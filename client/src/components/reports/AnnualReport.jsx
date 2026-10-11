import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reportsService";
import { yearChoices } from "@/utils/period";
import Select from "@/components/ui/Select";
import ReportSection from "./ReportSection";
import ReportTable from "./ReportTable";

const cat = (o, keys) => keys.reduce((s, k) => s + (o.expenses.categories.find((c) => c.key === k)?.amount || 0), 0);
const dept = (o, key) => o.departments.find((d) => d.key === key);

// s = { o: company overview, made: investment made in the year, total: investment to date }
const LINES = [
  { item: "Total income", get: (s) => s.o.income.total, bold: true },
  { item: "Trip freight", get: (s) => s.o.income.freight },
  { item: "Shop sales", get: (s) => s.o.income.shopSales },
  { item: "Other income", get: (s) => s.o.income.otherBusiness + s.o.income.otherReceipts },
  { item: "Total expenses", get: (s) => s.o.expenses.total, bold: true },
  { item: "Diesel / fuel", get: (s) => cat(s.o, ["diesel"]) },
  { item: "Salaries (drivers + staff)", get: (s) => cat(s.o, ["driver_salary", "staff_salary"]) },
  { item: "Repair & maintenance", get: (s) => cat(s.o, ["vehicle_repair", "vehicle_maintenance"]) },
  { item: "Office expenses", get: (s) => cat(s.o, ["office_expense"]) },
  { item: "Shop expenses", get: (s) => cat(s.o, ["shop_expense"]) },
  {
    item: "Other expenses",
    get: (s) =>
      s.o.expenses.total -
      cat(s.o, ["diesel", "driver_salary", "staff_salary", "vehicle_repair", "vehicle_maintenance", "office_expense", "shop_expense"]),
  },
  { item: "Net profit / loss", get: (s) => s.o.netProfit, bold: true },
  { item: "Shop profit", get: (s) => dept(s.o, "shop").profit },
  { item: "Office cost (including office staff salary)", get: (s) => dept(s.o, "office").expenses },
  { item: "Investment made during the year", get: (s) => s.made },
  { item: "Total investment to date (end of year)", get: (s) => s.total, bold: true },
];

const VEHICLE_COLUMNS = [
  { key: "vehicle", header: "Vehicle", type: "text", value: (r) => `Truck #${r.vehicleNumber}` },
  { key: "trips", header: "Trips", type: "number" },
  { key: "revenue", header: "Revenue", type: "money" },
  { key: "expenses", header: "Expenses", type: "money" },
  { key: "net", header: "Profit / loss", type: "signed" },
  { key: "investment", header: "Investment", type: "money" },
];

export default function AnnualReport() {
  const years = yearChoices(5);
  const [year, setYear] = useState(years[0]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "annual", year],
    queryFn: () => reportsService.annual(year),
  });

  const columns = [
    { key: "item", header: "Item", type: "text" },
    { key: "cur", header: String(year), type: "money" },
    { key: "prev", header: String(year - 1), type: "money" },
    { key: "change", header: "Change", type: "delta" },
  ];

  let rows = [];
  if (data) {
    const cur = { o: data.current, made: data.investment.madeThisYear, total: data.investment.totalToDate };
    const prev = { o: data.previous, made: data.investment.madeLastYear, total: data.investment.totalToDatePrev };
    rows = LINES.map((l, i) => {
      const a = l.get(cur);
      const b = l.get(prev);
      return { key: i, item: l.item, cur: a, prev: b, change: a - b, _bold: l.bold };
    });
  }

  const vehicles = (data?.vehicles ?? []).filter((v) => v.trips > 0 || v.expenses > 0);
  const vehicleTotals = {
    trips: vehicles.reduce((s, v) => s + v.trips, 0),
    revenue: vehicles.reduce((s, v) => s + v.revenue, 0),
    expenses: vehicles.reduce((s, v) => s + v.expenses, 0),
    net: vehicles.reduce((s, v) => s + v.net, 0),
    investment: vehicles.reduce((s, v) => s + v.investment, 0),
  };

  return (
    <>
      <div className="max-w-xs">
        <Select value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>

      <ReportSection
        title={`${year} annual report`}
        description={`Compared with ${year - 1}. Change = ${year} minus ${year - 1}.`}
        disabled={!rows.length}
        exportConfig={{
          title: `${year} annual report`,
          subtitle: `Compared with ${year - 1}`,
          columns,
          rows,
          filename: `annual-report-${year}`,
          sheetName: `Annual ${year}`,
        }}
      >
        <ReportTable columns={columns} rows={rows} loading={isLoading} error={error} minWidth={640} />
      </ReportSection>

      <ReportSection
        title={`Vehicle-wise profit — ${year}`}
        description="Trip income minus trip expenses and repairs, before salaries and overheads."
        disabled={!vehicles.length}
        exportConfig={{
          title: `Vehicle-wise profit ${year}`,
          columns: VEHICLE_COLUMNS,
          rows: vehicles,
          totals: vehicleTotals,
          filename: `vehicle-profit-${year}`,
          sheetName: `Vehicles ${year}`,
        }}
      >
        <ReportTable columns={VEHICLE_COLUMNS} rows={vehicles} totals={vehicleTotals} loading={isLoading} emptyText={`No vehicle activity in ${year}.`} minWidth={680} />
      </ReportSection>
    </>
  );
}