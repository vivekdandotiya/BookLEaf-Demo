import { classifyAndPrioritize } from './aiService.js';
import { ENV } from '../config/env.js';

const EVAL_TEST_CASES = [
  {
    id: 1,
    subject: 'Missing royalty payment',
    description: "I published my book 4 months ago and still haven't received any royalty. What's going on?",
    expectedCategory: 'Royalty & Payments',
    expectedPriority: 'Critical', // or High
  },
  {
    id: 2,
    subject: 'Royalty amount discrepancy',
    description: 'My royalty amount seems too low. I sold 200 copies but only received ₹3,000.',
    expectedCategory: 'Royalty & Payments',
    expectedPriority: 'Medium',
  },
  {
    id: 3,
    subject: 'Wrong ISBN on Amazon listing',
    description: "My book is showing a different ISBN on Amazon than what's on the physical copy.",
    expectedCategory: 'ISBN & Metadata Issues',
    expectedPriority: 'High', // High priority per BookLeaf policy
  },
  {
    id: 4,
    subject: 'Defective author copies received',
    description: 'I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.',
    expectedCategory: 'Printing & Quality',
    expectedPriority: 'High',
  },
  {
    id: 5,
    subject: 'Unavailable status on Amazon',
    description: "My book is published but it's showing as 'Currently Unavailable' on Amazon.",
    expectedCategory: 'Distribution & Availability',
    expectedPriority: 'High',
  },
  {
    id: 6,
    subject: 'Typesetting delay status update',
    description: "It's been 3 weeks and my book is still in typesetting. When will it be done?",
    expectedCategory: 'Book Status & Production Updates',
    expectedPriority: 'Medium',
  },
  {
    id: 7,
    subject: 'Updating description online',
    description: "Can I update the description of my book on Amazon after it's already live?",
    expectedCategory: 'General Inquiry',
    expectedPriority: 'Low',
  },
];

async function runEvaluation() {
  console.log('\n===============================================================');
  console.log('🤖 BookLeaf AI Auto-Classification & Priority Benchmark Eval');
  console.log('===============================================================\n');

  if (!ENV.OPENAI_API_KEY || ENV.OPENAI_API_KEY.trim() === '') {
    console.log('⚠️ [SKIPPED] OPENAI_API_KEY is not configured in backend/.env.');
    console.log('Per project instructions, live model evaluations are not faked.');
    console.log('To run this evaluation against gpt-4o-mini, provide a valid OPENAI_API_KEY.\n');
    console.log('Sample test cases registered for evaluation:');
    EVAL_TEST_CASES.forEach((tc) => {
      console.log(`- Case #${tc.id}: "${tc.subject}" -> Expected: [${tc.expectedCategory}] (${tc.expectedPriority})`);
    });
    console.log('\n===============================================================\n');
    process.exit(0);
  }

  console.log(`Model: ${ENV.OPENAI_MODEL}`);
  console.log(`Running ${EVAL_TEST_CASES.length} sample benchmark cases...\n`);

  let matchedCategories = 0;

  for (const tc of EVAL_TEST_CASES) {
    console.log(`--- Test Case #${tc.id} ---`);
    console.log(`Query: "${tc.description}"`);
    console.log(`Expected: Category='${tc.expectedCategory}', Priority='${tc.expectedPriority}'`);

    const result = await classifyAndPrioritize({
      subject: tc.subject,
      description: tc.description,
      bookContext: { title: 'Benchmark Book', status: 'Published & Live' },
      authorContext: { name: 'Test Author', city: 'Delhi' },
    });

    if (result.success) {
      const actualCat = result.data.category;
      const actualPri = result.data.priority;
      const catMatch = actualCat === tc.expectedCategory;
      if (catMatch) matchedCategories++;

      console.log(`Actual:   Category='${actualCat}', Priority='${actualPri}', Confidence=${(result.data.confidence * 100).toFixed(0)}%`);
      console.log(`Reasoning: ${result.data.reasoning}`);
      console.log(`Result:   ${catMatch ? '✅ MATCH' : '❌ MISMATCH'}\n`);
    } else {
      console.log(`❌ AI Execution Failed: ${result.reason}\n`);
    }
  }

  const accuracy = ((matchedCategories / EVAL_TEST_CASES.length) * 100).toFixed(1);
  console.log('===============================================================');
  console.log(`🎯 Overall Category Accuracy: ${matchedCategories}/${EVAL_TEST_CASES.length} (${accuracy}%)`);
  console.log('===============================================================\n');
}

runEvaluation();
