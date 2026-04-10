const Joi = require('joi');

const createUserSchema = {
  body: Joi.object({
    name: Joi.string().trim().max(100).allow('', null).optional(),
    email: Joi.string().email().lowercase().trim().allow('', null).optional(),
    password: Joi.string()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .allow('', null)
      .optional()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, and a digit',
      }),
    role: Joi.string().valid('dealer', 'cfa').required(),
    code: Joi.string().trim().optional(),
    isPrimary: Joi.boolean().optional(),
    parentUserId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    phone: Joi.string().pattern(/^\d{10}$/).allow('', null)
      .messages({ 'string.pattern.base': 'Phone must be 10 digits' }),
    businessName: Joi.string().trim().allow('', null),
    address: Joi.object({
      street: Joi.string().trim().allow('', null),
      city: Joi.string().trim().allow('', null),
      state: Joi.string().trim().allow('', null),
      pincode: Joi.string().pattern(/^\d{6}$/).allow('', null),
      country: Joi.string().trim().default('India'),
    }).allow(null),
    region: Joi.string().trim().allow('', null),
  }),
};

const updateUserSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    email: Joi.string().email().lowercase().trim(),
    code: Joi.string().trim(),
    phone: Joi.string().pattern(/^\d{10}$/).allow('', null),
    businessName: Joi.string().trim().allow('', null),
    address: Joi.object({
      street: Joi.string().trim().allow('', null),
      city: Joi.string().trim().allow('', null),
      state: Joi.string().trim().allow('', null),
      pincode: Joi.string().pattern(/^\d{6}$/).allow('', null),
      country: Joi.string().trim(),
    }),
    region: Joi.string().trim().allow('', null),
    isActive: Joi.boolean(),
  }),
};

module.exports = { createUserSchema, updateUserSchema };
