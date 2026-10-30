import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Author } from '../src/models/Author.js';
import { Book } from '../src/models/Book.js';
import { Ticket } from '../src/models/Ticket.js';
import { Counter } from '../src/models/Counter.js';
import { InternalNote } from '../src/models/InternalNote.js';

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/bookleaf_test_db';
let app;
let adminToken;
let author1Token;
let author2Token;
let author1Doc;
let author2Doc;
let book1Doc;
let book2Doc;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  app = createApp();

  // Clean test DB
  await Promise.all([
    User.deleteMany({}),
    Author.deleteMany({}),
    Book.deleteMany({}),
    Ticket.deleteMany({}),
    InternalNote.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  await Counter.create({ _id: 'ticketNumber', seq: 0 });

  // Create Author 1 (Priya Sharma)
  author1Doc = await Author.create({
    author_id: 'AUTH001',
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '+91-98765-43210',
    city: 'Mumbai',
    joined_date: new Date('2023-03-15'),
  });

  book1Doc = await Book.create({
    book_id: 'BK001',
    authorId: author1Doc._id,
    author_id: 'AUTH001',
    title: 'Whispers of the Ganges',
    isbn: '978-93-5XXXX-01-1',
    genre: 'Literary Fiction',
    status: 'Published & Live',
    mrp: 399,
    author_royalty_per_copy: 35,
    total_copies_sold: 342,
    total_royalty_earned: 11970,
    royalty_paid: 8400,
    royalty_pending: 3570,
  });

  author1Doc.books = [book1Doc._id];
  await author1Doc.save();

  // Create Author 2 (Ananya Reddy)
  author2Doc = await Author.create({
    author_id: 'AUTH003',
    name: 'Ananya Reddy',
    email: 'ananya.reddy@email.com',
    city: 'Hyderabad',
    joined_date: new Date('2024-02-20'),
  });

  book2Doc = await Book.create({
    book_id: 'BK005',
    authorId: author2Doc._id,
    author_id: 'AUTH003',
    title: 'Between Two Temples',
    isbn: '978-93-5XXXX-05-9',
    genre: 'Historical Fiction',
    status: 'Published & Live',
    mrp: 425,
    author_royalty_per_copy: 38,
    total_copies_sold: 67,
    total_royalty_earned: 2546,
    royalty_paid: 0,
    royalty_pending: 2546,
  });

  author2Doc.books = [book2Doc._id];
  await author2Doc.save();

  // Create Admin User
  const adminHash = await bcrypt.hash('Admin@12345', 10);
  await User.create({
    name: 'Operations Admin',
    email: 'admin@bookleaf.com',
    passwordHash: adminHash,
    role: 'admin',
    isActive: true,
  });

  // Create Author 1 User
  const authorHash = await bcrypt.hash('Author@12345', 10);
  await User.create({
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    passwordHash: authorHash,
    role: 'author',
    authorId: author1Doc._id,
    author_id: 'AUTH001',
    isActive: true,
  });

  // Create Author 2 User
  await User.create({
    name: 'Ananya Reddy',
    email: 'ananya.reddy@email.com',
    passwordHash: authorHash,
    role: 'author',
    authorId: author2Doc._id,
    author_id: 'AUTH003',
    isActive: true,
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('1. Health Check Endpoint', () => {
  it('GET /api/v1/health should return status healthy and DB connected', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database.status).toBe('connected');
  });
});

describe('2. Authentication & RBAC', () => {
  it('should authenticate Admin user and return token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@bookleaf.com', password: 'Admin@12345' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
    adminToken = res.body.data.token;
  });

  it('should authenticate Author user (Priya) and return token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'priya.sharma@email.com', password: 'Author@12345' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('author');
    expect(res.body.data.user.authorId).toBe(author1Doc._id.toString());
    author1Token = res.body.data.token;
  });

  it('should authenticate Author user (Ananya) and return token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ananya.reddy@email.com', password: 'Author@12345' });

    expect(res.status).toBe(200);
    author2Token = res.body.data.token;
  });

  it('should reject invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'priya.sharma@email.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject unauthenticated request to protected route with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject Author attempting to access Admin dashboard with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${author1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('3. Author Data Isolation & Ownership', () => {
  it('Priya Sharma should see only her own books', async () => {
    const res = await request(app)
      .get('/api/v1/authors/me/books')
      .set('Authorization', `Bearer ${author1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.books.length).toBe(1);
    expect(res.body.data.books[0].title).toBe('Whispers of the Ganges');
  });

  it('Priya Sharma attempting to fetch Ananya’s book by ID should return 404 (not leak)', async () => {
    const res = await request(app)
      .get(`/api/v1/authors/me/books/${book2Doc._id}`)
      .set('Authorization', `Bearer ${author1Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BOOK_NOT_FOUND');
  });

  it('Author dashboard computes accurate financial totals', async () => {
    const res = await request(app)
      .get('/api/v1/authors/me/dashboard')
      .set('Authorization', `Bearer ${author1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.financials.totalRoyaltyEarned).toBe(11970);
    expect(res.body.data.financials.totalRoyaltyPaid).toBe(8400);
    expect(res.body.data.financials.totalRoyaltyPending).toBe(3570);
  });
});

describe('4. Ticket Lifecycle & Management', () => {
  let createdTicketId;

  it('Author creates ticket successfully and receives 201', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${author1Token}`)
      .send({
        bookId: book1Doc._id.toString(),
        subject: 'Quarterly Royalty Payout Inquiry',
        description: 'I would like to confirm when the remaining pending royalty of ₹3,570 will be transferred.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticket.ticketNumber).toBe('BL-0001');
    expect(res.body.data.ticket.status).toBe('Open');
    createdTicketId = res.body.data.ticket._id;
  });

  it('Author 2 (Ananya) should NOT be able to view Author 1’s ticket (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${createdTicketId}`)
      .set('Authorization', `Bearer ${author2Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TICKET_NOT_FOUND');
  });

  it('Admin should be able to view any ticket and see both messages and internal notes', async () => {
    // Admin adds internal note
    const noteRes = await request(app)
      .post(`/api/v1/admin/tickets/${createdTicketId}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Checked bank IFSC code with finance team; payment is scheduled for next batch.' });

    expect(noteRes.status).toBe(201);

    // Admin views ticket
    const viewRes = await request(app)
      .get(`/api/v1/admin/tickets/${createdTicketId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(viewRes.status).toBe(200);
    expect(viewRes.body.data.internalNotes.length).toBe(1);
    expect(viewRes.body.data.internalNotes[0].body).toContain('IFSC code');
  });

  it('Author viewing their own ticket should NEVER see internal notes', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${createdTicketId}`)
      .set('Authorization', `Bearer ${author1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.internalNotes).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('IFSC code');
  });

  it('Admin overrides priority and category (marked as manual)', async () => {
    const catRes = await request(app)
      .patch(`/api/v1/admin/tickets/${createdTicketId}/category`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: 'Royalty & Payments' });

    expect(catRes.status).toBe(200);
    expect(catRes.body.data.ticket.category).toBe('Royalty & Payments');
    expect(catRes.body.data.ticket.classificationSource).toBe('manual');

    const priRes = await request(app)
      .patch(`/api/v1/admin/tickets/${createdTicketId}/priority`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priority: 'High' });

    expect(priRes.status).toBe(200);
    expect(priRes.body.data.ticket.priority).toBe('High');
  });

  it('Admin responds publicly and marks status as Resolved', async () => {
    const msgRes = await request(app)
      .post(`/api/v1/admin/tickets/${createdTicketId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Hello Priya, your pending royalty will be credited within 48 hours.' });

    expect(msgRes.status).toBe(201);

    const statusRes = await request(app)
      .patch(`/api/v1/admin/tickets/${createdTicketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Resolved' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.ticket.status).toBe('Resolved');
  });

  it('Author replying to a Resolved ticket automatically reopens it to In Progress', async () => {
    const replyRes = await request(app)
      .post(`/api/v1/tickets/${createdTicketId}/messages`)
      .set('Authorization', `Bearer ${author1Token}`)
      .send({ body: 'Thank you! I will verify once received.' });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.data.ticketStatus).toBe('In Progress');

    const checkRes = await request(app)
      .get(`/api/v1/tickets/${createdTicketId}`)
      .set('Authorization', `Bearer ${author1Token}`);

    expect(checkRes.body.data.ticket.status).toBe('In Progress');
  });
});

describe('5. Input Validation & Error Envelopes', () => {
  it('should return 400 with validation details when subject is too short', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${author1Token}`)
      .send({ subject: 'Hi', description: 'Description is long enough' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details[0].field).toBe('subject');
  });
});
