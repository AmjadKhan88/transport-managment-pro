import Income from "../models/Income.js";
import Customer from "../models/Customer.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildMeta } from "../utils/queryHelpers.js";
import {
  getCustomerBalances,
  getCustomerStatement,
  summarize,
} from "../services/receivables.js";

export const listReceivables = async (req, res) => {
  const { asOf, search, all } = req.query;
  const rows = await getCustomerBalances({
    asOf,
    search: typeof search === "string" ? search.trim() : "",
  });

  const totals = summarize(rows);
  const visible = (
    all === "true" ? rows : rows.filter((r) => r.balance !== 0)
  ).sort((a, b) => b.balance - a.balance);

  const pagination = getPagination(req.query);
  const page = visible.slice(
    pagination.skip,
    pagination.skip + pagination.limit,
  );

  res.json({
    success: true,
    data: page,
    meta: buildMeta(pagination, visible.length),
    totals,
  });
};

export const customerStatement = async (req, res) => {
  const data = await getCustomerStatement(req.params.id, req.query.asOf);
  res.json({ success: true, data });
};

// A payment from a customer = an Income entry (type customer_payment), so Income and the ledger always agree
export const receivePayment = async (req, res) => {
  const {
    customer,
    amount,
    date,
    method = "cash",
    reference,
    notes,
  } = req.body;

  if (!(await Customer.exists({ _id: customer, isDeleted: false })))
    throw new ApiError(404, "Customer not found");

  const income = await Income.create({
    type: "customer_payment",
    customer,
    amount: Number(amount),
    incomeDate: date ? new Date(date) : new Date(),
    paymentMethod: method,
    reference: reference?.trim() || undefined,
    notes: notes?.trim() || undefined,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: income });
};
