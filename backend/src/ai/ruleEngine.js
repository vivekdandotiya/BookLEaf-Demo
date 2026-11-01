import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../models/Ticket.js';
import { BOOKLEAF_KNOWLEDGE_BASE } from './knowledgeBase.js';

/**
 * Keyword definitions with weights for each of the 6 BookLeaf categories
 */
const CATEGORY_RULES = [
  {
    category: 'Royalty & Payments',
    weightMultiplier: 1.2,
    keywords: [
      'royalty',
      'royalties',
      'payout',
      'payouts',
      'payment',
      'payments',
      'earnings',
      'bank transfer',
      'bank account',
      'threshold',
      '80/20',
      'net profit',
      'unpaid',
      'disbursed',
      'disbursement',
      'overdue',
      'sold',
      'copies sold',
      'rupees',
      'inr',
      '₹',
      'money',
      'cheque',
      'statement',
    ],
    regexPatterns: [
      /royalt(y|ies)/i,
      /payout/i,
      /bank (transfer|account)/i,
      /80\/20/i,
      /net profit/i,
      /₹\s*\d+/i,
      /unpaid/i,
    ],
  },
  {
    category: 'ISBN & Metadata Issues',
    weightMultiplier: 1.3,
    keywords: [
      'isbn',
      'barcode',
      'metadata',
      'imprint',
      'wrong isbn',
      'duplicate isbn',
      'wrong title',
      'author name',
      'spelling',
      'synopsis',
      'description update',
      'wrong book linked',
      'asin',
      'book details',
      'subtitle',
      'mismatch',
    ],
    regexPatterns: [
      /isbn/i,
      /barcode/i,
      /metadata/i,
      /wrong (isbn|title|author|book)/i,
      /duplicate isbn/i,
    ],
  },
  {
    category: 'Printing & Quality',
    weightMultiplier: 1.2,
    keywords: [
      'print',
      'printing',
      'print quality',
      'defective',
      'defect',
      'defects',
      'blur',
      'blurry',
      'misprint',
      'misprints',
      'binding',
      'damaged',
      'misaligned',
      'crooked',
      'pages missing',
      'torn',
      'paper quality',
      'author copies',
      'author copy',
      'physical copy',
      'copies received',
      'reprint',
      'reprints',
      'cover finish',
      'matte',
      'glossy',
      'smudge',
      'smudged',
    ],
    regexPatterns: [
      /print(ing|ed)?\b/i,
      /defect(ive|s)?/i,
      /blur(ry)?/i,
      /misprint/i,
      /reprint/i,
      /misalign(ed)?/i,
      /binding/i,
      /author cop(y|ies)/i,
    ],
  },
  {
    category: 'Distribution & Availability',
    weightMultiplier: 1.2,
    keywords: [
      'currently unavailable',
      'unavailable',
      'out of stock',
      'not available',
      'buy link',
      'distribution',
      'availability',
      'channels',
      'bookleaf store',
      'platforms',
      'where to buy',
      'search result',
      'live link',
      'not showing',
      'delisted',
      'listing missing',
    ],
    regexPatterns: [
      /currently unavailable/i,
      /out of stock/i,
      /not available on (amazon|flipkart|store)/i,
      /distribution/i,
      /availab(le|ility)/i,
      /(amazon|flipkart).*(unavailable|out of stock|delisted|missing)/i,
    ],
  },
  {
    category: 'Book Status & Production Updates',
    weightMultiplier: 1.1,
    keywords: [
      'typesetting',
      'cover design',
      'editing',
      'proofreading',
      'manuscript',
      'production',
      'timeline',
      'delay',
      'delays',
      'when will my book',
      'status update',
      'stage',
      'how long',
      'progress',
      'publishing progress',
      'ready to publish',
      'proof',
    ],
    regexPatterns: [
      /typesetting/i,
      /cover design/i,
      /proofreading/i,
      /production (stage|timeline|status)/i,
      /when will (my|the) book/i,
      /status update/i,
    ],
  },
  {
    category: 'General Inquiry',
    weightMultiplier: 1.0,
    keywords: [
      'general',
      'query',
      'question',
      'contract',
      'package',
      'bestseller breakthrough',
      'standard free',
      'portal',
      'dashboard',
      'help',
      'support',
      'hello',
      'hi',
      'inquiry',
      'guidance',
      'information',
      'contact',
      'update description',
      'can i update',
      'how to update',
      'change description',
    ],
    regexPatterns: [
      /bestseller breakthrough/i,
      /standard free/i,
      /general (inquiry|question)/i,
      /how (does|can) I/i,
      /can I (update|change)/i,
      /update.*description/i,
    ],
  },
];

/**
 * Score-based classification of incoming ticket text
 */
export function classifyTicketText(text, bookContext = null) {
  const normalized = (text || '').toLowerCase();
  const scores = {};

  for (const rule of CATEGORY_RULES) {
    let score = 0;

    // Keyword match
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        score += 2;
      }
    }

    // Regex pattern match (higher confidence)
    for (const rx of rule.regexPatterns) {
      if (rx.test(normalized)) {
        score += 4;
      }
    }

    scores[rule.category] = score * rule.weightMultiplier;
  }

  // Metadata context boost
  if (bookContext) {
    const status = (bookContext.status || '').toLowerCase();
    if (status.includes('typesetting') || status.includes('cover') || status.includes('editing')) {
      scores['Book Status & Production Updates'] += 3;
    }
    if ((bookContext.royalty_pending || 0) > 0 && (normalized.includes('royalt') || normalized.includes('money') || normalized.includes('payout'))) {
      scores['Royalty & Payments'] += 4;
    }
  }

  // Pick top category
  let topCategory = 'General Inquiry';
  let maxScore = 0;

  for (const [cat, s] of Object.entries(scores)) {
    if (s > maxScore) {
      maxScore = s;
      topCategory = cat;
    }
  }

  // Default fallback if score too low
  if (maxScore < 2) {
    topCategory = 'General Inquiry';
  }

  // Calculate normalized confidence score (0.50 to 0.95)
  const confidence = Math.min(0.95, Math.max(0.65, Number((0.55 + maxScore * 0.04).toFixed(2))));

  return { category: topCategory, confidence, score: maxScore };
}

/**
 * Determine priority using transparent BookLeaf policy thresholds
 */
export function determinePriority(category, text, bookContext = null) {
  const normalized = (text || '').toLowerCase();
  const royaltyPending = Number(bookContext?.royalty_pending || 0);

  // 1. CRITICAL PRIORITY RULES
  // - Overdue royalty payments (> ₹1,000 threshold with delay indicators)
  if (category === 'Royalty & Payments') {
    const hasDelayIndicator =
      normalized.includes('overdue') ||
      normalized.includes('delay') ||
      normalized.includes('month') ||
      normalized.includes('haven\'t received') ||
      normalized.includes('not received') ||
      normalized.includes('never received') ||
      normalized.includes('still haven\'t') ||
      normalized.includes('urgent');

    if (royaltyPending >= 1000 && hasDelayIndicator) {
      return {
        priority: 'Critical',
        reasoning: `Author reports overdue royalties with ₹${royaltyPending.toLocaleString('en-IN')} pending, exceeding BookLeaf's ₹1,000 quarterly disbursement threshold.`,
      };
    }
    if (hasDelayIndicator && (normalized.includes('4 month') || normalized.includes('quarter') || normalized.includes('60 day'))) {
      return {
        priority: 'Critical',
        reasoning: `Author query indicates royalty payment overdue past the standard 45-day quarterly disbursement window.`,
      };
    }
  }

  // - Major launch batch defect
  if (category === 'Printing & Quality') {
    if (normalized.includes('launch') || normalized.includes('event') || normalized.includes('entire order') || normalized.includes('all copies')) {
      return {
        priority: 'Critical',
        reasoning: `Severe print defect affecting batch author copies with immediate event or launch impact.`,
      };
    }
  }

  // 2. HIGH PRIORITY RULES
  // - ISBN & metadata discrepancies (MUST be High per BookLeaf policy, 48-hour SLA)
  if (category === 'ISBN & Metadata Issues') {
    return {
      priority: 'High',
      reasoning: `ISBN discrepancies trigger BookLeaf's mandatory 48-hour resolution SLA with the production and catalog teams.`,
    };
  }

  // - Distribution: Book showing Currently Unavailable on Amazon/Flipkart
  if (category === 'Distribution & Availability') {
    if (normalized.includes('currently unavailable') || normalized.includes('unavailable') || normalized.includes('out of stock')) {
      return {
        priority: 'High',
        reasoning: `Live catalog title reported as 'Currently Unavailable' on distribution platforms, requiring stock sync within 24–48 hours.`,
      };
    }
    return {
      priority: 'High',
      reasoning: `Distribution availability issue affecting sales channels across retail partners.`,
    };
  }

  // - Printing quality defects (blurry, damaged, misaligned)
  if (category === 'Printing & Quality') {
    return {
      priority: 'High',
      reasoning: `Physical print defect reported on author copies, triggering BookLeaf's verified free reprint workflow.`,
    };
  }

  // - Royalty pending >= ₹1,000 threshold without extreme overdue
  if (category === 'Royalty & Payments' && royaltyPending >= 1000) {
    return {
      priority: 'High',
      reasoning: `Pending royalty amount (₹${royaltyPending.toLocaleString('en-IN')}) meets BookLeaf's minimum payout threshold.`,
    };
  }

  // 3. MEDIUM PRIORITY RULES
  if (category === 'Royalty & Payments') {
    return {
      priority: 'Medium',
      reasoning: `Standard royalty calculation inquiry or amount below the ₹1,000 threshold rolling over to the next quarter.`,
    };
  }

  if (category === 'Book Status & Production Updates') {
    const stage = bookContext?.status || 'Production';
    return {
      priority: 'Medium',
      reasoning: `Production timeline check for title currently in ${stage}. Standard milestone inquiry.`,
    };
  }

  // 4. LOW PRIORITY RULES
  if (category === 'General Inquiry') {
    return {
      priority: 'Low',
      reasoning: `General informational or portal navigation inquiry with no active operational blocking issues.`,
    };
  }

  // Default fallback
  return {
    priority: 'Medium',
    reasoning: `Classified under standard operations triage rules for ${category}.`,
  };
}

/**
 * Generate policy-grounded template suggested responses
 */
export function generateRuleBasedResponse({
  category,
  priority,
  subject,
  description,
  authorContext,
  bookContext,
}) {
  const authorName = authorContext?.name || 'Author';
  const bookTitle = bookContext?.title ? `"${bookContext.title}"` : 'your book';
  const pendingRoyalty = bookContext?.royalty_pending;
  const bookStatus = bookContext?.status || 'In Production';

  switch (category) {
    case 'Royalty & Payments': {
      const royaltyMention =
        pendingRoyalty !== null && pendingRoyalty !== undefined
          ? `We note that your account currently reflects ₹${Number(pendingRoyalty).toLocaleString('en-IN')} in pending royalties for ${bookTitle}. `
          : '';

      return `Dear ${authorName},

Thank you for reaching out to BookLeaf Publishing regarding your royalty payout for ${bookTitle}.

${royaltyMention}Per BookLeaf's Royalty & Payments Policy:
1. Payout Schedule: Royalties are calculated on a quarterly schedule and disbursed via bank transfer within 45 days following the end of each calendar quarter.
2. Minimum Threshold: The minimum payout threshold is ₹1,000. Accumulated amounts below this threshold automatically roll over to the subsequent quarter.
3. Profit Split: You receive 80% of net profit (calculated as MRP minus direct printing cost, platform commissions, and shipping).

Our accounts desk is reviewing your linked bank details and sales records. An operations representative will follow up with your confirmed transaction reference or status within 48 hours.

Warm regards,
BookLeaf Author Operations Desk`;
    }

    case 'ISBN & Metadata Issues': {
      const isbnNum = bookContext?.isbn ? ` (registered ISBN: ${bookContext.isbn})` : '';

      return `Dear ${authorName},

Thank you for alerting us regarding the metadata discrepancy for ${bookTitle}${isbnNum}.

Under BookLeaf's ISBN & Metadata Policy, ISBN listing discrepancies are treated as HIGH PRIORITY:
1. Publisher Imprint: Every title published through BookLeaf carries a unique registered ISBN assigned under our publisher imprint.
2. Escalation SLA: Our production desk has logged this issue directly with distribution partners (Amazon and Flipkart). Corrections typically reflect on retail portals within 48 hours.
3. Metadata Updates: Any additional updates to descriptions, sub-titles, or author bios submitted to retail platforms reflect within 3 to 5 business days.

Next Step: If you have a direct link or screenshot of the incorrect retail page, please share it in this thread so our catalog team can verify the barcode sync immediately.

Warm regards,
BookLeaf Author Operations Desk`;
    }

    case 'Printing & Quality': {
      return `Dear ${authorName},

Thank you for contacting us, and please accept our sincere apologies for the print quality issues you encountered with your author copies of ${bookTitle}.

Under BookLeaf's Printing & Quality Policy:
1. Quality Assurance: We take full responsibility for any manufacturing flaws, including blurry text, misaligned margins, binding faults, or cover defects.
2. Free Replacement: Following verification, BookLeaf will arrange a complete reprint of your defective copies at zero cost to you.
3. Turnaround Time: Replacement reprint turnaround is typically 5 to 7 business days from verification.

Next Step: Please reply with 1 to 2 clear photos highlighting the affected pages or binding defects. Once received, our Delhi printing desk will approve and dispatch your replacement batch.

Warm regards,
BookLeaf Author Operations Desk`;
    }

    case 'Distribution & Availability': {
      return `Dear ${authorName},

Thank you for bringing the platform availability of ${bookTitle} to our attention.

Under BookLeaf's Distribution Policy:
1. Platform Channels: Your title is slated for distribution across Amazon India, Flipkart, Amazon US/UK, and the BookLeaf Store.
2. Stock Synchronization: When an active title temporarily shows as "Currently Unavailable" on Amazon or Flipkart, it typically indicates an automated inventory re-sync between our Delhi warehouse and retail partners.
3. Resolution SLA: Our distribution operations desk triggers an immediate stock re-sync with Amazon and Flipkart, which normalizes listing availability within 24 to 48 hours.

Our team has initiated the catalog inventory refresh for your book and is monitoring the status until the listing shows active in-stock.

Warm regards,
BookLeaf Author Operations Desk`;
    }

    case 'Book Status & Production Updates': {
      return `Dear ${authorName},

Thank you for checking in on the publication progress of ${bookTitle}.

Your book is currently in the "${bookStatus}" stage of the BookLeaf publication pipeline. 

Our standard production workflow progresses through Manuscript Review, Editing, Cover Design, Typesetting, Proofreading, ISBN Assignment, and Printing before Distribution. 

Our production team is actively working on your project and collaborating to deliver the highest standard. A dedicated team member will update your dashboard with the next milestone within 2 business days.

Warm regards,
BookLeaf Author Operations Desk`;
    }

    case 'General Inquiry':
    default: {
      return `Dear ${authorName},

Thank you for reaching out to BookLeaf Author Support.

We have received your inquiry regarding ${bookTitle} and our operations desk is reviewing your request. We are committed to supporting our author partners through every stage of their publishing journey.

An operations representative will follow up with detailed guidance within 24 to 48 business hours. If you have additional documents or context to provide, feel free to reply directly to this thread.

Warm regards,
BookLeaf Author Operations Desk`;
    }
  }
}

/**
 * Main Rule-Engine entrypoint:
 * Replaces or supplements OpenAI with 100% deterministic, offline-capable classification.
 */
export function classifyWithRuleEngine({ subject, description, bookContext, authorContext }) {
  const combinedText = `${subject || ''} ${description || ''}`;

  // 1. Determine category
  const { category, confidence } = classifyTicketText(combinedText, bookContext);

  // 2. Determine priority and grounded reasoning
  const { priority, reasoning } = determinePriority(category, combinedText, bookContext);

  // 3. Generate policy-grounded template response
  const suggestedResponse = generateRuleBasedResponse({
    category,
    priority,
    subject,
    description,
    authorContext,
    bookContext,
  });

  return {
    success: true,
    source: 'rule_engine',
    data: {
      category,
      priority,
      confidence,
      reasoning: `[Local Rule-Based Engine] ${reasoning}`,
      suggestedResponse,
      model: 'local-rule-engine-v1',
      tokens: 0,
    },
  };
}
