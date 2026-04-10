const Complaint = require('../models/Complaint');
const User = require('../models/User');
const CFA = require('../models/CFA');
const Dealer = require('../models/Dealer');
const PickupProof = require('../models/PickupProof');
const { generateComplaintId } = require('../utils/complaintIdGen');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');
const { processUploads } = require('../services/storageService');
const { generateQRCode } = require('../services/qrService');
const { writeAuditLog } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { sendComplaintCreatedEmail } = require('../services/emailService');
const { emitNewComplaint, emitDashboardUpdate } = require('../services/socketService');
const logger = require('../utils/logger');

// Helpers
const getEntityUserIds = async (entityId, role) => {
  const users = await User.find({ [`${role}Entity`]: entityId, isActive: true });
  return users.map(u => u._id);
};

/**
 * POST /api/complaints — Create new complaint (Dealer only)
 */
const createComplaint = async (req, res, next) => {
  try {
    const dealerEntityId = req.user.dealerEntity._id;
    if (!dealerEntityId) return sendError(res, 403, 'User is not linked to a Dealer entity.');

    const dealer = await Dealer.findById(dealerEntityId);
    if (!dealer || !dealer.isActive) return sendError(res, 403, 'Dealer entity is inactive or not found.');

    const openCount = await Complaint.countDocuments({
      dealerEntity: dealerEntityId,
      status: { $in: Complaint.OPEN_STATUSES },
    });

    if (openCount >= 10) {
      return sendError(res, 429, 'Maximum 10 open complaints allowed. Please wait for existing complaints to be resolved.');
    }

    if (!req.files || req.files.length === 0) {
      return sendError(res, 400, 'At least 1 image is required.', [{ field: 'images', message: 'Minimum 1 image required' }]);
    }

    const complaintId = await generateComplaintId();
    const imageUrls = await processUploads(req.files, 'product-images', complaintId);

    const complaint = await Complaint.create({
      complaintId,
      dealerEntity: dealerEntityId,
      productType: req.body.productType,
      productName: req.body.productName,
      quantity: parseInt(req.body.quantity),
      reason: req.body.reason,
      description: req.body.description || '',
      images: imageUrls,
      status: 'CREATED',
      timeline: [{
        status: 'CREATED',
        timestamp: new Date(),
        updatedBy: req.user._id,
        note: `Complaint submitted by dealer user: ${req.user.name}`,
      }],
    });

    const admins = await User.find({ role: 'admin', isActive: true });
    const adminEmails = admins.map(a => a.email);
    
    sendComplaintCreatedEmail(adminEmails, complaint, req.user.name);
    
    admins.forEach(admin => {
      createNotification({
        userId: admin._id,
        title: 'New Complaint',
        body: `New return complaint ${complaintId} from ${dealer.code}`,
        type: 'complaint',
        complaintId: complaint._id,
      });
    });

    emitNewComplaint(complaintId, dealer.code);
    emitDashboardUpdate();

    writeAuditLog({
      action: 'COMPLAINT_CREATED',
      performedBy: req.user._id,
      targetId: complaint._id,
      targetModel: 'Complaint',
      after: { complaintId, status: 'CREATED' },
      req,
    });

    sendSuccess(res, 201, 'Complaint created successfully', complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints — Get all complaints (Admin only, with filters)
 */
const getAllComplaints = async (req, res, next) => {
  try {
    const { status, dealerEntity, cfaEntity, productType, dateFrom, dateTo, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (dealerEntity) filter.dealerEntity = dealerEntity;
    if (cfaEntity) filter.cfaEntity = cfaEntity;
    if (productType) filter.productType = productType;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    if (search) {
      filter.$or = [
        { complaintId: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('dealerEntity', 'code company region')
        .populate('cfaEntity', 'code company')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Complaint.countDocuments(filter),
    ]);

    sendPaginated(res, 'Complaints retrieved', complaints, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints/mine — Get own complaints (Dealer) or assigned (CFA)
 */
const getMyComplaints = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};

    if (req.user.role === 'dealer') {
      filter.dealerEntity = req.user.dealerEntity._id;
    } else if (req.user.role === 'cfa') {
      filter.cfaEntity = req.user.cfaEntity._id;
    }
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('dealerEntity', 'code company')
        .populate('cfaEntity', 'code company')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Complaint.countDocuments(filter),
    ]);

    sendPaginated(res, 'Complaints retrieved', complaints, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints/:id — Get single complaint
 */
const getComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;

    const filter = id.startsWith('CMP-') ? { complaintId: id } : { _id: id };

    const complaint = await Complaint.findOne(filter)
      .populate('dealerEntity', 'code company region')
      .populate('cfaEntity', 'code company');

    if (!complaint) {
      return sendError(res, 404, 'Complaint not found.');
    }

    if (req.user.role === 'dealer' && complaint.dealerEntity._id.toString() !== req.user.dealerEntity._id.toString()) {
      return sendError(res, 403, 'You can only view your own complaints.');
    }
    if (req.user.role === 'cfa' && complaint.cfaEntity?._id.toString() !== req.user.cfaEntity._id.toString()) {
      return sendError(res, 403, 'You can only view complaints assigned to you.');
    }

    sendSuccess(res, 200, 'Complaint retrieved', complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints/:id/timeline
 */
const getTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = id.startsWith('CMP-') ? { complaintId: id } : { _id: id };

    const complaint = await Complaint.findOne(filter)
      .select('complaintId timeline status')
      .populate('timeline.updatedBy', 'name role');

    if (!complaint) {
      return sendError(res, 404, 'Complaint not found.');
    }

    sendSuccess(res, 200, 'Timeline retrieved', complaint.timeline);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints/:id/proof
 */
const getProof = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    let complaint;
    if (id.startsWith('CMP-')) {
      complaint = await Complaint.findOne({ complaintId: id });
    } else {
      complaint = await Complaint.findById(id);
    }

    if (!complaint) {
      return sendError(res, 404, 'Complaint not found.');
    }

    const proof = await PickupProof.findOne({ complaintId: complaint._id })
      .populate('pickedBy', 'name email phone');

    if (!proof) {
      return sendError(res, 404, 'No pickup proof available yet.');
    }

    sendSuccess(res, 200, 'Pickup proof retrieved', proof);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints/:id/qr
 */
const getQRCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = id.startsWith('CMP-') ? { complaintId: id } : { _id: id };

    const complaint = await Complaint.findOne(filter).select('complaintId qrCode');
    if (!complaint) {
      return sendError(res, 404, 'Complaint not found.');
    }

    if (!complaint.qrCode) {
      return sendError(res, 404, 'QR code not generated yet. Complaint must be approved first.');
    }

    sendSuccess(res, 200, 'QR code retrieved', { qrCode: complaint.qrCode });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/complaints/:id/request-reschedule
 */
const requestReschedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = id.startsWith('CMP-') ? { complaintId: id } : { _id: id };

    const complaint = await Complaint.findOne(filter);
    if (!complaint) {
      return sendError(res, 404, 'Complaint not found.');
    }

    if (req.user.role === 'dealer' && complaint.dealerEntity.toString() !== req.user.dealerEntity._id.toString()) {
      return sendError(res, 403, 'You can only request reschedule for your own complaints.');
    }
    if (req.user.role === 'cfa' && complaint.cfaEntity?.toString() !== req.user.cfaEntity._id.toString()) {
      return sendError(res, 403, 'You can only request reschedule for complaints assigned to you.');
    }

    if (!['APPROVED', 'CFA_ASSIGNED'].includes(complaint.status)) {
      return sendError(res, 400, 'Complaint must be APPROVED or CFA_ASSIGNED to request a reschedule.');
    }

    const now = new Date();
    if (!complaint.estimatedPickupDate) {
      return sendError(res, 400, 'No pickup date was scheduled yet.');
    }
    if (now <= complaint.estimatedPickupDate) {
      return sendError(res, 400, 'The scheduled pickup date has not passed yet.');
    }

    const { proposedDate } = req.body;

    complaint.rescheduleRequests.push({
      requestedBy: req.user._id,
      role: req.user.role,
      requestedAt: now,
      proposedDate: proposedDate ? new Date(proposedDate) : undefined,
    });

    complaint.addTimelineEntry(
      complaint.status,
      req.user._id,
      `Reschedule requested by ${req.user.role === 'dealer' ? 'Dealer' : 'CFA'} user: ${req.user.name}`
    );

    await complaint.save();

    writeAuditLog({
      action: 'RESCHEDULE_REQUESTED',
      performedBy: req.user._id,
      targetId: complaint._id,
      targetModel: 'Complaint',
      after: { complaintId: complaint.complaintId, state: 'Reschedule Requested' },
      req,
    });

    const admins = await User.find({ role: 'admin', isActive: true });
    admins.forEach(admin => {
      createNotification({
        userId: admin._id,
        title: 'Pickup Reschedule Requested',
        body: `${req.user.role.toUpperCase()} requested to reschedule pickup for ${complaint.complaintId}`,
        type: 'complaint',
        complaintId: complaint._id,
      });
    });

    emitDashboardUpdate();

    sendSuccess(res, 200, 'Reschedule requested successfully', complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/complaints/:id/propose-pickup
 */
const proposePickup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { proposedDate } = req.body;
    const filter = id.startsWith('CMP-') ? { complaintId: id } : { _id: id };

    const complaint = await Complaint.findOne(filter);
    if (!complaint) return sendError(res, 404, 'Complaint not found.');

    if (req.user.role === 'dealer' && complaint.dealerEntity.toString() !== req.user.dealerEntity._id.toString()) {
      return sendError(res, 403, 'You can only propose pickup for your own complaints.');
    }
    if (req.user.role === 'cfa' && complaint.cfaEntity?.toString() !== req.user.cfaEntity._id.toString()) {
      return sendError(res, 403, 'You can only propose pickup for complaints assigned to you.');
    }

    if (!['APPROVED', 'CFA_ASSIGNED'].includes(complaint.status)) {
      return sendError(res, 400, 'Complaint must be APPROVED or CFA_ASSIGNED to propose a pickup.');
    }

    complaint.proposedPickupDate = new Date(proposedDate);
    complaint.pickupProposedBy = req.user._id;
    complaint.pickupScheduleStatus = 'PROPOSED';

    complaint.addTimelineEntry(
      complaint.status,
      req.user._id,
      `Pickup proposed for ${new Date(proposedDate).toLocaleDateString('en-IN')} by ${req.user.role.toUpperCase()} user: ${req.user.name}`
    );

    await complaint.save();

    const recipientEntityGroupIds = req.user.role === 'dealer' ? await getEntityUserIds(complaint.cfaEntity, 'cfa') : await getEntityUserIds(complaint.dealerEntity, 'dealer');
    recipientEntityGroupIds.forEach(userId => {
      createNotification({
        userId,
        title: 'New Pickup Proposal',
        body: `${req.user.role.toUpperCase()} proposed a pickup for ${complaint.complaintId} on ${new Date(proposedDate).toLocaleDateString()}`,
        type: 'pickup',
        complaintId: complaint._id,
      });
    });

    emitDashboardUpdate();

    sendSuccess(res, 200, 'Pickup date proposed successfully', complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/complaints/:id/confirm-pickup
 */
const confirmPickup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = id.startsWith('CMP-') ? { complaintId: id } : { _id: id };

    const complaint = await Complaint.findOne(filter);
    if (!complaint) return sendError(res, 404, 'Complaint not found.');

    if (complaint.pickupScheduleStatus !== 'PROPOSED') {
      return sendError(res, 400, 'There is no pending pickup proposal to confirm.');
    }

    const proposedBy = await User.findById(complaint.pickupProposedBy);
    const proposerRole = proposedBy?.role;
    
    if (proposerRole === req.user.role) {
      return sendError(res, 400, 'You cannot confirm a pickup proposal from your own organization.');
    }

    if (req.user.role === 'dealer' && complaint.dealerEntity.toString() !== req.user.dealerEntity._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }
    if (req.user.role === 'cfa' && complaint.cfaEntity?.toString() !== req.user.cfaEntity._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }

    complaint.estimatedPickupDate = complaint.proposedPickupDate;
    complaint.pickupScheduleStatus = 'CONFIRMED';

    complaint.addTimelineEntry(
      complaint.status,
      req.user._id,
      `Pickup date confirmed for ${complaint.estimatedPickupDate.toLocaleDateString('en-IN')} by ${req.user.role.toUpperCase()} user: ${req.user.name}`
    );

    await complaint.save();

    createNotification({
      userId: complaint.pickupProposedBy,
      title: 'Pickup Confirmed',
      body: `${req.user.role.toUpperCase()} confirmed the pickup for ${complaint.complaintId} on ${complaint.estimatedPickupDate.toLocaleDateString()}`,
      type: 'pickup',
      complaintId: complaint._id,
    });

    emitDashboardUpdate();

    sendSuccess(res, 200, 'Pickup date confirmed successfully', complaint);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  getComplaint,
  getTimeline,
  getProof,
  getQRCode,
  requestReschedule,
  proposePickup,
  confirmPickup,
};
