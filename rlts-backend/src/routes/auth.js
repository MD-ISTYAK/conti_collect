const express = require('express');
const router = express.Router();
const { login, registerAdmin, refreshTokenHandler, logout, getMe, changePassword, updateFcmToken } = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { loginSchema, registerSchema, refreshTokenSchema, changePasswordSchema, fcmTokenSchema } = require('../validators/authValidators');

router.post('/register', authLimiter, validate(registerSchema), registerAdmin);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refreshTokenHandler);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);
router.put('/change-password', auth, validate(changePasswordSchema), changePassword);
router.post('/fcm-token', auth, validate(fcmTokenSchema), updateFcmToken);

module.exports = router;
