/**
 * BookLeaf Knowledge Base Module
 * Deterministic, structured repository of BookLeaf Publishing business policies.
 * Derived verbatim from BookLeaf Technical Assignment specification (Pages 5-7).
 */

export const BOOKLEAF_KNOWLEDGE_BASE = {
  company: {
    title: 'Company Overview',
    summary:
      'BookLeaf Publishing is a self-publishing company operating in India and the US, processing 1,200+ titles monthly across a catalog of 22,000+ books. In-house printing facility and warehouse are in Delhi; external print partners include Repro India and Epitome Books. Offers Standard Free (no upfront cost) and Bestseller Breakthrough (premium paid package).',
  },

  royalty: {
    title: 'Royalty & Payments Policy',
    split: '80/20 royalty split: 80% of net profit goes to author, 20% to BookLeaf.',
    netProfitFormula:
      'Net Profit = MRP minus printing cost, platform commissions (Amazon/Flipkart), and shipping charges.',
    cycle: 'Calculated quarterly and paid within 45 days after the quarter ending.',
    threshold:
      'Minimum payout threshold is ₹1,000. If accumulated royalties are below ₹1,000, they roll over to the next quarter.',
    method: 'Payouts made via bank transfer to the account linked in the author dashboard.',
    transparency:
      'Authors can view a line-by-line royalty breakdown in their dashboard showing platform-level sales figures.',
  },

  isbn: {
    title: 'ISBN & Metadata Policy',
    assignment: 'Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf.',
    imprint:
      "ISBNs are registered under BookLeaf's publisher imprint. Authors desiring their own imprint must procure ISBN independently.",
    errorHandling:
      'ISBN errors (duplicate ISBN, wrong book linked, barcode mismatches on Amazon/Flipkart) are treated as HIGH PRIORITY and escalated directly to the production team with a 48-hour resolution timeline.',
    metadataUpdates:
      'Metadata changes submitted via dashboard or email typically reflect on distribution platforms within 3–5 business days.',
  },

  printing: {
    title: 'Printing & Quality Policy',
    turnaround: 'Standard print turnaround is 5–7 business days from order confirmation.',
    facilities:
      'In-house printing in Delhi handles most orders. Overflow or special formats route to Repro India or Epitome Books.',
    defects:
      'Quality defects (misprints, binding flaws, blurry images, color inconsistencies): BookLeaf arranges a free reprint after verification. Author may need to share photos of defective copies. Reprint turnaround is 5–7 business days.',
  },

  distribution: {
    title: 'Distribution & Platform Availability Policy',
    channels: ['Amazon India', 'Flipkart', 'Amazon US', 'Amazon UK', 'BookLeaf Store'],
    newListingTimeline: 'New listings typically go live within 7–10 business days after publication is complete.',
    syncIssues:
      'If a published book shows as "Currently Unavailable" on Amazon or Flipkart, it usually indicates a stock synchronization issue. BookLeaf triggers an immediate re-sync with distribution partners within 24–48 hours.',
  },

  production: {
    title: 'Production Stages & Timelines',
    stages: [
      'Manuscript Received',
      'Editing (if opted)',
      'Cover Design',
      'Typesetting',
      'Proofreading',
      'ISBN Assignment',
      'Printing',
      'Distribution Setup',
      'Published & Live',
    ],
    delays:
      'Authors are updated at each stage via email. Delays typically happen at Cover Design (waiting for author approval) and Proofreading (author revision rounds). Support representatives must never blame the author; collaborate honestly and give updated timelines.',
  },

  tone: {
    title: 'Communication Tone Guidelines',
    rules: [
      'Always empathetic, professional, and respectful. Authors are partners, not customers to be managed.',
      "Acknowledge the author's concern and emotion before jumping to operational solutions.",
      'Be specific: include actual book titles, numbers, dates, royalty amounts, and statuses rather than vague reassurances.',
      "Direct accountability: If something is BookLeaf's fault (delayed royalties, ISBN mismatch), own it directly with zero corporate deflection.",
      'Provide clear, bounded escalation timelines (e.g., "Our team will look into this and resolve within 48 hours") rather than open-ended promises.',
      'Always conclude with an explicit next step for the author or the BookLeaf support team.',
    ],
  },
};

/**
 * Deterministic helper to retrieve only relevant KB sections based on category and query hints
 */
export function getRelevantKnowledgeBase(category, queryText = '') {
  const text = queryText.toLowerCase();
  const sections = [];

  // Always include tone
  sections.push({ topic: 'Tone Guidelines', content: BOOKLEAF_KNOWLEDGE_BASE.tone });

  if (category === 'Royalty & Payments' || text.includes('royalt') || text.includes('payout') || text.includes('money')) {
    sections.push({ topic: 'Royalty Policy', content: BOOKLEAF_KNOWLEDGE_BASE.royalty });
  }

  if (category === 'ISBN & Metadata Issues' || text.includes('isbn') || text.includes('metadata') || text.includes('barcode')) {
    sections.push({ topic: 'ISBN Policy', content: BOOKLEAF_KNOWLEDGE_BASE.isbn });
  }

  if (category === 'Printing & Quality' || text.includes('print') || text.includes('quality') || text.includes('binding') || text.includes('defect')) {
    sections.push({ topic: 'Printing & Quality Policy', content: BOOKLEAF_KNOWLEDGE_BASE.printing });
  }

  if (category === 'Distribution & Availability' || text.includes('amazon') || text.includes('flipkart') || text.includes('unavailable') || text.includes('stock')) {
    sections.push({ topic: 'Distribution Policy', content: BOOKLEAF_KNOWLEDGE_BASE.distribution });
  }

  if (category === 'Book Status & Production Updates' || text.includes('production') || text.includes('typesetting') || text.includes('cover') || text.includes('stage')) {
    sections.push({ topic: 'Production Stages', content: BOOKLEAF_KNOWLEDGE_BASE.production });
  }

  if (sections.length <= 1) {
    // Default fallback: include general overview and production stages
    sections.push({ topic: 'Company Overview', content: BOOKLEAF_KNOWLEDGE_BASE.company });
    sections.push({ topic: 'Production Stages', content: BOOKLEAF_KNOWLEDGE_BASE.production });
  }

  return sections;
}
