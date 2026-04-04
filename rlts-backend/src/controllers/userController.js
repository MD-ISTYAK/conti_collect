const User = require('../models/User');
const CFARegion = require('../models/CFARegion');
const Complaint = require('../models/Complaint');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');
const { writeAuditLog } = require('../services/auditService');
const { sendWelcomeEmail } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * GET /api/admin/users — List all users (filter by role, status, region)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, isActive, region, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (region) filter.region = { $regex: region, $options: 'i' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    sendPaginated(res, 'Users retrieved', users, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/users — Create dealer or CFA account
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, businessName, address, region } = req.body;

    // Don't allow creating admin accounts
    if (role === 'admin') {
      return sendError(res, 403, 'Cannot create admin accounts through this endpoint.');
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return sendError(res, 409, 'An account with this email already exists.');
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      businessName,
      address,
      region,
      createdBy: req.user._id,
    });

    // Send welcome email
    sendWelcomeEmail(email, name, role, password);

    writeAuditLog({
      action: 'USER_CREATED',
      performedBy: req.user._id,
      targetId: user._id,
      targetModel: 'User',
      after: { name, email, role, region },
      req,
    });

    sendSuccess(res, 201, `${role.charAt(0).toUpperCase() + role.slice(1)} account created`, user);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users/:id
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found.');

    // Get complaint stats for this user
    let complaintStats = {};
    if (user.role === 'dealer') {
      complaintStats = {
        total: await Complaint.countDocuments({ dealerId: user._id }),
        active: await Complaint.countDocuments({ dealerId: user._id, status: { $in: Complaint.OPEN_STATUSES } }),
      };
    } else if (user.role === 'cfa') {
      complaintStats = {
        total: await Complaint.countDocuments({ cfaId: user._id }),
        active: await Complaint.countDocuments({ cfaId: user._id, status: { $in: ['CFA_ASSIGNED', 'PICKED_UP'] } }),
      };
    }

    sendSuccess(res, 200, 'User retrieved', { user, complaintStats });
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

    const before = { name: user.name, isActive: user.isActive, region: user.region };

    const updateFields = ['name', 'phone', 'businessName', 'address', 'region', 'isActive'];
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
      after: { name: user.name, isActive: user.isActive, region: user.region },
      req,
    });

    sendSuccess(res, 200, 'User updated', user);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/users/:id — Soft delete (deactivate)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found.');

    if (user.role === 'admin') {
      return sendError(res, 403, 'Cannot deactivate admin accounts.');
    }

    // Check for active complaints if CFA
    if (user.role === 'cfa') {
      const activeComplaints = await Complaint.countDocuments({
        cfaId: user._id,
        status: { $in: ['CFA_ASSIGNED', 'PICKED_UP'] },
      });
      if (activeComplaints > 0) {
        return sendError(res, 422, `Cannot deactivate CFA with ${activeComplaints} active complaint(s). Reassign first.`);
      }
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
 * GET /api/admin/cfa — List all CFA agents with regions
 */
const getCFAList = async (req, res, next) => {
  try {
    const cfas = await User.find({ role: 'cfa' }).sort({ name: 1 });

    const cfaWithRegions = await Promise.all(
      cfas.map(async (cfa) => {
        const regions = await CFARegion.find({ cfaId: cfa._id, isActive: true });
        const activeComplaints = await Complaint.countDocuments({
          cfaId: cfa._id,
          status: { $in: Complaint.OPEN_STATUSES },
        });
        return {
          ...cfa.toJSON(),
          regions,
          activeComplaints,
        };
      })
    );

    sendSuccess(res, 200, 'CFA agents retrieved', cfaWithRegions);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/cfa/regions — Assign/update regions for a CFA
 */
const assignRegion = async (req, res, next) => {
  try {
    const { cfaId, regionName, states, cities, pincodes } = req.body;

    const cfa = await User.findOne({ _id: cfaId, role: 'cfa' });
    if (!cfa) return sendError(res, 404, 'CFA agent not found.');

    const region = await CFARegion.findOneAndUpdate(
      { cfaId, regionName },
      { cfaId, regionName, states, cities: cities || [], pincodes: pincodes || [] },
      { upsert: true, new: true }
    );

    writeAuditLog({
      action: 'CFA_REGION_ASSIGNED',
      performedBy: req.user._id,
      targetId: cfa._id,
      targetModel: 'User',
      after: { regionName, states, cities, pincodes },
      req,
    });

    sendSuccess(res, 200, 'Region assigned', region);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getCFAList,
  assignRegion,
};
