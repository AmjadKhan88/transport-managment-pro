import mongoose from "mongoose";
import Trip, { TRIP_STATUSES } from "../models/Trip.js";
import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import Customer from "../models/Customer.js";
import { ApiError } from "../utils/ApiError.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
} from "../utils/queryHelpers.js";

const { ObjectId } = mongoose.Types;

const TEXT_FIELDS = [
  "tripDate",
  "biltyNumber",
  "from",
  "to",
  "status",
  "notes",
];
const MONEY_FIELDS = [
  "freightAmount",
  "advance",
  "dieselLiters",
  "dieselCost",
  "tollTax",
  "driverTripExpense",
  "otherExpenses",
];
const REFS = {
  vehicle: [Vehicle, "Vehicle"],
  driver: [Driver, "Driver"],
  customer: [Customer, "Customer"],
};

const POPULATE = [
  { path: "vehicle", select: "vehicleNumber make model" },
  { path: "driver", select: "name" },
  { path: "customer", select: "name companyName" },
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

function applyBody(trip, body) {
  for (const k of TEXT_FIELDS) if (has(body, k)) trip.set(k, clean(body[k]));
  for (const k of MONEY_FIELDS)
    if (has(body, k)) trip.set(k, Number(body[k]) || 0);
  for (const k of Object.keys(REFS))
    if (has(body, k)) trip.set(k, body[k] || null);
}

const findOrFail = async (id) => {
  const trip = await Trip.findOne({ _id: id, isDeleted: false });
  if (!trip) throw new ApiError(404, "Trip not found");
  return trip;
};

// "2026-10-31" -> start or end of that day (UTC, same as how trip dates are stored)
const parseDay = (s, endOfDay = false) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s || "")
    ? new Date(`${s}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
    : null;

function buildFilter(q) {
  const filter = { isDeleted: false };

  for (const k of ["vehicle", "driver", "customer"]) {
    if (typeof q[k] === "string" && ObjectId.isValid(q[k]))
      filter[k] = new ObjectId(q[k]);
  }
  if (TRIP_STATUSES.includes(q.status)) filter.status = q.status;

  const from = parseDay(q.from);
  const to = parseDay(q.to, true);
  if (from || to)
    filter.tripDate = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  if (typeof q.search === "string" && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ biltyNumber: rx }, { from: rx }, { to: rx }];
  }
  return filter;
}

const SORTS = {
  newest: { tripDate: -1, createdAt: -1 },
  oldest: { tripDate: 1, createdAt: 1 },
  profit: { netProfit: -1 },
  freight: { freightAmount: -1 },
};

const ZERO_TOTALS = {
  count: 0,
  freight: 0,
  advance: 0,
  remaining: 0,
  dieselLiters: 0,
  diesel: 0,
  toll: 0,
  driverExpense: 0,
  other: 0,
  expense: 0,
  net: 0,
};

async function getTotals(filter) {
  // cancelled trips never count, unless the user is looking at cancelled trips
  const match = filter.status
    ? filter
    : { ...filter, status: { $ne: "cancelled" } };
  const [row] = await Trip.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        freight: { $sum: "$freightAmount" },
        advance: { $sum: "$advance" },
        remaining: { $sum: "$remainingAmount" },
        dieselLiters: { $sum: "$dieselLiters" },
        diesel: { $sum: "$dieselCost" },
        toll: { $sum: "$tollTax" },
        driverExpense: { $sum: "$driverTripExpense" },
        other: { $sum: "$otherExpenses" },
        expense: { $sum: "$totalExpense" },
        net: { $sum: "$netProfit" },
      },
    },
  ]);
  if (!row) return ZERO_TOTALS;
  const { _id, ...totals } = row;
  return totals;
}

export const listTrips = async (req, res) => {
  const filter = buildFilter(req.query);
  const pagination = getPagination(req.query);

  const [data, total, totals] = await Promise.all([
    Trip.find(filter)
      .sort(SORTS[req.query.sort] || SORTS.newest)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(POPULATE),
    Trip.countDocuments(filter),
    getTotals(filter),
  ]);

  res.json({ success: true, data, meta: buildMeta(pagination, total), totals });
};

export const getTrip = async (req, res) => {
  const trip = await findOrFail(req.params.id);
  await trip.populate(POPULATE);
  res.json({ success: true, data: trip });
};

export const createTrip = async (req, res) => {
  await assertRefs(req.body);
  const trip = new Trip();
  applyBody(trip, req.body);
  trip.createdBy = req.user._id;
  await trip.save();
  await trip.populate(POPULATE);
  res.status(201).json({ success: true, data: trip });
};

export const updateTrip = async (req, res) => {
  const trip = await findOrFail(req.params.id);
  await assertRefs(req.body);
  applyBody(trip, req.body);
  await trip.save();
  await trip.populate(POPULATE);
  res.json({ success: true, data: trip });
};

export const deleteTrip = async (req, res) => {
  const trip = await findOrFail(req.params.id);
  trip.isDeleted = true;
  await trip.save();
  res.json({ success: true, message: "Trip deleted" });
};
