/**
 * 404 handler + centralized error handler.
 * Translates common MySQL/JWT errors into clean HTTP responses.
 */
const logger = require('../logs/logger');

function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error.';

  switch (err.code) {
    case 'ER_DUP_ENTRY':
      status = 409;
      message = 'A record with these details already exists.';
      break;
    case 'ER_NO_REFERENCED_ROW_2':
    case 'ER_ROW_IS_REFERENCED_2':
      status = 409;
      message = 'This action conflicts with a related record.';
      break;
    case 'ER_BAD_FIELD_ERROR':
    case 'ER_PARSE_ERROR':
      status = 500;
      message = 'A database query error occurred.';
      break;
    case 'ECONNREFUSED':
    case 'ER_ACCESS_DENIED_ERROR':
      status = 503;
      message = 'Database is unavailable. Please try again shortly.';
      break;
    default:
      break;
  }

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, err);
  }

  return res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
