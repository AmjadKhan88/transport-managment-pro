import Customer, { CUSTOMER_STATUSES } from "../models/Customer.js";
import { ApiError } from "../utils/ApiError.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
} from "../utils/queryHelpers.js";

const FIELDS = [
  "name",
  "companyName",
  "phone",
  "address",
  "openingBalance",
  "status",
  "notes",
];
const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);

const applyBody = (customer, body) => {
  for (const k of FIELDS)
    if (Object.hasOwn(body, k)) customer.set(k, clean(body[k]));
};

const findOrFail = async (id) => {
  const customer = await Customer.findOne({ _id: id, isDeleted: false });
  if (!customer) throw new ApiError(404, "Customer not found");
  return customer;
};

const SORTS = { newest: { createdAt: -1 }, name: { name: 1 } };

export const listCustomers = async (req, res) => {
  const { search, status, sort = "newest" } = req.query;

  const filter = { isDeleted: false };
  if (CUSTOMER_STATUSES.includes(status)) filter.status = status;
  if (typeof search === "string" && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ name: rx }, { companyName: rx }, { phone: rx }];
  }

  const pagination = getPagination(req.query);
  const [data, total] = await Promise.all([
    Customer.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .collation({ locale: "en" })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Customer.countDocuments(filter),
  ]);

  res.json({ success: true, data, meta: buildMeta(pagination, total) });
};

export const getSummary = async (req, res) => {
  const rows = await Customer.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        opening: { $sum: "$openingBalance" },
      },
    },
  ]);

  const byStatus = Object.fromEntries(CUSTOMER_STATUSES.map((s) => [s, 0]));
  let total = 0;
  let openingBalanceTotal = 0;
  for (const r of rows) {
    byStatus[r._id] = r.count;
    total += r.count;
    openingBalanceTotal += r.opening;
  }

  res.json({ success: true, data: { total, byStatus, openingBalanceTotal } });
};

export const getCustomer = async (req, res) => {
  res.json({ success: true, data: await findOrFail(req.params.id) });
};

export const createCustomer = async (req, res) => {
  const customer = new Customer();
  applyBody(customer, req.body);
  customer.createdBy = req.user._id;
  await customer.save();
  res.status(201).json({ success: true, data: customer });
};

export const updateCustomer = async (req, res) => {
  const customer = await findOrFail(req.params.id);
  applyBody(customer, req.body);
  await customer.save();
  res.json({ success: true, data: customer });
};

// Soft delete. Customers with trips/payments will be protected in later steps.
export const deleteCustomer = async (req, res) => {
  const customer = await findOrFail(req.params.id);
  customer.isDeleted = true;
  await customer.save();
  res.json({ success: true, message: "Customer deleted" });
};
