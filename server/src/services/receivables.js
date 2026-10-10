import Customer from "../models/Customer.js";
import Trip from "../models/Trip.js";
import Income from "../models/Income.js";
import { ApiError } from "../utils/ApiError.js";
import { escapeRegex, parseDay } from "../utils/queryHelpers.js";

const DAY = 86400000;
const round2 = (n) => Math.round(n * 100) / 100;

const todayUTC = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

export const resolveAsOf = (asOf) => parseDay(asOf) ?? todayUTC();
const endOfDay = (d) => new Date(d.getTime() + DAY - 1);

const EMPTY_BUCKETS = () => ({
  opening: 0,
  d30: 0,
  d60: 0,
  d90: 0,
  d90plus: 0,
});

/**
 * FIFO ageing.
 * Payments (and any customer credit) are applied to the oldest charges first:
 * opening balance, then trips by date. What is left is bucketed by trip age.
 * balance = what's left - unused credit (negative = customer paid more than owed).
 */
export function ageBalance({ opening, charges, paid, asOf }) {
  const buckets = EMPTY_BUCKETS();
  let credit = paid;
  let openingDue = opening;
  if (openingDue < 0) {
    credit += -openingDue;
    openingDue = 0;
  }

  const useOnOpening = Math.min(openingDue, credit);
  buckets.opening = openingDue - useOnOpening;
  credit -= useOnOpening;

  for (const c of charges) {
    const use = Math.min(c.amount, credit);
    credit -= use;
    const due = c.amount - use;
    if (due <= 0) continue;

    const days = Math.floor(
      (asOf.getTime() - new Date(c.date).getTime()) / DAY,
    );
    if (days <= 30) buckets.d30 += due;
    else if (days <= 60) buckets.d60 += due;
    else if (days <= 90) buckets.d90 += due;
    else buckets.d90plus += due;
  }

  for (const k of Object.keys(buckets)) buckets[k] = round2(buckets[k]);
  const outstanding = Object.values(buckets).reduce((s, v) => s + v, 0);
  return { buckets, balance: round2(outstanding - credit) };
}

export async function getCustomerBalances({ asOf, search } = {}) {
  const asOfDate = resolveAsOf(asOf);
  const asOfEnd = endOfDay(asOfDate);

  const customerFilter = { isDeleted: false };
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    customerFilter.$or = [{ name: rx }, { companyName: rx }, { phone: rx }];
  }

  const [customers, trips, payments] = await Promise.all([
    Customer.find(customerFilter)
      .select("name companyName phone openingBalance status")
      .lean(),
    Trip.find({
      isDeleted: false,
      status: { $ne: "cancelled" },
      remainingAmount: { $gt: 0 },
      tripDate: { $lte: asOfEnd },
    })
      .select("customer tripDate remainingAmount")
      .sort({ tripDate: 1, createdAt: 1 })
      .lean(),
    Income.aggregate([
      {
        $match: {
          isDeleted: false,
          type: "customer_payment",
          incomeDate: { $lte: asOfEnd },
        },
      },
      { $group: { _id: "$customer", amount: { $sum: "$amount" } } },
    ]),
  ]);

  const chargesBy = new Map();
  for (const t of trips) {
    const key = String(t.customer);
    if (!chargesBy.has(key)) chargesBy.set(key, []);
    chargesBy.get(key).push({ date: t.tripDate, amount: t.remainingAmount });
  }
  const paidBy = new Map(payments.map((p) => [String(p._id), p.amount]));

  return customers.map((c) => {
    const id = String(c._id);
    const charges = chargesBy.get(id) ?? [];
    const opening = c.openingBalance || 0;
    const paid = paidBy.get(id) ?? 0;
    const { buckets, balance } = ageBalance({
      opening,
      charges,
      paid,
      asOf: asOfDate,
    });

    return {
      id,
      name: c.name,
      companyName: c.companyName,
      phone: c.phone,
      status: c.status,
      opening,
      billed: round2(charges.reduce((s, x) => s + x.amount, 0)),
      paid: round2(paid),
      balance,
      buckets,
    };
  });
}

export function summarize(rows) {
  const totals = {
    receivable: 0,
    credit: 0,
    customers: 0,
    buckets: EMPTY_BUCKETS(),
  };
  for (const r of rows) {
    if (r.balance > 0) {
      totals.receivable += r.balance;
      totals.customers += 1;
    } else if (r.balance < 0) {
      totals.credit += -r.balance;
    }
    for (const k of Object.keys(totals.buckets))
      totals.buckets[k] += r.buckets[k];
  }
  totals.receivable = round2(totals.receivable);
  totals.credit = round2(totals.credit);
  for (const k of Object.keys(totals.buckets))
    totals.buckets[k] = round2(totals.buckets[k]);
  return totals;
}

export async function getCustomerStatement(customerId, asOf) {
  const asOfDate = resolveAsOf(asOf);

  const customer = await Customer.findOne({
    _id: customerId,
    isDeleted: false,
  }).lean();
  if (!customer) throw new ApiError(404, "Customer not found");

  const [trips, payments] = await Promise.all([
    Trip.find({
      customer: customerId,
      isDeleted: false,
      status: { $ne: "cancelled" },
    })
      .sort({ tripDate: 1, createdAt: 1 })
      .populate("vehicle", "vehicleNumber")
      .lean(),
    Income.find({
      customer: customerId,
      isDeleted: false,
      type: "customer_payment",
    })
      .sort({ incomeDate: 1, createdAt: 1 })
      .lean(),
  ]);

  const opening = customer.openingBalance || 0;
  const rows = [];

  if (opening !== 0) {
    rows.push({
      id: "opening",
      date: null,
      order: 0,
      type: "opening",
      description: "Opening balance (before using the system)",
      debit: opening > 0 ? opening : 0,
      credit: opening < 0 ? -opening : 0,
    });
  }
  for (const t of trips) {
    rows.push({
      id: String(t._id),
      date: t.tripDate,
      order: 1,
      type: "trip",
      description: `Truck #${t.vehicle?.vehicleNumber ?? "?"}: ${t.from} → ${t.to}${t.biltyNumber ? ` · Bilty ${t.biltyNumber}` : ""}`,
      debit: t.freightAmount,
      credit: t.advance,
    });
  }
  for (const p of payments) {
    rows.push({
      id: String(p._id),
      date: p.incomeDate,
      order: 2,
      type: "payment",
      description: `Payment received${p.paymentMethod ? ` (${p.paymentMethod.replace("_", " ")})` : ""}${p.reference ? ` · ${p.reference}` : ""}`,
      debit: 0,
      credit: p.amount,
    });
  }

  rows.sort((a, b) => {
    if (!a.date && b.date) return -1;
    if (a.date && !b.date) return 1;
    const diff = a.date && b.date ? new Date(a.date) - new Date(b.date) : 0;
    return diff || a.order - b.order;
  });

  let running = 0;
  const statement = rows.map(({ order, ...r }) => {
    running = round2(running + r.debit - r.credit);
    return { ...r, balance: running };
  });

  const freight = trips.reduce((s, t) => s + t.freightAmount, 0);
  const advances = trips.reduce((s, t) => s + t.advance, 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);

  const charges = trips
    .filter((t) => t.remainingAmount > 0)
    .map((t) => ({ date: t.tripDate, amount: t.remainingAmount }));
  const { buckets, balance } = ageBalance({
    opening,
    charges,
    paid,
    asOf: asOfDate,
  });

  return {
    customer: {
      id: String(customer._id),
      name: customer.name,
      companyName: customer.companyName,
      phone: customer.phone,
      address: customer.address,
    },
    summary: {
      trips: trips.length,
      opening,
      freight,
      advances,
      payments: paid,
      balance,
      buckets,
    },
    statement,
  };
}
