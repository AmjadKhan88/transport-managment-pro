import Expense from "../models/Expense.js";
import Vehicle from "../models/Vehicle.js";
import { ApiError } from "../utils/ApiError.js";
import { PAYMENT_STATUSES } from "../config/payment.js";
import {
  MANUAL_EXPENSE_CATEGORIES,
  EXPENSE_DEPARTMENTS,
} from "../config/accounting.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
  dateRangeFilter,
  toObjectId,
} from "../utils/queryHelpers.js";

const TEXT_FIELDS = [
  "expenseDate",
  "category",
  "department",
  "description",
  "reference",
  "paymentMethod",
  "paymentStatus",
];
const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);
const has = (obj, key) => Object.hasOwn(obj, key);
const POPULATE = [{ path: "vehicle", select: "vehicleNumber make model" }];

async function assertVehicle(body) {
  if (
    body.vehicle &&
    !(await Vehicle.exists({ _id: body.vehicle, isDeleted: false }))
  ) {
    throw new ApiError(404, "Vehicle not found");
  }
}

function applyBody(expense, body) {
  for (const k of TEXT_FIELDS) if (has(body, k)) expense.set(k, clean(body[k]));
  if (has(body, "amount")) expense.set("amount", Number(body.amount) || 0);
  if (has(body, "vehicle")) expense.set("vehicle", body.vehicle || null);
}

const findOrFail = async (id) => {
  const expense = await Expense.findOne({ _id: id, isDeleted: false });
  if (!expense) throw new ApiError(404, "Expense not found");
  return expense;
};

const SORTS = {
  newest: { expenseDate: -1, createdAt: -1 },
  oldest: { expenseDate: 1, createdAt: 1 },
  amount: { amount: -1 },
};

export const listExpenses = async (req, res) => {
  const q = req.query;
  const range = dateRangeFilter(q.from, q.to);

  const filter = { isDeleted: false };
  if (range) filter.expenseDate = range;
  if (MANUAL_EXPENSE_CATEGORIES.includes(q.category))
    filter.category = q.category;
  if (EXPENSE_DEPARTMENTS.includes(q.department))
    filter.department = q.department;
  if (PAYMENT_STATUSES.includes(q.paymentStatus))
    filter.paymentStatus = q.paymentStatus;
  const vehicle = toObjectId(q.vehicle);
  if (vehicle) filter.vehicle = vehicle;
  if (typeof q.search === "string" && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ description: rx }, { reference: rx }];
  }

  const pagination = getPagination(q);

  const [data, total, [row]] = await Promise.all([
    Expense.find(filter)
      .sort(SORTS[q.sort] || SORTS.newest)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(POPULATE),
    Expense.countDocuments(filter),
    Expense.aggregate([
      { $match: { isDeleted: false, ...(range && { expenseDate: range }) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: "$amount" },
          unpaid: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$amount", 0],
            },
          },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    data,
    meta: buildMeta(pagination, total),
    totals: {
      count: row?.count ?? 0,
      total: row?.total ?? 0,
      unpaid: row?.unpaid ?? 0,
    },
  });
};

export const createExpense = async (req, res) => {
  await assertVehicle(req.body);
  const expense = new Expense();
  applyBody(expense, req.body);
  expense.createdBy = req.user._id;
  await expense.save();
  await expense.populate(POPULATE);
  res.status(201).json({ success: true, data: expense });
};

export const updateExpense = async (req, res) => {
  const expense = await findOrFail(req.params.id);
  await assertVehicle(req.body);
  applyBody(expense, req.body);
  await expense.save();
  await expense.populate(POPULATE);
  res.json({ success: true, data: expense });
};

export const deleteExpense = async (req, res) => {
  const expense = await findOrFail(req.params.id);
  expense.isDeleted = true;
  await expense.save();
  res.json({ success: true, message: "Expense deleted" });
};
