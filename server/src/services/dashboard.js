import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import Trip from "../models/Trip.js";
import Repair from "../models/Repair.js";
import Investment from "../models/Investment.js";
import StockItem from "../models/StockItem.js";
import { getCompanyOverview } from "./companyLedger.js";
import { getCustomerBalances, summarize } from "./receivables.js";
import { getPayables } from "./payables.js";
import { dateRangeFilter } from "../utils/queryHelpers.js";

const round2 = (n) => Math.round(n * 100) / 100;

const monthRange = (year, month) => {
  const mm = String(month).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(last).padStart(2, "0")}`,
  };
};

// Income / expenses / profit for each month of a year, using the SAME company ledger rules
async function getMonthlySeries(year) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const overviews = await Promise.all(
    months.map((m) => getCompanyOverview(monthRange(year, m))),
  );
  return overviews.map((o, i) => ({
    month: `${year}-${String(i + 1).padStart(2, "0")}`,
    income: o.income.total,
    expenses: o.expenses.total,
    profit: o.netProfit,
  }));
}

// Vehicle P&L = trip freight - (trip expenses + repairs). Salaries and overheads are not vehicle-specific.
async function getVehiclePerformance(range) {
  const onTrip = range ? { tripDate: range } : {};
  const onRepair = range ? { repairDate: range } : {};
  const liveTrips = { isDeleted: false, status: { $ne: "cancelled" } };

  const [vehicles, tripRows, repairRows, tripAll, repairAll] =
    await Promise.all([
      Vehicle.find({ isDeleted: false }).populate("driver", "name").lean(),
      Trip.aggregate([
        { $match: { ...liveTrips, ...onTrip } },
        {
          $group: {
            _id: "$vehicle",
            trips: { $sum: 1 },
            revenue: { $sum: "$freightAmount" },
            expenses: { $sum: "$totalExpense" },
          },
        },
      ]),
      Repair.aggregate([
        { $match: { isDeleted: false, ...onRepair } },
        { $group: { _id: "$vehicle", cost: { $sum: "$totalCost" } } },
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

  const tripBy = new Map(tripRows.map((r) => [String(r._id), r]));
  const repairBy = new Map(repairRows.map((r) => [String(r._id), r.cost]));
  const allNetBy = new Map(tripAll.map((r) => [String(r._id), r.net]));
  const allRepairBy = new Map(repairAll.map((r) => [String(r._id), r.cost]));

  return vehicles
    .map((v) => {
      const id = String(v._id);
      const t = tripBy.get(id) ?? { trips: 0, revenue: 0, expenses: 0 };
      const repairs = repairBy.get(id) ?? 0;
      const expenses = t.expenses + repairs;
      const allTimeNet = (allNetBy.get(id) ?? 0) - (allRepairBy.get(id) ?? 0);

      return {
        id,
        vehicleNumber: v.vehicleNumber,
        make: v.make,
        model: v.model,
        status: v.status,
        driver: v.driver?.name ?? null,
        trips: t.trips,
        revenue: t.revenue,
        expenses,
        net: round2(t.revenue - expenses),
        investment: v.totalInvestment || 0,
        recovery:
          v.totalInvestment > 0
            ? round2((allTimeNet / v.totalInvestment) * 100)
            : null,
      };
    })
    .filter((v) => v.status !== "sold" || v.trips > 0 || v.expenses > 0)
    .sort((a, b) => b.net - a.net);
}

async function getCounts() {
  const [vehicleTotal, vehicleActive, driverTotal, driverActive] =
    await Promise.all([
      Vehicle.countDocuments({ isDeleted: false }),
      Vehicle.countDocuments({ isDeleted: false, status: "active" }),
      Driver.countDocuments({ isDeleted: false }),
      Driver.countDocuments({ isDeleted: false, status: "active" }),
    ]);
  return {
    vehicles: { total: vehicleTotal, active: vehicleActive },
    drivers: { total: driverTotal, active: driverActive },
  };
}

// All-time: vehicles (automatic) + shop / office / other (manual register)
async function getInvestment() {
  const [[v], [m]] = await Promise.all([
    Vehicle.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$totalInvestment" } } },
    ]),
    Investment.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  const vehicles = v?.total ?? 0;
  const other = m?.total ?? 0;
  return { total: vehicles + other, vehicles, other };
}

async function getStockValue() {
  const [row] = await StockItem.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        value: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
      },
    },
  ]);
  return row?.value ?? 0;
}

export async function getDashboard({ from, to, prevFrom, prevTo, year } = {}) {
  const range = dateRangeFilter(from, to);
  const chartYear = Number(year) || new Date().getFullYear();

  const [
    overview,
    previous,
    monthly,
    performance,
    counts,
    investment,
    stock,
    balances,
    payables,
  ] = await Promise.all([
    getCompanyOverview({ from, to }),
    prevFrom && prevTo
      ? getCompanyOverview({ from: prevFrom, to: prevTo })
      : null,
    getMonthlySeries(chartYear),
    getVehiclePerformance(range),
    getCounts(),
    getInvestment(),
    getStockValue(),
    getCustomerBalances({}),
    getPayables(),
  ]);

  const recTotals = summarize(balances);
  const top = balances
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      name: r.name,
      companyName: r.companyName,
      balance: r.balance,
    }));

  return {
    overview,
    previous,
    chartYear,
    monthly,
    vehicles: { ...counts.vehicles, performance },
    drivers: counts.drivers,
    investment,
    receivables: {
      total: recTotals.receivable,
      credit: recTotals.credit,
      d90plus: recTotals.buckets.d90plus,
      top,
    },
    payables: {
      total: payables.total,
      kinds: payables.kinds.map((k) => ({
        kind: k.kind,
        label: k.label,
        total: k.total,
      })),
    },
    // Current assets is an ESTIMATE: receivables + shop stock. Cash/bank is not tracked.
    assets: {
      receivables: recTotals.receivable,
      stock,
      total: round2(recTotals.receivable + stock),
    },
  };
}
