import cron from "node-cron";
import Notification from "../models/Notification.js";
import Repair from "../models/Repair.js";
import Vehicle from "../models/Vehicle.js";
import Document from "../models/Document.js";
import StockItem from "../models/StockItem.js";
import { getCustomerBalances } from "./receivables.js";

const DAY = 86400000;
const rs = (n) => `Rs ${Number(n || 0).toLocaleString("en-PK")}`;
const day = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const words = (s) => String(s || "").replace(/_/g, " ");

// "2026-W41": lets a reminder repeat once a week while the problem lasts
function weekKey(d = new Date()) {
  const t = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const first = Date.UTC(t.getUTCFullYear(), 0, 1);
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - first) / DAY + 1) / 7)).padStart(2, "0")}`;
}
const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

// `key` is unique: asking for the same reminder twice is simply ignored
async function raise(alert) {
  try {
    await Notification.create({ kind: "alert", ...alert });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
}

async function maintenance() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * DAY);

  // the latest repair of each (vehicle, category) decides whether a service is still due
  const rows = await Repair.aggregate([
    { $match: { isDeleted: false } },
    { $sort: { repairDate: -1, createdAt: -1 } },
    {
      $group: {
        _id: { vehicle: "$vehicle", category: "$category" },
        doc: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$doc" } },
    { $match: { nextMaintenanceDate: { $ne: null, $lte: horizon } } },
    { $limit: 100 },
  ]);

  const vehicles = await Vehicle.find({
    _id: { $in: rows.map((r) => r.vehicle) },
    isDeleted: false,
    status: { $ne: "sold" },
  })
    .select("vehicleNumber")
    .lean();
  const byId = new Map(vehicles.map((v) => [String(v._id), v]));

  for (const r of rows) {
    const v = byId.get(String(r.vehicle));
    if (!v) continue;
    const overdue = new Date(r.nextMaintenanceDate) < now;
    await raise({
      action: "maintenance",
      resource: "repairs",
      module: "repairs",
      severity: overdue ? "critical" : "warning",
      title: `${overdue ? "Maintenance overdue" : "Maintenance due soon"}: Truck #${v.vehicleNumber}`,
      message: `${words(r.category)} — due ${day(r.nextMaintenanceDate)}`,
      link: "/repairs",
      key: `maint:${r._id}:${weekKey()}`,
    });
  }
}

async function documents() {
  const now = new Date();
  const docs = await Document.find({
    isDeleted: false,
    expiryDate: { $ne: null, $lte: new Date(now.getTime() + 14 * DAY) },
  })
    .limit(200)
    .lean();

  for (const d of docs) {
    const expired = new Date(d.expiryDate) < now;
    await raise({
      action: "document_expiry",
      resource: "documents",
      module: "documents",
      severity: expired ? "critical" : "warning",
      title: `${expired ? "Document expired" : "Document expiring soon"}: ${d.title}`,
      message: `${expired ? "Expired" : "Expires"} on ${day(d.expiryDate)}`,
      link: "/documents",
      key: `doc:${d._id}:${expired ? "expired" : "soon"}`,
    });
  }
}

async function receivables() {
  const rows = await getCustomerBalances({});
  for (const r of rows.filter((c) => c.buckets.d90plus > 0)) {
    await raise({
      action: "receivable_overdue",
      resource: "receivables",
      module: "receivables",
      severity: "warning",
      title: `Overdue payment: ${r.name}`,
      message: `${rs(r.buckets.d90plus)} is more than 90 days old`,
      link: `/receivables/${r.id}`,
      key: `recv90:${r.id}:${monthKey()}`,
    });
  }
}

async function lowStock() {
  const items = await StockItem.find({
    isDeleted: false,
    reorderLevel: { $gt: 0 },
    $expr: { $lte: ["$quantity", "$reorderLevel"] },
  })
    .limit(100)
    .lean();

  for (const i of items) {
    await raise({
      action: "low_stock",
      resource: "shop",
      module: "shop",
      severity: "warning",
      title: `Low stock: ${i.name}`,
      message: `${i.quantity} ${i.unit || "pcs"} left (reorder at ${i.reorderLevel})`,
      link: "/shop",
      key: `stock:${i._id}:${weekKey()}`,
    });
  }
}

export async function runAlertChecks() {
  for (const check of [maintenance, documents, receivables, lowStock]) {
    try {
      await check();
    } catch (err) {
      console.error(`Alert check "${check.name}" failed:`, err.message);
    }
  }
}

export function startAlertScheduler() {
  const expression = process.env.ALERT_CRON || "0 8 * * *"; // every morning at 08:00
  const timezone = process.env.ALERT_TZ || "Asia/Karachi";

  if (!cron.validate(expression))
    return console.error(`❌ Invalid ALERT_CRON: ${expression}`);

  cron.schedule(expression, runAlertChecks, { timezone });
  setTimeout(runAlertChecks, 60_000).unref(); // also once shortly after the server starts
  console.log(`🔔 Reminder checks scheduled (${expression}, ${timezone})`);
}
