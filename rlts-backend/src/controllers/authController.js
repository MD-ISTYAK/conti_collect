const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { writeAuditLog } = require('../services/auditService');
const logger = require('../utils/logger');

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 401, 'Invalid email or password.');
    }

    if (!user.isActive) {
      return sendError(res, 403, 'Account has been deactivated. Contact administrator.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password.');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Save refresh token and last login
    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    const userObj = user.toJSON();

    sendSuccess(res, 200, 'Login successful', {
      accessToken,
      refreshToken,
      user: userObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshTokenHandler = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return sendError(res, 401, 'Invalid refresh token.');
    }

    if (!user.isActive) {
      return sendError(res, 403, 'Account has been deactivated.');
    }

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    user.refreshToken = newRefreshToken;
    await user.save();

    sendSuccess(res, 200, 'Token refreshed', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid or expired refresh token.');
    }
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    sendSuccess(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  sendSuccess(res, 200, 'User profile', req.user);
};

/**
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 400, 'Current password is incorrect.');
    }

    user.password = newPassword;
    await user.save();

    writeAuditLog({
      action: 'PASSWORD_CHANGED',
      performedBy: user._id,
      targetId: user._id,
      targetModel: 'User',
      req,
    });

    sendSuccess(res, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/fcm-token
 */
const updateFcmToken = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { fcmToken: req.body.fcmToken });
    sendSuccess(res, 200, 'FCM token updated');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register-admin
 */
const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 400, 'Email is already registered.');
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
      isActive: true,
    });

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    sendSuccess(res, 201, 'Admin registration successful', {
      accessToken,
      refreshToken,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerAdmin,
  login,
  refreshTokenHandler,
  logout,
  getMe,
  changePassword,
  updateFcmToken,
};
