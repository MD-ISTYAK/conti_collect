const mongoose = require('mongoose');

const cfaSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'CFA code (Sales Office) is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  company: {
    type: String,
    trim: true,
  },
  region: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

cfaSchema.index({ isActive: 1 });
cfaSchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.model('CFA', cfaSchema);
