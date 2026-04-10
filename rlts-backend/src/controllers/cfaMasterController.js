const CFA = require('../models/CFA');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');
const { writeAuditLog } = require('../services/auditService');
const logger = require('../utils/logger');
const xlsx = require('xlsx');

/**
 * GET /api/admin/cfa-master
 */
const listCFAs = async (req, res, next) => {
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
    const [cfas, total] = await Promise.all([
      CFA.find(filter).sort({ code: 1 }).skip(skip).limit(parseInt(limit)),
      CFA.countDocuments(filter),
    ]);

    // Enrich with user count and complaint stats
    const enriched = await Promise.all(cfas.map(async (cfa) => {
      const [userCount, complaintCount, activeComplaints] = await Promise.all([
        User.countDocuments({ cfaEntity: cfa._id, isActive: true }),
        Complaint.countDocuments({ cfaEntity: cfa._id }),
        Complaint.countDocuments({ cfaEntity: cfa._id, status: { $in: Complaint.OPEN_STATUSES } }),
      ]);
      return { ...cfa.toJSON(), userCount, complaintCount, activeComplaints };
    }));

    sendPaginated(res, 'CFA list retrieved', enriched, page, limit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/cfa-master
 */
const createCFA = async (req, res, next) => {
  try {
    const { code, company, region } = req.body;
    if (!code) return sendError(res, 400, 'CFA code (Sales Office) is required.');

    const existing = await CFA.findOne({ code: { $regex: new RegExp(`^${code.trim()}$`, 'i') } });
    if (existing) return sendError(res, 409, `CFA with code '${code}' already exists.`);

    const cfa = await CFA.create({ code: code.trim().toUpperCase(), company, region });

    writeAuditLog({
      action: 'CFA_CREATED',
      performedBy: req.user._id,
      targetId: cfa._id,
      targetModel: 'CFA',
      after: { code: cfa.code, company, region },
      req,
    });

    sendSuccess(res, 201, 'CFA entity created', cfa);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/cfa-master/:id
 */
const getCFA = async (req, res, next) => {
  try {
    const cfa = await CFA.findById(req.params.id);
    if (!cfa) return sendError(res, 404, 'CFA not found.');

    const [users, complaintCount, activeComplaints] = await Promise.all([
      User.find({ cfaEntity: cfa._id }).select('-password').sort({ createdAt: -1 }),
      Complaint.countDocuments({ cfaEntity: cfa._id }),
      Complaint.countDocuments({ cfaEntity: cfa._id, status: { $in: Complaint.OPEN_STATUSES } }),
    ]);

    sendSuccess(res, 200, 'CFA retrieved', {
      cfa,
      users,
      stats: { complaintCount, activeComplaints },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/cfa-master/:id
 */
const updateCFA = async (req, res, next) => {
  try {
    const cfa = await CFA.findById(req.params.id);
    if (!cfa) return sendError(res, 404, 'CFA not found.');

    const before = { code: cfa.code, company: cfa.company, region: cfa.region };

    if (req.body.code !== undefined) cfa.code = req.body.code.trim().toUpperCase();
    if (req.body.company !== undefined) cfa.company = req.body.company;
    if (req.body.region !== undefined) cfa.region = req.body.region;
    if (req.body.isActive !== undefined) cfa.isActive = req.body.isActive;

    await cfa.save();

    writeAuditLog({
      action: 'CFA_UPDATED',
      performedBy: req.user._id,
      targetId: cfa._id,
      targetModel: 'CFA',
      before,
      after: { code: cfa.code, company: cfa.company, region: cfa.region },
      req,
    });

    sendSuccess(res, 200, 'CFA updated', cfa);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/cfa-master/:id
 */
const deactivateCFA = async (req, res, next) => {
  try {
    const cfa = await CFA.findById(req.params.id);
    if (!cfa) return sendError(res, 404, 'CFA not found.');

    const activeComplaints = await Complaint.countDocuments({
      cfaEntity: cfa._id,
      status: { $in: ['CFA_ASSIGNED', 'PICKED_UP'] },
    });

    if (activeComplaints > 0) {
      return sendError(res, 422, `Cannot deactivate CFA with ${activeComplaints} active complaint(s). Reassign first.`);
    }

    cfa.isActive = false;
    await cfa.save();

    writeAuditLog({
      action: 'CFA_DEACTIVATED',
      performedBy: req.user._id,
      targetId: cfa._id,
      targetModel: 'CFA',
      before: { isActive: true },
      after: { isActive: false },
      req,
    });

    sendSuccess(res, 200, 'CFA deactivated', cfa);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/cfa-master/:id/users
 */
const createCFAUser = async (req, res, next) => {
  try {
    const cfa = await CFA.findById(req.params.id);
    if (!cfa) return sendError(res, 404, 'CFA not found.');

    const { email, password, name, roleLabel } = req.body;
    if (!email || !password) return sendError(res, 400, 'Email and password are required.');

    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 409, 'An account with this email already exists.');

    const user = await User.create({
      name: name || `CFA ${cfa.code} User`,
      email,
      password,
      role: 'cfa',
      roleLabel: roleLabel || 'cfa-employee',
      cfaEntity: cfa._id,
      isActive: true,
    });

    writeAuditLog({
      action: 'CFA_USER_CREATED',
      performedBy: req.user._id,
      targetId: user._id,
      targetModel: 'User',
      after: { email, role: 'cfa', cfaEntity: cfa._id, roleLabel: user.roleLabel },
      req,
    });

    sendSuccess(res, 201, 'CFA user created', user);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/cfa-master/:id/users
 */
const getCFAUsers = async (req, res, next) => {
  try {
    const cfa = await CFA.findById(req.params.id);
    if (!cfa) return sendError(res, 404, 'CFA not found.');

    const users = await User.find({ cfaEntity: cfa._id }).select('-password').sort({ createdAt: -1 });
    sendSuccess(res, 200, 'CFA users retrieved', users);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/cfa-master/import
 */
const importCFA = async (req, res, next) => {
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

      const codeRaw = normalizedRow['sales office code'] || normalizedRow['sales office'];
      if (!codeRaw) {
        skipped++;
        errors.push(`Row ${i + 2}: Missing Sales Office Code or Sales Office column.`);
        continue;
      }

      const code = String(codeRaw).trim().toUpperCase();
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
      const result = await CFA.bulkWrite(bulkOps);
      imported = result.upsertedCount;
      updated = result.modifiedCount;
    }

    sendSuccess(res, 200, 'Import completed', { imported, updated, skipped, errors });
  } catch (error) {
    logger.error('Error importing CFAs:', error);
    sendError(res, 500, 'Failed to import CFAs');
  }
};

/**
 * GET /api/admin/cfa-master/export
 */
const exportCFA = async (req, res, next) => {
  try {
    const cfas = await CFA.find().sort({ code: 1 });
    
    const data = cfas.map(c => ({
      'Sales Office Code': c.code,
      'Sales Office': c.code,
      'Country': c.country || '',
      'Region': c.region || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'CFAs');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="CFA_Master.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    logger.error('Error exporting CFAs:', error);
    sendError(res, 500, 'Failed to export CFAs');
  }
};

module.exports = {
  listCFAs,
  createCFA,
  getCFA,
  updateCFA,
  deactivateCFA,
  createCFAUser,
  getCFAUsers,
  importCFA,
  exportCFA,
};
