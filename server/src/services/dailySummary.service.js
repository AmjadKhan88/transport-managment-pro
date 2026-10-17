import User from "../models/User.js";
import AutomationLog from "../models/AutomationLog.js";
import {
  sendText,
  sendTemplate,
  isWindowClosedError,
} from "./whatsapp.service.js";
import { sendEmail } from "./email.service.js";

// ADAPT: import paths to match your real models
import Trip from "../models/Trip.js";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Diesel from "../models/Diesel.js";
import Repair from "../models/Repair.js";
import Salary from "../models/Salary.js";
import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import Customer from "../models/Customer.js";

const TZ = "Asia/Karachi";

// ADAPT: amountField must match your schema. kind: income | expense | info
const SOURCES = [
  {
    key: "trips",
    label: "Trips",
    model: Trip,
    kind: "income",
    amountField: "freight",
  },
  {
    key: "income",
    label: "Other income",
    model: Income,
    kind: "income",
    amountField: "amount",
  },
  {
    key: "diesel",
    label: "Diesel",
    model: Diesel,
    kind: "expense",
    amountField: "totalAmount",
  },
  {
    key: "repairs",
    label: "Repairs",
    model: Repair,
    kind: "expense",
    amountField: "cost",
  },
  {
    key: "expenses",
    label: "Other expenses",
    model: Expense,
    kind: "expense",
    amountField: "amount",
  },
  {
    key: "salaries",
    label: "Salaries",
    model: Salary,
    kind: "expense",
    amountField: "netSalary",
  },
  { key: "vehicles", label: "New vehicles", model: Vehicle, kind: "info" },
  { key: "drivers", label: "New drivers", model: Driver, kind: "info" },
  { key: "customers", label: "New customers", model: Customer, kind: "info" },
];

/* ---------- helpers ---------- */
export const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // YYYY-MM-DD

function dayRange(dateKey) {
  const from = new Date(`${dateKey}T00:00:00+05:00`); // Pakistan has no DST
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

export function fmtMoney(n = 0) {
  const v = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (v >= 1e7) return `${sign}Rs ${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${sign}Rs ${(v / 1e5).toFixed(1)} Lac`;
  return `${sign}Rs ${Math.round(v).toLocaleString("en-PK")}`;
}

/* ---------- build the data ---------- */
export async function buildSummary(dateKey = todayKey()) {
  const { from, to } = dayRange(dateKey);

  const rows = await Promise.all(
    SOURCES.map(async (s) => {
      const match = { createdAt: { $gte: from, $lt: to } };
      const [agg] = await s.model.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: s.amountField ? `$${s.amountField}` : 0 },
          },
        },
      ]);

      // who did the data entry (only if the schema has createdBy)
      let byUser = [];
      if (s.model.schema.path("createdBy")) {
        byUser = await s.model.aggregate([
          { $match: match },
          { $group: { _id: "$createdBy", n: { $sum: 1 } } },
        ]);
      }
      return { ...s, count: agg?.count || 0, total: agg?.total || 0, byUser };
    }),
  );

  const active = rows.filter((r) => r.count > 0);

  // ADAPT: for exact consistency with your dashboard, replace these two lines with
  // your Step 10 company-overview function for (from, to) to avoid double counting.
  const income = active
    .filter((r) => r.kind === "income")
    .reduce((a, r) => a + r.total, 0);
  const expenses = active
    .filter((r) => r.kind === "expense")
    .reduce((a, r) => a + r.total, 0);

  // merge per-user counts
  const userCount = {};
  active.forEach((r) =>
    r.byUser.forEach((u) => {
      if (u._id) userCount[u._id] = (userCount[u._id] || 0) + u.n;
    }),
  );
  const users = await User.find({ _id: { $in: Object.keys(userCount) } })
    .select("name")
    .lean();
  const byUser = users
    .map((u) => ({ name: u.name, entries: userCount[u._id] }))
    .sort((a, b) => b.entries - a.entries);

  return {
    dateKey,
    dateLabel: new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(from),
    rows: active.map(({ key, label, kind, count, total }) => ({
      key,
      label,
      kind,
      count,
      total,
    })),
    totals: { income, expenses, net: income - expenses },
    totalEntries: active.reduce((a, r) => a + r.count, 0),
    byUser,
  };
}

/* ---------- formatters ---------- */
export function toWhatsAppText(s) {
  const lines = [
    "*Geo Shalmani - Daily Summary*",
    s.dateLabel,
    "",
    `Income: ${fmtMoney(s.totals.income)}`,
    `Expenses: ${fmtMoney(s.totals.expenses)}`,
    `Net: ${fmtMoney(s.totals.net)}`,
    "",
    `*Work today (${s.totalEntries} entries)*`,
  ];
  if (!s.rows.length) lines.push("No entries were recorded today.");
  s.rows.forEach((r) =>
    lines.push(
      `- ${r.label}: ${r.count}${r.kind !== "info" ? ` (${fmtMoney(r.total)})` : ""}`,
    ),
  );
  if (s.byUser.length) {
    lines.push("", "*By user*");
    s.byUser.forEach((u) => lines.push(`- ${u.name}: ${u.entries}`));
  }
  return lines.join("\n");
}

export function toTemplateParams(s) {
  const work = s.rows.length
    ? s.rows.map((r) => `${r.label} ${r.count}`).join(", ")
    : "No entries";
  return [
    s.dateLabel,
    fmtMoney(s.totals.income),
    fmtMoney(s.totals.expenses),
    fmtMoney(s.totals.net),
    work,
  ];
}

export function toEmailHtml(s) {
  const rows = s.rows
    .map(
      (
        r,
      ) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${r.label}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${r.count}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${r.kind === "info" ? "-" : fmtMoney(r.total)}</td></tr>`,
    )
    .join("");
  const users = s.byUser
    .map((u) => `<li>${u.name}: ${u.entries} entries</li>`)
    .join("");
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
    <h2 style="background:#166534;color:#fff;margin:0;padding:16px">Geo Shalmani - Daily Summary</h2>
    <p style="padding:0 16px">${s.dateLabel}</p>
    <p style="padding:0 16px;font-size:16px">
      <b>Income:</b> ${fmtMoney(s.totals.income)}<br/>
      <b>Expenses:</b> ${fmtMoney(s.totals.expenses)}<br/>
      <b>Net:</b> ${fmtMoney(s.totals.net)}
    </p>
    <table style="width:calc(100% - 32px);margin:0 16px;border-collapse:collapse;font-size:14px">
      <tr style="background:#f3f4f6"><th align="left" style="padding:8px">Section</th><th style="padding:8px">Entries</th><th align="right" style="padding:8px">Amount</th></tr>
      ${rows || '<tr><td colspan="3" style="padding:8px">No entries today.</td></tr>'}
    </table>
    ${users ? `<h3 style="padding:0 16px">By user</h3><ul>${users}</ul>` : ""}
  </div>`;
}

/* ---------- send ---------- */
async function logResult(dateKey, channel, status, error) {
  await AutomationLog.findOneAndUpdate(
    { type: "daily_summary", dateKey, channel },
    { status, error: error || undefined },
    { upsert: true },
  );
}

async function alreadySent(dateKey, channel) {
  const l = await AutomationLog.findOne({
    type: "daily_summary",
    dateKey,
    channel,
  }).lean();
  return l?.status === "sent";
}

export async function sendWhatsAppSummary(summary) {
  const to = process.env.OWNER_WHATSAPP;
  try {
    await sendText(to, toWhatsAppText(summary)); // works only if the owner messaged within 24h
    return "text";
  } catch (e) {
    if (!isWindowClosedError(e)) throw e;
    await sendTemplate(
      to,
      process.env.WHATSAPP_SUMMARY_TEMPLATE || "daily_summary",
      toTemplateParams(summary),
    );
    return "template";
  }
}

export async function runDailySummary({
  dateKey = todayKey(),
  force = false,
  dry = false,
} = {}) {
  const summary = await buildSummary(dateKey);
  if (dry) return { dry: true, summary, whatsappText: toWhatsAppText(summary) };

  const channels = (process.env.SUMMARY_CHANNELS || "whatsapp")
    .split(",")
    .map((c) => c.trim());
  const results = {};

  for (const ch of channels) {
    if (!force && (await alreadySent(dateKey, ch))) {
      results[ch] = "skipped (already sent)";
      continue;
    }
    try {
      if (ch === "whatsapp")
        results[ch] = `sent via ${await sendWhatsAppSummary(summary)}`;
      else if (ch === "email") {
        await sendEmail({
          to: process.env.OWNER_EMAIL,
          subject: `Geo Shalmani - Daily Summary (${summary.dateLabel})`,
          html: toEmailHtml(summary),
          text: toWhatsAppText(summary),
        });
        results[ch] = "sent";
      }
      await logResult(dateKey, ch, "sent");
    } catch (e) {
      console.error(
        `[daily-summary] ${ch} failed:`,
        e.message,
        e.details || "",
      );
      results[ch] = `failed: ${e.message}`;
      await logResult(dateKey, ch, "failed", e.message);
    }
  }
  return { dateKey, results };
}
