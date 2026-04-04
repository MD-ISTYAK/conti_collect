const Complaint = require('../models/Complaint');
const User = require('../models/User');
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

/**
 * POST /api/complaints — Create new complaint (Dealer only)
 */
const createComplaint = async (req, res, next) => {
  try {
    const dealer = req.user;

    // Check max 10 open complaints rule
    const openCount = await Complaint.countDocuments({
      dealerId: dealer._id,
      status: { $in: Complaint.OPEN_STATUSES },
    });

    if (openCount >= 10) {
      return sendError(res, 429, 'Maximum 10 open complaints allowed. Please wait for existing complaints to be resolved.');
    }

    // Process uploaded images
    if (!req.files || req.files.length === 0) {
      return sendError(res, 400, 'At least 1 image is required.', [{ field: 'images', message: 'Minimum 1 image required' }]);
    }

    const complaintId = await generateComplaintId();

    // Move images from temp to permanent location
    const imageUrls = await processUploads(req.files, 'product-images', complaintId);

    // Create complaint
    const complaint = await Complaint.create({
      complaintId,
      dealerId: dealer._id,
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
        updatedBy: dealer._id,
        note: 'Complaint submitted by dealer',
      }],
    });

    // Notify admins
    const admins = await User.find({ role: 'admin', isActive: true });
    const adminEmails = admins.map(a => a.email);
    
    sendComplaintCreatedEmail(adminEmails, complaint, dealer.name);
    
    admins.forEach(admin => {
      createNotification({
        userId: admin._id,
        title: 'New Complaint',
        body: `New return complaint ${complaintId} from ${dealer.name}`,
        type: 'complaint',
        complaintId: complaint._id,
      });
    });

    emitNewComplaint(complaintId, dealer.name);
    emitDashboardUpdate();

    writeAuditLog({
      action: 'COMPLAINT_CREATED',
      performedBy: dealer._id,
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
    const { status, dealerId, cfaId, productType, dateFrom, dateTo, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (dealerId) filter.dealerId = dealerId;
    if (cfaId) filter.cfaId = cfaId;
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
        .populate('dealerId', 'name email phone businessName region')
        .populate('cfaId', 'name email phone')
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
      filter.dealerId = req.user._id;
    } else if (req.user.role === 'cfa') {
      filter.cfaId = req.user._id;
    }
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('dealerId', 'name email businessName')
        .populate('cfaId', 'name email')
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

    // Support both ObjectId and complaintId (CMP-xxx)
    const filter = id.startsWith('CMP-') ? { complaintId: id } : { _id: id };

    const complaint = await Complaint.findOne(filter)
      .populate('dealerId', 'name email phone businessName address region')
      .populate('cfaId', 'name email phone businessName');

    if (!complaint) {
      return sendError(res, 404, 'Complaint not found.');
    }

    // Role-based access: dealer can only see own, CFA can only see assigned
    if (req.user.role === 'dealer' && complaint.dealerId._id.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'You can only view your own complaints.');
    }
    if (req.user.role === 'cfa' && complaint.cfaId?._id.toString() !== req.user._id.toString()) {
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

module.exports = {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  getComplaint,
  getTimeline,
  getProof,
  getQRCode,
};
