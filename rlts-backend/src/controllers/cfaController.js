const Complaint = require('../models/Complaint');
const PickupProof = require('../models/PickupProof');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { processUploads } = require('../services/storageService');
const { writeAuditLog } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { sendPickupCompletedEmail } = require('../services/emailService');
const { emitStatusChange, emitPickupCompleted, emitDashboardUpdate } = require('../services/socketService');
const logger = require('../utils/logger');

/**
 * GET /api/cfa/assigned — Get all complaints assigned to this CFA
 */
const getAssigned = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      cfaId: req.user._id,
      status: { $in: ['CFA_ASSIGNED', 'PICKED_UP'] },
    })
      .populate('dealerId', 'name email phone businessName address')
      .sort({ estimatedPickupDate: 1 });

    sendSuccess(res, 200, 'Assigned complaints retrieved', complaints);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/cfa/pickup/:id — Submit pickup proof
 */
const submitPickup = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('dealerId', 'name email');
    
    if (!complaint) return sendError(res, 404, 'Complaint not found.');

    if (complaint.cfaId.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'This complaint is not assigned to you.');
    }

    if (!complaint.canTransitionTo('PICKED_UP')) {
      return sendError(res, 422, `Cannot mark pickup. Complaint status is ${complaint.status}.`);
    }

    // Validate all required proof elements
    if (!req.files?.pickupPhotos || req.files.pickupPhotos.length === 0) {
      return sendError(res, 400, 'At least 1 pickup photo is required.');
    }
    if (!req.files?.signatureImage || req.files.signatureImage.length === 0) {
      return sendError(res, 400, 'Dealer signature image is required.');
    }

    const { dealerName, gpsLocation } = req.body;
    const gps = typeof gpsLocation === 'string' ? JSON.parse(gpsLocation) : gpsLocation;

    if (!gps || !gps.lat || !gps.lng) {
      return sendError(res, 400, 'GPS location is required.');
    }
    if (gps.lat < -90 || gps.lat > 90 || gps.lng < -180 || gps.lng > 180) {
      return sendError(res, 400, 'GPS coordinates are out of valid range.');
    }

    // Process uploads
    const pickupPhotoUrls = await processUploads(
      req.files.pickupPhotos, 'pickup-photos', complaint.complaintId
    );
    const signatureUrl = await processUploads(
      req.files.signatureImage, 'signature', complaint.complaintId
    );

    // Create pickup proof
    const proof = await PickupProof.create({
      complaintId: complaint._id,
      pickedBy: req.user._id,
      pickupPhotos: pickupPhotoUrls,
      signatureImage: signatureUrl[0],
      dealerName,
      gpsLocation: gps,
      pickupTime: new Date(),
    });

    // Update complaint
    const before = { status: complaint.status };
    complaint.status = 'PICKED_UP';
    complaint.actualPickupDate = new Date();
    complaint.addTimelineEntry('PICKED_UP', req.user._id, `Product collected by CFA: ${req.user.name}`);
    await complaint.save();

    // Notify dealer and admins
    const admins = await User.find({ role: 'admin', isActive: true });
    const adminEmails = admins.map(a => a.email);
    sendPickupCompletedEmail(complaint.dealerId.email, adminEmails, complaint);

    createNotification({
      userId: complaint.dealerId._id,
      title: 'Product Collected',
      body: `Your product for complaint ${complaint.complaintId} has been collected.`,
      type: 'pickup',
      complaintId: complaint._id,
    });

    admins.forEach(admin => {
      createNotification({
        userId: admin._id,
        title: 'Pickup Completed',
        body: `Pickup completed for ${complaint.complaintId} by ${req.user.name}`,
        type: 'pickup',
        complaintId: complaint._id,
      });
    });

    emitPickupCompleted(complaint.complaintId, req.user.name, complaint.dealerId._id);
    emitDashboardUpdate();

    writeAuditLog({
      action: 'PICKUP_COMPLETED',
      performedBy: req.user._id,
      targetId: complaint._id,
      targetModel: 'Complaint',
      before,
      after: { status: 'PICKED_UP' },
      req,
    });

    sendSuccess(res, 200, 'Pickup proof submitted', { complaint, proof });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/cfa/receive/:id — Submit warehouse receipt
 */
const submitReceive = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return sendError(res, 404, 'Complaint not found.');

    if (complaint.cfaId.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'This complaint is not assigned to you.');
    }

    if (!complaint.canTransitionTo('RECEIVED_AT_CFA')) {
      return sendError(res, 422, `Cannot mark received. Complaint status is ${complaint.status}.`);
    }

    if (!req.files || req.files.length === 0) {
      return sendError(res, 400, 'At least 1 warehouse photo is required.');
    }

    const { receivedQuantity, conditionNotes } = req.body;
    const quantity = parseInt(receivedQuantity);

    // Process warehouse photos
    const warehousePhotoUrls = await processUploads(
      req.files, 'warehouse-photos', complaint.complaintId
    );

    // Update pickup proof with warehouse data
    const proof = await PickupProof.findOne({ complaintId: complaint._id });
    if (proof) {
      proof.warehousePhotos = warehousePhotoUrls;
      proof.receivedQuantity = quantity;
      proof.conditionNotes = conditionNotes || '';
      await proof.save();
    }

    // Update complaint
    const before = { status: complaint.status };
    const quantityMismatch = quantity !== complaint.quantity;
    const note = quantityMismatch
      ? `Received at CFA warehouse. QUANTITY MISMATCH: expected ${complaint.quantity}, received ${quantity}`
      : `Received at CFA warehouse. Quantity confirmed: ${quantity}`;

    complaint.status = 'RECEIVED_AT_CFA';
    complaint.receivedAtCFADate = new Date();
    complaint.addTimelineEntry('RECEIVED_AT_CFA', req.user._id, note);
    await complaint.save();

    // Notify admins
    const admins = await User.find({ role: 'admin', isActive: true });
    admins.forEach(admin => {
      createNotification({
        userId: admin._id,
        title: quantityMismatch ? '⚠️ Received with Discrepancy' : 'Received at Warehouse',
        body: `Complaint ${complaint.complaintId} received at CFA. ${quantityMismatch ? 'QUANTITY MISMATCH!' : ''}`,
        type: 'complaint',
        complaintId: complaint._id,
      });
    });

    emitStatusChange(complaint.complaintId, 'RECEIVED_AT_CFA', complaint.dealerId);
    emitDashboardUpdate();

    writeAuditLog({
      action: 'RECEIVED_AT_CFA',
      performedBy: req.user._id,
      targetId: complaint._id,
      targetModel: 'Complaint',
      before,
      after: { status: 'RECEIVED_AT_CFA', receivedQuantity: quantity },
      req,
    });

    sendSuccess(res, 200, 'Warehouse receipt submitted', complaint);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/cfa/scan/:complaintId — Validate complaint from QR scan
 */
const scanQR = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findOne({ complaintId })
      .populate('dealerId', 'name email phone businessName address')
      .select('complaintId productType productName quantity status dealerId estimatedPickupDate');

    if (!complaint) {
      return sendError(res, 404, 'Invalid QR code. Complaint not found.');
    }

    if (complaint.cfaId && complaint.cfaId.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'This complaint is not assigned to you.');
    }

    if (complaint.status !== 'CFA_ASSIGNED') {
      return sendError(res, 422, `Complaint is in ${complaint.status} status. Must be CFA_ASSIGNED for pickup.`);
    }

    sendSuccess(res, 200, 'Complaint verified', complaint);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssigned,
  submitPickup,
  submitReceive,
  scanQR,
};
