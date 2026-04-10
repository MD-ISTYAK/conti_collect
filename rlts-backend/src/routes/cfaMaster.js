const express = require('express');
const router = express.Router();
const cfaMasterController = require('../controllers/cfaMasterController');
const entityUserController = require('../controllers/entityUserController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(auth);
router.use(roleCheck('admin'));

router.get('/', cfaMasterController.listCFAs);
router.post('/', cfaMasterController.createCFA);
router.post('/import', upload.single('file'), cfaMasterController.importCFA);
router.get('/export', cfaMasterController.exportCFA);
router.get('/:id', cfaMasterController.getCFA);
router.put('/:id', cfaMasterController.updateCFA);
router.delete('/:id', cfaMasterController.deactivateCFA);

// User endpoints specific to CFA
router.post('/:id/users', cfaMasterController.createCFAUser);
router.get('/:id/users', cfaMasterController.getCFAUsers);

module.exports = router;
