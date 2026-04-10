const express = require('express');
const router = express.Router();
const dealerMasterController = require('../controllers/dealerMasterController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(auth);
router.use(roleCheck('admin'));

router.get('/', dealerMasterController.listDealers);
router.post('/', dealerMasterController.createDealer);
router.post('/import', upload.single('file'), dealerMasterController.importDealer);
router.get('/export', dealerMasterController.exportDealer);
router.get('/:id', dealerMasterController.getDealer);
router.put('/:id', dealerMasterController.updateDealer);
router.delete('/:id', dealerMasterController.deactivateDealer);

// User endpoints specific to Dealer
router.post('/:id/users', dealerMasterController.createDealerUser);
router.get('/:id/users', dealerMasterController.getDealerUsers);

module.exports = router;
