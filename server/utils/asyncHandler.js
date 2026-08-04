/**
 * Wraps an async route handler so any thrown error / rejected promise is
 * forwarded to the central error handler instead of crashing the process.
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
