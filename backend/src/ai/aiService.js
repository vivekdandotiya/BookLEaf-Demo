import OpenAI from 'openai';
import { z } from 'zod';
import { ENV } from '../config/env.js';
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  RESPONSE_DRAFT_SYSTEM_PROMPT,
  UNIFIED_TICKET_AI_SYSTEM_PROMPT,
} from './prompts.js';
import { getRelevantKnowledgeBase } from './knowledgeBase.js';
import { draftCache } from './draftCache.js';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../models/Ticket.js';
import { classifyWithRuleEngine, generateRuleBasedResponse } from './ruleEngine.js';

export { classifyWithRuleEngine, generateRuleBasedResponse };

let customOpenAIClient = undefined;

/**
 * Configure or override OpenAI client (primarily for testing and mock injection)
 */
export function setOpenAIClient(client) {
  customOpenAIClient = client;
}

/**
 * Lazily instantiate and return the active OpenAI client
 */
export function getOpenAIClient() {
  if (customOpenAIClient !== undefined) {
    return customOpenAIClient;
  }
  const key = (process.env.OPENAI_API_KEY || ENV.OPENAI_API_KEY || '').trim();
  if (!key) {
    return null;
  }
  return new OpenAI({ apiKey: key });
}

export const unifiedTicketAISchema = z.object({
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(5),
  suggestedResponse: z.string().min(10),
});

export const classificationSchema = z.object({
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(5),
});

/**
 * Unified AI processor for ticket creation:
 * If OpenAI is configured and available, classifies and drafts using gpt-4o-mini.
 * If OpenAI is unavailable, quota exhausted (429), or disabled, seamlessly engages
 * the Local Rule-Based Engine without failing ticket creation.
 */
export async function processTicketAI({ subject, description, bookContext, authorContext }) {
  const client = getOpenAIClient();

  // If OpenAI client is configured, attempt LLM processing first
  if (client) {
    try {
      // Retrieve relevant knowledge base policies
      const relevantKB = getRelevantKnowledgeBase('General Inquiry', `${subject} ${description}`);

      const userContent = `
Author Details:
- Name: ${authorContext?.name || 'Valued Author'}
- Email: ${authorContext?.email || 'N/A'}
- City: ${authorContext?.city || 'N/A'}
- Author ID: ${authorContext?.author_id || 'N/A'}
- Joined: ${authorContext?.joined_date ? new Date(authorContext.joined_date).toISOString().split('T')[0] : 'N/A'}

Book Details:
- Title: ${bookContext?.title || 'General Account Inquiry (No book attached)'}
- ISBN: ${bookContext?.isbn || 'N/A'}
- Status: ${bookContext?.status || 'N/A'}
- MRP: ${bookContext?.mrp !== null && bookContext?.mrp !== undefined ? `₹${bookContext.mrp}` : 'N/A'}
- Publication Date: ${bookContext?.publication_date ? new Date(bookContext.publication_date).toISOString().split('T')[0] : 'N/A'}
- Total Sold: ${bookContext?.total_copies_sold ?? 'N/A'}
- Royalty Earned: ₹${bookContext?.total_royalty_earned ?? 'N/A'}
- Royalty Paid: ₹${bookContext?.royalty_paid ?? 'N/A'}
- Royalty Pending: ₹${bookContext?.royalty_pending ?? 'N/A'}
- Last Payout: ${bookContext?.last_royalty_payout_date ? new Date(bookContext.last_royalty_payout_date).toISOString().split('T')[0] : 'None'}
- Print Partner: ${bookContext?.print_partner || 'In-House'}
- Active Channels: ${bookContext?.available_on?.join(', ') || 'N/A'}

Applicable BookLeaf Policies & Standards:
${JSON.stringify(relevantKB, null, 2)}

Author Ticket Inquiry:
<<<AUTHOR_QUERY>>>
Subject: ${subject}
Description: ${description}
<<<END_QUERY>>>

Classify this ticket, assign priority, explain your reasoning, and draft a professional suggested response.
`;

      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || ENV.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: UNIFIED_TICKET_AI_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 800,
      });

      const rawContent = response.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error('OpenAI returned an empty response');
      }

      let parsed;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseErr) {
        throw new Error(`OpenAI response was not valid JSON: ${parseErr.message}`);
      }

      const validated = unifiedTicketAISchema.parse(parsed);

      return {
        success: true,
        source: 'openai',
        data: {
          category: validated.category,
          priority: validated.priority,
          confidence: validated.confidence,
          reasoning: validated.reasoning,
          suggestedResponse: validated.suggestedResponse,
          model: response.model || process.env.OPENAI_MODEL || ENV.OPENAI_MODEL || 'gpt-4o-mini',
          tokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (err) {
      const sanitizedMsg = (err.message || 'Unknown AI error').replace(/sk-[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_API_KEY]');
      console.warn(`[AI Service] OpenAI provider error (${sanitizedMsg}). Engaging Local Rule-Based Engine fallback.`);

      // Seamless fallback to Local Rule-Based Engine
      const ruleResult = classifyWithRuleEngine({ subject, description, bookContext, authorContext });
      return {
        success: true,
        source: 'rule_engine',
        fallbackReason: sanitizedMsg,
        data: ruleResult.data,
      };
    }
  }

  // Operating without OpenAI credits / key: Use Local Rule-Based Engine directly
  console.log('[AI Service] Operating without external LLM provider. Utilizing Local Rule-Based Engine.');
  const ruleResult = classifyWithRuleEngine({ subject, description, bookContext, authorContext });
  return {
    success: true,
    source: 'rule_engine',
    data: ruleResult.data,
  };
}

/**
 * Classify and prioritize an incoming ticket (delegates to unified processor)
 */
export async function classifyAndPrioritize(args) {
  return processTicketAI(args);
}

/**
 * Generate an empathetic, policy-grounded draft response for an admin
 */
export async function generateDraftResponse({
  ticketId,
  lastMessageId,
  subject,
  description,
  category,
  priority,
  bookContext,
  authorContext,
  recentMessages = [],
}) {
  // 1. Check in-memory cache first
  const cachedDraft = draftCache.get(ticketId, lastMessageId);
  if (cachedDraft) {
    return {
      success: true,
      draft: cachedDraft,
      source: 'cache',
      cached: true,
    };
  }

  const client = getOpenAIClient();
  if (!client) {
    // Generate grounded rule-based draft template
    const ruleDraft = generateRuleBasedResponse({
      category,
      priority,
      subject,
      description,
      authorContext,
      bookContext,
    });
    draftCache.set(ticketId, lastMessageId, ruleDraft);
    return {
      success: true,
      draft: ruleDraft,
      source: 'rule_engine',
      cached: false,
      model: 'local-rule-engine-v1',
    };
  }

  // 2. Retrieve only relevant Knowledge Base sections
  const relevantKB = getRelevantKnowledgeBase(category, `${subject} ${description}`);

  const formattedMessages = recentMessages
    .slice(-4)
    .map((m) => `${m.senderRole === 'author' ? 'Author' : 'BookLeaf Support'} (${new Date(m.createdAt).toLocaleTimeString()}): ${m.body}`)
    .join('\n\n');

  const userPrompt = `
Author Profile:
- Name: ${authorContext?.name || 'Valued Author'}
- Email: ${authorContext?.email || 'N/A'}
- City: ${authorContext?.city || 'N/A'}

Book Details:
- Title: ${bookContext?.title || 'General Account Level'}
- ISBN: ${bookContext?.isbn || 'N/A'}
- Status: ${bookContext?.status || 'N/A'}
- Total Sold: ${bookContext?.total_copies_sold ?? 'N/A'}
- Royalty Earned: ₹${bookContext?.total_royalty_earned ?? 'N/A'}
- Royalty Paid: ₹${bookContext?.royalty_paid ?? 'N/A'}
- Royalty Pending: ₹${bookContext?.royalty_pending ?? 'N/A'}
- Print Partner: ${bookContext?.print_partner || 'In-House'}
- Available Platforms: ${bookContext?.available_on?.join(', ') || 'N/A'}

Applicable BookLeaf Knowledge Base Policies:
${JSON.stringify(relevantKB, null, 2)}

Original Author Ticket:
<<<AUTHOR_QUERY>>>
Subject: ${subject}
Description: ${description}
<<<END_QUERY>>>

${formattedMessages ? `Recent Public Conversation:\n${formattedMessages}\n` : ''}

Draft an empathetic, polite, and policy-accurate reply to the author. Follow all Tone Guidelines and specific next-step requirements.
`;

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || ENV.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RESPONSE_DRAFT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 650,
    });

    const draft = response.choices?.[0]?.message?.content?.trim();
    if (!draft) {
      throw new Error('OpenAI returned an empty response');
    }

    // Cache the draft
    draftCache.set(ticketId, lastMessageId, draft);

    return {
      success: true,
      draft,
      source: 'openai',
      cached: false,
      model: response.model,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (err) {
    const sanitizedMsg = (err.message || 'Unknown error').replace(/sk-[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_API_KEY]');
    console.warn(`[AI Service] OpenAI draft error (${sanitizedMsg}). Falling back to Local Rule-Based template draft.`);

    const ruleDraft = generateRuleBasedResponse({
      category,
      priority,
      subject,
      description,
      authorContext,
      bookContext,
    });
    draftCache.set(ticketId, lastMessageId, ruleDraft);

    return {
      success: true,
      draft: ruleDraft,
      source: 'rule_engine',
      cached: false,
      model: 'local-rule-engine-v1',
    };
  }
}
