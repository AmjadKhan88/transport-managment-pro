import fs from "fs/promises";
import path from "path";
import Document, { DOC_CATEGORIES, ENTITY_TYPES } from "../models/Document.js";
import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import Customer from "../models/Customer.js";
import Repair from "../models/Repair.js";
import DieselEntry from "../models/DieselEntry.js";
import SalaryRecord from "../models/SalaryRecord.js";
import OfficeExpense from "../models/OfficeExpense.js";
import ShopTransaction from "../models/ShopTransaction.js";
import Expense from "../models/Expense.js";
import Income from "../models/Income.js";
import { ApiError } from "../utils/ApiError.js";
import { verifySignature } from "../utils/fileSignature.js";
import { UPLOAD_ROOT } from "../middlewares/upload.js";
import {
  escapeRegex,
  getPagination,
  buildMeta,
  toObjectId,
} from "../utils/queryHelpers.js";

const ENTITY_MODELS = {
  vehicle: Vehicle,
  driver: Driver,
  customer: Customer,
  repair: Repair,
  diesel: DieselEntry,
  salary: SalaryRecord,
  office: OfficeExpense,
  shop: ShopTransaction,
  expense: Expense,
  income: Income,
};

const DAY = 86400000;
const todayUTC = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

const absolutePath = (storedName) => path.join(UPLOAD_ROOT, storedName);

// ---- readable labels for "linked to" ---------------------------------------------
async function withLabels(docs) {
  const wanted = {};
  for (const d of docs)
    if (d.entityType)
      (wanted[d.entityType] ??= new Set()).add(String(d.entityId));

  const labels = new Map();
  const put = (type, id, label, link) =>
    labels.set(`${type}:${id}`, { label, link });
  const truck = (v) => (v ? `Truck #${v.vehicleNumber}` : "");

  await Promise.all(
    Object.entries(wanted).map(async ([type, set]) => {
      const ids = [...set];
      const find = (Model, select, populate) => {
        let q = Model.find({ _id: { $in: ids } }).select(select);
        for (const p of populate ?? []) q = q.populate(...p);
        return q.lean();
      };

      switch (type) {
        case "vehicle":
          (await find(Vehicle, "vehicleNumber")).forEach((v) =>
            put(type, v._id, truck(v), `/vehicles/${v._id}`),
          );
          break;
        case "driver":
          (await find(Driver, "name")).forEach((d) =>
            put(type, d._id, d.name, `/drivers/${d._id}`),
          );
          break;
        case "customer":
          (await find(Customer, "name")).forEach((c) =>
            put(type, c._id, c.name, `/receivables/${c._id}`),
          );
          break;
        case "repair":
          (
            await find(Repair, "category vehicle", [
              ["vehicle", "vehicleNumber"],
            ])
          ).forEach((r) =>
            put(
              type,
              r._id,
              `Repair (${r.category.replace("_", " ")}) · ${truck(r.vehicle)}`,
            ),
          );
          break;
        case "diesel":
          (
            await find(DieselEntry, "fuelStation vehicle", [
              ["vehicle", "vehicleNumber"],
            ])
          ).forEach((e) =>
            put(
              type,
              e._id,
              `Fuel · ${e.fuelStation || "entry"} · ${truck(e.vehicle)}`,
            ),
          );
          break;
        case "salary":
          (
            await find(SalaryRecord, "month driver employee", [
              ["driver", "name"],
              ["employee", "name"],
            ])
          ).forEach((s) =>
            put(
              type,
              s._id,
              `Salary · ${s.driver?.name ?? s.employee?.name ?? "—"} · ${s.month}`,
            ),
          );
          break;
        case "office":
          (await find(OfficeExpense, "category")).forEach((o) =>
            put(type, o._id, `Office · ${o.category.replace("_", " ")}`),
          );
          break;
        case "shop":
          (await find(ShopTransaction, "type party")).forEach((s) =>
            put(
              type,
              s._id,
              `Shop · ${s.type}${s.party ? ` · ${s.party}` : ""}`,
            ),
          );
          break;
        case "expense":
          (await find(Expense, "category")).forEach((e) =>
            put(type, e._id, `Expense · ${e.category.replace("_", " ")}`),
          );
          break;
        case "income":
          (await find(Income, "type source")).forEach((i) =>
            put(
              type,
              i._id,
              `Income · ${i.source || i.type.replace("_", " ")}`,
            ),
          );
          break;
      }
    }),
  );

  return docs.map((d) => {
    const json = d.toJSON();
    const hit = d.entityType
      ? labels.get(`${d.entityType}:${d.entityId}`)
      : null;
    return { ...json, label: hit?.label ?? null, link: hit?.link ?? null };
  });
}

// ---- list ------------------------------------------------------------------------------
export const listDocuments = async (req, res) => {
  const q = req.query;
  const filter = { isDeleted: false };

  if (DOC_CATEGORIES.includes(q.category)) filter.category = q.category;
  if (ENTITY_TYPES.includes(q.entityType)) {
    filter.entityType = q.entityType;
    const id = toObjectId(q.entityId);
    if (id) filter.entityId = id;
  }
  const vehicle = toObjectId(q.vehicle);
  if (vehicle) filter.vehicle = vehicle;

  if (typeof q.search === "string" && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ title: rx }, { originalName: rx }, { notes: rx }];
  }

  const today = todayUTC();
  const soonEnd = new Date(today.getTime() + 30 * DAY);
  if (q.expiry === "expired") filter.expiryDate = { $lt: today };
  if (q.expiry === "soon") filter.expiryDate = { $gte: today, $lte: soonEnd };

  const pagination = getPagination(q);
  const [docs, total, [row]] = await Promise.all([
    Document.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Document.countDocuments(filter),
    Document.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          size: { $sum: "$size" },
          expired: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: [{ $type: "$expiryDate" }, "missing"] },
                    { $lt: ["$expiryDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          soon: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$expiryDate", today] },
                    { $lte: ["$expiryDate", soonEnd] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    data: await withLabels(docs),
    meta: buildMeta(pagination, total),
    totals: {
      count: row?.count ?? 0,
      size: row?.size ?? 0,
      expired: row?.expired ?? 0,
      soon: row?.soon ?? 0,
    },
  });
};

// ---- upload ------------------------------------------------------------------------------
export const createDocument = async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw new ApiError(400, "Choose a file to upload");
    await verifySignature(file.path, file.mimetype);

    const {
      title,
      category = "other",
      entityType,
      entityId,
      expiryDate,
      notes,
    } = req.body;
    if (!DOC_CATEGORIES.includes(category))
      throw new ApiError(400, "Invalid category");
    if (expiryDate && Number.isNaN(Date.parse(expiryDate)))
      throw new ApiError(400, "Invalid expiry date");

    let linkType;
    let linkId;
    let vehicle = null;
    if (entityType) {
      if (!ENTITY_TYPES.includes(entityType))
        throw new ApiError(400, "Invalid linked record type");
      const id = toObjectId(entityId);
      if (!id) throw new ApiError(400, "Invalid linked record");
      const target = await ENTITY_MODELS[entityType]
        .findOne({ _id: id, isDeleted: false })
        .select("vehicle");
      if (!target) throw new ApiError(404, "The linked record was not found");
      linkType = entityType;
      linkId = id;
      vehicle = entityType === "vehicle" ? id : (target.vehicle ?? null);
    }

    // multer reads file names as latin1; restore the real UTF-8 name
    const originalName = Buffer.from(file.originalname, "latin1").toString(
      "utf8",
    );

    const doc = await Document.create({
      title: title?.trim() || path.parse(originalName).name,
      category,
      entityType: linkType,
      entityId: linkId,
      vehicle,
      originalName,
      storedName: path.relative(UPLOAD_ROOT, file.path).replaceAll("\\", "/"),
      mimeType: file.mimetype,
      size: file.size,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      notes: notes?.trim() || undefined,
      uploadedBy: req.user._id,
    });

    const [data] = await withLabels([doc]);
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (file) await fs.unlink(file.path).catch(() => {});
    throw err;
  }
};

// ---- edit details (not the file itself) -----------------------------------------------------
const findOrFail = async (id) => {
  const doc = await Document.findOne({ _id: id, isDeleted: false });
  if (!doc) throw new ApiError(404, "Document not found");
  return doc;
};

export const updateDocument = async (req, res) => {
  const doc = await findOrFail(req.params.id);
  const { title, category, expiryDate, notes } = req.body;

  if (title !== undefined) {
    if (!String(title).trim()) throw new ApiError(400, "Title cannot be empty");
    doc.title = String(title).trim();
  }
  if (category !== undefined) {
    if (!DOC_CATEGORIES.includes(category))
      throw new ApiError(400, "Invalid category");
    doc.category = category;
  }
  if (expiryDate !== undefined) {
    if (expiryDate && Number.isNaN(Date.parse(expiryDate)))
      throw new ApiError(400, "Invalid expiry date");
    doc.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
  }
  if (notes !== undefined) doc.notes = String(notes).trim() || undefined;

  await doc.save();
  const [data] = await withLabels([doc]);
  res.json({ success: true, data });
};

// ---- delete: the file is removed from disk for good ---------------------------------------------
export const deleteDocument = async (req, res) => {
  const doc = await findOrFail(req.params.id);
  doc.isDeleted = true;
  await doc.save();
  await fs.unlink(absolutePath(doc.storedName)).catch(() => {});
  res.json({ success: true, message: "Document deleted" });
};

// ---- download / preview (authenticated) --------------------------------------------------------------
export const downloadDocument = async (req, res) => {
  const doc = await findOrFail(req.params.id);
  const file = absolutePath(doc.storedName);

  try {
    await fs.access(file);
  } catch {
    throw new ApiError(404, "The file is missing on the server");
  }

  const inline =
    doc.mimeType === "application/pdf" || doc.mimeType.startsWith("image/");
  res.sendFile(file, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=0",
    },
  });
};
