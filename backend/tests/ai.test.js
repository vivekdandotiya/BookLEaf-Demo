import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  processTicketAI,
  classifyAndPrioritize,
  generateDraftResponse,
  setOpenAIClient,
  unifiedTicketAISchema,
} from '../src/ai/aiService.js';
import {
  classifyWithRuleEngine,
  classifyTicketText,
  determinePriority,
  generateRuleBasedResponse,
} from '../src/ai/ruleEngine.js';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../src/models/Ticket.js';

describe('AI & Local Rule-Based Engine Test Suite', () => {
  afterEach(() => {
    // Reset mock client override
    setOpenAIClient(undefined);
    vi.restoreAllMocks();
  });

  describe('1. Local Rule-Based Classification: All 6 Categories', () => {
    it('should accurately classify Category 1: Royalty & Payments', () => {
      const res = classifyWithRuleEngine({
        subject: 'Pending royalty payment inquiry',
        description: 'My dashboard shows ₹3,570 in pending royalties. When will this payout be transferred to my bank account?',
        bookContext: { title: 'Whispers of the Ganges', royalty_pending: 3570 },
      });

      expect(res.success).toBe(true);
      expect(res.source).toBe('rule_engine');
      expect(res.data.category).toBe('Royalty & Payments');
      expect(res.data.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should accurately classify Category 2: ISBN & Metadata Issues', () => {
      const res = classifyWithRuleEngine({
        subject: 'Wrong ISBN on Amazon listing',
        description: 'The ISBN printed on my physical book does not match the barcode or ISBN displayed on Amazon.',
        bookContext: { title: 'Startup Sutra', isbn: '978-93-5XXXX-04-2' },
      });

      expect(res.success).toBe(true);
      expect(res.source).toBe('rule_engine');
      expect(res.data.category).toBe('ISBN & Metadata Issues');
    });

    it('should accurately classify Category 3: Printing & Quality', () => {
      const res = classifyWithRuleEngine({
        subject: 'Defective author copies received',
        description: 'The author copies have blurry text on chapters 3 and 4, and page margins are misaligned. Need a reprint.',
        bookContext: { title: 'The Last Monsoon' },
      });

      expect(res.success).toBe(true);
      expect(res.source).toBe('rule_engine');
      expect(res.data.category).toBe('Printing & Quality');
    });

    it('should accurately classify Category 4: Distribution & Availability', () => {
      const res = classifyWithRuleEngine({
        subject: 'Book showing Currently Unavailable on Amazon',
        description: 'My book is published and live but the Amazon listing is showing as Currently Unavailable and out of stock.',
        bookContext: { title: 'Echoes of Silence', status: 'Published & Live' },
      });

      expect(res.success).toBe(true);
      expect(res.source).toBe('rule_engine');
      expect(res.data.category).toBe('Distribution & Availability');
    });

    it('should accurately classify Category 5: Book Status & Production Updates', () => {
      const res = classifyWithRuleEngine({
        subject: 'Typesetting delay status update',
        description: 'It has been 3 weeks and my book is still in typesetting. When will typesetting finish and move to proofreading?',
        bookContext: { title: 'Shadows of the Past', status: 'In Typesetting' },
      });

      expect(res.success).toBe(true);
      expect(res.source).toBe('rule_engine');
      expect(res.data.category).toBe('Book Status & Production Updates');
    });

    it('should accurately classify Category 6: General Inquiry', () => {
      const res = classifyWithRuleEngine({
        subject: 'Question about publishing packages',
        description: 'Hello, what is the difference between the Bestseller Breakthrough package and Standard Free publishing?',
      });

      expect(res.success).toBe(true);
      expect(res.source).toBe('rule_engine');
      expect(res.data.category).toBe('General Inquiry');
    });
  });

  describe('2. Local Rule-Based Priority Scoring Rules', () => {
    it('should assign Critical priority for overdue royalties exceeding ₹1,000 threshold', () => {
      const res = determinePriority(
        'Royalty & Payments',
        'I published 4 months ago and haven\'t received my overdue royalty payout.',
        { royalty_pending: 3570 }
      );

      expect(res.priority).toBe('Critical');
      expect(res.reasoning).toContain('₹1,000');
    });

    it('should assign High priority for ISBN discrepancies per BookLeaf 48-hour policy', () => {
      const res = determinePriority(
        'ISBN & Metadata Issues',
        'Wrong ISBN listed on Amazon India portal'
      );

      expect(res.priority).toBe('High');
      expect(res.reasoning).toContain('48-hour resolution SLA');
    });

    it('should assign High priority for published books showing Currently Unavailable', () => {
      const res = determinePriority(
        'Distribution & Availability',
        'Book is showing Currently Unavailable on Amazon'
      );

      expect(res.priority).toBe('High');
      expect(res.reasoning).toContain('Currently Unavailable');
    });

    it('should assign High priority for physical printing defects on author copies', () => {
      const res = determinePriority(
        'Printing & Quality',
        'Blurry pages and misaligned binding defects on received copies'
      );

      expect(res.priority).toBe('High');
      expect(res.reasoning).toContain('reprint workflow');
    });

    it('should assign Medium priority for standard production milestone inquiries', () => {
      const res = determinePriority(
        'Book Status & Production Updates',
        'Checking timeline for typesetting progress',
        { status: 'In Typesetting' }
      );

      expect(res.priority).toBe('Medium');
      expect(res.reasoning).toContain('milestone');
    });

    it('should assign Low priority for general informational queries', () => {
      const res = determinePriority(
        'General Inquiry',
        'How do I update my profile details in the author dashboard?'
      );

      expect(res.priority).toBe('Low');
      expect(res.reasoning).toContain('informational');
    });
  });

  describe('3. Grounded Template Suggested Responses', () => {
    it('should generate grounded response for Royalty with 80/20 split and 48-hour follow-up', () => {
      const draft = generateRuleBasedResponse({
        category: 'Royalty & Payments',
        priority: 'Critical',
        subject: 'Overdue royalty',
        description: 'Need my money',
        authorContext: { name: 'Priya Sharma' },
        bookContext: { title: 'Whispers of the Ganges', royalty_pending: 3570 },
      });

      expect(draft).toContain('Dear Priya Sharma');
      expect(draft).toContain('₹3,570');
      expect(draft).toContain('80% of net profit');
      expect(draft).toContain('₹1,000');
      expect(draft).toContain('48 hours');
    });

    it('should generate grounded response for Printing with free reprint SLA (5-7 business days)', () => {
      const draft = generateRuleBasedResponse({
        category: 'Printing & Quality',
        priority: 'High',
        subject: 'Damaged copies',
        description: 'Pages blurry',
        authorContext: { name: 'Sneha Kulkarni' },
        bookContext: { title: 'Beyond the Horizon' },
      });

      expect(draft).toContain('Dear Sneha Kulkarni');
      expect(draft).toContain('zero cost to you');
      expect(draft).toContain('5 to 7 business days');
      expect(draft).toContain('1 to 2 clear photos');
    });

    it('should generate grounded response for ISBN with 48-hour platform escalation', () => {
      const draft = generateRuleBasedResponse({
        category: 'ISBN & Metadata Issues',
        priority: 'High',
        subject: 'Wrong barcode',
        description: 'Wrong ISBN',
        authorContext: { name: 'Rohit Kapoor' },
        bookContext: { title: 'Startup Sutra', isbn: '978-93-5XXXX-04-2' },
      });

      expect(draft).toContain('Dear Rohit Kapoor');
      expect(draft).toContain('48 hours');
      expect(draft).toContain('unique registered ISBN');
    });

    it('should generate grounded response for Distribution with stock re-sync SLA', () => {
      const draft = generateRuleBasedResponse({
        category: 'Distribution & Availability',
        priority: 'High',
        subject: 'Unavailable',
        description: 'Listing down',
        authorContext: { name: 'Vikram Joshi' },
        bookContext: { title: 'The Last Monsoon' },
      });

      expect(draft).toContain('Dear Vikram Joshi');
      expect(draft).toContain('stock re-sync');
      expect(draft).toContain('24 to 48 hours');
    });
  });

  describe('4. Seamless Fallback on API Errors & Offline Mode', () => {
    it('should seamlessly engage Local Rule Engine when OpenAI quota is exhausted (429)', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(
              new Error('429 You have no credits remaining. Add credits at https://platform.openai.com')
            ),
          },
        },
      };

      setOpenAIClient(mockClient);

      const result = await processTicketAI({
        subject: 'Overdue royalty payout transfer inquiry',
        description: 'It has been 4 months and my ₹3,570 overdue royalty has not been received in my bank account.',
        bookContext: { title: 'Whispers of the Ganges', royalty_pending: 3570 },
        authorContext: { name: 'Priya Sharma' },
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('rule_engine');
      expect(result.data.category).toBe('Royalty & Payments');
      expect(result.data.priority).toBe('Critical');
      expect(result.data.suggestedResponse).toContain('Dear Priya Sharma');
      expect(result.data.model).toBe('local-rule-engine-v1');
    });

    it('should operate cleanly in offline mode when OPENAI_API_KEY is not configured', async () => {
      setOpenAIClient(null);

      const result = await processTicketAI({
        subject: 'Amazon listing shows Currently Unavailable',
        description: 'My book listing on Amazon is out of stock and unavailable.',
        bookContext: { title: 'Startup Sutra', status: 'Published & Live' },
        authorContext: { name: 'Rohit Kapoor' },
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('rule_engine');
      expect(result.data.category).toBe('Distribution & Availability');
      expect(result.data.priority).toBe('High');
      expect(result.data.reasoning).toContain('[Local Rule-Based Engine]');
    });

    it('should fall back to template draft in generateDraftResponse when OpenAI fails', async () => {
      setOpenAIClient(null);

      const result = await generateDraftResponse({
        ticketId: 'test-ticket-id',
        lastMessageId: 'initial',
        subject: 'Print quality issue',
        description: 'Pages are upside down',
        category: 'Printing & Quality',
        priority: 'High',
        authorContext: { name: 'Sneha Kulkarni' },
        bookContext: { title: 'Beyond the Horizon' },
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('rule_engine');
      expect(result.draft).toContain('Dear Sneha Kulkarni');
      expect(result.draft).toContain('5 to 7 business days');
    });
  });

  describe('5. Verified Categories and Priorities Compatibility', () => {
    it('should verify all 6 standard categories match schema exactly', () => {
      const expectedCategories = [
        'Royalty & Payments',
        'ISBN & Metadata Issues',
        'Printing & Quality',
        'Distribution & Availability',
        'Book Status & Production Updates',
        'General Inquiry',
      ];

      expect(TICKET_CATEGORIES).toEqual(expectedCategories);
    });

    it('should verify all 4 standard priorities match schema exactly', () => {
      const expectedPriorities = ['Critical', 'High', 'Medium', 'Low'];
      expect(TICKET_PRIORITIES).toEqual(expectedPriorities);
    });
  });
});
