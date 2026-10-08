import DieselEntry from "../models/DieselEntry.js";
import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import Trip from "../models/Trip.js";
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
  "fuelDate",
  "fuelStation",
  "paymentMethod",
  "paymentStatus",
  "route",
  "receiptNumber",
  "notes",
];
const NUM_FIELDS = ["liters", "ratePerLiter"];
const REFS = { vehicle: [Vehicle, "Vehicle"], driver: [Driver, "Driver"] };
const POPULATE = [
  { path: "vehicle", select: "vehicleNumber make model" },
  { path: "driver", select: "name" },
];

const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);
const has = (obj, key) => Object.hasOwn(obj, key);

async function assertRefs(body) {
  for (const [key, [Model, label]] of Object.entries(REFS)) {
    if (
      body[key] &&
      !(await Model.exists({ _id: body[key], isDeleted: false }))
    ) {
      throw new ApiError(404, `${label} not found`);
    }
  }
}

function applyBody(entry, body) {
  for (const k of TEXT_FIELDS) if (has(body, k)) entry.set(k, clean(body[k]));
  for (const k of NUM_FIELDS)
    if (has(body, k)) entry.set(k, Number(body[k]) || 0);
  for (const k of Object.keys(REFS))
    if (has(body, k)) entry.set(k, body[k] || null);
}

const findOrFail = async (id) => {
  const entry = await DieselEntry.findOne({ _id: id, isDeleted: false });
  if (!entry) throw new ApiError(404, "Fuel entry not found");
  return entry;
};

function buildFilter(q) {
  const filter = { isDeleted: false };
  const vehicle = toObjectId(q.vehicle);
  const driver = toObjectId(q.driver);
  if (vehicle) filter.vehicle = vehicle;
  if (driver) filter.driver = driver;
  if (PAYMENT_STATUSES.includes(q.paymentStatus))
    filter.paymentStatus = q.paymentStatus;

  const range = dateRangeFilter(q.from, q.to);
  if (range) filter.fuelDate = range;

  if (typeof q.search === "string" && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ fuelStation: rx }, { receiptNumber: rx }, { route: rx }];
  }
  return filter;
}

const SORTS = {
  newest: { fuelDate: -1, createdAt: -1 },
  oldest: { fuelDate: 1, createdAt: 1 },
  amount: { totalAmount: -1 },
  liters: { liters: -1 },
};

async function getTotals(filter) {
  const [row] = await DieselEntry.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        liters: { $sum: "$liters" },
        amount: { $sum: "$totalAmount" },
        unpaid: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$totalAmount", 0],
          },
        },
      },
    },
  ]);
  return row
    ? {
        count: row.count,
        liters: row.liters,
        amount: row.amount,
        unpaid: row.unpaid,
      }
    : { count: 0, liters: 0, amount: 0, unpaid: 0 };
}

export const listDiesel = async (req, res) => {
  const filter = buildFilter(req.query);
  const pagination = getPagination(req.query);

  const [data, total, totals] = await Promise.all([
    DieselEntry.find(filter)
      .sort(SORTS[req.query.sort] || SORTS.newest)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(POPULATE),
    DieselEntry.countDocuments(filter),
    getTotals(filter),
  ]);

  res.json({ success: true, data, meta: buildMeta(pagination, total), totals });
};

// Distinct station names for the autocomplete
export const listStations = async (req, res) => {
  const names = await DieselEntry.distinct("fuelStation", { isDeleted: false });
  res.json({
    success: true,
    data: names.filter(Boolean).sort((a, b) => a.localeCompare(b)),
  });
};

const GROUP_FORMATS = { day: "%Y-%m-%d", month: "%Y-%m", year: "%Y" };

export const dieselReport = async (req, res) => {
  const groupBy = ["day", "month", "year", "vehicle"].includes(
    req.query.groupBy,
  )
    ? req.query.groupBy
    : "month";
  const filter = buildFilter(req.query);
  let rows;

  if (groupBy === "vehicle") {
    const grouped = await DieselEntry.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$vehicle",
          entries: { $sum: 1 },
          liters: { $sum: "$liters" },
          amount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { amount: -1 } },
    ]);
    const ids = grouped.map((g) => g._id);

    const tripMatch = {
      isDeleted: false,
      status: { $ne: "cancelled" },
      vehicle: { $in: ids },
    };
    const range = dateRangeFilter(req.query.from, req.query.to);
    if (range) tripMatch.tripDate = range;

    const [vehicles, tripCounts] = await Promise.all([
      Vehicle.find({ _id: { $in: ids } }).select("vehicleNumber make model"),
      Trip.aggregate([
        { $match: tripMatch },
        { $group: { _id: "$vehicle", trips: { $sum: 1 } } },
      ]),
    ]);
    const vMap = new Map(vehicles.map((v) => [String(v._id), v.toJSON()]));
    const tMap = new Map(tripCounts.map((t) => [String(t._id), t.trips]));

    rows = grouped.map((g) => {
      const trips = tMap.get(String(g._id)) || 0;
      return {
        key: String(g._id),
        vehicle: vMap.get(String(g._id)) ?? null,
        entries: g.entries,
        liters: g.liters,
        amount: g.amount,
        avgRate: g.liters ? g.amount / g.liters : 0,
        trips,
        costPerTrip: trips ? g.amount / trips : null,
      };
    });
  } else {
    const grouped = await DieselEntry.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: GROUP_FORMATS[groupBy],
              date: "$fuelDate",
            },
          },
          entries: { $sum: 1 },
          liters: { $sum: "$liters" },
          amount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: -1 } },
    ]);
    rows = grouped.map((g) => ({
      key: g._id,
      entries: g.entries,
      liters: g.liters,
      amount: g.amount,
      avgRate: g.liters ? g.amount / g.liters : 0,
    }));
  }

  const totals = rows.reduce(
    (t, r) => ({
      entries: t.entries + r.entries,
      liters: t.liters + r.liters,
      amount: t.amount + r.amount,
    }),
    { entries: 0, liters: 0, amount: 0 },
  );

  res.json({ success: true, data: rows, totals, groupBy });
};

export const getDiesel = async (req, res) => {
  const entry = await findOrFail(req.params.id);
  await entry.populate(POPULATE);
  res.json({ success: true, data: entry });
};

export const createDiesel = async (req, res) => {
  await assertRefs(req.body);
  const body = { ...req.body };
  if (!has(body, "paymentStatus"))
    body.paymentStatus = body.paymentMethod === "credit" ? "unpaid" : "paid";

  const entry = new DieselEntry();
  applyBody(entry, body);
  entry.createdBy = req.user._id;
  await entry.save();
  await entry.populate(POPULATE);
  res.status(201).json({ success: true, data: entry });
};

export const updateDiesel = async (req, res) => {
  const entry = await findOrFail(req.params.id);
  await assertRefs(req.body);
  applyBody(entry, req.body);
  await entry.save();
  await entry.populate(POPULATE);
  res.json({ success: true, data: entry });
};

export const deleteDiesel = async (req, res) => {
  const entry = await findOrFail(req.params.id);
  entry.isDeleted = true;
  await entry.save();
  res.json({ success: true, message: "Fuel entry deleted" });
};
