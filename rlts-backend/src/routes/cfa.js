const express = require('express');
const router = express.Router();
const { getAssigned, submitPickup, submitReceive, scanQR } = require('../controllers/cfaController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const { uploadPickupPhotos, uploadWarehousePhotos, handleUploadError } = require('../middleware/upload');
const { pickupSchema, receiveSchema } = require('../validators/cfaValidators');

// All CFA routes require CFA role
router.use(auth, roleCheck('cfa'));

router.get('/assigned', getAssigned);
router.post('/pickup/:id', uploadPickupPhotos, handleUploadError, submitPickup);
router.post('/receive/:id', uploadWarehousePhotos, handleUploadError, submitReceive);
router.get('/scan/:complaintId', scanQR);

module.exports = router;
