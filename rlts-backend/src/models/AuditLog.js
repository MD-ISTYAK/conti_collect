const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['Complaint', 'User', 'PickupProof'],
  },
  before: {
    type: mongoose.Schema.Types.Mixed,
  },
  after: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
}, {
  timestamps: true,
});

// Audit logs are immutable - no update or delete
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, targetModel: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
