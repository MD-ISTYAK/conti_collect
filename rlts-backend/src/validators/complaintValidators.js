const Joi = require('joi');

const createComplaintSchema = {
  body: Joi.object({
    productType: Joi.string().valid('tire', 'glass', 'motor_part', 'battery', 'other').required()
      .messages({ 'any.required': 'Product type is required', 'any.only': 'Invalid product type' }),
    productName: Joi.string().trim().max(200).required()
      .messages({ 'any.required': 'Product name is required', 'string.max': 'Product name must be under 200 characters' }),
    quantity: Joi.number().integer().min(1).max(10000).required()
      .messages({ 'any.required': 'Quantity is required', 'number.integer': 'Quantity must be an integer', 'number.min': 'Quantity must be at least 1' }),
    reason: Joi.string().valid('defective', 'wrong_item', 'damaged', 'expired', 'other').required()
      .messages({ 'any.required': 'Return reason is required', 'any.only': 'Invalid return reason' }),
    description: Joi.string().trim().max(1000).allow('', null),
  }),
};

const approveComplaintSchema = {
  body: Joi.object({
    notes: Joi.string().trim().allow('', null),
  }),
};

const rejectComplaintSchema = {
  body: Joi.object({
    rejectionReason: Joi.string().trim().min(10).required()
      .messages({ 'any.required': 'Rejection reason is required', 'string.min': 'Rejection reason must be at least 10 characters' }),
  }),
};

const assignCfaSchema = {
  body: Joi.object({
    cfaId: Joi.string().required()
      .messages({ 'any.required': 'CFA ID is required' }),
    estimatedPickupDate: Joi.date().iso().greater('now').required()
      .messages({ 'any.required': 'Estimated pickup date is required', 'date.greater': 'Pickup date must be in the future' }),
  }),
};

const verifyComplaintSchema = {
  body: Joi.object({
    adminNotes: Joi.string().trim().allow('', null),
  }),
};

const processRefundSchema = {
  body: Joi.object({
    refundAmount: Joi.number().positive().max(1000000).precision(2).required()
      .messages({ 'any.required': 'Refund amount is required', 'number.positive': 'Amount must be positive' }),
    refundReference: Joi.string().trim().required()
      .messages({ 'any.required': 'Refund reference number is required' }),
    note: Joi.string().trim().allow('', null),
  }),
};

const complaintQuerySchema = {
  query: Joi.object({
    status: Joi.string().valid('CREATED', 'APPROVED', 'REJECTED', 'CFA_ASSIGNED', 'PICKED_UP', 'RECEIVED_AT_CFA', 'VERIFIED', 'REFUND_PROCESSED')
      .allow('', null),
    dealerId: Joi.string().allow('', null),
    cfaId: Joi.string().allow('', null),
    productType: Joi.string().valid('tire', 'glass', 'motor_part', 'battery', 'other')
      .allow('', null),
    dateFrom: Joi.date().iso().allow('', null),
    dateTo: Joi.date().iso().allow('', null),
    search: Joi.string().trim().allow('', null),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt').allow('', null),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').allow('', null),
  }),
};

module.exports = {
  createComplaintSchema,
  approveComplaintSchema,
  rejectComplaintSchema,
  assignCfaSchema,
  verifyComplaintSchema,
  processRefundSchema,
  complaintQuerySchema,
};
