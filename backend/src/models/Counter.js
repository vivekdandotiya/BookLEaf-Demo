import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);

export async function getNextTicketNumber() {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'ticketNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `BL-${String(counter.seq).padStart(4, '0')}`;
}
