import OfficeExpense, { OFFICE_CATEGORIES } from "../models/OfficeExpense.js";
import { ApiError } from "../utils/ApiError.js";
import { PAYMENT_STATUSES } from "../config/payment.js";
import { departmentSalaryCosts, sumCosts } from "../services/salaryCost.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
  dateRangeFilter,
} from "../utils/queryHelpers.js";

const TEXT_FIELDS = [
  "expenseDate",
  "category",
  "description",
  "billNumber",
  "paymentMethod",
  "paymentStatus",
];
const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);
const has = (obj, key) => Object.hasOwn(obj, key);

function applyBody(expense, body) {
  for (const k of TEXT_FIELDS) if (has(body, k)) expense.set(k, clean(body[k]));
  if (has(body, "amount")) expense.set("amount", Number(body.amount) || 0);
}

const findOrFail = async (id) => {
  const expense = await OfficeExpense.findOne({ _id: id, isDeleted: false });
  if (!expense) throw new ApiError(404, "Office expense not found");
  return expense;
};

const SORTS = {
  newest: { expenseDate: -1, createdAt: -1 },
  oldest: { expenseDate: 1, createdAt: 1 },
  amount: { amount: -1 },
};

async function getTotals(filter) {
  const [row] = await OfficeExpense.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        expenses: { $sum: "$amount" },
        unpaid: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$amount", 0],
          },
        },
      },
    },
  ]);
  return {
    count: row?.count ?? 0,
    expenses: row?.expenses ?? 0,
    unpaid: row?.unpaid ?? 0,
  };
}

export const listOffice = async (req, res) => {
  const q = req.query;
  const range = dateRangeFilter(q.from, q.to);

  const filter = { isDeleted: false };
  if (range) filter.expenseDate = range;
  if (OFFICE_CATEGORIES.includes(q.category)) filter.category = q.category;
  if (PAYMENT_STATUSES.includes(q.paymentStatus))
    filter.paymentStatus = q.paymentStatus;
  if (typeof q.search === "string" && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ description: rx }, { billNumber: rx }];
  }

  const totalsFilter = {
    isDeleted: false,
    ...(range && { expenseDate: range }),
  };
  const pagination = getPagination(q);

  const [data, total, totals, salaryMap] = await Promise.all([
    OfficeExpense.find(filter)
      .sort(SORTS[q.sort] || SORTS.newest)
      .skip(pagination.skip)
      .limit(pagination.limit),
    OfficeExpense.countDocuments(filter),
    getTotals(totalsFilter),
    departmentSalaryCosts("office", { from: q.from, to: q.to }),
  ]);

  const salary = sumCosts(salaryMap);
  res.json({
    success: true,
    data,
    meta: buildMeta(pagination, total),
    totals: { ...totals, salary, total: totals.expenses + salary },
  });
};

export const officeReport = async (req, res) => {
  const groupBy = req.query.groupBy === "year" ? "year" : "month";
  const format = groupBy === "year" ? "%Y" : "%Y-%m";
  const range = dateRangeFilter(req.query.from, req.query.to);
  const match = { isDeleted: false, ...(range && { expenseDate: range }) };

  const [grouped, categories, salaryMap] = await Promise.all([
    OfficeExpense.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format, date: "$expenseDate" } },
          amount: { $sum: "$amount" },
        },
      },
    ]),
    OfficeExpense.aggregate([
      { $match: match },
      { $group: { _id: "$category", amount: { $sum: "$amount" } } },
    ]),
    departmentSalaryCosts("office", {
      from: req.query.from,
      to: req.query.to,
      groupBy,
    }),
  ]);

  const rows = new Map();
  const row = (key) => {
    if (!rows.has(key)) rows.set(key, { key, expenses: 0, salary: 0 });
    return rows.get(key);
  };
  for (const g of grouped) row(g._id).expenses += g.amount;
  for (const [key, cost] of salaryMap) row(key).salary += cost;

  const data = [...rows.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((r) => ({ ...r, total: r.expenses + r.salary }));

  const totals = data.reduce(
    (t, r) => ({
      expenses: t.expenses + r.expenses,
      salary: t.salary + r.salary,
      total: t.total + r.total,
    }),
    { expenses: 0, salary: 0, total: 0 },
  );

  const byCategory = categories.map((c) => ({
    category: c._id,
    amount: c.amount,
  }));
  const salaryTotal = sumCosts(salaryMap);
  if (salaryTotal > 0)
    byCategory.push({ category: "salary", amount: salaryTotal });
  byCategory.sort((a, b) => b.amount - a.amount);

  res.json({ success: true, data, byCategory, totals, groupBy });
};

export const createOffice = async (req, res) => {
  const expense = new OfficeExpense();
  applyBody(expense, req.body);
  expense.createdBy = req.user._id;
  await expense.save();
  res.status(201).json({ success: true, data: expense });
};

export const updateOffice = async (req, res) => {
  const expense = await findOrFail(req.params.id);
  applyBody(expense, req.body);
  await expense.save();
  res.json({ success: true, data: expense });
};

export const deleteOffice = async (req, res) => {
  const expense = await findOrFail(req.params.id);
  expense.isDeleted = true;
  await expense.save();
  res.json({ success: true, message: "Office expense deleted" });
};
