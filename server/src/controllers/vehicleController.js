import Vehicle, {
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  INVESTMENT_FIELDS,
} from "../models/Vehicle.js";
import { ApiError } from "../utils/ApiError.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
} from "../utils/queryHelpers.js";
import Driver from "../models/Driver.js";

const INFO_FIELDS = [
  "vehicleNumber",
  "registrationNumber",
  "type",
  "make",
  "model",
  "purchaseDate",
  "purchasePrice",
  "currentValue",
  "status",
  "notes",
];
const OWNERSHIP_FIELDS = ["ownerName", "ownershipType", "details"];

const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);
const has = (obj, key) => Object.hasOwn(obj, key);

// Copies only allowed fields from the request body onto the document
function applyBody(vehicle, body) {
  for (const k of INFO_FIELDS) if (has(body, k)) vehicle.set(k, clean(body[k]));

  if (body.ownership) {
    for (const k of OWNERSHIP_FIELDS) {
      if (has(body.ownership, k))
        vehicle.set(`ownership.${k}`, clean(body.ownership[k]));
    }
  }
  if (body.investment) {
    for (const k of INVESTMENT_FIELDS) {
      if (has(body.investment, k))
        vehicle.set(`investment.${k}`, Number(body.investment[k]) || 0);
    }
  }
}

const findOrFail = async (id) => {
  const vehicle = await Vehicle.findOne({ _id: id, isDeleted: false });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");
  return vehicle;
};

const SORTS = {
  newest: { createdAt: -1 },
  number: { vehicleNumber: 1 },
  investment: { totalInvestment: -1 },
};

const DRIVER_SELECT = "name phone status";

// Sets/clears the driver, making sure he isn't already on another truck
async function setDriver(vehicle, driverId) {
  if (!driverId) {
    vehicle.driver = null;
    return;
  }
  const driver = await Driver.findOne({ _id: driverId, isDeleted: false });
  if (!driver) throw new ApiError(404, "Driver not found");

  const other = await Vehicle.findOne({
    driver: driverId,
    isDeleted: false,
    _id: { $ne: vehicle._id },
  }).select("vehicleNumber");
  if (other)
    throw new ApiError(
      409,
      `${driver.name} is already assigned to Truck #${other.vehicleNumber}`,
    );

  vehicle.driver = driverId;
}

export const listVehicles = async (req, res) => {
  const { search, status, type, sort = "newest" } = req.query;

  const filter = { isDeleted: false };
  if (VEHICLE_STATUSES.includes(status)) filter.status = status;
  if (VEHICLE_TYPES.includes(type)) filter.type = type;
  if (typeof search === "string" && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { vehicleNumber: rx },
      { registrationNumber: rx },
      { make: rx },
      { model: rx },
    ];
  }

  const pagination = getPagination(req.query);

  const [data, total] = await Promise.all([
    Vehicle.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .collation({ locale: "en", numericOrdering: true }) // "311" before "1000"
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("driver", DRIVER_SELECT),
    Vehicle.countDocuments(filter),
  ]);

  res.json({ success: true, data, meta: buildMeta(pagination, total) });
};

export const getSummary = async (req, res) => {
  const rows = await Vehicle.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        investment: { $sum: "$totalInvestment" },
      },
    },
  ]);

  const byStatus = Object.fromEntries(VEHICLE_STATUSES.map((s) => [s, 0]));
  let total = 0;
  let totalInvestment = 0;
  for (const r of rows) {
    byStatus[r._id] = r.count;
    total += r.count;
    totalInvestment += r.investment;
  }

  res.json({ success: true, data: { total, byStatus, totalInvestment } });
};

export const getVehicle = async (req, res) => {
  const vehicle = await findOrFail(req.params.id);
  await vehicle.populate("driver", DRIVER_SELECT);
  res.json({ success: true, data: vehicle });
};

export const createVehicle = async (req, res) => {
  const vehicle = new Vehicle();
  applyBody(vehicle, req.body);
  if (has(req.body, "driver")) await setDriver(vehicle, req.body.driver);
  vehicle.createdBy = req.user._id;
  await vehicle.save();
  await vehicle.populate("driver", DRIVER_SELECT);
  res.status(201).json({ success: true, data: vehicle });
};

export const updateVehicle = async (req, res) => {
  const vehicle = await findOrFail(req.params.id);
  applyBody(vehicle, req.body);
  if (has(req.body, "driver")) await setDriver(vehicle, req.body.driver);
  await vehicle.save();
  await vehicle.populate("driver", DRIVER_SELECT);
  res.json({ success: true, data: vehicle });
};

// Soft delete. When Trips exist (Step 6) we'll also protect vehicles that have history.
export const deleteVehicle = async (req, res) => {
  const vehicle = await findOrFail(req.params.id);
  vehicle.isDeleted = true;
  await vehicle.save();
  res.json({ success: true, message: "Vehicle deleted" });
};

// Lightweight list for dropdowns (driver form)
export const vehicleOptions = async (req, res) => {
  const data = await Vehicle.find({ isDeleted: false, status: { $ne: "sold" } })
    .select("vehicleNumber make model status driver")
    .sort({ vehicleNumber: 1 })
    .collation({ locale: "en", numericOrdering: true });
  res.json({ success: true, data });
};
