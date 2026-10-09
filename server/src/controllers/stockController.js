import StockItem from "../models/StockItem.js";
import { ApiError } from "../utils/ApiError.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
} from "../utils/queryHelpers.js";

const FIELDS = ["name", "unit", "notes"];
const NUMBERS = ["quantity", "reorderLevel", "costPrice", "salePrice"];
const clean = (v) => (typeof v === "string" ? v.trim() || undefined : v);

function applyBody(item, body) {
  for (const k of FIELDS)
    if (Object.hasOwn(body, k)) item.set(k, clean(body[k]));
  for (const k of NUMBERS)
    if (Object.hasOwn(body, k)) item.set(k, Number(body[k]) || 0);
}

const findOrFail = async (id) => {
  const item = await StockItem.findOne({ _id: id, isDeleted: false });
  if (!item) throw new ApiError(404, "Stock item not found");
  return item;
};

const LOW = {
  $and: [
    { $gt: ["$reorderLevel", 0] },
    { $lte: ["$quantity", "$reorderLevel"] },
  ],
};

export const listStock = async (req, res) => {
  const { search, low } = req.query;

  const filter = { isDeleted: false };
  if (typeof search === "string" && search.trim())
    filter.name = new RegExp(escapeRegex(search.trim()), "i");
  if (low === "true") filter.$expr = LOW;

  const pagination = getPagination(req.query);
  const [data, total] = await Promise.all([
    StockItem.find(filter)
      .sort({ name: 1 })
      .collation({ locale: "en" })
      .skip(pagination.skip)
      .limit(pagination.limit),
    StockItem.countDocuments(filter),
  ]);

  res.json({ success: true, data, meta: buildMeta(pagination, total) });
};

export const stockSummary = async (req, res) => {
  const [row] = await StockItem.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        items: { $sum: 1 },
        value: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
        low: { $sum: { $cond: [LOW, 1, 0] } },
      },
    },
  ]);
  res.json({
    success: true,
    data: {
      items: row?.items ?? 0,
      value: row?.value ?? 0,
      low: row?.low ?? 0,
    },
  });
};

export const createStock = async (req, res) => {
  const item = new StockItem();
  applyBody(item, req.body);
  item.createdBy = req.user._id;
  await item.save();
  res.status(201).json({ success: true, data: item });
};

export const updateStock = async (req, res) => {
  const item = await findOrFail(req.params.id);
  applyBody(item, req.body);
  await item.save();
  res.json({ success: true, data: item });
};

// Add (+) or remove (-) stock; never goes below zero
export const adjustStock = async (req, res) => {
  const delta = Number(req.body.delta);
  const item = await StockItem.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: false,
      quantity: { $gte: delta < 0 ? -delta : 0 },
    },
    { $inc: { quantity: delta } },
    { new: true },
  );
  if (!item) {
    await findOrFail(req.params.id); // 404 if it doesn't exist
    throw new ApiError(400, "Not enough stock to remove that quantity");
  }
  res.json({ success: true, data: item });
};

export const deleteStock = async (req, res) => {
  const item = await findOrFail(req.params.id);
  item.isDeleted = true;
  await item.save();
  res.json({ success: true, message: "Stock item deleted" });
};
