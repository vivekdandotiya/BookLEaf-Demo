import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  processTicketAI,
  classifyAndPrioritize,
  generateDraftResponse,
  setOpenAIClient,
  unifiedTicketAISchema,
} from '../src/ai/aiService.js';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../src/models/Ticket.js';

describe('AI Integration Unit & Fallback Test Suite', () => {
  afterEach(() => {
    // Reset mock client override
    setOpenAIClient(undefined);
    vi.restoreAllMocks();
  });

  describe('1. Successful AI Analysis (Mocked Valid Response)', () => {
    it('should successfully parse, validate, and return structured AI data', async () => {
      const mockCompletion = {
        model: 'gpt-4o-mini',
        usage: { total_tokens: 312 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'Royalty & Payments',
                priority: 'Critical',
                confidence: 0.95,
                reasoning: 'Author reports ₹3,570 in pending royalties overdue past the 45-day quarterly window.',
                suggestedResponse:
                  'Dear Priya Sharma,\n\nThank you for reaching out regarding your pending royalty for "Whispers of the Ganges". We deeply apologize for the delay in your payout of ₹3,570. Per BookLeaf policy, our accounts team will verify your linked bank details and initiate an expedited transfer within 48 hours.\n\nWarm regards,\nBookLeaf Operations',
              }),
            },
          },
        ],
      };

      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      };

      setOpenAIClient(mockClient);

      const result = await processTicketAI({
        subject: 'Overdue quarterly royalty payout',
        description: 'It has been 60 days since Q2 ended and my ₹3,570 has not arrived in my account.',
        bookContext: {
          title: 'Whispers of the Ganges',
          isbn: '978-93-5XXXX-01-1',
          status: 'Published & Live',
          royalty_pending: 3570,
        },
        authorContext: {
          name: 'Priya Sharma',
          author_id: 'AUTH001',
          city: 'Mumbai',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.category).toBe('Royalty & Payments');
      expect(result.data.priority).toBe('Critical');
      expect(result.data.confidence).toBe(0.95);
      expect(result.data.reasoning).toContain('₹3,570');
      expect(result.data.suggestedResponse).toContain('Dear Priya Sharma');
      expect(result.data.model).toBe('gpt-4o-mini');
      expect(result.data.tokens).toBe(312);

      // Verify validation against Zod schema
      const zodCheck = unifiedTicketAISchema.safeParse(result.data);
      expect(zodCheck.success).toBe(true);
    });

    it('should support classifyAndPrioritize delegation seamlessly', async () => {
      const mockCompletion = {
        model: 'gpt-4o-mini',
        usage: { total_tokens: 280 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'ISBN & Metadata Issues',
                priority: 'High',
                confidence: 0.98,
                reasoning: 'Barcode mismatch reported on Amazon listing; must be treated as High priority per BookLeaf policy.',
                suggestedResponse:
                  'Dear Author,\n\nWe apologize for the ISBN discrepancy. Our production desk has escalated this with Amazon for immediate correction within 48 hours.',
              }),
            },
          },
        ],
      };

      setOpenAIClient({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      });

      const result = await classifyAndPrioritize({
        subject: 'Wrong ISBN on Amazon',
        description: 'The ISBN on Amazon points to another book.',
      });

      expect(result.success).toBe(true);
      expect(result.data.category).toBe('ISBN & Metadata Issues');
      expect(result.data.priority).toBe('High');
      expect(result.data.suggestedResponse).toBeDefined();
    });
  });

  describe('2. Invalid AI Output & Schema Handling', () => {
    it('should handle malformed non-JSON output from LLM gracefully', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'Sorry, I cannot answer this inquiry right now.' } }],
            }),
          },
        },
      };

      setOpenAIClient(mockClient);

      const result = await processTicketAI({
        subject: 'Book quality issue',
        description: 'Pages are upside down',
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('not valid JSON');
    });

    it('should reject invalid categories violating Zod schema', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      category: 'Unrecognized Random Category',
                      priority: 'High',
                      confidence: 0.9,
                      reasoning: 'Valid reasoning format',
                      suggestedResponse: 'Valid suggested response',
                    }),
                  },
                },
              ],
            }),
          },
        },
      };

      setOpenAIClient(mockClient);

      const result = await processTicketAI({
        subject: 'Random topic',
        description: 'Random description',
      });

      expect(result.success).toBe(false);
      // Zod validation throws error on invalid enum value
      expect(result.reason).toBeDefined();
    });

    it('should reject missing fields like missing suggestedResponse', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      category: 'General Inquiry',
                      priority: 'Low',
                      confidence: 0.8,
                      reasoning: 'General question without response',
                    }),
                  },
                },
              ],
            }),
          },
        },
      };

      setOpenAIClient(mockClient);

      const result = await processTicketAI({
        subject: 'General question',
        description: 'How do I change my profile photo?',
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('3. Missing API Key Handling', () => {
    it('should gracefully degrade when OpenAI client is null without throwing unhandled exceptions', async () => {
      setOpenAIClient(null);

      const result = await processTicketAI({
        subject: 'Query without API key',
        description: 'Testing missing API key behavior',
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('OPENAI_API_KEY');
    });

    it('should return helpful guidance for generateDraftResponse when key is missing', async () => {
      setOpenAIClient(null);

      const result = await generateDraftResponse({
        ticketId: 'fake-id',
        lastMessageId: 'msg-1',
        subject: 'Draft request without key',
        description: 'Testing draft fallback',
        category: 'General Inquiry',
        priority: 'Low',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('OPENAI_API_KEY is not configured');
    });
  });

  describe('4. API Errors (429 Rate Limits, 500 Errors, Timeouts)', () => {
    it('should catch 429 quota exhaustion errors cleanly and sanitize messages', async () => {
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
        subject: 'Rate limited inquiry',
        description: 'Testing quota error',
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('429');
    });

    it('should catch 500 Internal Server errors from OpenAI and return safe error envelope', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('500 The server had an error while processing your request')),
          },
        },
      };

      setOpenAIClient(mockClient);

      const result = await processTicketAI({
        subject: 'Server error inquiry',
        description: 'Testing 500 error',
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('500');
    });

    it('should sanitize any accidental API key patterns in error messages', async () => {
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(
              new Error('Invalid request with key sk-proj-1234567890abcdefghijklmnop')
            ),
          },
        },
      };

      setOpenAIClient(mockClient);

      const result = await processTicketAI({
        subject: 'Sensitive error inquiry',
        description: 'Testing redaction',
      });

      expect(result.success).toBe(false);
      expect(result.reason).not.toContain('sk-proj-1234567890abcdefghijklmnop');
      expect(result.reason).toContain('[REDACTED_API_KEY]');
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
