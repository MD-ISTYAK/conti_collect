/**
 * Standard API response helpers
 */

const sendSuccess = (res, statusCode, message, data = null, meta = null) => {
  const response = {
    success: true,
    message,
  };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const sendError = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
  };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, message, data, page, limit, total) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
