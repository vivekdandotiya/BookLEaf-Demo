import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['author', 'admin', 'system'],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        name: { type: String },
        size: { type: Number },
        type: { type: String },
        url: { type: String },
      },
    ],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

messageSchema.index({ ticketId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
