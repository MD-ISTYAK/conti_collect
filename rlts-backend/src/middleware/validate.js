const { sendError } = require('../utils/responseHelper');

/**
 * Joi schema validation middleware.
 * @param {Object} schema - Joi schema object with optional body, params, query keys
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        errors.push(...error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message.replace(/"/g, ''),
        })));
      } else {
        req.body = schema.body.validate(req.body, { stripUnknown: true }).value;
      }
    }

    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message.replace(/"/g, ''),
        })));
      }
    }

    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false, stripUnknown: true });
      if (error) {
        errors.push(...error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message.replace(/"/g, ''),
        })));
      } else {
        req.query = schema.query.validate(req.query, { stripUnknown: true }).value;
      }
    }

    if (errors.length > 0) {
      return sendError(res, 400, 'Validation failed', errors);
    }

    next();
  };
};

module.exports = validate;
