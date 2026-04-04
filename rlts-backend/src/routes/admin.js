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
} = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const {
  approveComplaintSchema,
  rejectComplaintSchema,
  assignCfaSchema,
  verifyComplaintSchema,
  processRefundSchema,
} = require('../validators/complaintValidators');

// All admin routes require admin role
router.use(auth, roleCheck('admin'));

router.post('/complaints/:id/approve', validate(approveComplaintSchema), approveComplaint);
router.post('/complaints/:id/reject', validate(rejectComplaintSchema), rejectComplaint);
router.post('/complaints/:id/assign-cfa', validate(assignCfaSchema), assignCFA);
router.post('/complaints/:id/verify', validate(verifyComplaintSchema), verifyComplaint);
router.post('/complaints/:id/refund', validate(processRefundSchema), processRefund);
router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);
router.get('/reports/export', exportReport);

module.exports = router;
