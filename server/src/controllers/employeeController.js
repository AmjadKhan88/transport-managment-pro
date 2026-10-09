import Employee, {
  DEPARTMENTS,
  EMPLOYEE_STATUSES,
} from "../models/Employee.js";
import { ApiError } from "../utils/ApiError.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
} from "../utils/queryHelpers.js";

const FIELDS = [
  "name",
  "designation",
  "department",
  "phone",
  "address",
  "joiningDate",
  "salary",
  "status",
  "notes",
];
const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);

const applyBody = (employee, body) => {
  for (const k of FIELDS)
    if (Object.hasOwn(body, k)) employee.set(k, clean(body[k]));
};

const findOrFail = async (id) => {
  const employee = await Employee.findOne({ _id: id, isDeleted: false });
  if (!employee) throw new ApiError(404, "Staff member not found");
  return employee;
};

const SORTS = {
  newest: { createdAt: -1 },
  name: { name: 1 },
  salary: { salary: -1 },
};

export const listEmployees = async (req, res) => {
  const { search, status, department, sort = "newest" } = req.query;

  const filter = { isDeleted: false };
  if (EMPLOYEE_STATUSES.includes(status)) filter.status = status;
  if (DEPARTMENTS.includes(department)) filter.department = department;
  if (typeof search === "string" && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ name: rx }, { designation: rx }, { phone: rx }];
  }

  const pagination = getPagination(req.query);
  const [data, total] = await Promise.all([
    Employee.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .collation({ locale: "en" })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Employee.countDocuments(filter),
  ]);

  res.json({ success: true, data, meta: buildMeta(pagination, total) });
};

export const getSummary = async (req, res) => {
  const rows = await Employee.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        salary: { $sum: "$salary" },
      },
    },
  ]);

  const byStatus = Object.fromEntries(EMPLOYEE_STATUSES.map((s) => [s, 0]));
  let total = 0;
  let monthlyPayroll = 0; // active staff only
  for (const r of rows) {
    byStatus[r._id] = r.count;
    total += r.count;
    if (r._id === "active") monthlyPayroll = r.salary;
  }

  res.json({ success: true, data: { total, byStatus, monthlyPayroll } });
};

export const getEmployee = async (req, res) => {
  res.json({ success: true, data: await findOrFail(req.params.id) });
};

export const createEmployee = async (req, res) => {
  const employee = new Employee();
  applyBody(employee, req.body);
  employee.createdBy = req.user._id;
  await employee.save();
  res.status(201).json({ success: true, data: employee });
};

export const updateEmployee = async (req, res) => {
  const employee = await findOrFail(req.params.id);
  applyBody(employee, req.body);
  await employee.save();
  res.json({ success: true, data: employee });
};

// Soft delete: salary history stays intact
export const deleteEmployee = async (req, res) => {
  const employee = await findOrFail(req.params.id);
  employee.isDeleted = true;
  await employee.save();
  res.json({ success: true, message: "Staff member deleted" });
};
