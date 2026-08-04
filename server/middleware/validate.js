/**
 * validate(schema) — request-body validation middleware.
 * On failure responds 422 with { success, message, errors: [{ field, message }] }.
 *
 *   router.post('/', validate(courseCreateSchema), h(CourseController.create));
 */
const { validate: runValidation } = require('../validations/validator');
const { fail } = require('../utils/response');

module.exports = function validate(schema) {
  return (req, res, next) => {
    const { valid, errors } = runValidation(schema, req.body || {});
    if (!valid) {
      return fail(res, errors[0].message, 422, { errors });
    }
    return next();
  };
};
