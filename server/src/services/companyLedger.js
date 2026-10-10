import Trip from "../models/Trip.js";
import DieselEntry from "../models/DieselEntry.js";
import Repair from "../models/Repair.js";
import SalaryRecord from "../models/SalaryRecord.js";
import ShopTransaction from "../models/ShopTransaction.js";
import OfficeExpense from "../models/OfficeExpense.js";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import {
  DIESEL_EXPENSE_SOURCE,
  COMPANY_EXPENSE_CATEGORIES,
} from "../config/accounting.js";
import { dateRangeFilter } from "../utils/queryHelpers.js";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAINTENANCE_CATEGORIES = ["oil", "general_maintenance"];

// basic + trip allowance + bonus + other payment - deduction
const SALARY_COST = {
  $subtract: [
    { $add: ["$basicSalary", "$tripAllowance", "$bonus", "$otherPayment"] },
    "$deduction",
  ],
};

const monthFilter = (from, to) => {
  const f = DAY_RE.test(from || "") ? from.slice(0, 7) : null;
  const t = DAY_RE.test(to || "") ? to.slice(0, 7) : null;
  return f || t ? { ...(f && { $gte: f }), ...(t && { $lte: t }) } : null;
};

const total = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);

/**
 * The ONE place where company income, expenses and profit are calculated.
 * See project-memory/17-company-accounting-rules.md before changing anything here.
 */
export async function getCompanyOverview({ from, to } = {}) {
  const range = dateRangeFilter(from, to);
  const months = monthFilter(from, to);
  const onDate = (field) => (range ? { [field]: range } : {});
  const onMonth = months ? { month: months } : {};

  const [
    tripRow,
    fuelRow,
    repairRows,
    driverRow,
    staffRows,
    shopRows,
    officeRow,
    incomeRows,
    manualRows,
  ] = await Promise.all([
    Trip.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $ne: "cancelled" },
          ...onDate("tripDate"),
        },
      },
      {
        $group: {
          _id: null,
          freight: { $sum: "$freightAmount" },
          diesel: { $sum: "$dieselCost" },
          driverExpense: { $sum: "$driverTripExpense" },
          toll: { $sum: "$tollTax" },
          other: { $sum: "$otherExpenses" },
        },
      },
    ]),
    DieselEntry.aggregate([
      { $match: { isDeleted: false, ...onDate("fuelDate") } },
      { $group: { _id: null, amount: { $sum: "$totalAmount" } } },
    ]),
    Repair.aggregate([
      { $match: { isDeleted: false, ...onDate("repairDate") } },
      { $group: { _id: "$category", amount: { $sum: "$totalCost" } } },
    ]),
    SalaryRecord.aggregate([
      { $match: { isDeleted: false, payeeType: "driver", ...onMonth } },
      { $group: { _id: null, cost: { $sum: SALARY_COST } } },
    ]),
    SalaryRecord.aggregate([
      { $match: { isDeleted: false, payeeType: "employee", ...onMonth } },
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "emp",
        },
      },
      { $unwind: { path: "$emp", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$emp.department", "other"] },
          cost: { $sum: SALARY_COST },
        },
      },
    ]),
    ShopTransaction.aggregate([
      { $match: { isDeleted: false, ...onDate("txnDate") } },
      { $group: { _id: "$type", amount: { $sum: "$amount" } } },
    ]),
    OfficeExpense.aggregate([
      { $match: { isDeleted: false, ...onDate("expenseDate") } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]),
    Income.aggregate([
      { $match: { isDeleted: false, ...onDate("incomeDate") } },
      { $group: { _id: "$type", amount: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { isDeleted: false, ...onDate("expenseDate") } },
      {
        $group: {
          _id: { category: "$category", department: "$department" },
          amount: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  // ---- raw figures -------------------------------------------------------
  const trips = tripRow[0] ?? {
    freight: 0,
    diesel: 0,
    driverExpense: 0,
    toll: 0,
    other: 0,
  };
  const fuelPurchased = fuelRow[0]?.amount ?? 0;

  let repairs = 0;
  let maintenance = 0;
  for (const r of repairRows) {
    if (MAINTENANCE_CATEGORIES.includes(r._id)) maintenance += r.amount;
    else repairs += r.amount;
  }

  const driverSalary = driverRow[0]?.cost ?? 0;
  const staff = { office: 0, shop: 0, workshop: 0, other: 0 };
  for (const r of staffRows) staff[r._id in staff ? r._id : "other"] += r.cost;

  const shop = { sale: 0, purchase: 0, expense: 0 };
  for (const r of shopRows) shop[r._id] = r.amount;

  const office = officeRow[0]?.amount ?? 0;

  const income = { customer_payment: 0, other_business: 0, other_receipt: 0 };
  for (const r of incomeRows) income[r._id] = r.amount;

  const manual = {};
  const manualDept = { transport: 0, shop: 0, office: 0, general: 0 };
  for (const r of manualRows) {
    manual[r._id.category] = (manual[r._id.category] || 0) + r.amount;
    manualDept[r._id.department in manualDept ? r._id.department : "general"] +=
      r.amount;
  }

  // ---- income ------------------------------------------------------------
  const incomeTotals = {
    freight: trips.freight,
    shopSales: shop.sale,
    otherBusiness: income.other_business,
    otherReceipts: income.other_receipt,
  };
  incomeTotals.total = total(incomeTotals);

  // ---- expenses (18 categories, one source each) ---------------------------
  const diesel =
    DIESEL_EXPENSE_SOURCE === "trips" ? trips.diesel : fuelPurchased;
  const amounts = {
    diesel,
    driver_salary: driverSalary,
    driver_trip_expense: trips.driverExpense,
    vehicle_repair: repairs,
    vehicle_maintenance: maintenance,
    toll_tax: trips.toll,
    advance_payment: manual.advance_payment || 0,
    office_expense: office,
    shop_expense: shop.purchase + shop.expense,
    staff_salary: total(staff),
    electricity: manual.electricity || 0,
    internet: manual.internet || 0,
    rent: manual.rent || 0,
    stationery: manual.stationery || 0,
    tax: manual.tax || 0,
    insurance: manual.insurance || 0,
    miscellaneous: manual.miscellaneous || 0,
    other: (manual.other || 0) + trips.other,
  };
  const categories = COMPANY_EXPENSE_CATEGORIES.map((c) => ({
    ...c,
    amount: amounts[c.key] ?? 0,
  }));
  const expenseTotal = categories.reduce((s, c) => s + c.amount, 0);

  // ---- departments (sum exactly to the company totals) ---------------------
  const transportExpenses =
    diesel +
    trips.driverExpense +
    trips.toll +
    trips.other +
    repairs +
    maintenance +
    driverSalary +
    staff.workshop +
    manualDept.transport;
  const shopExpenses =
    shop.purchase + shop.expense + staff.shop + manualDept.shop;
  const officeExpenses = office + staff.office + manualDept.office;
  const generalExpenses = staff.other + manualDept.general;

  const dept = (key, label, inc, exp) => ({
    key,
    label,
    income: inc,
    expenses: exp,
    profit: inc - exp,
  });
  const departments = [
    dept(
      "transport",
      "Transport (vehicles, drivers)",
      trips.freight,
      transportExpenses,
    ),
    dept("shop", "Shop", shop.sale, shopExpenses),
    dept("office", "Office", 0, officeExpenses),
    dept(
      "general",
      "General / other business",
      income.other_business + income.other_receipt,
      generalExpenses,
    ),
  ];

  return {
    income: incomeTotals,
    customerPayments: income.customer_payment, // memo: settles receivables, not added to income
    expenses: { categories, total: expenseTotal },
    netProfit: incomeTotals.total - expenseTotal,
    departments,
    diesel: {
      source: DIESEL_EXPENSE_SOURCE,
      tripDiesel: trips.diesel,
      fuelPurchased,
    },
  };
}
