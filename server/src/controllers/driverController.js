import Driver, { DRIVER_STATUSES } from "../models/Driver.js";
import Vehicle from "../models/Vehicle.js";
import { ApiError } from "../utils/ApiError.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
} from "../utils/queryHelpers.js";

const FIELDS = [
  "name",
  "fatherName",
  "cnic",
  "phone",
  "address",
  "joiningDate",
  "salary",
  "status",
  "notes",
];
const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);
const has = (obj, key) => Object.hasOwn(obj, key);

const applyBody = (driver, body) => {
  for (const k of FIELDS) if (has(body, k)) driver.set(k, clean(body[k]));
};

const findOrFail = async (id) => {
  const driver = await Driver.findOne({ _id: id, isDeleted: false });
  if (!driver) throw new ApiError(404, "Driver not found");
  return driver;
};

// Attaches the assigned vehicle ({ id, vehicleNumber, make, model, status } | null) to each driver
async function withVehicles(drivers) {
  const vehicles = await Vehicle.find({
    driver: { $in: drivers.map((d) => d._id) },
    isDeleted: false,
  }).select("vehicleNumber make model status driver");
  const byDriver = new Map(vehicles.map((v) => [String(v.driver), v.toJSON()]));
  return drivers.map((d) => ({
    ...d.toJSON(),
    vehicle: byDriver.get(String(d._id)) ?? null,
  }));
}

// Throws if the vehicle doesn't exist or already belongs to a different driver
async function assertVehicleFree(vehicleId, driverId) {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, isDeleted: false });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");
  if (vehicle.driver && String(vehicle.driver) !== String(driverId)) {
    throw new ApiError(
      409,
      `Truck #${vehicle.vehicleNumber} already has a driver assigned`,
    );
  }
}

// Unassign the driver's current vehicle(s), then assign the new one (or none)
async function assignVehicle(driverId, vehicleId) {
  await Vehicle.updateMany(
    {
      driver: driverId,
      isDeleted: false,
      ...(vehicleId ? { _id: { $ne: vehicleId } } : {}),
    },
    { driver: null },
  );
  if (vehicleId)
    await Vehicle.updateOne({ _id: vehicleId }, { driver: driverId });
}

const SORTS = {
  newest: { createdAt: -1 },
  name: { name: 1 },
  salary: { salary: -1 },
};

export const listDrivers = async (req, res) => {
  const { search, status, sort = "newest" } = req.query;

  const filter = { isDeleted: false };
  if (DRIVER_STATUSES.includes(status)) filter.status = status;
  if (typeof search === "string" && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { name: rx },
      { fatherName: rx },
      { cnic: rx },
      { phone: rx },
    ];
  }

  const pagination = getPagination(req.query);
  const [drivers, total] = await Promise.all([
    Driver.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .collation({ locale: "en" })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Driver.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: await withVehicles(drivers),
    meta: buildMeta(pagination, total),
  });
};

export const getSummary = async (req, res) => {
  const rows = await Driver.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        salary: { $sum: "$salary" },
      },
    },
  ]);

  const byStatus = Object.fromEntries(DRIVER_STATUSES.map((s) => [s, 0]));
  let total = 0;
  let monthlyPayroll = 0; // active drivers only
  for (const r of rows) {
    byStatus[r._id] = r.count;
    total += r.count;
    if (r._id === "active") monthlyPayroll = r.salary;
  }

  const assignedIds = await Vehicle.distinct("driver", {
    isDeleted: false,
    driver: { $ne: null },
  });
  const unassigned = await Driver.countDocuments({
    isDeleted: false,
    status: "active",
    _id: { $nin: assignedIds },
  });

  res.json({
    success: true,
    data: { total, byStatus, unassigned, monthlyPayroll },
  });
};

// Lightweight list for dropdowns (vehicle form)
export const driverOptions = async (req, res) => {
  const drivers = await Driver.find({
    isDeleted: false,
    status: { $ne: "inactive" },
  })
    .select("name status")
    .sort({ name: 1 })
    .collation({ locale: "en" });
  res.json({ success: true, data: await withVehicles(drivers) });
};

export const getDriver = async (req, res) => {
  const driver = await findOrFail(req.params.id);
  const [data] = await withVehicles([driver]);
  res.json({ success: true, data });
};

export const createDriver = async (req, res) => {
  const { vehicleId } = req.body;
  if (vehicleId) await assertVehicleFree(vehicleId, null);

  const driver = new Driver();
  applyBody(driver, req.body);
  driver.createdBy = req.user._id;
  await driver.save();

  if (vehicleId) await assignVehicle(driver._id, vehicleId);

  const [data] = await withVehicles([driver]);
  res.status(201).json({ success: true, data });
};

export const updateDriver = async (req, res) => {
  const driver = await findOrFail(req.params.id);
  const changesVehicle = has(req.body, "vehicleId");
  const vehicleId = req.body.vehicleId || null;

  if (changesVehicle && vehicleId)
    await assertVehicleFree(vehicleId, driver._id);

  applyBody(driver, req.body);
  await driver.save();

  if (changesVehicle) await assignVehicle(driver._id, vehicleId);

  const [data] = await withVehicles([driver]);
  res.json({ success: true, data });
};

export const deleteDriver = async (req, res) => {
  const driver = await findOrFail(req.params.id);
  driver.isDeleted = true;
  await driver.save();
  await Vehicle.updateMany({ driver: driver._id }, { driver: null });
  res.json({ success: true, message: "Driver deleted" });
};
