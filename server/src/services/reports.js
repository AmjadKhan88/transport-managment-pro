import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import Employee from "../models/Employee.js";
import Trip from "../models/Trip.js";
import Repair from "../models/Repair.js";
import DieselEntry from "../models/DieselEntry.js";
import Investment from "../models/Investment.js";
import SalaryRecord from "../models/SalaryRecord.js";
import { getCompanyOverview } from "./companyLedger.js";
import { COMPANY_EXPENSE_CATEGORIES } from "../config/accounting.js";
import { ApiError } from "../utils/ApiError.js";
import { dateRangeFilter, toObjectId } from "../utils/queryHelpers.js";

const round2 = (n) => Math.round(n * 100) / 100;
const yearOf = (y) =>
  /^\d{4}$/.test(String(y || "")) ? Number(y) : new Date().getFullYear();

const monthRange = (year, month) => {
  const mm = String(month).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(last).padStart(2, "0")}`,
  };
};

const sumCats = (cat, keys) => keys.reduce((s, k) => s + (cat[k] || 0), 0);

// ---- monthly comparison + expenses-by-month matrix -----------------------------
export async function getMonthlyReport(yearInput) {
  const year = yearOf(yearInput);
  const overviews = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      getCompanyOverview(monthRange(year, i + 1)),
    ),
  );

  const months = overviews.map((o, i) => {
    const cat = Object.fromEntries(
      o.expenses.categories.map((c) => [c.key, c.amount]),
    );
    const diesel = sumCats(cat, ["diesel"]);
    const salaries = sumCats(cat, ["driver_salary", "staff_salary"]);
    const repairs = sumCats(cat, ["vehicle_repair", "vehicle_maintenance"]);
    const office = sumCats(cat, ["office_expense"]);
    const shop = sumCats(cat, ["shop_expense"]);
    const other = round2(
      o.expenses.total - (diesel + salaries + repairs + office + shop),
    );

    return {
      month: `${year}-${String(i + 1).padStart(2, "0")}`,
      income: o.income.total,
      diesel,
      salaries,
      repairs,
      office,
      shop,
      other,
      expenses: o.expenses.total,
      profit: o.netProfit,
      categories: cat,
    };
  });

  return {
    year,
    categories: COMPANY_EXPENSE_CATEGORIES.map(
      ({ key, label, source, from }) => ({ key, label, source, from }),
    ),
    months,
  };
}

// ---- investments ---------------------------------------------------------------
// Vehicles are dated by purchaseDate (fallback createdAt); manual investments by investDate
async function investmentTotal(range) {
  const [[v], [m]] = await Promise.all([
    Vehicle.aggregate([
      { $match: { isDeleted: false } },
      {
        $addFields: {
          investDate: { $ifNull: ["$purchaseDate", "$createdAt"] },
        },
      },
      ...(range ? [{ $match: { investDate: range } }] : []),
      { $group: { _id: null, total: { $sum: "$totalInvestment" } } },
    ]),
    Investment.aggregate([
      { $match: { isDeleted: false, ...(range && { investDate: range }) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  return (v?.total ?? 0) + (m?.total ?? 0);
}

// ---- vehicle-wise report -------------------------------------------------------
// net = trip freight - (trip diesel + driver trip + toll + other + repairs). No salaries/overheads.
export async function getVehicleReport(range) {
  const liveTrips = { isDeleted: false, status: { $ne: "cancelled" } };
  const onTrip = range ? { tripDate: range } : {};
  const onRepair = range ? { repairDate: range } : {};
  const onFuel = range ? { fuelDate: range } : {};

  const [vehicles, tripRows, repairRows, fuelRows, tripAll, repairAll] =
    await Promise.all([
      Vehicle.find({ isDeleted: false }).populate("driver", "name").lean(),
      Trip.aggregate([
        { $match: { ...liveTrips, ...onTrip } },
        {
          $group: {
            _id: "$vehicle",
            trips: { $sum: 1 },
            revenue: { $sum: "$freightAmount" },
            diesel: { $sum: "$dieselCost" },
            driverExpense: { $sum: "$driverTripExpense" },
            toll: { $sum: "$tollTax" },
            other: { $sum: "$otherExpenses" },
          },
        },
      ]),
      Repair.aggregate([
        { $match: { isDeleted: false, ...onRepair } },
        { $group: { _id: "$vehicle", cost: { $sum: "$totalCost" } } },
      ]),
      DieselEntry.aggregate([
        { $match: { isDeleted: false, ...onFuel } },
        {
          $group: {
            _id: "$vehicle",
            liters: { $sum: "$liters" },
            amount: { $sum: "$totalAmount" },
          },
        },
      ]),
      Trip.aggregate([
        { $match: liveTrips },
        { $group: { _id: "$vehicle", net: { $sum: "$netProfit" } } },
      ]),
      Repair.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$vehicle", cost: { $sum: "$totalCost" } } },
      ]),
    ]);

  const by = (rows, key = "_id") =>
    new Map(rows.map((r) => [String(r[key]), r]));
  const tripBy = by(tripRows);
  const repairBy = by(repairRows);
  const fuelBy = by(fuelRows);
  const allNetBy = by(tripAll);
  const allRepairBy = by(repairAll);

  return vehicles
    .map((v) => {
      const id = String(v._id);
      const t = tripBy.get(id) ?? {
        trips: 0,
        revenue: 0,
        diesel: 0,
        driverExpense: 0,
        toll: 0,
        other: 0,
      };
      const repairs = repairBy.get(id)?.cost ?? 0;
      const fuel = fuelBy.get(id) ?? { liters: 0, amount: 0 };
      const expenses = t.diesel + t.driverExpense + t.toll + t.other + repairs;
      const allTimeNet =
        (allNetBy.get(id)?.net ?? 0) - (allRepairBy.get(id)?.cost ?? 0);

      return {
        id,
        vehicleNumber: v.vehicleNumber,
        make: v.make,
        model: v.model,
        status: v.status,
        driver: v.driver?.name ?? null,
        investment: v.totalInvestment || 0,
        trips: t.trips,
        revenue: t.revenue,
        diesel: t.diesel,
        driverExpense: t.driverExpense,
        toll: t.toll,
        other: t.other,
        repairs,
        expenses: round2(expenses),
        net: round2(t.revenue - expenses),
        fuelLiters: fuel.liters,
        fuelAmount: fuel.amount,
        allTimeNet: round2(allTimeNet),
        recovery:
          v.totalInvestment > 0
            ? round2((allTimeNet / v.totalInvestment) * 100)
            : null,
      };
    })
    .filter((v) => v.status !== "sold" || v.trips > 0 || v.expenses > 0)
    .sort((a, b) =>
      a.vehicleNumber.localeCompare(b.vehicleNumber, undefined, {
        numeric: true,
      }),
    );
}

// ---- annual report ---------------------------------------------------------------
export async function getAnnualReport(yearInput) {
  const year = yearOf(yearInput);
  const cur = { from: `${year}-01-01`, to: `${year}-12-31` };
  const prev = { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
  const upTo = (to) => dateRangeFilter(undefined, to);

  const [
    current,
    previous,
    vehicles,
    madeThis,
    madePrev,
    totalToDate,
    totalToDatePrev,
  ] = await Promise.all([
    getCompanyOverview(cur),
    getCompanyOverview(prev),
    getVehicleReport(dateRangeFilter(cur.from, cur.to)),
    investmentTotal(dateRangeFilter(cur.from, cur.to)),
    investmentTotal(dateRangeFilter(prev.from, prev.to)),
    investmentTotal(upTo(cur.to)),
    investmentTotal(upTo(prev.to)),
  ]);

  return {
    year,
    current,
    previous,
    vehicles,
    investment: {
      madeThisYear: madeThis,
      madeLastYear: madePrev,
      totalToDate,
      totalToDatePrev,
    },
  };
}

// ---- trip history of one vehicle ---------------------------------------------------
export async function getTripHistory({ vehicle, range }) {
  const id = toObjectId(vehicle);
  if (!id) throw new ApiError(400, "Select a vehicle");

  const trips = await Trip.find({
    isDeleted: false,
    vehicle: id,
    ...(range && { tripDate: range }),
  })
    .sort({ tripDate: 1, createdAt: 1 })
    .limit(2000)
    .populate("driver", "name")
    .populate("customer", "name")
    .lean();

  return trips.map((t) => ({
    id: String(t._id),
    date: t.tripDate,
    driver: t.driver?.name ?? "",
    customer: t.customer?.name ?? "",
    route: `${t.from} to ${t.to}`,
    bilty: t.biltyNumber ?? "",
    freight: t.freightAmount,
    advance: t.advance,
    diesel: t.dieselCost,
    toll: t.tollTax,
    driverExpense: t.driverTripExpense,
    other: t.otherExpenses,
    expense: t.totalExpense,
    net: t.netProfit,
    status: t.status,
  }));
}

// ---- investment recovery -------------------------------------------------------------
export async function getRecoveryReport() {
  const [vehicles, company, investment] = await Promise.all([
    getVehicleReport(null), // all time
    getCompanyOverview({}),
    investmentTotal(null),
  ]);
  return {
    vehicles,
    company: {
      income: company.income.total,
      expenses: company.expenses.total,
      netProfit: company.netProfit,
    },
    investment,
  };
}

// ---- salary reports ---------------------------------------------------------------------
const SALARY_GROUP = {
  basic: { $sum: "$basicSalary" },
  additions: { $sum: { $add: ["$tripAllowance", "$bonus", "$otherPayment"] } },
  advance: { $sum: "$advance" },
  deduction: { $sum: "$deduction" },
  net: { $sum: "$netSalary" },
  paid: { $sum: "$paidAmount" },
  remaining: { $sum: { $subtract: ["$netSalary", "$paidAmount"] } },
};

export async function getSalaryReport({ year: yearInput, payeeType }) {
  const year = yearOf(yearInput);
  const filter = {
    isDeleted: false,
    month: { $gte: `${year}-01`, $lte: `${year}-12` },
  };
  if (["driver", "employee"].includes(payeeType)) filter.payeeType = payeeType;

  const [monthRows, personRows] = await Promise.all([
    SalaryRecord.aggregate([
      { $match: filter },
      { $group: { _id: "$month", count: { $sum: 1 }, ...SALARY_GROUP } },
      { $sort: { _id: 1 } },
    ]),
    SalaryRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { type: "$payeeType", driver: "$driver", employee: "$employee" },
          months: { $sum: 1 },
          ...SALARY_GROUP,
        },
      },
    ]),
  ]);

  const driverIds = personRows.map((r) => r._id.driver).filter(Boolean);
  const employeeIds = personRows.map((r) => r._id.employee).filter(Boolean);
  const [drivers, employees] = await Promise.all([
    Driver.find({ _id: { $in: driverIds } })
      .select("name")
      .lean(),
    Employee.find({ _id: { $in: employeeIds } })
      .select("name")
      .lean(),
  ]);
  const names = new Map(
    [...drivers, ...employees].map((p) => [String(p._id), p.name]),
  );

  const months = monthRows.map(({ _id, ...r }) => ({ month: _id, ...r }));
  const people = personRows
    .map(({ _id, ...r }) => ({
      type: _id.type,
      name: names.get(String(_id.driver ?? _id.employee)) ?? "—",
      ...r,
    }))
    .sort(
      (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
    );

  return { year, months, people };
}
