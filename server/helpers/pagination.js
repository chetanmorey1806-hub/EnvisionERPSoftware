/**
 * Pagination helpers for list endpoints.
 *
 *   const { page, limit, offset } = parsePagination(req.query);
 *   const rows = await Model.raw(`... LIMIT ? OFFSET ?`, [limit, offset]);
 *   return success(res, { data: rows, meta: buildMeta(total, page, limit) });
 */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function parsePagination(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  return { page, limit, offset: (page - 1) * limit };
}

function buildMeta(total, page, limit) {
  const totalItems = Number(total) || 0;
  return {
    total: totalItems,
    page,
    limit,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    hasNext: page * limit < totalItems,
    hasPrev: page > 1,
  };
}

module.exports = { parsePagination, buildMeta, MAX_LIMIT, DEFAULT_LIMIT };
