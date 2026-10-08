import mongoose from "mongoose";

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

// "2026-10-31" -> start/end of that day (UTC, same as how dates are stored)
export const parseDay = (s, endOfDay = false) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s || "")
    ? new Date(`${s}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
    : null;

// Returns { $gte, $lte } for the given from/to strings, or null if neither is valid
export const dateRangeFilter = (from, to) => {
  const a = parseDay(from);
  const b = parseDay(to, true);
  return a || b ? { ...(a && { $gte: a }), ...(b && { $lte: b }) } : null;
};

export const toObjectId = (v) =>
  typeof v === "string" && mongoose.Types.ObjectId.isValid(v)
    ? new mongoose.Types.ObjectId(v)
    : null;
