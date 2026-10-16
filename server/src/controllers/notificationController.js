import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { MODULES, hasPermission } from "../config/permissions.js";
import {
  getPagination,
  buildMeta,
  dateRangeFilter,
} from "../utils/queryHelpers.js";

const ACTION_PREF = { create: "added", update: "changed", delete: "deleted" };

const visibleModules = (user) =>
  MODULES.filter((m) => hasPermission(user.role, m, "view"));

const prefsOf = (user) => {
  const p = user.notificationPrefs || {};
  return {
    added: p.added ?? true,
    changed: p.changed ?? true,
    deleted: p.deleted ?? true,
    alerts: p.alerts ?? true,
  };
};

// What this person may see: only their areas, never their own actions, only the kinds they switched on
function visibleFilter(user) {
  const prefs = prefsOf(user);
  const actions = Object.entries(ACTION_PREF)
    .filter(([, key]) => prefs[key])
    .map(([action]) => action);

  const or = [];
  if (actions.length)
    or.push({
      kind: "activity",
      action: { $in: actions },
      "actor.id": { $ne: user._id },
    });
  if (prefs.alerts) or.push({ kind: "alert" });
  if (!or.length) return { _id: null }; // everything switched off: matches nothing

  return { module: { $in: visibleModules(user) }, $or: or };
}

// First time: start from "now" so nobody is flooded with old items
async function seenAtOf(user) {
  if (user.notificationsSeenAt) return user.notificationsSeenAt;
  const now = new Date();
  await User.updateOne({ _id: user._id }, { notificationsSeenAt: now });
  return now;
}

const toItem = (doc, seenAt) => ({
  ...doc.toJSON(),
  unread: doc.updatedAt > seenAt,
});

// Used by the bell: number of new items + the latest few
export const summary = async (req, res) => {
  const filter = visibleFilter(req.user);
  const seenAt = await seenAtOf(req.user);

  const [unread, docs] = await Promise.all([
    Notification.countDocuments({ ...filter, updatedAt: { $gt: seenAt } }),
    Notification.find(filter).sort({ updatedAt: -1 }).limit(8),
  ]);

  res.json({
    success: true,
    data: { unread, seenAt, items: docs.map((d) => toItem(d, seenAt)) },
  });
};

export const list = async (req, res) => {
  const { kind, resource, from, to } = req.query;
  const seenAt = await seenAtOf(req.user);

  const and = [visibleFilter(req.user)];
  if (["activity", "alert"].includes(kind)) and.push({ kind });
  if (typeof resource === "string" && resource) and.push({ resource });
  const range = dateRangeFilter(from, to);
  if (range) and.push({ updatedAt: range });

  const pagination = getPagination(req.query, { defaultLimit: 15 });
  const [docs, total] = await Promise.all([
    Notification.find({ $and: and })
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Notification.countDocuments({ $and: and }),
  ]);

  res.json({
    success: true,
    data: docs.map((d) => toItem(d, seenAt)),
    meta: buildMeta(pagination, total),
    seenAt,
  });
};

export const readAll = async (req, res) => {
  await User.updateOne(
    { _id: req.user._id },
    { notificationsSeenAt: new Date() },
  );
  res.json({ success: true });
};

const parseDate = (v) => {
  const d = new Date(v);
  return typeof v === "string" && !Number.isNaN(d.getTime()) ? d : null;
};

/**
 * "What work happened today?" Everyone's activity (including your own) in the areas you may see.
 * Ignores notification preferences on purpose.
 */
export const today = async (req, res) => {
  const now = new Date();
  const from =
    parseDate(req.query.from) ??
    new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = parseDate(req.query.to) ?? now;

  const base = {
    kind: "activity",
    module: { $in: visibleModules(req.user) },
    createdAt: { $gte: from, $lte: to },
  };

  const [grouped, docs] = await Promise.all([
    Notification.aggregate([
      { $match: base },
      {
        $group: {
          _id: { actor: "$actor.id", resource: "$resource" },
          name: { $first: "$actor.name" },
          role: { $first: "$actor.role" },
          count: { $sum: "$count" },
        },
      },
    ]),
    Notification.find(base).sort({ createdAt: -1 }).limit(100),
  ]);

  const people = new Map();
  const areas = new Map();
  let total = 0;

  for (const g of grouped) {
    const id = String(g._id.actor);
    const person = people.get(id) ?? {
      id,
      name: g.name,
      role: g.role,
      total: 0,
      areas: [],
    };
    person.total += g.count;
    person.areas.push({ resource: g._id.resource, count: g.count });
    people.set(id, person);

    areas.set(g._id.resource, (areas.get(g._id.resource) || 0) + g.count);
    total += g.count;
  }

  const byCount = (a, b) => b.count - a.count;
  res.json({
    success: true,
    data: {
      from,
      to,
      total,
      people: [...people.values()]
        .map((p) => ({ ...p, areas: p.areas.sort(byCount) }))
        .sort((a, b) => b.total - a.total),
      areas: [...areas.entries()]
        .map(([resource, count]) => ({ resource, count }))
        .sort(byCount),
      items: docs.map((d) => d.toJSON()),
    },
  });
};

export const getPreferences = async (req, res) => {
  res.json({ success: true, data: prefsOf(req.user) });
};

export const updatePreferences = async (req, res) => {
  const set = {};
  for (const key of ["added", "changed", "deleted", "alerts"]) {
    if (typeof req.body[key] === "boolean")
      set[`notificationPrefs.${key}`] = req.body[key];
  }
  if (Object.keys(set).length)
    await User.updateOne({ _id: req.user._id }, { $set: set });

  const fresh = await User.findById(req.user._id);
  res.json({ success: true, data: prefsOf(fresh) });
};
