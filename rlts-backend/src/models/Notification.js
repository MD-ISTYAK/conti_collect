const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  body: {
    type: String,
    required: [true, 'Body is required'],
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['complaint', 'pickup', 'refund', 'system'],
  },
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  channel: {
    type: [String],
    enum: ['push', 'email', 'sms', 'in_app'],
    default: ['in_app'],
  },
}, {
  timestamps: true,
});

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
