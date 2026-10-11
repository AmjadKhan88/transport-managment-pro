import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reportsService";
import { currentMonth, monthLabel, yearChoices } from "@/utils/period";
import Select from "@/components/ui/Select";
import { cardClass } from "@/components/ui/styles";
import { IncomeExpenseChart } from "@/components/dashboard/charts";
import ReportSection from "./ReportSection";
import ReportTable from "./ReportTable";

export const MONTHLY_COLUMNS = [
  { key: "label", header: "Month", type: "text" },
  { key: "income", header: "Income", type: "money" },
  { key: "diesel", header: "Diesel", type: "money" },
  { key: "salaries", header: "Salaries", type: "money" },
  { key: "repairs", header: "Repair & maint.", type: "money" },
  { key: "office", header: "Office", type: "money" },
  { key: "shop", header: "Shop", type: "money" },
  { key: "other", header: "Other", type: "money" },
  { key: "expenses", header: "Total expenses", type: "money" },
  { key: "profit", header: "Net profit / loss", type: "signed" },
  { key: "change", header: "Change vs previous month", type: "delta" },
];

const SUM_KEYS = ["income", "diesel", "salaries", "repairs", "office", "shop", "other", "expenses", "profit"];

export default function MonthlyComparison() {
  const years = yearChoices(5);
  const [year, setYear] = useState(years[0]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "monthly", year],
    queryFn: () => reportsService.monthly(year),
  });

  const now = currentMonth();
  const months = data?.months ?? [];
  const rows = months.map((m, i) => ({
    ...m,
    key: m.month,
    label: monthLabel(m.month),
    // no comparison for January or for months that have not happened yet
    change: i === 0 || m.month > now ? null : m.profit - months[i - 1].profit,
  }));
  const totals = Object.fromEntries(SUM_KEYS.map((k) => [k, rows.reduce((s, r) => s + r[k], 0)]));

  return (
    <>
      <div className="max-w-xs">
        <Select value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>

      {months.length > 0 && (
        <div className={`${cardClass} p-5`}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Income vs expenses, {year}</h2>
          <IncomeExpenseChart monthly={months} />
        </div>
      )}

      <ReportSection
        title={`Monthly comparison — ${year}`}
        description="The last column shows whether each month did better or worse than the one before."
        disabled={!rows.length}
        exportConfig={{
          title: `Monthly comparison ${year}`,
          subtitle: "Income, expenses and net profit by month",
          columns: MONTHLY_COLUMNS,
          rows,
          totals,
          filename: `monthly-comparison-${year}`,
          landscape: true,
          sheetName: `Monthly ${year}`,
        }}
      >
        <ReportTable columns={MONTHLY_COLUMNS} rows={rows} totals={totals} loading={isLoading} error={error} minWidth={1100} />
      </ReportSection>
    </>
  );
}