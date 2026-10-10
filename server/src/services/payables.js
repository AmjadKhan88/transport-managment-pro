import mongoose from "mongoose";
import DieselEntry from "../models/DieselEntry.js";
import Repair from "../models/Repair.js";
import ShopTransaction from "../models/ShopTransaction.js";
import OfficeExpense from "../models/OfficeExpense.js";
import Expense from "../models/Expense.js";
import SalaryRecord from "../models/SalaryRecord.js";
import PayablePayment, { PAYABLE_KINDS } from "../models/PayablePayment.js";
import { ApiError } from "../utils/ApiError.js";

const EPS = 0.005;
const round2 = (n) => Math.round(n * 100) / 100;

export const KIND_ORDER = [
  "salary",
  "repair",
  "fuel",
  "shop",
  "office",
  "expense",
];
export const KIND_LABELS = {
  salary: "Salaries",
  repair: "Workshops",
  fuel: "Fuel stations",
  shop: "Shop suppliers",
  office: "Office bills",
  expense: "Other bills",
};

// How each kind of bill is read: which model, which fields, who is "the party"
const CONFIG = {
  fuel: {
    model: DieselEntry,
    date: "fuelDate",
    amount: "totalAmount",
    party: "fuelStation",
    ref: "receiptNumber",
    describe: (e) => `${e.liters} L${e.route ? ` · ${e.route}` : ""}`,
  },
  repair: {
    model: Repair,
    date: "repairDate",
    amount: "totalCost",
    party: "mechanic",
    ref: "billNumber",
    describe: (e) =>
      `${e.category.replace("_", " ")}${e.description ? ` · ${e.description}` : ""}`,
  },
  shop: {
    model: ShopTransaction,
    date: "txnDate",
    amount: "amount",
    party: "party",
    ref: "reference",
    extra: { type: { $in: ["purchase", "expense"] } },
    describe: (e) => `${e.type}${e.description ? ` · ${e.description}` : ""}`,
  },
  office: {
    model: OfficeExpense,
    date: "expenseDate",
    amount: "amount",
    party: "category",
    ref: "billNumber",
    describe: (e) => e.description || "",
  },
  expense: {
    model: Expense,
    date: "expenseDate",
    amount: "amount",
    party: "category",
    ref: "reference",
    describe: (e) => e.description || "",
  },
};

// ---- outstanding bills (not salaries) --------------------------------------
async function loadOutstanding(kind, party) {
  const cfg = CONFIG[kind];
  const filter = { isDeleted: false, paymentStatus: "unpaid", ...cfg.extra };
  if (party !== undefined)
    filter[cfg.party] = party === "" ? { $in: [null, ""] } : party;

  const [entries, allocRows] = await Promise.all([
    cfg.model
      .find(filter)
      .sort({ [cfg.date]: 1, createdAt: 1 })
      .lean(),
    PayablePayment.aggregate([
      { $match: { isDeleted: false, kind } },
      { $unwind: "$allocations" },
      {
        $group: {
          _id: "$allocations.entry",
          amount: { $sum: "$allocations.amount" },
        },
      },
    ]),
  ]);
  const allocated = new Map(allocRows.map((r) => [String(r._id), r.amount]));

  return entries
    .map((e) => {
      const amount = e[cfg.amount];
      const outstanding = Math.max(
        round2(amount - (allocated.get(String(e._id)) || 0)),
        0,
      );
      return {
        id: String(e._id),
        date: e[cfg.date],
        party: (e[cfg.party] || "").trim(),
        amount,
        outstanding,
        description: cfg.describe(e),
        reference: e[cfg.ref] || "",
      };
    })
    .filter((e) => e.outstanding > EPS);
}

// ---- outstanding salaries ---------------------------------------------------
async function loadSalaryOutstanding(payee) {
  const filter = {
    isDeleted: false,
    paymentStatus: { $in: ["unpaid", "partial"] },
  };
  if (payee) {
    filter.payeeType = payee.type;
    filter[payee.type] = payee.id;
  }
  const records = await SalaryRecord.find(filter)
    .sort({ month: 1, createdAt: 1 })
    .populate("driver", "name")
    .populate("employee", "name")
    .lean();

  return records
    .map((r) => {
      const who = r.payeeType === "driver" ? r.driver : r.employee;
      return {
        id: String(r._id),
        month: r.month,
        payeeType: r.payeeType,
        payeeId: String(who?._id ?? ""),
        name: who?.name ?? "—",
        net: r.netSalary,
        paid: r.paidAmount,
        outstanding: round2(r.netSalary - r.paidAmount),
      };
    })
    .filter((r) => r.outstanding > EPS);
}

function parseSalaryParty(party) {
  const [type, id] = String(party).split(":");
  if (
    !["driver", "employee"].includes(type) ||
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    throw new ApiError(400, "Invalid salary payee");
  }
  return { type, id };
}

// ---- overview ----------------------------------------------------------------
export async function getPayables() {
  const kinds = [];

  for (const kind of KIND_ORDER) {
    const map = new Map();

    if (kind === "salary") {
      for (const r of await loadSalaryOutstanding()) {
        const key = `${r.payeeType}:${r.payeeId}`;
        const p = map.get(key) ?? {
          key,
          label: r.name,
          count: 0,
          outstanding: 0,
          oldest: r.month,
        };
        p.count += 1;
        p.outstanding = round2(p.outstanding + r.outstanding);
        map.set(key, p);
      }
    } else {
      for (const e of await loadOutstanding(kind)) {
        const p = map.get(e.party) ?? {
          key: e.party,
          label: e.party,
          count: 0,
          outstanding: 0,
          oldest: e.date,
        };
        p.count += 1;
        p.outstanding = round2(p.outstanding + e.outstanding);
        map.set(e.party, p);
      }
    }

    const parties = [...map.values()].sort(
      (a, b) => b.outstanding - a.outstanding,
    );
    kinds.push({
      kind,
      label: KIND_LABELS[kind],
      total: round2(parties.reduce((s, p) => s + p.outstanding, 0)),
      parties,
    });
  }

  return { total: round2(kinds.reduce((s, k) => s + k.total, 0)), kinds };
}

export async function getPartyBills(kind, party) {
  if (kind === "salary") {
    const rows = await loadSalaryOutstanding(parseSalaryParty(party));
    return rows.map((r) => ({
      id: r.id,
      month: r.month,
      amount: r.net,
      paid: r.paid,
      outstanding: r.outstanding,
    }));
  }
  if (!CONFIG[kind]) throw new ApiError(400, "Invalid kind");
  return loadOutstanding(kind, party);
}

// ---- paying ------------------------------------------------------------------
async function paySalary({ party, amount, date, method }) {
  const payee = parseSalaryParty(party);
  const filter = {
    isDeleted: false,
    paymentStatus: { $in: ["unpaid", "partial"] },
    payeeType: payee.type,
    [payee.type]: payee.id,
  };
  const records = await SalaryRecord.find(filter).sort({
    month: 1,
    createdAt: 1,
  });
  const outstanding = round2(
    records.reduce((s, r) => s + (r.netSalary - r.paidAmount), 0),
  );
  if (amount > outstanding + EPS) {
    throw new ApiError(
      400,
      `Amount is more than the outstanding salary (${outstanding})`,
    );
  }

  let left = amount;
  let applied = 0;
  for (const record of records) {
    if (left <= EPS) break;
    const due = round2(record.netSalary - record.paidAmount);
    const use = Math.min(due, left);
    record.paidAmount = round2(record.paidAmount + use);
    record.paymentMethod = method;
    record.paymentDate = date ? new Date(date) : new Date();
    await record.save(); // status is recalculated by the model
    left = round2(left - use);
    applied += 1;
  }
  return { kind: "salary", amount, billsTouched: applied };
}

export async function payParty({
  kind,
  party = "",
  amount,
  date,
  method = "cash",
  reference,
  notes,
  userId,
}) {
  if (kind === "salary") return paySalary({ party, amount, date, method });

  const cfg = CONFIG[kind];
  if (!cfg) throw new ApiError(400, "Invalid kind");

  const bills = await loadOutstanding(kind, party);
  const outstanding = round2(bills.reduce((s, b) => s + b.outstanding, 0));
  if (outstanding <= EPS)
    throw new ApiError(400, "Nothing is outstanding for this party");
  if (amount > outstanding + EPS) {
    throw new ApiError(
      400,
      `Amount is more than the outstanding balance (${outstanding})`,
    );
  }

  let left = amount;
  const allocations = [];
  const settled = [];
  for (const bill of bills) {
    if (left <= EPS) break;
    const use = Math.min(bill.outstanding, left);
    allocations.push({ entry: bill.id, amount: round2(use) });
    if (bill.outstanding - use <= EPS) settled.push(bill.id);
    left = round2(left - use);
  }

  const payment = await PayablePayment.create({
    kind,
    party,
    amount,
    paymentDate: date ? new Date(date) : new Date(),
    paymentMethod: method,
    reference,
    notes,
    allocations,
    createdBy: userId,
  });

  if (settled.length)
    await cfg.model.updateMany(
      { _id: { $in: settled } },
      { paymentStatus: "paid" },
    );

  return {
    kind,
    amount,
    paymentId: String(payment._id),
    billsTouched: allocations.length,
    billsSettled: settled.length,
  };
}

// Undo a payment: bills that are no longer fully covered go back to "unpaid"
export async function reversePayment(paymentId) {
  const payment = await PayablePayment.findOne({
    _id: paymentId,
    isDeleted: false,
  });
  if (!payment) throw new ApiError(404, "Payment not found");

  const cfg = CONFIG[payment.kind];
  payment.isDeleted = true;
  await payment.save();

  const entryIds = payment.allocations.map((a) => a.entry);
  const [entries, allocRows] = await Promise.all([
    cfg.model
      .find({ _id: { $in: entryIds } })
      .select(`${cfg.amount} paymentStatus`)
      .lean(),
    PayablePayment.aggregate([
      { $match: { isDeleted: false, kind: payment.kind } },
      { $unwind: "$allocations" },
      { $match: { "allocations.entry": { $in: entryIds } } },
      {
        $group: {
          _id: "$allocations.entry",
          amount: { $sum: "$allocations.amount" },
        },
      },
    ]),
  ]);
  const allocated = new Map(allocRows.map((r) => [String(r._id), r.amount]));

  const reopen = entries
    .filter(
      (e) =>
        e.paymentStatus === "paid" &&
        (allocated.get(String(e._id)) || 0) < e[cfg.amount] - EPS,
    )
    .map((e) => e._id);
  if (reopen.length)
    await cfg.model.updateMany(
      { _id: { $in: reopen } },
      { paymentStatus: "unpaid" },
    );
}
