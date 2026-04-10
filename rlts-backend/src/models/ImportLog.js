const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema({
  importedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  importedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  fileName: {
    type: String,
    trim: true,
  },
  totalRows: {
    type: Number,
    default: 0,
  },
  adjustedRows: {
    type: Number,
    default: 0,
  },
  skippedRows: {
    type: Number,
    default: 0,
  },
  importedCount: {
    type: Number,
    default: 0,
  },
  updatedCount: {
    type: Number,
    default: 0,
  },
  duplicateCount: {
    type: Number,
    default: 0,
  },
  errorCount: {
    type: Number,
    default: 0,
  },
  errorDetails: [{
    row: Number,
    id: String,
    message: String,
  }],
  importedComplaintIds: [String],
  updatedComplaintIds: [String],
}, {
  timestamps: true,
});

importLogSchema.index({ importedBy: 1, createdAt: -1 });
importLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ImportLog', importLogSchema);
