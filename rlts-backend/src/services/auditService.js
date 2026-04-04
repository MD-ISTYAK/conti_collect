const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Write an audit log entry asynchronously (non-blocking).
 */
const writeAuditLog = async ({ action, performedBy, targetId, targetModel, before, after, req }) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      targetId,
      targetModel,
      before: before || null,
      after: after || null,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get('User-Agent') || null,
    });
  } catch (error) {
    // Audit log failures should not break the main flow
    logger.error(`Audit log write failed: ${error.message}`, { action, targetId });
  }
};

module.exports = { writeAuditLog };
