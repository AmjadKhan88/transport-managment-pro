import SalaryRecord, {
  PAYEE_TYPES,
  SALARY_STATUSES,
} from "../models/SalaryRecord.js";
import Driver from "../models/Driver.js";
import Employee from "../models/Employee.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildMeta, toObjectId } from "../utils/queryHelpers.js";
import { MONTH_RE } from "../validators/salaryValidators.js";

const CREATE_ONLY = ["payeeType", "driver", "employee", "month"];
const EDITABLE_TEXT = ["paymentDate", "paymentMethod", "notes"];
const MONEY_FIELDS = [
  "basicSalary",
  "tripAllowance",
  "bonus",
  "otherPayment",
  "advance",
  "deduction",
  "paidAmount",
];

const POPULATE = [
  { path: "driver", select: "name" },
  { path: "employee", select: "name designation department" },
];

const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);
const has = (obj, key) => Object.hasOwn(obj, key);

async function assertPayee(body) {
  if (
    body.driver &&
    !(await Driver.exists({ _id: body.driver, isDeleted: false }))
  ) {
    throw new ApiError(404, "Driver not found");
  }
  if (
    body.employee &&
    !(await Employee.exists({ _id: body.employee, isDeleted: false }))
  ) {
    throw new ApiError(404, "Staff member not found");
  }
}

function applyBody(record, body, isCreate) {
  if (isCreate) {
    record.payeeType = body.payeeType;
    record.driver = body.payeeType === "driver" ? body.driver || null : null;
    record.employee =
      body.payeeType === "employee" ? body.employee || null : null;
    record.month = body.month;
  }
  for (const k of EDITABLE_TEXT)
    if (has(body, k)) record.set(k, clean(body[k]));
  for (const k of MONEY_FIELDS)
    if (has(body, k)) record.set(k, Number(body[k]) || 0);
}

// Duplicate (person + month) gets a friendly message
async function saveRecord(record) {
  try {
    await record.save();
  } catch (err) {
    if (err.code === 11000)
      throw new ApiError(
        409,
        "A salary record for this person and month already exists",
      );
    throw err;
  }
}

const findOrFail = async (id) => {
  const record = await SalaryRecord.findOne({ _id: id, isDeleted: false });
  if (!record) throw new ApiError(404, "Salary record not found");
  return record;
};

function buildFilter(q) {
  const filter = { isDeleted: false };
  if (PAYEE_TYPES.includes(q.payeeType)) filter.payeeType = q.payeeType;

  const driver = toObjectId(q.driver);
  const employee = toObjectId(q.employee);
  if (driver) filter.driver = driver;
  if (employee) filter.employee = employee;

  if (MONTH_RE.test(q.month || "")) filter.month = q.month;
  else if (/^\d{4}$/.test(q.year || ""))
    filter.month = { $gte: `${q.year}-01`, $lte: `${q.year}-12` };

  if (q.paymentStatus === "due")
    filter.paymentStatus = { $in: ["unpaid", "partial"] };
  else if (SALARY_STATUSES.includes(q.paymentStatus))
    filter.paymentStatus = q.paymentStatus;

  return filter;
}

const GROUP = {
  count: { $sum: 1 },
  basic: { $sum: "$basicSalary" },
  additions: { $sum: { $add: ["$tripAllowance", "$bonus", "$otherPayment"] } },
  advance: { $sum: "$advance" },
  deduction: { $sum: "$deduction" },
  net: { $sum: "$netSalary" },
  paid: { $sum: "$paidAmount" },
  remaining: { $sum: { $subtract: ["$netSalary", "$paidAmount"] } },
};

const ZERO = {
  count: 0,
  basic: 0,
  additions: 0,
  advance: 0,
  deduction: 0,
  net: 0,
  paid: 0,
  remaining: 0,
};

async function getTotals(filter) {
  const [row] = await SalaryRecord.aggregate([
    { $match: filter },
    { $group: { _id: null, ...GROUP } },
  ]);
  if (!row) return ZERO;
  const { _id, ...totals } = row;
  return totals;
}

const SORTS = {
  newest: { month: -1, createdAt: -1 },
  oldest: { month: 1, createdAt: 1 },
  amount: { netSalary: -1 },
};

export const listSalaries = async (req, res) => {
  const filter = buildFilter(req.query);
  const pagination = getPagination(req.query);

  const [data, total, totals] = await Promise.all([
    SalaryRecord.find(filter)
      .sort(SORTS[req.query.sort] || SORTS.newest)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(POPULATE),
    SalaryRecord.countDocuments(filter),
    getTotals(filter),
  ]);

  res.json({ success: true, data, meta: buildMeta(pagination, total), totals });
};

// Monthly salary report for a year
export const salaryReport = async (req, res) => {
  const year = /^\d{4}$/.test(req.query.year || "")
    ? req.query.year
    : String(new Date().getFullYear());
  const filter = buildFilter({ payeeType: req.query.payeeType, year });

  const grouped = await SalaryRecord.aggregate([
    { $match: filter },
    { $group: { _id: "$month", ...GROUP } },
    { $sort: { _id: -1 } },
  ]);
  const data = grouped.map(({ _id, ...rest }) => ({ month: _id, ...rest }));

  const totals = data.reduce(
    (t, r) =>
      Object.fromEntries(Object.keys(ZERO).map((k) => [k, t[k] + r[k]])),
    { ...ZERO },
  );

  res.json({ success: true, data, totals, year });
};

// People who can be paid (with their basic salary) for the salary form
export const listPayees = async (req, res) => {
  const [drivers, employees] = await Promise.all([
    Driver.find({ isDeleted: false, status: { $ne: "inactive" } })
      .select("name salary")
      .sort({ name: 1 })
      .collation({ locale: "en" }),
    Employee.find({ isDeleted: false, status: "active" })
      .select("name designation department salary")
      .sort({ name: 1 })
      .collation({ locale: "en" }),
  ]);
  res.json({ success: true, data: { drivers, employees } });
};

// Creates the month's records (basic salary prefilled) for active drivers / staff that don't have one yet
export const generateSalaries = async (req, res) => {
  const { month, payeeType = "all" } = req.body;
  const types = payeeType === "all" ? PAYEE_TYPES : [payeeType];
  const result = { created: 0, existing: 0, noSalary: 0 };

  for (const type of types) {
    const Model = type === "driver" ? Driver : Employee;
    const people = await Model.find({ isDeleted: false, status: "active" });
    const existingRows = await SalaryRecord.find({
      isDeleted: false,
      payeeType: type,
      month,
    }).select(type);
    const existing = new Set(existingRows.map((r) => String(r[type])));

    for (const person of people) {
      if (existing.has(String(person._id))) {
        result.existing += 1;
        continue;
      }
      if (!person.salary) {
        result.noSalary += 1;
        continue;
      }
      const record = new SalaryRecord({
        payeeType: type,
        [type]: person._id,
        month,
        basicSalary: person.salary,
        createdBy: req.user._id,
      });
      await saveRecord(record);
      result.created += 1;
    }
  }

  res.status(201).json({ success: true, data: result });
};

export const getSalary = async (req, res) => {
  const record = await findOrFail(req.params.id);
  await record.populate(POPULATE);
  res.json({ success: true, data: record });
};

export const createSalary = async (req, res) => {
  await assertPayee(req.body);
  const record = new SalaryRecord();
  applyBody(record, req.body, true);
  record.createdBy = req.user._id;
  await saveRecord(record);
  await record.populate(POPULATE);
  res.status(201).json({ success: true, data: record });
};

export const updateSalary = async (req, res) => {
  const record = await findOrFail(req.params.id);
  applyBody(record, req.body, false); // payee and month are locked after creation
  await saveRecord(record);
  await record.populate(POPULATE);
  res.json({ success: true, data: record });
};

export const deleteSalary = async (req, res) => {
  const record = await findOrFail(req.params.id);
  record.isDeleted = true;
  await record.save();
  res.json({ success: true, message: "Salary record deleted" });
};
