const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { writeAuditLog } = require('../services/auditService');

/**
 * PUT /api/admin/entity-users/:userId
 */
const updateEntityUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, 404, 'User not found.');
    if (user.role === 'admin') return sendError(res, 403, 'Cannot modify admin users here.');

    const before = { name: user.name, roleLabel: user.roleLabel, isActive: user.isActive };

    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.roleLabel !== undefined) user.roleLabel = req.body.roleLabel;
    if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
    
    // Optional password update
    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();

    writeAuditLog({
      action: 'ENTITY_USER_UPDATED',
      performedBy: req.user._id,
      targetId: user._id,
      targetModel: 'User',
      before,
      after: { name: user.name, roleLabel: user.roleLabel, isActive: user.isActive },
      req,
    });

    sendSuccess(res, 200, 'User updated', user);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/entity-users/:userId
 */
const deactivateEntityUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return sendError(res, 404, 'User not found.');
    if (user.role === 'admin') return sendError(res, 403, 'Cannot deactivate admin users here.');

    user.isActive = false;
    await user.save();

    writeAuditLog({
      action: 'ENTITY_USER_DEACTIVATED',
      performedBy: req.user._id,
      targetId: user._id,
      targetModel: 'User',
      before: { isActive: true },
      after: { isActive: false },
      req,
    });

    sendSuccess(res, 200, 'User deactivated', user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateEntityUser,
  deactivateEntityUser,
};
