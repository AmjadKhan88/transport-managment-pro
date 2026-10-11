import { useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reportsService";
import { formatPKR, formatSigned } from "@/utils/format";
import StatusBadge from "@/components/ui/StatusBadge";
import { cardClass } from "@/components/ui/styles";
import ReportSection from "./ReportSection";
import ReportTable from "./ReportTable";

const statusOf = (r) => {
  if (r.investment <= 0) return { label: "No investment recorded", tone: "gray" };
  if (r.allTimeNet >= r.investment) return { label: "Recovered", tone: "green" };
  if (r.allTimeNet > 0) return { label: "Recovering", tone: "amber" };
  return { label: "Not yet", tone: "red" };
};

const COLUMNS = [
  { key: "vehicle", header: "Vehicle", type: "text", value: (r) => `Truck #${r.vehicleNumber}` },
  { key: "investment", header: "Investment", type: "money" },
  { key: "revenue", header: "Revenue (all time)", type: "money", value: (r) => r.allRevenue },
  { key: "expenses", header: "Expenses (all time)", type: "money", value: (r) => r.allExpenses },
  { key: "allTimeNet", header: "Net profit", type: "signed" },
  { key: "recovery", header: "Recovered", type: "percent" },
  { key: "left", header: "Still to recover", type: "money" },
  {
    key: "status", header: "Status", type: "text",
    value: (r) => statusOf(r).label,
    cell: (r) => <StatusBadge label={statusOf(r).label} tone={statusOf(r).tone} />,
  },
];

export default function RecoveryReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "recovery"],
    queryFn: reportsService.recovery,
  });

  // all-time figures per vehicle: this report is called with no period, so net = all-time net
  const rows = (data?.vehicles ?? []).map((v) => ({
    ...v,
    allRevenue: v.revenue,
    allExpenses: v.expenses,
    left: Math.max(v.investment - v.allTimeNet, 0),
  }));

  const totals = {
    investment: rows.reduce((s, r) => s + r.investment, 0),
    allRevenue: rows.reduce((s, r) => s + r.allRevenue, 0),
    allExpenses: rows.reduce((s, r) => s + r.allExpenses, 0),
    allTimeNet: rows.reduce((s, r) => s + r.allTimeNet, 0),
    left: rows.reduce((s, r) => s + r.left, 0),
  };

  const company = data?.company;
  const companyPct = data && data.investment > 0 ? (company.netProfit / data.investment) * 100 : null;

  return (
    <>
      {data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={`${cardClass} p-5`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total company investment</p>
            <p className="mt-1.5 text-2xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(data.investment)}</p>
            <p className="mt-1 text-[13px] text-gray-500">Vehicles, shop, office and other</p>
          </div>
          <div className={`${cardClass} p-5`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Company net profit, all time</p>
            <p className={`mt-1.5 text-2xl font-semibold ${company.netProfit < 0 ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-gray-50"}`}>
              {formatSigned(company.netProfit)}
            </p>
            <p className="mt-1 text-[13px] text-gray-500">Income − expenses since the start</p>
          </div>
          <div className={`${cardClass} p-5`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Company investment recovered</p>
            <p className="mt-1.5 text-2xl font-semibold text-gray-900 dark:text-gray-50">
              {companyPct === null ? "—" : `${companyPct.toFixed(1)}%`}
            </p>
            <p className="mt-1 text-[13px] text-gray-500">
              {companyPct !== null && companyPct >= 100 ? "Investment recovered" : "Net profit ÷ total investment"}
            </p>
          </div>
        </div>
      )}

      <ReportSection
        title="Vehicle investment vs profit"
        description="All time. Net profit = trip freight − trip expenses − repairs. A vehicle is recovered once its net profit reaches its investment."
        disabled={!rows.length}
        exportConfig={{
          title: "Investment recovery report",
          subtitle: "All time, per vehicle",
          columns: COLUMNS,
          rows,
          totals,
          filename: "investment-recovery",
          landscape: true,
          sheetName: "Investment recovery",
        }}
      >
        <ReportTable columns={COLUMNS} rows={rows} totals={totals} loading={isLoading} error={error} minWidth={980} />
      </ReportSection>
    </>
  );
}