const express = require('express');
const router = express.Router();
const entityUserController = require('../controllers/entityUserController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);
router.use(roleCheck('admin'));

router.put('/:userId', entityUserController.updateEntityUser);
router.delete('/:userId', entityUserController.deactivateEntityUser);

module.exports = router;
