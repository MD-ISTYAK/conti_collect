const Joi = require('joi');

const createUserSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, and a digit',
      }),
    role: Joi.string().valid('dealer', 'cfa').required(),
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
