const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getCFAList,
  assignRegion,
} = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/userValidators');
const { regionSchema } = require('../validators/cfaValidators');

// All user management routes require admin role
router.use(auth, roleCheck('admin'));

router.get('/', getUsers);
router.post('/', validate(createUserSchema), createUser);
router.get('/cfa', getCFAList);
router.post('/cfa/regions', validate(regionSchema), assignRegion);
router.get('/:id', getUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
