import AuditLog from "../models/AuditLog.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
  dateRangeFilter,
} from "../utils/queryHelpers.js";

export const listAudit = async (req, res) => {
  const { search, action, resource, from, to } = req.query;

  const filter = {};
  if (typeof action === "string" && action) filter.action = action;
  if (typeof resource === "string" && resource) filter.resource = resource;
  const range = dateRangeFilter(from, to);
  if (range) filter.createdAt = range;
  if (typeof search === "string" && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { userName: rx },
      { userEmail: rx },
      { path: rx },
      { resourceId: rx },
      { ip: rx },
    ];
  }

  const pagination = getPagination(req.query, { defaultLimit: 15 });
  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, data, meta: buildMeta(pagination, total) });
};
