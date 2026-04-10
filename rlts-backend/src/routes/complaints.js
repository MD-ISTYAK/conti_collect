const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/complaintController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const { uploadComplaintImages, handleUploadError } = require('../middleware/upload');
const { createComplaintSchema, complaintQuerySchema } = require('../validators/complaintValidators');

router.post('/', auth, roleCheck('dealer'), uploadComplaintImages, handleUploadError, validate(createComplaintSchema), createComplaint);
router.get('/', auth, roleCheck('admin'), validate(complaintQuerySchema), getAllComplaints);
router.get('/mine', auth, roleCheck('dealer', 'cfa'), getMyComplaints);
router.get('/:id', auth, getComplaint);
router.get('/:id/timeline', auth, getTimeline);
router.get('/:id/proof', auth, getProof);
router.get('/:id/qr', auth, getQRCode);
router.post('/:id/request-reschedule', auth, roleCheck('dealer', 'cfa'), requestReschedule);
router.post('/:id/propose-pickup', auth, roleCheck('dealer', 'cfa'), proposePickup);
router.post('/:id/confirm-pickup', auth, roleCheck('dealer', 'cfa'), confirmPickup);

module.exports = router;
