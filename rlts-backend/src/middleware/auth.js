const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/responseHelper');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(res, 401, 'Token is invalid. User not found.');
    }

    if (!user.isActive) {
      return sendError(res, 403, 'Account has been deactivated. Contact administrator.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token has expired.');
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Token is invalid.');
    }
    return sendError(res, 401, 'Authentication failed.');
  }
};

module.exports = auth;
