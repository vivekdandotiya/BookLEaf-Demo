import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Author } from '../models/Author.js';
import { Book } from '../models/Book.js';
import { Ticket } from '../models/Ticket.js';
import { getNextTicketNumber } from '../models/Counter.js';
import { classifyAndPrioritize } from '../ai/aiService.js';
import { ENV } from '../config/env.js';

async function main() {
  console.log('Connecting to database...');
  let connected = false;
  try {
    await mongoose.connect(ENV.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to Atlas.');
    connected = true;
  } catch (err) {
    console.log('Atlas connection failed (IP whitelist/timeout). Trying local MongoDB fallback...');
    await mongoose.connect('mongodb://127.0.0.1:27017/bookleaf_db', { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to local MongoDB.');
    connected = true;
  }

  // Find 3 distinct authors and books
  const priya = await Author.findOne({ author_id: 'AUTH001' });
  const priyaBook = await Book.findOne({ book_id: 'BK001' });

  const rohit = await Author.findOne({ author_id: 'AUTH002' });
  const rohitBook = await Book.findOne({ book_id: 'BK004' });

  const sneha = await Author.findOne({ author_id: 'AUTH004' });
  const snehaBook = await Book.findOne({ book_id: 'BK007' });

  const sampleTickets = [
    {
      author: priya,
      book: priyaBook,
      subject: 'Pending Q2 royalty transfer inquiry',
      description:
        'My dashboard shows ₹3,570 in pending royalties for Whispers of the Ganges. When will this be deposited into my bank account?',
      expectedCategory: 'Royalty & Payments',
    },
    {
      author: rohit,
      book: rohitBook,
      subject: 'Wrong ISBN displayed on Amazon India listing',
      description:
        'My book listing on Amazon India is displaying the wrong ISBN 978-93-5XXXX-04-2 which belongs to another edition instead of the physical copy ISBN. Please fix this urgently.',
      expectedCategory: 'ISBN & Metadata Issues',
    },
    {
      author: sneha,
      book: snehaBook,
      subject: 'Defective author copies received with blurry text',
      description:
        'I received my batch of 10 author copies today. The cover finish is fine, but chapters 3 and 4 have blurry text and misaligned page margins. How can I get replacement copies reprinted?',
      expectedCategory: 'Printing & Quality',
    },
  ];

  console.log('\n--- Creating & Processing 3 Realistic Tickets ---');

  for (let i = 0; i < sampleTickets.length; i++) {
    const s = sampleTickets[i];
    console.log(`\n[Ticket #${i + 1}] Author: ${s.author.name} | Book: ${s.book.title}`);
    console.log(`Subject: "${s.subject}"`);

    const ticketNumber = await getNextTicketNumber();

    // 1. Save ticket
    const ticket = await Ticket.create({
      ticketNumber,
      authorId: s.author._id,
      author_id: s.author.author_id,
      bookId: s.book._id,
      subject: s.subject,
      description: s.description,
      status: 'Open',
      classificationSource: 'pending',
      aiStatus: 'pending',
    });

    console.log(`Created ticket document ${ticket.ticketNumber} (ID: ${ticket._id})`);

    // 2. Invoke real AI service
    console.log('Sending real request to AI service with model:', ENV.OPENAI_MODEL);
    const aiResult = await classifyAndPrioritize({
      subject: s.subject,
      description: s.description,
      bookContext: s.book,
      authorContext: s.author,
    });

    if (aiResult.success) {
      console.log('✅ Real OpenAI request succeeded!');
      ticket.category = aiResult.data.category;
      ticket.priority = aiResult.data.priority;
      ticket.classificationSource = 'ai';
      ticket.aiStatus = 'success';
      ticket.suggestedResponse = aiResult.data.suggestedResponse;
      ticket.aiMeta = {
        confidence: aiResult.data.confidence,
        reasoning: aiResult.data.reasoning,
        suggestedResponse: aiResult.data.suggestedResponse,
        model: aiResult.data.model,
        tokens: aiResult.data.tokens,
        timestamp: new Date(),
      };
      console.log('Classified as:', ticket.category, '| Priority:', ticket.priority);
      console.log('Reasoning:', ticket.aiMeta.reasoning);
      console.log('Suggested Response Preview:', ticket.suggestedResponse.slice(0, 100) + '...');
    } else {
      console.log('⚠️ Real OpenAI request returned failure/error:');
      console.log('Error reason:', aiResult.reason);
      ticket.aiStatus = 'failed';
      ticket.classificationSource = 'pending';
      ticket.aiMeta = {
        confidence: 0,
        reasoning: aiResult.reason,
        timestamp: new Date(),
      };
      console.log('Ticket gracefully transitioned to manual admin triage mode.');
    }

    await ticket.save();
  }

  // Count tickets in DB
  const count = await Ticket.countDocuments({});
  console.log(`\nTotal tickets in database: ${count}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

main().catch((err) => {
  console.error('Fatal test script error:', err);
  process.exit(1);
});
