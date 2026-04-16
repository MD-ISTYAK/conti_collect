const express = require('express');
const router = express.Router();
const {
  approveComplaint,
  rejectComplaint,
  assignCFA,
  verifyComplaint,
  processRefund,
  getDashboard,
  getAnalytics,
  exportReport,
  schedulePickup,
  deleteComplaints,
} = require('../controllers/adminController');
const customFieldController = require('../controllers/customFieldController');
const importController = require('../controllers/importController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const {
  approveComplaintSchema,
  rejectComplaintSchema,
  assignCfaSchema,
  verifyComplaintSchema,
  processRefundSchema,
} = require('../validators/complaintValidators');

// All admin routes require admin role
router.use(auth, roleCheck('admin'));

router.post('/complaints/delete', deleteComplaints);
router.post('/complaints/:id/approve', validate(approveComplaintSchema), approveComplaint);
router.post('/complaints/:id/reject', validate(rejectComplaintSchema), rejectComplaint);
router.post('/complaints/:id/assign-cfa', validate(assignCfaSchema), assignCFA);
router.post('/complaints/:id/verify', validate(verifyComplaintSchema), verifyComplaint);
router.post('/complaints/:id/refund', validate(processRefundSchema), processRefund);
router.post('/complaints/:id/schedule-pickup', schedulePickup);
router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);
router.get('/reports/export', exportReport);

// Custom Fields
router.get('/custom-fields', customFieldController.getAll);
router.post('/custom-fields', customFieldController.create);
router.patch('/custom-fields/:id', customFieldController.update);
router.delete('/custom-fields/:id', customFieldController.delete);

// MIS Import
router.post('/complaints/import', upload.single('file'), importController.importComplaints);

module.exports = router;
