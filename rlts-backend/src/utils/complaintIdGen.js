const mongoose = require('mongoose');

/**
 * Atomic complaint ID generator using MongoDB findOneAndUpdate.
 * Format: CMP-YYYY-XXXX where XXXX is zero-padded sequential per year.
 * Resets to 0001 each January 1st.
 */

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

const generateComplaintId = async () => {
  const year = new Date().getFullYear();
  const counterId = `complaint_${year}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(4, '0');
  return `CMP-${year}-${paddedSeq}`;
};

module.exports = { generateComplaintId, Counter };
