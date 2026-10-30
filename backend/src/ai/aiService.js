import OpenAI from 'openai';
import { z } from 'zod';
import { ENV } from '../config/env.js';
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  RESPONSE_DRAFT_SYSTEM_PROMPT,
} from './prompts.js';
import { getRelevantKnowledgeBase } from './knowledgeBase.js';
import { draftCache } from './draftCache.js';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../models/Ticket.js';

let openaiClient = null;
if (ENV.OPENAI_API_KEY && ENV.OPENAI_API_KEY.trim().length > 0) {
  openaiClient = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });
}

const classificationSchema = z.object({
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(5),
});

/**
 * Classify and prioritize an incoming ticket
 */
export async function classifyAndPrioritize({ subject, description, bookContext, authorContext }) {
  if (!openaiClient) {
    return {
      success: false,
      reason: 'OPENAI_API_KEY not configured. Manual triage required.',
    };
  }

  const userContent = `
Author Details:
- Name: ${authorContext?.name || 'N/A'}
- City: ${authorContext?.city || 'N/A'}
- Joined: ${authorContext?.joined_date ? new Date(authorContext.joined_date).toISOString().split('T')[0] : 'N/A'}

Book Details:
- Title: ${bookContext?.title || 'General Account Inquiry (No book specified)'}
- ISBN: ${bookContext?.isbn || 'N/A'}
- Status: ${bookContext?.status || 'N/A'}
- Publication Date: ${bookContext?.publication_date ? new Date(bookContext.publication_date).toISOString().split('T')[0] : 'N/A'}
- Royalty Earned: ₹${bookContext?.total_royalty_earned ?? 'N/A'}
- Royalty Paid: ₹${bookContext?.royalty_paid ?? 'N/A'}
- Royalty Pending: ₹${bookContext?.royalty_pending ?? 'N/A'}
- Last Payout: ${bookContext?.last_royalty_payout_date ? new Date(bookContext.last_royalty_payout_date).toISOString().split('T')[0] : 'None'}

Author Ticket Query:
<<<AUTHOR_QUERY>>>
Subject: ${subject}
Description: ${description}
<<<END_QUERY>>>
`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: ENV.OPENAI_MODEL,
      messages: [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 300,
    });

    const rawContent = response.choices[0]?.message?.content;
    const parsed = JSON.parse(rawContent);
    const validated = classificationSchema.parse(parsed);

    return {
      success: true,
      data: {
        category: validated.category,
        priority: validated.priority,
        confidence: validated.confidence,
        reasoning: validated.reasoning,
        model: response.model,
        tokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (err) {
    console.error('[AI Service] Classification error:', err.message);
    return {
      success: false,
      reason: err.message,
    };
  }
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
      cached: true,
    };
  }

  if (!openaiClient) {
    return {
      success: false,
      draft: null,
      error: 'OPENAI_API_KEY is not configured on the server. Please write a manual response.',
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
    const response = await openaiClient.chat.completions.create({
      model: ENV.OPENAI_MODEL,
      messages: [
        { role: 'system', content: RESPONSE_DRAFT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 650,
    });

    const draft = response.choices[0]?.message?.content?.trim();
    if (!draft) {
      throw new Error('OpenAI returned an empty response');
    }

    // Cache the draft
    draftCache.set(ticketId, lastMessageId, draft);

    return {
      success: true,
      draft,
      cached: false,
      model: response.model,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (err) {
    console.error('[AI Service] Draft generation error:', err.message);
    return {
      success: false,
      draft: null,
      error: `AI drafting failed: ${err.message}. Please respond manually.`,
    };
  }
}
