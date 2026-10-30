import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Author } from '../models/Author.js';
import { Book } from '../models/Book.js';
import { User } from '../models/User.js';
import { Ticket } from '../models/Ticket.js';
import { Message } from '../models/Message.js';
import { InternalNote } from '../models/InternalNote.js';
import { Counter } from '../models/Counter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeed() {
  console.log('\n======================================================');
  console.log('🌱 Starting BookLeaf Database Seeding (Idempotent)...');
  console.log('======================================================\n');

  await connectDB();

  try {
    // 1. Locate sample data file
    const sampleDataPath = path.resolve(__dirname, '../../../docs/assets/BookLeaf Sample Data.json');
    if (!fs.existsSync(sampleDataPath)) {
      throw new Error(`Sample data file not found at: ${sampleDataPath}`);
    }

    const rawData = fs.readFileSync(sampleDataPath, 'utf-8');
    const parsedData = JSON.parse(rawData);
    const { authors } = parsedData;

    console.log(`[Seed] Found ${authors.length} authors in sample data.`);

    // 2. Clear existing collections to ensure idempotent fresh state
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      Author.deleteMany({}),
      Book.deleteMany({}),
      User.deleteMany({}),
      Ticket.deleteMany({}),
      Message.deleteMany({}),
      InternalNote.deleteMany({}),
      Counter.deleteMany({}),
    ]);

    // Initialize ticket counter
    await Counter.create({ _id: 'ticketNumber', seq: 0 });

    // 3. Insert Authors and Books verbatim
    let totalBooksCount = 0;
    const authorDocMap = new Map();

    for (const authorData of authors) {
      const authorDoc = await Author.create({
        author_id: authorData.author_id,
        name: authorData.name,
        email: authorData.email.toLowerCase(),
        phone: authorData.phone,
        city: authorData.city,
        joined_date: new Date(authorData.joined_date),
        books: [],
      });

      authorDocMap.set(authorData.author_id, authorDoc);

      const bookIds = [];
      for (const bookData of authorData.books) {
        const bookDoc = await Book.create({
          book_id: bookData.book_id,
          authorId: authorDoc._id,
          author_id: authorData.author_id,
          title: bookData.title,
          isbn: bookData.isbn ?? null,
          genre: bookData.genre,
          publication_date: bookData.publication_date ? new Date(bookData.publication_date) : null,
          status: bookData.status,
          mrp: bookData.mrp ?? null,
          author_royalty_per_copy: bookData.author_royalty_per_copy ?? null,
          total_copies_sold: bookData.total_copies_sold ?? 0,
          total_royalty_earned: bookData.total_royalty_earned ?? 0,
          royalty_paid: bookData.royalty_paid ?? 0,
          royalty_pending: bookData.royalty_pending ?? 0,
          last_royalty_payout_date: bookData.last_royalty_payout_date ? new Date(bookData.last_royalty_payout_date) : null,
          print_partner: bookData.print_partner ?? null,
          available_on: bookData.available_on ?? [],
        });

        bookIds.push(bookDoc._id);
        totalBooksCount++;
      }

      authorDoc.books = bookIds;
      await authorDoc.save();
    }

    console.log(`[Seed] Successfully imported ${authors.length} authors and ${totalBooksCount} books.`);

    // 4. Create Demo Admin User
    const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
    const adminUser = await User.create({
      name: 'BookLeaf Ops Admin',
      email: 'admin@bookleaf.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
    });

    // 5. Create Author Users for all authors in sample data
    const authorPasswordHash = await bcrypt.hash('Author@12345', 10);
    const createdAuthorUsers = [];

    for (const authorData of authors) {
      const authorDoc = authorDocMap.get(authorData.author_id);
      const authorUser = await User.create({
        name: authorData.name,
        email: authorData.email.toLowerCase(),
        passwordHash: authorPasswordHash,
        role: 'author',
        authorId: authorDoc._id,
        author_id: authorData.author_id,
        isActive: true,
      });
      createdAuthorUsers.push(authorUser);
    }

    console.log(`[Seed] Successfully created 1 Admin and ${createdAuthorUsers.length} Author user accounts.\n`);

    // 6. Print Credentials Table
    console.log('========================================================================================');
    console.log('                          DEMO CREDENTIALS TABLE                                        ');
    console.log('========================================================================================');
    console.log('| Role   | Name                 | Email                    | Password     | Details     |');
    console.log('|--------|----------------------|--------------------------|--------------|-------------|');
    console.log(`| ADMIN  | ${adminUser.name.padEnd(20)} | ${adminUser.email.padEnd(24)} | Admin@12345  | Full Access |`);
    for (const au of createdAuthorUsers.slice(0, 4)) {
      const authorData = authors.find((a) => a.author_id === au.author_id);
      const detail = `${authorData.books.length} book(s) - ${authorData.city}`;
      console.log(`| AUTHOR | ${au.name.padEnd(20)} | ${au.email.padEnd(24)} | Author@12345 | ${detail.padEnd(11)} |`);
    }
    console.log('| ...    | (All 10 Authors can log in with their email and password: Author@12345)     |');
    console.log('========================================================================================\n');

  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed();
}
