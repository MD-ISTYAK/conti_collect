const mongoose = require('mongoose');

const STATUSES = [
  'CREATED',
  'APPROVED',
  'REJECTED',
  'CFA_ASSIGNED',
  'PICKED_UP',
  'RECEIVED_AT_CFA',
  'VERIFIED',
  'REFUND_PROCESSED',
];

const PRODUCT_TYPES = ['tire', 'glass', 'motor_part', 'battery', 'other'];
const RETURN_REASONS = ['defective', 'wrong_item', 'damaged', 'expired', 'other'];

const timelineEntrySchema = new mongoose.Schema({
  status: { type: String, enum: STATUSES, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, trim: true },
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Dealer ID is required'],
    index: true,
  },
  productType: {
    type: String,
    required: [true, 'Product type is required'],
    enum: PRODUCT_TYPES,
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: 200,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be an integer',
    },
  },
  reason: {
    type: String,
    required: [true, 'Return reason is required'],
    enum: RETURN_REASONS,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  images: {
    type: [String],
    validate: {
      validator: function (v) {
        return v.length >= 1 && v.length <= 5;
      },
      message: 'Between 1 and 5 images are required',
    },
  },
  status: {
    type: String,
    enum: STATUSES,
    default: 'CREATED',
    index: true,
  },
  cfaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
  estimatedPickupDate: {
    type: Date,
  },
  actualPickupDate: {
    type: Date,
  },
  receivedAtCFADate: {
    type: Date,
  },
  verifiedDate: {
    type: Date,
  },
  refundAmount: {
    type: Number,
    min: 0,
  },
  refundDate: {
    type: Date,
  },
  refundReference: {
    type: String,
    trim: true,
  },
  adminNotes: {
    type: String,
    trim: true,
  },
  timeline: [timelineEntrySchema],
  qrCode: {
    type: String,
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ dealerId: 1, status: 1 });
complaintSchema.index({ cfaId: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });

// Valid status transitions
const VALID_TRANSITIONS = {
  CREATED: ['APPROVED', 'REJECTED'],
  APPROVED: ['CFA_ASSIGNED'],
  CFA_ASSIGNED: ['PICKED_UP'],
  PICKED_UP: ['RECEIVED_AT_CFA'],
  RECEIVED_AT_CFA: ['VERIFIED'],
  VERIFIED: ['REFUND_PROCESSED'],
  REJECTED: [],
  REFUND_PROCESSED: [],
};

complaintSchema.methods.canTransitionTo = function (newStatus) {
  return VALID_TRANSITIONS[this.status]?.includes(newStatus) || false;
};

complaintSchema.methods.addTimelineEntry = function (status, userId, note) {
  this.timeline.push({
    status,
    timestamp: new Date(),
    updatedBy: userId,
    note,
  });
};

// Terminal statuses
complaintSchema.methods.isTerminal = function () {
  return ['REJECTED', 'REFUND_PROCESSED'].includes(this.status);
};

// Non-terminal (open) statuses
complaintSchema.statics.OPEN_STATUSES = [
  'CREATED', 'APPROVED', 'CFA_ASSIGNED', 'PICKED_UP', 'RECEIVED_AT_CFA', 'VERIFIED'
];

module.exports = mongoose.model('Complaint', complaintSchema);
module.exports.STATUSES = STATUSES;
module.exports.PRODUCT_TYPES = PRODUCT_TYPES;
module.exports.RETURN_REASONS = RETURN_REASONS;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
