const Complaint = require('../models/Complaint');
const User = require('../models/User');
const CFA = require('../models/CFA');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { writeAuditLog } = require('../services/auditService');
const { createNotification, notifyMultiple } = require('../services/notificationService');
const { generateQRCode } = require('../services/qrService');
const { emitStatusChange, emitDashboardUpdate } = require('../services/socketService');
const {
  sendComplaintApprovedEmail,
  sendComplaintRejectedEmail,
  sendCfaAssignedEmail,
  sendRefundProcessedEmail,
} = require('../services/emailService');
const logger = require('../utils/logger');

// Helper to get active users for an entity
const getEntityUserEmails = async (entityId, role) => {
  const users = await User.find({ [`${role}Entity`]: entityId, isActive: true });
  return users.map(u => u.email);
};

const getEntityUserIds = async (entityId, role) => {
  const users = await User.find({ [`${role}Entity`]: entityId, isActive: true });
  return users.map(u => u._id);
};

/**
 * POST /api/admin/complaints/:id/approve
 */
const approveComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('dealerEntity');
    if (!complaint) return sendError(res, 404, 'Complaint not found.');

    if (!complaint.canTransitionTo('APPROVED')) {
      return sendError(res, 422, `Cannot approve complaint in ${complaint.status} status.`);
    }

    const before = { status: complaint.status };
    complaint.status = 'APPROVED';
    complaint.addTimelineEntry('APPROVED', req.user._id, req.body.notes || 'Complaint approved by admin');

    // Generate QR code
    const qrUrl = await generateQRCode(complaint.complaintId);
    complaint.qrCode = qrUrl;

    await complaint.save();

    // Notify dealer users
    const dealerEmails = await getEntityUserEmails(complaint.dealerEntity._id, 'dealer');
    const dealerUserIds = await getEntityUserIds(complaint.dealerEntity._id, 'dealer');

    if (dealerEmails.length > 0) {
      sendComplaintApprovedEmail(dealerEmails[0], complaint); // Send to first for now, or adapt emailService to array
    }
    
    dealerUserIds.forEach(userId => {
      createNotification({
        userId,
        title: 'Complaint Approved',
        body: `Your complaint ${complaint.complaintId} has been approved.`,
        type: 'complaint',
        complaintId: complaint._id,
      });
      emitStatusChange(complaint.complaintId, 'APPROVED', userId);
    });

    emitDashboardUpdate();

    writeAuditLog({
      action: 'COMPLAINT_APPROVED',
      performedBy: req.user._id,
      targetId: complaint._id,
      targetModel: 'Complaint',
      before,
      after: { status: 'APPROVED' },
      req,
    });

    sendSuccess(res, 200, 'Complaint approved', complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/complaints/:id/reject
 */
const rejectComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('dealerEntity');
    if (!complaint) return sendError(res, 404, 'Complaint not found.');

    if (!complaint.canTransitionTo('REJECTED')) {
      return sendError(res, 422, `Cannot reject complaint in ${complaint.status} status.`);
    }

    const before = { status: complaint.status };
    complaint.status = 'REJECTED';
    complaint.rejectionReason = req.body.rejectionReason;
    complaint.addTimelineEntry('REJECTED', req.user._id, req.body.rejectionReason);

    await complaint.save();

    const dealerEmails = await getEntityUserEmails(complaint.dealerEntity._id, 'dealer');
    const dealerUserIds = await getEntityUserIds(complaint.dealerEntity._id, 'dealer');

    if (dealerEmails.length > 0) {
      sendComplaintRejectedEmail(dealerEmails[0], complaint);
    }
    
    dealerUserIds.forEach(userId => {
      createNotification({
        userId,
        title: 'Complaint Rejected',
        body: `Your complaint ${complaint.complaintId} has been rejected. Reason: ${req.body.rejectionReason}`,
        type: 'complaint',
        complaintId: complaint._id,
      });
      emitStatusChange(complaint.complaintId, 'REJECTED', userId);
    });

    emitDashboardUpdate();

    writeAuditLog({
      action: 'COMPLAINT_REJECTED',
      performedBy: req.user._id,
      targetId: complaint._id,
      targetModel: 'Complaint',
      before,
      after: { status: 'REJECTED', rejectionReason: req.body.rejectionReason },
      req,
    });

    sendSuccess(res, 200, 'Complaint rejected', complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/complaints/:id/assign-cfa
 */
const assignCFA = async (req, res, next) => {
  try {
    const { cfaId, estimatedPickupDate } = req.body; // cfaId is actually CFA Entity ID now

    const complaint = await Complaint.findById(req.params.id).populate('dealerEntity');
    if (!complaint) return sendError(res, 404, 'Complaint not found.');

    if (!complaint.canTransitionTo('CFA_ASSIGNED')) {
      return sendError(res, 422, `Cannot assign CFA. Complaint status is ${complaint.status}.`);
    }

    const cfa = await CFA.findOne({ _id: cfaId, isActive: true });
    if (!cfa) return sendError(res, 404, 'CFA entity not found or inactive.');

    // Check CFA max 20 active assignments
    const cfaActiveCount = await Complaint.countDocuments({
      cfaEntity: cfa._id,
      status: { $in: Complaint.OPEN_STATUSES },
    });
    // if (cfaActiveCount >= 20) {
    //   return sendError(res, 422, 'CFA agent has reached maximum 20 active assignments.');
    // }

    const before = { status: complaint.status };
    complaint.status = 'CFA_ASSIGNED';
    complaint.cfaEntity = cfa._id;
    complaint.estimatedPickupDate = new Date(estimatedPickupDate);
    complaint.pickupScheduleStatus = 'CONFIRMED';
    complaint.addTimelineEntry('CFA_ASSIGNED', req.user._id, `Assigned to CFA: ${cfa.code}`);

    await complaint.save();

    const dealerEmails = await getEntityUserEmails(complaint.dealerEntity._id, 'dealer');
    const dealerUserIds = await getEntityUserIds(complaint.dealerEntity._id, 'dealer');
    const cfaEmails = await getEntityUserEmails(cfa._id, 'cfa');
    const cfaUserIds = await getEntityUserIds(cfa._id, 'cfa');

    if (dealerEmails.length > 0 && cfaEmails.length > 0) {
      sendCfaAssignedEmail(dealerEmails[0], cfaEmails[0], complaint, cfa.code, estimatedPickupDate);
    }

    dealerUserIds.forEach(userId => {
      createNotification({
        userId,
        title: 'Pickup Scheduled',
        body: `Pickup for ${complaint.complaintId} scheduled for ${new Date(estimatedPickupDate).toLocaleDateString('en-IN')}`,
        type: 'pickup',
        complaintId: complaint._id,
      });
      emitStatusChange(complaint.complaintId, 'CFA_ASSIGNED', userId);
    });

    cfaUserIds.forEach(userId => {
      createNotification({
        userId,
        title: 'New Pickup Assigned',
        body: `Pick up complaint ${complaint.complaintId} - assigned to your CFA`,
        type: 'pickup',
        complaintId: complaint._id,
      });
    });

    emitDashboardUpdate();

    writeAuditLog({
      action: 'CFA_ASSIGNED',
      performedBy: req.user._id,
      targetId: complaint._id,
      targetModel: 'Complaint',
      before,
      after: { status: 'CFA_ASSIGNED', cfaEntity: cfaId, estimatedPickupDate },
      req,
    });

    sendSuccess(res, 200, 'CFA assigned successfully', complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/complaints/:id/verify
 */
const verifyComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('dealerEntity');
    if (!complaint) return sendError(res, 404, 'Complaint not found.');

    if (!complaint.canTransitionTo('VERIFIED')) {
      return sendError(res, 422, `Cannot verify. Complaint status is ${complaint.status}.`);
    }

    const before = { status: complaint.status };
    complaint.status = 'VERIFIED';
    complaint.verifiedDate = new Date();
    if (req.body.adminNotes) complaint.adminNotes = req.body.adminNotes;
    complaint.addTimelineEntry('VERIFIED', req.user._id, req.body.adminNotes || 'Complaint verified by admin');

    await complaint.save();

    const dealerUserIds = await getEntityUserIds(complaint.dealerEntity._id, 'dealer');
    dealerUserIds.forEach(userId => {
      createNotification({
        userId,
        title: 'Complaint Verified',
        body: `Your complaint ${complaint.complaintId} has been verified. Refund will be processed.`,
        type: 'complaint',
        complaintId: complaint._id,
      });
      emitStatusChange(complaint.complaintId, 'VERIFIED', userId);
    });

    emitDashboardUpdate();

    writeAuditLog({
      action: 'COMPLAINT_VERIFIED',
      performedBy: req.user._id,
      targetId: complaint._id,
      targetModel: 'Complaint',
      before,
      after: { status: 'VERIFIED' },
      req,
    });

    sendSuccess(res, 200, 'Complaint verified', complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/complaints/:id/refund
 */
const processRefund = async (req, res, next) => {
  try {
    const { refundAmount, refundReference, note } = req.body;

    const complaint = await Complaint.findById(req.params.id).populate('dealerEntity');
    if (!complaint) return sendError(res, 404, 'Complaint not found.');

    if (!complaint.canTransitionTo('REFUND_PROCESSED')) {
      return sendError(res, 422, `Cannot process refund. Complaint status is ${complaint.status}.`);
    }

    const before = { status: complaint.status };
    complaint.status = 'REFUND_PROCESSED';
    complaint.refundAmount = refundAmount;
    complaint.refundReference = refundReference;
    complaint.refundDate = new Date();
    complaint.addTimelineEntry('REFUND_PROCESSED', req.user._id, note || `Refund of ₹${refundAmount} processed`);

    await complaint.save();

    const dealerEmails = await getEntityUserEmails(complaint.dealerEntity._id, 'dealer');
    const dealerUserIds = await getEntityUserIds(complaint.dealerEntity._id, 'dealer');

    if (dealerEmails.length > 0) {
      sendRefundProcessedEmail(dealerEmails[0], complaint);
    }

    dealerUserIds.forEach(userId => {
      createNotification({
        userId,
        title: 'Refund Processed',
        body: `Refund of ₹${refundAmount} processed for complaint ${complaint.complaintId}. Ref: ${refundReference}`,
        type: 'refund',
        complaintId: complaint._id,
      });
      emitStatusChange(complaint.complaintId, 'REFUND_PROCESSED', userId);
    });

    emitDashboardUpdate();

    writeAuditLog({
      action: 'REFUND_PROCESSED',
      performedBy: req.user._id,
      targetId: complaint._id,
      targetModel: 'Complaint',
      before,
      after: { status: 'REFUND_PROCESSED', refundAmount, refundReference },
      req,
    });

    sendSuccess(res, 200, 'Refund processed', complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const [
      total, created, approved, cfaAssigned, pickedUp, receivedAtCfa, verified, refundProcessed, rejected, last30DaysTotal, thisMonthRefunds,
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'CREATED' }),
      Complaint.countDocuments({ status: 'APPROVED' }),
      Complaint.countDocuments({ status: 'CFA_ASSIGNED' }),
      Complaint.countDocuments({ status: 'PICKED_UP' }),
      Complaint.countDocuments({ status: 'RECEIVED_AT_CFA' }),
      Complaint.countDocuments({ status: 'VERIFIED' }),
      Complaint.countDocuments({ status: 'REFUND_PROCESSED' }),
      Complaint.countDocuments({ status: 'REJECTED' }),
      Complaint.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      Complaint.countDocuments({
        status: 'REFUND_PROCESSED',
        refundDate: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
    ]);

    const recentActivity = await Complaint.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('complaintId status timeline updatedAt')
      .populate('timeline.updatedBy', 'name role');

    const activity = recentActivity.map(c => {
      const lastEntry = c.timeline[c.timeline.length - 1];
      return {
        complaintId: c.complaintId,
        status: c.status,
        action: lastEntry?.status,
        actor: lastEntry?.updatedBy?.name || 'System',
        timestamp: lastEntry?.timestamp || c.updatedAt,
      };
    });

    sendSuccess(res, 200, 'Dashboard data', {
      stats: {
        total,
        pendingApproval: created,
        approved,
        cfaAssigned,
        pickedUp,
        receivedAtCfa,
        verified,
        refundProcessed,
        rejected,
        pickupsInProgress: cfaAssigned + pickedUp,
        completedRefundsThisMonth: thisMonthRefunds,
        last30DaysTotal,
      },
      recentActivity: activity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const complaintsOverTime = await Complaint.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const byStatus = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byProductType = await Complaint.aggregate([
      { $group: { _id: '$productType', count: { $sum: 1 } } },
    ]);

    const topDealers = await Complaint.aggregate([
      { $group: { _id: '$dealerEntity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'dealers',
          localField: '_id',
          foreignField: '_id',
          as: 'dealer',
        },
      },
      { $unwind: '$dealer' },
      {
        $project: {
          name: '$dealer.code',
          businessName: '$dealer.company',
          count: 1,
        },
      },
    ]);

    sendSuccess(res, 200, 'Analytics data', {
      complaintsOverTime,
      byStatus,
      byProductType,
      topDealers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/export
 */
const exportReport = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const filter = {};
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const complaints = await Complaint.find(filter)
      .populate('dealerEntity', 'code company region')
      .populate('cfaEntity', 'code company')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, 200, 'Report generated', complaints);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  approveComplaint,
  rejectComplaint,
  assignCFA,
  verifyComplaint,
  processRefund,
  getDashboard,
  getAnalytics,
  exportReport,
};
