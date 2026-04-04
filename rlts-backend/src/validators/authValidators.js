const Joi = require('joi');

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().trim().required()
      .messages({ 'any.required': 'Email is required', 'string.email': 'Invalid email format' }),
    password: Joi.string().required()
      .messages({ 'any.required': 'Password is required' }),
  }),
};

const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required()
      .messages({ 'any.required': 'Refresh token is required' }),
  }),
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required()
      .messages({ 'any.required': 'Current password is required' }),
    newPassword: Joi.string().min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'any.required': 'New password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, and a digit',
      }),
  }),
};

const fcmTokenSchema = {
  body: Joi.object({
    fcmToken: Joi.string().required()
      .messages({ 'any.required': 'FCM token is required' }),
  }),
};

const registerSchema = {
  body: Joi.object({
    name: Joi.string().trim().required()
      .messages({ 'any.required': 'Name is required' }),
    email: Joi.string().email().lowercase().trim().required()
      .messages({ 'any.required': 'Email is required', 'string.email': 'Invalid email format' }),
    password: Joi.string().min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'any.required': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, and a digit',
      }),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  fcmTokenSchema,
};
