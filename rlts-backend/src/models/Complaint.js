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

const TIMELINE_STATUSES = [
  ...STATUSES,
  'PICKUP_SCHEDULED',
  'SCHEDULE_UPDATED',
  'RESCHEDULE_REQUESTED',
  'PICKUP_PROPOSED',
  'PICKUP_CONFIRMED'
];

const PRODUCT_TYPES = ['tire', 'glass', 'motor_part', 'battery', 'other'];
const RETURN_REASONS = ['defective', 'wrong_item', 'damaged', 'expired', 'other'];

const timelineEntrySchema = new mongoose.Schema({
  status: { type: String, enum: TIMELINE_STATUSES, required: true },
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
  dealerEntity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: [true, 'Dealer entity is required'],
    index: true,
  },
  cfaEntity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CFA',
    index: true,
  },
  productType: {
    type: String,
    enum: PRODUCT_TYPES,
    default: 'tire',
  },
  productName: {
    type: String,
    trim: true,
    maxlength: 200,
    default: 'Unknown',
  },
  quantity: {
    type: Number,
    min: 1,
    default: 1,
  },
  reason: {
    type: String,
    enum: RETURN_REASONS,
    default: 'other',
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  images: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: STATUSES,
    default: 'CREATED',
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
  proposedPickupDate: {
    type: Date,
  },
  pickupProposedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  pickupScheduleStatus: {
    type: String,
    enum: ['NOT_SCHEDULED', 'PROPOSED', 'CONFIRMED'],
    default: 'NOT_SCHEDULED',
  },
  adminNotes: {
    type: String,
    trim: true,
  },
  rescheduleRequests: [{
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['dealer', 'cfa'] },
    requestedAt: { type: Date, default: Date.now },
    proposedDate: { type: Date },
    reason: { type: String, trim: true },
  }],
  timeline: [timelineEntrySchema],
  qrCode: {
    type: String,
  },
  customData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // MIS Import Tracking
  misCreatedAt: {
    type: Date,
  },
  misAdjustedAt: {
    type: Date,
  },
  misImportedAt: {
    type: Date,
  },
  misImportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  source: {
    type: String,
    enum: ['manual', 'mis_import'],
    default: 'manual',
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ dealerEntity: 1, status: 1 });
complaintSchema.index({ cfaEntity: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ source: 1 });

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

// Terminal (closed) statuses
complaintSchema.statics.CLOSED_STATUSES = [
  'REJECTED', 'REFUND_PROCESSED'
];

module.exports = mongoose.model('Complaint', complaintSchema);
module.exports.STATUSES = STATUSES;
module.exports.PRODUCT_TYPES = PRODUCT_TYPES;
module.exports.RETURN_REASONS = RETURN_REASONS;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
