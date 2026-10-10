import Income, { INCOME_TYPES } from "../models/Income.js";
import Customer from "../models/Customer.js";
import { ApiError } from "../utils/ApiError.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
  dateRangeFilter,
  toObjectId,
} from "../utils/queryHelpers.js";

const TEXT_FIELDS = [
  "incomeDate",
  "type",
  "source",
  "paymentMethod",
  "reference",
  "notes",
];
const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);
const has = (obj, key) => Object.hasOwn(obj, key);

async function assertCustomer(body) {
  if (
    body.customer &&
    !(await Customer.exists({ _id: body.customer, isDeleted: false }))
  ) {
    throw new ApiError(404, "Customer not found");
  }
}

function applyBody(income, body) {
  for (const k of TEXT_FIELDS) if (has(body, k)) income.set(k, clean(body[k]));
  if (has(body, "amount")) income.set("amount", Number(body.amount) || 0);
  if (has(body, "customer")) income.set("customer", body.customer || null);
}

const findOrFail = async (id) => {
  const income = await Income.findOne({ _id: id, isDeleted: false });
  if (!income) throw new ApiError(404, "Income entry not found");
  return income;
};

const SORTS = {
  newest: { incomeDate: -1, createdAt: -1 },
  oldest: { incomeDate: 1, createdAt: 1 },
  amount: { amount: -1 },
};

export const listIncome = async (req, res) => {
  const q = req.query;
  const range = dateRangeFilter(q.from, q.to);

  const filter = { isDeleted: false };
  if (range) filter.incomeDate = range;
  if (INCOME_TYPES.includes(q.type)) filter.type = q.type;
  const customer = toObjectId(q.customer);
  if (customer) filter.customer = customer;
  if (typeof q.search === "string" && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ source: rx }, { reference: rx }, { notes: rx }];
  }

  const pagination = getPagination(q);
  const totalsMatch = { isDeleted: false, ...(range && { incomeDate: range }) };

  const [data, total, grouped] = await Promise.all([
    Income.find(filter)
      .sort(SORTS[q.sort] || SORTS.newest)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate({ path: "customer", select: "name companyName" }),
    Income.countDocuments(filter),
    Income.aggregate([
      { $match: totalsMatch },
      { $group: { _id: "$type", amount: { $sum: "$amount" } } },
    ]),
  ]);

  const byType = { customer_payment: 0, other_business: 0, other_receipt: 0 };
  for (const g of grouped) byType[g._id] = g.amount;

  res.json({
    success: true,
    data,
    meta: buildMeta(pagination, total),
    totals: {
      customerPayments: byType.customer_payment,
      otherBusiness: byType.other_business,
      otherReceipts: byType.other_receipt,
    },
  });
};

export const createIncome = async (req, res) => {
  await assertCustomer(req.body);
  const income = new Income();
  applyBody(income, req.body);
  income.createdBy = req.user._id;
  await income.save();
  await income.populate({ path: "customer", select: "name companyName" });
  res.status(201).json({ success: true, data: income });
};

export const updateIncome = async (req, res) => {
  const income = await findOrFail(req.params.id);
  await assertCustomer(req.body);
  applyBody(income, req.body);
  await income.save();
  await income.populate({ path: "customer", select: "name companyName" });
  res.json({ success: true, data: income });
};

export const deleteIncome = async (req, res) => {
  const income = await findOrFail(req.params.id);
  income.isDeleted = true;
  await income.save();
  res.json({ success: true, message: "Income entry deleted" });
};
