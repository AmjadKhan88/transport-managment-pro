import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reportsService";
import { yearChoices } from "@/utils/period";
import Select from "@/components/ui/Select";
import ReportSection from "./ReportSection";
import ReportTable from "./ReportTable";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ExpenseMatrix() {
  const years = yearChoices(5);
  const [year, setYear] = useState(years[0]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "monthly", year],
    queryFn: () => reportsService.monthly(year),
  });

  const months = data?.months ?? [];

  // screen: compact (Lac / Cr). Excel/PDF: full numbers.
  const columns = [
    { key: "label", header: "Category", type: "text" },
    ...months.map((m, i) => ({ key: m.month, header: MONTH_NAMES[i], type: "compact" })),
    { key: "total", header: "Total", type: "compact" },
  ];

  const rows = (data?.categories ?? []).map((c) => {
    const row = { key: c.key, label: c.label };
    let total = 0;
    for (const m of months) {
      const v = m.categories[c.key] || 0;
      row[m.month] = v;
      total += v;
    }
    row.total = total;
    return row;
  });

  const totals = { total: rows.reduce((s, r) => s + r.total, 0) };
  for (const m of months) totals[m.month] = rows.reduce((s, r) => s + (r[m.month] || 0), 0);

  return (
    <>
      <div className="max-w-xs">
        <Select value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>

      <ReportSection
        title={`Expenses by month — ${year}`}
        description="All 18 expense categories. Diesel, repair, office, shop and other expenses are all here."
        disabled={!rows.length}
        exportConfig={{
          title: `Expenses by month ${year}`,
          subtitle: "All expense categories",
          columns,
          rows,
          totals,
          filename: `expenses-by-month-${year}`,
          landscape: true,
          sheetName: `Expenses ${year}`,
        }}
      >
        <ReportTable columns={columns} rows={rows} totals={totals} loading={isLoading} error={error} minWidth={1200} />
      </ReportSection>
    </>
  );
}