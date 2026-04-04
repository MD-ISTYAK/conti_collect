const mongoose = require('mongoose');

const cfaRegionSchema = new mongoose.Schema({
  cfaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  regionName: {
    type: String,
    required: [true, 'Region name is required'],
    trim: true,
  },
  states: {
    type: [String],
    required: [true, 'At least one state is required'],
    validate: {
      validator: function (v) { return v.length >= 1; },
      message: 'At least one state is required',
    },
  },
  cities: {
    type: [String],
    default: [],
  },
  pincodes: {
    type: [String],
    default: [],
    validate: {
      validator: function (v) {
        return v.every(p => /^\d{6}$/.test(p));
      },
      message: 'All pincodes must be 6 digits',
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

cfaRegionSchema.index({ states: 1 });
cfaRegionSchema.index({ cities: 1 });
cfaRegionSchema.index({ pincodes: 1 });

module.exports = mongoose.model('CFARegion', cfaRegionSchema);
