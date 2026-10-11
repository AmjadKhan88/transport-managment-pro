import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reportsService";
import { monthLabel, yearChoices } from "@/utils/period";
import Select from "@/components/ui/Select";
import ReportSection from "./ReportSection";
import ReportTable from "./ReportTable";

const MONEY = ["basic", "additions", "advance", "deduction", "net", "paid", "remaining"];
const sums = (rows, extra = []) =>
  Object.fromEntries([...MONEY, ...extra].map((k) => [k, rows.reduce((s, r) => s + (r[k] || 0), 0)]));

const MONTH_COLUMNS = [
  { key: "label", header: "Month", type: "text" },
  { key: "count", header: "People", type: "number" },
  { key: "basic", header: "Basic", type: "money" },
  { key: "additions", header: "Additions", type: "money" },
  { key: "deductions", header: "Advance + deduction", type: "money" },
  { key: "net", header: "Net salary", type: "money" },
  { key: "paid", header: "Paid", type: "money" },
  { key: "remaining", header: "Remaining", type: "money" },
];

const PERSON_COLUMNS = [
  { key: "name", header: "Name", type: "text" },
  { key: "kind", header: "Type", type: "text" },
  { key: "months", header: "Months", type: "number" },
  { key: "basic", header: "Basic", type: "money" },
  { key: "additions", header: "Additions", type: "money" },
  { key: "deductions", header: "Advance + deduction", type: "money" },
  { key: "net", header: "Net salary", type: "money" },
  { key: "paid", header: "Paid", type: "money" },
  { key: "remaining", header: "Remaining", type: "money" },
];

export default function SalaryReports() {
  const years = yearChoices(5);
  const [year, setYear] = useState(years[0]);
  const [payeeType, setPayeeType] = useState("");

  const params = { year, payeeType: payeeType || undefined };
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "salaries", params],
    queryFn: () => reportsService.salaries(params),
  });

  const scope = payeeType === "driver" ? "Drivers" : payeeType === "employee" ? "Staff" : "Drivers and staff";

  const months = (data?.months ?? []).map((m) => ({ ...m, key: m.month, label: monthLabel(m.month), deductions: m.advance + m.deduction }));
  const monthTotals = { ...sums(months, ["count"]), deductions: months.reduce((s, r) => s + r.deductions, 0) };

  const people = (data?.people ?? []).map((p, i) => ({
    ...p, key: i, kind: p.type === "driver" ? "Driver" : "Staff", deductions: p.advance + p.deduction,
  }));
  const peopleTotals = { ...sums(people, ["months"]), deductions: people.reduce((s, r) => s + r.deductions, 0) };

  return (
    <>
      <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        <Select value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
        <Select value={payeeType} onChange={(e) => setPayeeType(e.target.value)}>
          <option value="">Drivers and staff</option>
          <option value="driver">Drivers only</option>
          <option value="employee">Staff only</option>
        </Select>
      </div>

      <ReportSection
        title={`Monthly salary report — ${year}`}
        description={scope}
        disabled={!months.length}
        exportConfig={{
          title: `Monthly salary report ${year}`, subtitle: scope, columns: MONTH_COLUMNS,
          rows: months, totals: monthTotals, filename: `salary-monthly-${year}`, sheetName: `Salary ${year}`,
        }}
      >
        <ReportTable columns={MONTH_COLUMNS} rows={months} totals={monthTotals} loading={isLoading} error={error} emptyText={`No salary records in ${year}.`} minWidth={900} />
      </ReportSection>

      <ReportSection
        title={`Salary history by person — ${year}`}
        description={scope}
        disabled={!people.length}
        exportConfig={{
          title: `Salary history by person ${year}`, subtitle: scope, columns: PERSON_COLUMNS,
          rows: people, totals: peopleTotals, filename: `salary-by-person-${year}`, landscape: true, sheetName: `By person ${year}`,
        }}
      >
        <ReportTable columns={PERSON_COLUMNS} rows={people} totals={peopleTotals} loading={isLoading} emptyText={`No salary records in ${year}.`} minWidth={980} />
      </ReportSection>
    </>
  );
}