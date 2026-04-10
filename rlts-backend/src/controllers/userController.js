const User = require('../models/User');
const Complaint = require('../models/Complaint');
const CFA = require('../models/CFA');
const Dealer = require('../models/Dealer');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');
const { writeAuditLog } = require('../services/auditService');

/**
 * GET /api/admin/users — List all users (filter by role, entity, status)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, cfaEntity, dealerEntity, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (cfaEntity) filter.cfaEntity = cfaEntity;
    if (dealerEntity) filter.dealerEntity = dealerEntity;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { roleLabel: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('cfaEntity', 'code company')
        .populate('dealerEntity', 'code company')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    sendPaginated(res, 'Users retrieved', users, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users/:id
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('cfaEntity')
      .populate('dealerEntity');
      
    if (!user) return sendError(res, 404, 'User not found.');

    sendSuccess(res, 200, 'User retrieved', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found.');

    const before = { name: user.name, email: user.email, isActive: user.isActive, roleLabel: user.roleLabel };

    if (req.body.email && req.body.email !== user.email) {
      const existing = await User.findOne({ email: req.body.email });
      if (existing) return sendError(res, 409, 'This email is already in use by another account.');
    }

    const updateFields = ['name', 'email', 'phone', 'address', 'isActive', 'roleLabel'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    await user.save();

    writeAuditLog({
      action: 'USER_UPDATED',
      performedBy: req.user._id,
      targetId: user._id,
      targetModel: 'User',
      before,
      after: { name: user.name, isActive: user.isActive, roleLabel: user.roleLabel },
      req,
    });

    sendSuccess(res, 200, 'User updated', user);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/users/:id — Soft delete
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found.');

    if (user.role === 'admin') {
      return sendError(res, 403, 'Cannot deactivate admin accounts.');
    }

    user.isActive = false;
    await user.save();

    writeAuditLog({
      action: 'USER_DEACTIVATED',
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

/**
 * GET /api/admin/cfa — List all CFA entities (Backward compatibility)
 */
const getCFAList = async (req, res, next) => {
  try {
    // For backward compatibility, map CFA master to old structure where possible
    const cfas = await CFA.find({ isActive: true }).sort({ code: 1 });
    sendSuccess(res, 200, 'CFA entities retrieved', cfas);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getCFAList,
};
