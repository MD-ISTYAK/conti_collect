const mongoose = require('mongoose');

const dealerSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Dealer code (AG) is required'],
    unique: true,
    trim: true,
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

dealerSchema.index({ isActive: 1 });
dealerSchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.model('Dealer', dealerSchema);
