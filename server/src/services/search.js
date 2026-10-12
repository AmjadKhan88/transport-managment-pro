import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import Customer from "../models/Customer.js";
import Trip from "../models/Trip.js";
import Repair from "../models/Repair.js";
import DieselEntry from "../models/DieselEntry.js";
import Document from "../models/Document.js";
import ShopTransaction from "../models/ShopTransaction.js";
import OfficeExpense from "../models/OfficeExpense.js";
import Expense from "../models/Expense.js";
import Income from "../models/Income.js";
import { hasPermission } from "../config/permissions.js";
import { escapeRegex } from "../utils/queryHelpers.js";

const LIMIT = 5;
const enc = encodeURIComponent;
const date = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";
const money = (n) => `Rs ${Number(n || 0).toLocaleString("en-PK")}`;
const truck = (v) => (v ? `Truck #${v.vehicleNumber}` : "");
const join = (...parts) => parts.filter(Boolean).join(" · ");

export async function globalSearch(user, query) {
  const term = String(query || "").trim();
  if (term.length < 2) return [];

  const rx = new RegExp(escapeRegex(term), "i");
  const can = (module) => hasPermission(user.role, module, "view");

  // vehicles / customers that match, so trips, fuel, repairs and income can be found by "311" or a customer name
  const [vehicleIds, customerIds] = await Promise.all([
    Vehicle.find({
      isDeleted: false,
      $or: [{ vehicleNumber: rx }, { registrationNumber: rx }],
    })
      .limit(20)
      .distinct("_id"),
    Customer.find({
      isDeleted: false,
      $or: [{ name: rx }, { companyName: rx }],
    })
      .limit(20)
      .distinct("_id"),
  ]);

  const groups = [];
  const add = (type, label, items) =>
    items.length && groups.push({ type, label, items });

  const tasks = [];
  const task = (module, fn) => can(module) && tasks.push(fn());

  task("vehicles", async () => {
    const rows = await Vehicle.find({
      isDeleted: false,
      $or: [
        { vehicleNumber: rx },
        { registrationNumber: rx },
        { make: rx },
        { model: rx },
      ],
    })
      .limit(LIMIT)
      .lean();
    return {
      order: 1,
      type: "vehicle",
      label: "Vehicles",
      items: rows.map((v) => ({
        id: String(v._id),
        title: `Truck #${v.vehicleNumber}`,
        subtitle: join(
          [v.make, v.model].filter(Boolean).join(" "),
          v.registrationNumber,
        ),
        to: `/vehicles/${v._id}`,
      })),
    };
  });

  task("drivers", async () => {
    const rows = await Driver.find({
      isDeleted: false,
      $or: [{ name: rx }, { fatherName: rx }, { cnic: rx }, { phone: rx }],
    })
      .limit(LIMIT)
      .lean();
    return {
      order: 2,
      type: "driver",
      label: "Drivers",
      items: rows.map((d) => ({
        id: String(d._id),
        title: d.name,
        subtitle: join(d.fatherName && `S/O ${d.fatherName}`, d.cnic, d.phone),
        to: `/drivers/${d._id}`,
      })),
    };
  });

  task("customers", async () => {
    const rows = await Customer.find({
      isDeleted: false,
      $or: [{ name: rx }, { companyName: rx }, { phone: rx }],
    })
      .limit(LIMIT)
      .lean();
    const ledger = can("receivables");
    return {
      order: 3,
      type: "customer",
      label: "Customers",
      items: rows.map((c) => ({
        id: String(c._id),
        title: c.name,
        subtitle: join(c.companyName, c.phone),
        to: ledger ? `/receivables/${c._id}` : `/customers?q=${enc(c.name)}`,
      })),
    };
  });

  task("trips", async () => {
    const rows = await Trip.find({
      isDeleted: false,
      $or: [
        { biltyNumber: rx },
        { from: rx },
        { to: rx },
        { vehicle: { $in: vehicleIds } },
        { customer: { $in: customerIds } },
      ],
    })
      .sort({ tripDate: -1 })
      .limit(LIMIT)
      .populate("vehicle", "vehicleNumber")
      .populate("customer", "name")
      .lean();
    return {
      order: 4,
      type: "trip",
      label: "Trips",
      items: rows.map((t) => ({
        id: String(t._id),
        title: `${t.from} → ${t.to}`,
        subtitle: join(
          truck(t.vehicle),
          t.customer?.name,
          date(t.tripDate),
          money(t.freightAmount),
        ),
        to: `/trips?q=${enc(t.biltyNumber || t.from)}`,
      })),
    };
  });

  task("repairs", async () => {
    const rows = await Repair.find({
      isDeleted: false,
      $or: [
        { mechanic: rx },
        { parts: rx },
        { description: rx },
        { billNumber: rx },
        { vehicle: { $in: vehicleIds } },
      ],
    })
      .sort({ repairDate: -1 })
      .limit(LIMIT)
      .populate("vehicle", "vehicleNumber")
      .lean();
    return {
      order: 5,
      type: "repair",
      label: "Repairs",
      items: rows.map((r) => ({
        id: String(r._id),
        title: `${r.category.replace("_", " ")} · ${money(r.totalCost)}`,
        subtitle: join(truck(r.vehicle), r.mechanic, date(r.repairDate)),
        to: `/repairs?q=${enc(r.mechanic || r.billNumber || term)}`,
      })),
    };
  });

  task("diesel", async () => {
    const rows = await DieselEntry.find({
      isDeleted: false,
      $or: [
        { fuelStation: rx },
        { receiptNumber: rx },
        { route: rx },
        { vehicle: { $in: vehicleIds } },
      ],
    })
      .sort({ fuelDate: -1 })
      .limit(LIMIT)
      .populate("vehicle", "vehicleNumber")
      .lean();
    return {
      order: 6,
      type: "diesel",
      label: "Fuel entries",
      items: rows.map((e) => ({
        id: String(e._id),
        title: `${e.liters} L · ${money(e.totalAmount)}`,
        subtitle: join(truck(e.vehicle), e.fuelStation, date(e.fuelDate)),
        to: `/diesel?q=${enc(e.fuelStation || e.receiptNumber || term)}`,
      })),
    };
  });

  task("documents", async () => {
    const rows = await Document.find({
      isDeleted: false,
      $or: [{ title: rx }, { originalName: rx }, { notes: rx }],
    })
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean();
    return {
      order: 7,
      type: "document",
      label: "Documents",
      items: rows.map((d) => ({
        id: String(d._id),
        title: d.title,
        subtitle: join(d.category.replace("_", " "), d.originalName),
        to: `/documents?q=${enc(d.title)}`,
      })),
    };
  });

  task("shop", async () => {
    const rows = await ShopTransaction.find({
      isDeleted: false,
      $or: [{ party: rx }, { description: rx }, { reference: rx }],
    })
      .sort({ txnDate: -1 })
      .limit(LIMIT)
      .lean();
    return {
      order: 8,
      type: "shop",
      label: "Shop",
      items: rows.map((s) => ({
        id: String(s._id),
        title: `${s.type} · ${money(s.amount)}`,
        subtitle: join(s.party, s.description, date(s.txnDate)),
        to: `/shop?q=${enc(s.party || s.description || s.reference || term)}`,
      })),
    };
  });

  task("office", async () => {
    const rows = await OfficeExpense.find({
      isDeleted: false,
      $or: [{ description: rx }, { billNumber: rx }],
    })
      .sort({ expenseDate: -1 })
      .limit(LIMIT)
      .lean();
    return {
      order: 9,
      type: "office",
      label: "Office",
      items: rows.map((o) => ({
        id: String(o._id),
        title: `${o.category.replace("_", " ")} · ${money(o.amount)}`,
        subtitle: join(o.description, date(o.expenseDate)),
        to: `/office?q=${enc(o.description || o.billNumber || term)}`,
      })),
    };
  });

  task("expenses", async () => {
    const rows = await Expense.find({
      isDeleted: false,
      $or: [{ description: rx }, { reference: rx }],
    })
      .sort({ expenseDate: -1 })
      .limit(LIMIT)
      .lean();
    return {
      order: 10,
      type: "expense",
      label: "Expenses",
      items: rows.map((e) => ({
        id: String(e._id),
        title: `${e.category.replace("_", " ")} · ${money(e.amount)}`,
        subtitle: join(e.description, date(e.expenseDate)),
        to: `/expenses?q=${enc(e.description || e.reference || term)}`,
      })),
    };
  });

  task("income", async () => {
    const rows = await Income.find({
      isDeleted: false,
      $or: [
        { source: rx },
        { reference: rx },
        { notes: rx },
        { customer: { $in: customerIds } },
      ],
    })
      .sort({ incomeDate: -1 })
      .limit(LIMIT)
      .populate("customer", "name")
      .lean();
    return {
      order: 11,
      type: "income",
      label: "Income",
      items: rows.map((i) => ({
        id: String(i._id),
        title: `${i.type.replace("_", " ")} · ${money(i.amount)}`,
        subtitle: join(i.customer?.name, i.source, date(i.incomeDate)),
        to: `/income?q=${enc(i.source || i.reference || i.customer?.name || term)}`,
      })),
    };
  });

  const results = await Promise.all(tasks);
  for (const r of results.sort((a, b) => a.order - b.order))
    add(r.type, r.label, r.items);
  return groups;
}
