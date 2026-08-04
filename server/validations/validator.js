/**
 * Tiny declarative validator (no external deps).
 *
 * A schema maps a field name to a rule object:
 *   {
 *     email:    { required: true, type: 'email' },
 *     password: { required: true, type: 'string', min: 6, max: 64 },
 *     role:     { enum: ['admin', 'staff'] },
 *     amount:   { required: true, type: 'number', min: 1 },
 *   }
 *
 * validate(schema, data) -> { valid, errors: [{ field, message }] }
 * Rules only run when the field is present, EXCEPT `required`.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmpty(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function checkType(value, type) {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return !Number.isNaN(Number(value));
    case 'boolean': return typeof value === 'boolean' || value === 'true' || value === 'false' || value === 0 || value === 1;
    case 'array': return Array.isArray(value);
    case 'email': return typeof value === 'string' && EMAIL_RE.test(value);
    default: return true;
  }
}

function validateField(field, value, rule) {
  const errors = [];
  const label = rule.label || field;

  if (rule.required && isEmpty(value)) {
    errors.push({ field, message: `${label} is required.` });
    return errors; // no point running further rules
  }
  if (isEmpty(value)) return errors; // optional & absent -> skip

  if (rule.type && !checkType(value, rule.type)) {
    errors.push({ field, message: `${label} must be a valid ${rule.type}.` });
  }
  const asNumber = Number(value);
  const asLength = typeof value === 'string' || Array.isArray(value) ? value.length : null;

  if (rule.min !== undefined) {
    if (rule.type === 'number' && asNumber < rule.min) {
      errors.push({ field, message: `${label} must be at least ${rule.min}.` });
    } else if (asLength !== null && asLength < rule.min) {
      errors.push({ field, message: `${label} must be at least ${rule.min} characters.` });
    }
  }
  if (rule.max !== undefined) {
    if (rule.type === 'number' && asNumber > rule.max) {
      errors.push({ field, message: `${label} must be at most ${rule.max}.` });
    } else if (asLength !== null && asLength > rule.max) {
      errors.push({ field, message: `${label} must be at most ${rule.max} characters.` });
    }
  }
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push({ field, message: `${label} must be one of: ${rule.enum.join(', ')}.` });
  }
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    errors.push({ field, message: rule.patternMessage || `${label} is invalid.` });
  }
  return errors;
}

function validate(schema, data = {}) {
  const errors = [];
  for (const [field, rule] of Object.entries(schema)) {
    errors.push(...validateField(field, data[field], rule));
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { validate };
