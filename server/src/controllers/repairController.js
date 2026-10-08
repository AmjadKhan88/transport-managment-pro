import Repair, { REPAIR_CATEGORIES } from "../models/Repair.js";
import Vehicle from "../models/Vehicle.js";
import { ApiError } from "../utils/ApiError.js";
import { PAYMENT_STATUSES } from "../config/payment.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
  dateRangeFilter,
  toObjectId,
} from "../utils/queryHelpers.js";

const TEXT_FIELDS = [
  "repairDate",
  "category",
  "mechanic",
  "parts",
  "description",
  "billNumber",
  "nextMaintenanceDate",
  "paymentMethod",
  "paymentStatus",
];
const MONEY_FIELDS = ["partsCost", "laborCost"];
const POPULATE = [{ path: "vehicle", select: "vehicleNumber make model" }];

const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);
const has = (obj, key) => Object.hasOwn(obj, key);

async function assertVehicle(body) {
  if (
    body.vehicle &&
    !(await Vehicle.exists({ _id: body.vehicle, isDeleted: false }))
  ) {
    throw new ApiError(404, "Vehicle not found");
  }
}

function applyBody(repair, body) {
  for (const k of TEXT_FIELDS) if (has(body, k)) repair.set(k, clean(body[k]));
  for (const k of MONEY_FIELDS)
    if (has(body, k)) repair.set(k, Number(body[k]) || 0);
  if (has(body, "vehicle")) repair.set("vehicle", body.vehicle || null);
}

const findOrFail = async (id) => {
  const repair = await Repair.findOne({ _id: id, isDeleted: false });
  if (!repair) throw new ApiError(404, "Repair record not found");
  return repair;
};

function buildFilter(q) {
  const filter = { isDeleted: false };
  const vehicle = toObjectId(q.vehicle);
  if (vehicle) filter.vehicle = vehicle;
  if (REPAIR_CATEGORIES.includes(q.category)) filter.category = q.category;
  if (PAYMENT_STATUSES.includes(q.paymentStatus))
    filter.paymentStatus = q.paymentStatus;

  const range = dateRangeFilter(q.from, q.to);
  if (range) filter.repairDate = range;

  if (typeof q.search === "string" && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [
      { mechanic: rx },
      { parts: rx },
      { description: rx },
      { billNumber: rx },
    ];
  }
  return filter;
}

const SORTS = {
  newest: { repairDate: -1, createdAt: -1 },
  oldest: { repairDate: 1, createdAt: 1 },
  cost: { totalCost: -1 },
};

async function getTotals(filter) {
  const [row] = await Repair.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        parts: { $sum: "$partsCost" },
        labor: { $sum: "$laborCost" },
        total: { $sum: "$totalCost" },
        unpaid: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$totalCost", 0],
          },
        },
      },
    },
  ]);
  return row
    ? {
        count: row.count,
        parts: row.parts,
        labor: row.labor,
        total: row.total,
        unpaid: row.unpaid,
      }
    : { count: 0, parts: 0, labor: 0, total: 0, unpaid: 0 };
}

export const listRepairs = async (req, res) => {
  const filter = buildFilter(req.query);
  const pagination = getPagination(req.query);

  const [data, total, totals] = await Promise.all([
    Repair.find(filter)
      .sort(SORTS[req.query.sort] || SORTS.newest)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(POPULATE),
    Repair.countDocuments(filter),
    getTotals(filter),
  ]);

  res.json({ success: true, data, meta: buildMeta(pagination, total), totals });
};

export const listWorkshops = async (req, res) => {
  const names = await Repair.distinct("mechanic", { isDeleted: false });
  res.json({
    success: true,
    data: names.filter(Boolean).sort((a, b) => a.localeCompare(b)),
  });
};

// Maintenance due: the LATEST repair of each (vehicle, category) with a next-maintenance date
// that is overdue or within `days` days. A newer repair of that category clears the reminder.
export const upcomingMaintenance = async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const horizon = new Date();
  horizon.setUTCHours(23, 59, 59, 999);
  horizon.setUTCDate(horizon.getUTCDate() + days);

  const rows = await Repair.aggregate([
    { $match: { isDeleted: false } },
    { $sort: { repairDate: -1, createdAt: -1 } },
    {
      $group: {
        _id: { vehicle: "$vehicle", category: "$category" },
        doc: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$doc" } },
    { $match: { nextMaintenanceDate: { $ne: null, $lte: horizon } } },
    { $sort: { nextMaintenanceDate: 1 } },
    { $limit: 50 },
  ]);

  const vehicles = await Vehicle.find({
    _id: { $in: rows.map((r) => r.vehicle) },
    isDeleted: false,
    status: { $ne: "sold" },
  }).select("vehicleNumber make model");
  const vMap = new Map(vehicles.map((v) => [String(v._id), v.toJSON()]));

  const data = rows
    .filter((r) => vMap.has(String(r.vehicle)))
    .map((r) => ({
      id: String(r._id),
      category: r.category,
      repairDate: r.repairDate,
      nextMaintenanceDate: r.nextMaintenanceDate,
      vehicle: vMap.get(String(r.vehicle)),
    }));

  res.json({ success: true, data });
};

export const getRepair = async (req, res) => {
  const repair = await findOrFail(req.params.id);
  await repair.populate(POPULATE);
  res.json({ success: true, data: repair });
};

export const createRepair = async (req, res) => {
  await assertVehicle(req.body);
  const body = { ...req.body };
  if (!has(body, "paymentStatus"))
    body.paymentStatus = body.paymentMethod === "credit" ? "unpaid" : "paid";

  const repair = new Repair();
  applyBody(repair, body);
  repair.createdBy = req.user._id;
  await repair.save();
  await repair.populate(POPULATE);
  res.status(201).json({ success: true, data: repair });
};

export const updateRepair = async (req, res) => {
  const repair = await findOrFail(req.params.id);
  await assertVehicle(req.body);
  applyBody(repair, req.body);
  await repair.save();
  await repair.populate(POPULATE);
  res.json({ success: true, data: repair });
};

export const deleteRepair = async (req, res) => {
  const repair = await findOrFail(req.params.id);
  repair.isDeleted = true;
  await repair.save();
  res.json({ success: true, message: "Repair record deleted" });
};
