const { sendError } = require('../utils/responseHelper');

/**
 * Role-based access control middleware.
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'dealer', 'cfa')
 */
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, 'You do not have permission to perform this action.');
    }

    next();
  };
};

module.exports = roleCheck;
