import mongoose from 'mongoose';

export const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

export const TICKET_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: true,
      index: true,
    },
    author_id: {
      type: String,
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        name: { type: String, required: true },
        size: { type: Number, required: true },
        type: { type: String, required: true },
        url: { type: String, default: '' },
      },
    ],
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      default: 'General Inquiry',
      index: true,
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: 'Open',
      index: true,
    },
    classificationSource: {
      type: String,
      enum: ['ai', 'manual', 'pending'],
      default: 'pending',
    },
    aiStatus: {
      type: String,
      enum: ['pending', 'success', 'failed', 'skipped'],
      default: 'pending',
    },
    suggestedResponse: {
      type: String,
      default: null,
    },
    aiMeta: {
      confidence: { type: Number, min: 0, max: 1, default: null },
      reasoning: { type: String, default: null },
      suggestedResponse: { type: String, default: null },
      model: { type: String, default: null },
      tokens: { type: Number, default: null },
      timestamp: { type: Date, default: null },
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    firstAdminResponseAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ticketSchema.index({ authorId: 1, createdAt: -1 });
ticketSchema.index({ status: 1, priority: 1, category: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ subject: 'text', description: 'text' });

export const Ticket = mongoose.model('Ticket', ticketSchema);
