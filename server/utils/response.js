/**
 * Standard JSON response helpers.
 *
 * Contract (matches the React client's expectations):
 *   success  -> { success: true, message, ...payload }   e.g. { token, user } or { data, meta }
 *   failure  -> { success: false, message }               (client reads err.response.data.message)
 */

function success(res, payload = {}, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, message, ...payload });
}

function created(res, payload = {}, message = 'Created') {
  return success(res, payload, message, 201);
}

function fail(res, message = 'Request failed', status = 400, extra = {}) {
  return res.status(status).json({ success: false, message, ...extra });
}

module.exports = { success, created, fail };
