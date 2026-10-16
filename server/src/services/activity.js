import Notification from "../models/Notification.js";
import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import Customer from "../models/Customer.js";
import Trip from "../models/Trip.js";
import DieselEntry from "../models/DieselEntry.js";
import Repair from "../models/Repair.js";
import SalaryRecord from "../models/SalaryRecord.js";
import Employee from "../models/Employee.js";
import ShopTransaction from "../models/ShopTransaction.js";
import StockItem from "../models/StockItem.js";
import OfficeExpense from "../models/OfficeExpense.js";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Investment from "../models/Investment.js";
import Document from "../models/Document.js";
import User from "../models/User.js";
import PayablePayment from "../models/PayablePayment.js";

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const GROUP_WINDOW_MS = 10 * 60 * 1000; // same person + same action + same area within 10 minutes = one notification
const MAX_ENTRIES = 20;

const rs = (n) => `Rs ${Number(n || 0).toLocaleString("en-PK")}`;
const truck = (v) => (v?.vehicleNumber ? `Truck #${v.vehicleNumber}` : "");
const dot = (...parts) => parts.filter(Boolean).join(" · ");
const words = (s) => String(s || "").replace(/_/g, " ");
const enc = encodeURIComponent;
const idOf = (d) => String(d.id ?? d._id ?? "");

const PAYABLE_KIND = {
  salary: "salaries",
  repair: "workshops",
  fuel: "fuel stations",
  shop: "shop suppliers",
  office: "office bills",
  expense: "other bills",
};

/**
 * Which actions are announced.
 *  module   : the permission module someone needs to see it
 *  noun     : "Bilal added a ___"
 *  page     : the list page it links to
 *  detail   : optional link to the record itself
 *  label    : the readable description of the record (works on API JSON and on database records)
 *  model    : used to read a record BEFORE it is deleted (so we know its name)
 *  phrase   : optional fixed wording instead of "added a ___"
 */
const REGISTRY = {
  vehicles: {
    module: "vehicles",
    noun: "vehicle",
    model: Vehicle,
    page: "/vehicles",
    detail: (d) => `/vehicles/${idOf(d)}`,
    label: (d) => `Truck #${d.vehicleNumber}`,
  },
  drivers: {
    module: "drivers",
    noun: "driver",
    model: Driver,
    page: "/drivers",
    detail: (d) => `/drivers/${idOf(d)}`,
    label: (d) => d.name,
  },
  customers: {
    module: "customers",
    noun: "customer",
    model: Customer,
    page: "/customers",
    label: (d) => d.name,
  },
  trips: {
    module: "trips",
    noun: "trip",
    model: Trip,
    populate: [["vehicle", "vehicleNumber"]],
    page: "/trips",
    detail: (d) => `/trips?q=${enc(d.biltyNumber || d.from || "")}`,
    label: (d) =>
      dot(`${d.from} → ${d.to}`, truck(d.vehicle), rs(d.freightAmount)),
  },
  diesel: {
    module: "diesel",
    noun: "fuel entry",
    model: DieselEntry,
    populate: [["vehicle", "vehicleNumber"]],
    page: "/diesel",
    detail: (d) => `/diesel?q=${enc(d.fuelStation || "")}`,
    label: (d) =>
      dot(`${d.liters} L`, rs(d.totalAmount), truck(d.vehicle), d.fuelStation),
  },
  repairs: {
    module: "repairs",
    noun: "repair",
    model: Repair,
    populate: [["vehicle", "vehicleNumber"]],
    page: "/repairs",
    label: (d) =>
      dot(words(d.category), rs(d.totalCost), truck(d.vehicle), d.mechanic),
  },
  salaries: {
    module: "employees",
    noun: "salary record",
    model: SalaryRecord,
    populate: [
      ["driver", "name"],
      ["employee", "name"],
    ],
    page: "/employees",
    label: (d) =>
      dot(
        d.driver?.name ?? d.employee?.name,
        d.month,
        `net ${rs(d.netSalary)}`,
      ),
  },
  employees: {
    module: "employees",
    noun: "staff member",
    model: Employee,
    page: "/employees",
    label: (d) => dot(d.name, d.designation),
  },
  shop: {
    module: "shop",
    noun: "shop entry",
    model: ShopTransaction,
    page: "/shop",
    label: (d) => dot(d.type, rs(d.amount), d.party),
  },
  "shop/stock": {
    module: "shop",
    noun: "stock item",
    model: StockItem,
    page: "/shop",
    label: (d) => d.name,
  },
  office: {
    module: "office",
    noun: "office expense",
    model: OfficeExpense,
    page: "/office",
    label: (d) => dot(words(d.category), rs(d.amount), d.description),
  },
  income: {
    module: "income",
    noun: "income entry",
    model: Income,
    page: "/income",
    label: (d) => dot(words(d.type), rs(d.amount), d.source),
  },
  expenses: {
    module: "expenses",
    noun: "expense",
    model: Expense,
    page: "/expenses",
    label: (d) => dot(words(d.category), rs(d.amount), d.description),
  },
  investments: {
    module: "investments",
    noun: "investment",
    model: Investment,
    page: "/investments",
    label: (d) => dot(`${d.group} / ${words(d.category)}`, rs(d.amount)),
  },
  documents: {
    module: "documents",
    noun: "document",
    model: Document,
    page: "/documents",
    label: (d) => d.title,
  },
  users: {
    module: "users",
    noun: "user",
    model: User,
    page: "/users",
    label: (d) => dot(d.name, d.email),
  },

  "receivables/payments": {
    module: "receivables",
    noun: "customer payment",
    page: "/receivables",
    phrase: { create: "recorded a customer payment" },
    label: async (d) => {
      const c = d.customer
        ? await Customer.findById(d.customer).select("name").lean()
        : null;
      return dot(c?.name, `${rs(d.amount)} received`);
    },
  },
  "payables/pay": {
    module: "payables",
    noun: "bill payment",
    page: "/payables",
    phrase: { create: "recorded a bill payment" },
    label: (d) => `${rs(d.amount)} paid (${PAYABLE_KIND[d.kind] ?? d.kind})`,
  },
  "payables/payments": {
    module: "payables",
    noun: "payment",
    model: PayablePayment,
    page: "/payables",
    phrase: { delete: "reversed a payment" },
    label: (d) => dot(rs(d.amount), PAYABLE_KIND[d.kind] ?? d.kind),
  },
  "salaries/generate": {
    module: "employees",
    noun: "salary run",
    page: "/employees",
    phrase: { create: "generated the monthly salaries" },
    label: (d, ctx) =>
      `${d.created} record(s) created for ${ctx.body?.month ?? "the month"}`,
  },
};

const VERB = { create: "added", update: "changed", delete: "deleted" };
const plural = (noun) =>
  noun.endsWith("y") ? `${noun.slice(0, -1)}ies` : `${noun}s`;

function titleFor(name, action, entry, count) {
  const phrase = entry.phrase?.[action];
  if (phrase)
    return count > 1
      ? `${name} ${phrase} (${count} times)`
      : `${name} ${phrase}`;
  if (count > 1)
    return `${name} ${VERB[action]} ${count} ${plural(entry.noun)}`;
  return `${name} ${VERB[action]} ${/^[aeiou]/i.test(entry.noun) ? "an" : "a"} ${entry.noun}`;
}

// "trips/65f.../x"  ->  { key: "trips", entry, id }
function resolveTarget(req) {
  const parts = req.originalUrl
    .split("?")[0]
    .replace(/^\/api\//, "")
    .split("/")
    .filter(Boolean);
  const [resource, second] = parts;
  if (!resource) return null;

  const sub =
    second && !OBJECT_ID.test(second) ? `${resource}/${second}` : null;
  const key = sub && REGISTRY[sub] ? sub : resource;
  const entry = REGISTRY[key];
  if (!entry) return null;

  return { key, entry, id: parts.find((p, i) => i > 0 && OBJECT_ID.test(p)) };
}

async function loadRecord({ entry, id }) {
  if (!entry.model || !id) return null;
  try {
    let q = entry.model.findById(id);
    for (const p of entry.populate ?? []) q = q.populate(...p);
    return await q.lean();
  } catch {
    return null;
  }
}

// Writes the event, or adds to the person's recent group of the same kind
async function record({ actor, action, key, entry, label, link }) {
  const row = { label, link, at: new Date() };

  const grouped = await Notification.findOneAndUpdate(
    {
      kind: "activity",
      "actor.id": actor._id,
      action,
      resource: key,
      updatedAt: { $gte: new Date(Date.now() - GROUP_WINDOW_MS) },
    },
    {
      $inc: { count: 1 },
      $push: { entries: { $each: [row], $slice: -MAX_ENTRIES } },
      $set: { link },
    },
    { sort: { updatedAt: -1 }, new: true },
  );

  if (grouped) {
    await Notification.updateOne(
      { _id: grouped._id },
      {
        $set: {
          title: titleFor(actor.name, action, entry, grouped.count),
          message: `Latest: ${label}`,
        },
      },
    );
    return;
  }

  await Notification.create({
    kind: "activity",
    action,
    resource: key,
    module: entry.module,
    actor: { id: actor._id, name: actor.name, role: actor.role },
    title: titleFor(actor.name, action, entry, 1),
    message: label,
    link,
    count: 1,
    entries: [row],
  });
}

async function handleFinish(req, res, target, beforeDelete) {
  const { entry, key, id } = target;
  const action =
    req.method === "DELETE"
      ? "delete"
      : req.method === "POST" && !id
        ? "create"
        : "update";

  let doc =
    action === "delete" ? await beforeDelete : res.locals.activityBody?.data;
  if (!doc && id && action !== "delete") doc = await loadRecord(target); // e.g. a password reset only returns a message
  if (!doc) return;

  let label = entry.noun;
  let link = entry.page;
  try {
    label = (await entry.label(doc, { body: req.body })) || entry.noun;
    link =
      action === "delete" ? entry.page : (entry.detail?.(doc) ?? entry.page);
  } catch {
    /* keep the plain wording */
  }

  await record({ actor: req.user, action, key, entry, label, link });
}

/**
 * Mount BEFORE the routes:  app.use("/api", activityNotifier);
 * Announces every successful add / change / delete made through the API.
 */
export function activityNotifier(req, res, next) {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return next();

  const target = resolveTarget(req);
  if (!target) return next();

  const send = res.json.bind(res);
  res.json = (body) => {
    res.locals.activityBody = body;
    return send(body);
  };

  // Deleting returns no record, so read it first to know what was deleted (deletes are soft, so this is safe)
  const beforeDelete =
    req.method === "DELETE" && target.id ? loadRecord(target) : null;

  res.on("finish", () => {
    if (res.statusCode >= 300 || !req.user) return;
    handleFinish(req, res, target, beforeDelete).catch((err) =>
      console.error("Notification failed:", err.message),
    );
  });

  next();
}
