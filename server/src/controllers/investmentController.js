import Investment, { INVESTMENT_GROUPS } from "../models/Investment.js";
import Vehicle from "../models/Vehicle.js";
import { ApiError } from "../utils/ApiError.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
  dateRangeFilter,
} from "../utils/queryHelpers.js";

const TEXT_FIELDS = [
  "investDate",
  "group",
  "category",
  "description",
  "reference",
];
const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);

function applyBody(inv, body) {
  for (const k of TEXT_FIELDS)
    if (Object.hasOwn(body, k)) inv.set(k, clean(body[k]));
  if (Object.hasOwn(body, "amount"))
    inv.set("amount", Number(body.amount) || 0);
}

const findOrFail = async (id) => {
  const inv = await Investment.findOne({ _id: id, isDeleted: false });
  if (!inv) throw new ApiError(404, "Investment not found");
  return inv;
};

export const listInvestments = async (req, res) => {
  const q = req.query;
  const range = dateRangeFilter(q.from, q.to);

  const filter = { isDeleted: false };
  if (range) filter.investDate = range;
  if (Object.keys(INVESTMENT_GROUPS).includes(q.group)) filter.group = q.group;
  if (typeof q.category === "string" && q.category)
    filter.category = q.category;
  if (typeof q.search === "string" && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ description: rx }, { reference: rx }];
  }

  const pagination = getPagination(q);
  const [data, total] = await Promise.all([
    Investment.find(filter)
      .sort({ investDate: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Investment.countDocuments(filter),
  ]);

  res.json({ success: true, data, meta: buildMeta(pagination, total) });
};

const VEHICLE_ITEMS = [
  ["purchase", "$purchasePrice"],
  ["registration", "$investment.registration"],
  ["tax", "$investment.tax"],
  ["insurance", "$investment.insurance"],
  ["initial_repair", "$investment.initialRepair"],
  ["accessories", "$investment.accessories"],
  ["other_costs", "$investment.otherCosts"],
];

// Total company investment: vehicles (automatic) + shop / office / other (manual register)
export const investmentSummary = async (req, res) => {
  const range = dateRangeFilter(req.query.from, req.query.to);

  const [vehicleRows, manualRows] = await Promise.all([
    Vehicle.aggregate([
      { $match: { isDeleted: false } },
      {
        $addFields: {
          investDate: { $ifNull: ["$purchaseDate", "$createdAt"] },
        },
      },
      ...(range ? [{ $match: { investDate: range } }] : []),
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          ...Object.fromEntries(
            VEHICLE_ITEMS.map(([key, field]) => [key, { $sum: field }]),
          ),
        },
      },
    ]),
    Investment.aggregate([
      { $match: { isDeleted: false, ...(range && { investDate: range }) } },
      {
        $group: {
          _id: { group: "$group", category: "$category" },
          amount: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const v = vehicleRows[0] ?? {};
  const vehicleItems = VEHICLE_ITEMS.map(([key]) => ({
    category: key,
    amount: v[key] ?? 0,
  })).filter((i) => i.amount > 0);

  const groups = [
    { group: "vehicle", auto: true, count: v.count ?? 0, items: vehicleItems },
    ...Object.keys(INVESTMENT_GROUPS).map((g) => ({
      group: g,
      auto: false,
      items: manualRows
        .filter((r) => r._id.group === g)
        .map((r) => ({ category: r._id.category, amount: r.amount })),
    })),
  ].map((g) => ({ ...g, total: g.items.reduce((s, i) => s + i.amount, 0) }));

  res.json({
    success: true,
    data: { total: groups.reduce((s, g) => s + g.total, 0), groups },
  });
};

export const createInvestment = async (req, res) => {
  const inv = new Investment();
  applyBody(inv, req.body);
  inv.createdBy = req.user._id;
  await inv.save();
  res.status(201).json({ success: true, data: inv });
};

export const updateInvestment = async (req, res) => {
  const inv = await findOrFail(req.params.id);
  applyBody(inv, req.body);
  await inv.save();
  res.json({ success: true, data: inv });
};

export const deleteInvestment = async (req, res) => {
  const inv = await findOrFail(req.params.id);
  inv.isDeleted = true;
  await inv.save();
  res.json({ success: true, message: "Investment deleted" });
};
