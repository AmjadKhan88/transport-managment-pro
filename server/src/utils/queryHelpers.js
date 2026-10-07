export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getPagination = (
  query,
  { defaultLimit = 10, maxLimit = 100 } = {},
) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || defaultLimit, 1),
    maxLimit,
  );
  return { page, limit, skip: (page - 1) * limit };
};

export const buildMeta = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  pages: Math.max(Math.ceil(total / limit), 1),
});
