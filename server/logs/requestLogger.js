/**
 * Express middleware that logs every HTTP request once the response finishes:
 *   METHOD /path -> status (duration ms)
 * Errors (5xx) are logged at 'warn', everything else at 'info'.
 */
const logger = require('./logger');

module.exports = function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const line = `${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)}ms)`;
    if (res.statusCode >= 500) logger.warn(line);
    else logger.info(line);
  });

  next();
};
