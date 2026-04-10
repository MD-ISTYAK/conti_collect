const Dealer = require('../models/Dealer');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');
const { writeAuditLog } = require('../services/auditService');
const logger = require('../utils/logger');
const xlsx = require('xlsx');

/**
 * GET /api/admin/dealer-master
 */
const listDealers = async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { region: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [dealers, total] = await Promise.all([
      Dealer.find(filter).sort({ code: 1 }).skip(skip).limit(parseInt(limit)),
      Dealer.countDocuments(filter),
    ]);

    const enriched = await Promise.all(dealers.map(async (dealer) => {
      const [userCount, complaintCount, activeComplaints] = await Promise.all([
        User.countDocuments({ dealerEntity: dealer._id, isActive: true }),
        Complaint.countDocuments({ dealerEntity: dealer._id }),
        Complaint.countDocuments({ dealerEntity: dealer._id, status: { $in: Complaint.OPEN_STATUSES } }),
      ]);
      return { ...dealer.toJSON(), userCount, complaintCount, activeComplaints };
    }));

    sendPaginated(res, 'Dealer list retrieved', enriched, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/dealer-master
 */
const createDealer = async (req, res, next) => {
  try {
    const { code, company, region } = req.body;
    if (!code) return sendError(res, 400, 'Dealer code (AG) is required.');

    const existing = await Dealer.findOne({ code: { $regex: new RegExp(`^${code.trim()}$`, 'i') } });
    if (existing) return sendError(res, 409, `Dealer with code '${code}' already exists.`);

    const dealer = await Dealer.create({ code: code.trim(), company, region });

    writeAuditLog({
      action: 'DEALER_CREATED',
      performedBy: req.user._id,
      targetId: dealer._id,
      targetModel: 'Dealer',
      after: { code: dealer.code, company, region },
      req,
    });

    sendSuccess(res, 201, 'Dealer entity created', dealer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/dealer-master/:id
 */
const getDealer = async (req, res, next) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    const [users, complaintCount, activeComplaints] = await Promise.all([
      User.find({ dealerEntity: dealer._id }).select('-password').sort({ createdAt: -1 }),
      Complaint.countDocuments({ dealerEntity: dealer._id }),
      Complaint.countDocuments({ dealerEntity: dealer._id, status: { $in: Complaint.OPEN_STATUSES } }),
    ]);

    sendSuccess(res, 200, 'Dealer retrieved', {
      dealer,
      users,
      stats: { complaintCount, activeComplaints },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/dealer-master/:id
 */
const updateDealer = async (req, res, next) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    const before = { code: dealer.code, company: dealer.company, region: dealer.region };

    if (req.body.code !== undefined) dealer.code = req.body.code.trim();
    if (req.body.company !== undefined) dealer.company = req.body.company;
    if (req.body.region !== undefined) dealer.region = req.body.region;
    if (req.body.isActive !== undefined) dealer.isActive = req.body.isActive;

    await dealer.save();

    writeAuditLog({
      action: 'DEALER_UPDATED',
      performedBy: req.user._id,
      targetId: dealer._id,
      targetModel: 'Dealer',
      before,
      after: { code: dealer.code, company: dealer.company, region: dealer.region },
      req,
    });

    sendSuccess(res, 200, 'Dealer updated', dealer);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/dealer-master/:id
 */
const deactivateDealer = async (req, res, next) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    dealer.isActive = false;
    await dealer.save();

    writeAuditLog({
      action: 'DEALER_DEACTIVATED',
      performedBy: req.user._id,
      targetId: dealer._id,
      targetModel: 'Dealer',
      before: { isActive: true },
      after: { isActive: false },
      req,
    });

    sendSuccess(res, 200, 'Dealer deactivated', dealer);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/dealer-master/:id/users
 */
const createDealerUser = async (req, res, next) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    const { email, password, name, roleLabel } = req.body;
    if (!email || !password) return sendError(res, 400, 'Email and password are required.');

    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 409, 'An account with this email already exists.');

    const user = await User.create({
      name: name || `Dealer ${dealer.code} User`,
      email,
      password,
      role: 'dealer',
      roleLabel: roleLabel || 'dealer-employee',
      dealerEntity: dealer._id,
      isActive: true,
    });

    writeAuditLog({
      action: 'DEALER_USER_CREATED',
      performedBy: req.user._id,
      targetId: user._id,
      targetModel: 'User',
      after: { email, role: 'dealer', dealerEntity: dealer._id, roleLabel: user.roleLabel },
      req,
    });

    sendSuccess(res, 201, 'Dealer user created', user);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/dealer-master/:id/users
 */
const getDealerUsers = async (req, res, next) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    const users = await User.find({ dealerEntity: dealer._id }).select('-password').sort({ createdAt: -1 });
    sendSuccess(res, 200, 'Dealer users retrieved', users);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/dealer-master/import
 */
const importDealer = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 400, 'No file uploaded');

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    const bulkOps = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const normalizedRow = {};
      Object.keys(row).forEach(k => {
        normalizedRow[k.trim().toLowerCase()] = row[k];
      });

      const codeRaw = normalizedRow['ag code'] || normalizedRow['ag'];
      if (!codeRaw) {
        skipped++;
        errors.push(`Row ${i + 2}: Missing AG Code or AG column.`);
        continue;
      }

      const code = String(codeRaw).trim();
      const countryRaw = normalizedRow['country'];
      const regionRaw = normalizedRow['region'];
      
      const updateData = {};
      if (countryRaw) updateData.country = String(countryRaw).trim();
      if (regionRaw) updateData.region = String(regionRaw).trim();

      bulkOps.push({
        updateOne: {
          filter: { code },
          update: { $set: updateData },
          upsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      const result = await Dealer.bulkWrite(bulkOps);
      imported = result.upsertedCount;
      updated = result.modifiedCount;
    }

    sendSuccess(res, 200, 'Import completed', { imported, updated, skipped, errors });
  } catch (error) {
    logger.error('Error importing Dealers:', error);
    sendError(res, 500, 'Failed to import Dealers');
  }
};

/**
 * GET /api/admin/dealer-master/export
 */
const exportDealer = async (req, res, next) => {
  try {
    const dealers = await Dealer.find().sort({ code: 1 });
    
    const data = dealers.map(d => ({
      'AG': d.code,
      'Country': d.country || '',
      'Region': d.region || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Dealers');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Dealer_Master.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    logger.error('Error exporting Dealers:', error);
    sendError(res, 500, 'Failed to export Dealers');
  }
};

module.exports = {
  listDealers,
  createDealer,
  getDealer,
  updateDealer,
  deactivateDealer,
  createDealerUser,
  getDealerUsers,
  importDealer,
  exportDealer,
};
