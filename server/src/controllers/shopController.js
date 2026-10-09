import ShopTransaction, {
  SHOP_TYPES,
  SHOP_EXPENSE_CATEGORIES,
} from "../models/ShopTransaction.js";
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
  "txnDate",
  "type",
  "category",
  "party",
  "description",
  "reference",
  "paymentMethod",
  "paymentStatus",
];
const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);
const has = (obj, key) => Object.hasOwn(obj, key);

function applyBody(txn, body) {
  for (const k of TEXT_FIELDS) if (has(body, k)) txn.set(k, clean(body[k]));
  if (has(body, "amount")) txn.set("amount", Number(body.amount) || 0);
}

const findOrFail = async (id) => {
  const txn = await ShopTransaction.findOne({ _id: id, isDeleted: false });
  if (!txn) throw new ApiError(404, "Shop entry not found");
  return txn;
};

const SORTS = {
  newest: { txnDate: -1, createdAt: -1 },
  oldest: { txnDate: 1, createdAt: 1 },
  amount: { amount: -1 },
};

const ZERO = {
  count: 0,
  sales: 0,
  purchases: 0,
  expenses: 0,
  payable: 0,
  receivable: 0,
};
const byType = (t) => ({
  $sum: { $cond: [{ $eq: ["$type", t] }, "$amount", 0] },
});

async function getTotals(filter) {
  const [row] = await ShopTransaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        sales: byType("sale"),
        purchases: byType("purchase"),
        expenses: byType("expense"),
        // unpaid purchases/expenses = we owe; unpaid sales = still to receive
        payable: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$type", "sale"] },
                  { $eq: ["$paymentStatus", "unpaid"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        receivable: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$type", "sale"] },
                  { $eq: ["$paymentStatus", "unpaid"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
      },
    },
  ]);
  if (!row) return ZERO;
  const { _id, ...totals } = row;
  return totals;
}

export const listTransactions = async (req, res) => {
  const q = req.query;
  const range = dateRangeFilter(q.from, q.to);

  const filter = { isDeleted: false };
  if (range) filter.txnDate = range;
  if (SHOP_TYPES.includes(q.type)) filter.type = q.type;
  if (SHOP_EXPENSE_CATEGORIES.includes(q.category))
    filter.category = q.category;
  if (PAYMENT_STATUSES.includes(q.paymentStatus))
    filter.paymentStatus = q.paymentStatus;
  if (typeof q.search === "string" && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ party: rx }, { description: rx }, { reference: rx }];
  }

  // Stat cards always describe the whole shop for the period (date range only)
  const totalsFilter = { isDeleted: false, ...(range && { txnDate: range }) };
  const pagination = getPagination(q);

  const [data, total, totals, salaryMap] = await Promise.all([
    ShopTransaction.find(filter)
      .sort(SORTS[q.sort] || SORTS.newest)
      .skip(pagination.skip)
      .limit(pagination.limit),
    ShopTransaction.countDocuments(filter),
    getTotals(totalsFilter),
    departmentSalaryCosts("shop", { from: q.from, to: q.to }),
  ]);

  const salary = sumCosts(salaryMap);
  res.json({
    success: true,
    data,
    meta: buildMeta(pagination, total),
    totals: {
      ...totals,
      salary,
      profit: totals.sales - totals.purchases - totals.expenses - salary,
    },
  });
};

export const shopReport = async (req, res) => {
  const groupBy = req.query.groupBy === "year" ? "year" : "month";
  const format = groupBy === "year" ? "%Y" : "%Y-%m";
  const range = dateRangeFilter(req.query.from, req.query.to);
  const match = { isDeleted: false, ...(range && { txnDate: range }) };

  const [grouped, salaryMap] = await Promise.all([
    ShopTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            period: { $dateToString: { format, date: "$txnDate" } },
            type: "$type",
          },
          amount: { $sum: "$amount" },
        },
      },
    ]),
    departmentSalaryCosts("shop", {
      from: req.query.from,
      to: req.query.to,
      groupBy,
    }),
  ]);

  const rows = new Map();
  const row = (key) => {
    if (!rows.has(key))
      rows.set(key, { key, sales: 0, purchases: 0, expenses: 0, salary: 0 });
    return rows.get(key);
  };
  const FIELD = { sale: "sales", purchase: "purchases", expense: "expenses" };
  for (const g of grouped) row(g._id.period)[FIELD[g._id.type]] += g.amount;
  for (const [key, cost] of salaryMap) row(key).salary += cost;

  const data = [...rows.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((r) => {
      const totalExpenses = r.purchases + r.expenses + r.salary;
      return {
        ...r,
        totalExpenses,
        grossProfit: r.sales - r.purchases,
        profit: r.sales - totalExpenses,
      };
    });

  const totals = data.reduce(
    (t, r) => ({
      sales: t.sales + r.sales,
      purchases: t.purchases + r.purchases,
      expenses: t.expenses + r.expenses,
      salary: t.salary + r.salary,
      totalExpenses: t.totalExpenses + r.totalExpenses,
      grossProfit: t.grossProfit + r.grossProfit,
      profit: t.profit + r.profit,
    }),
    {
      sales: 0,
      purchases: 0,
      expenses: 0,
      salary: 0,
      totalExpenses: 0,
      grossProfit: 0,
      profit: 0,
    },
  );

  res.json({ success: true, data, totals, groupBy });
};

export const createTransaction = async (req, res) => {
  const txn = new ShopTransaction();
  applyBody(txn, req.body);
  txn.createdBy = req.user._id;
  await txn.save();
  res.status(201).json({ success: true, data: txn });
};

export const updateTransaction = async (req, res) => {
  const txn = await findOrFail(req.params.id);
  applyBody(txn, req.body);
  await txn.save();
  res.json({ success: true, data: txn });
};

export const deleteTransaction = async (req, res) => {
  const txn = await findOrFail(req.params.id);
  txn.isDeleted = true;
  await txn.save();
  res.json({ success: true, message: "Shop entry deleted" });
};
