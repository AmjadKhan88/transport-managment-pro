import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { salaryService } from "@/services/salaryService";
import { monthLabel, yearChoices } from "@/utils/period";
import { formatPKR } from "@/utils/format";
import Select from "@/components/ui/Select";
import { cardClass, thClass, tdClass } from "@/components/ui/styles";

export default function SalaryReport() {
  const years = yearChoices(5);
  const [year, setYear] = useState(years[0]);
  const [payeeType, setPayeeType] = useState("");

  const params = { year, payeeType: payeeType || undefined };
  const { data, isLoading, error } = useQuery({
    queryKey: ["salaries", "report", params],
    queryFn: () => salaryService.report(params),
  });

  const rows = data?.data ?? [];
  const totals = data?.totals;

  return (
    <div className={cardClass}>
      <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 sm:grid-cols-2 dark:border-gray-800">
        <Select value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
        <Select value={payeeType} onChange={(e) => setPayeeType(e.target.value)}>
          <option value="">Drivers and staff</option>
          <option value="driver">Drivers only</option>
          <option value="employee">Staff only</option>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <th className={thClass}>Month</th>
              <th className={`${thClass} text-right`}>People</th>
              <th className={`${thClass} text-right`}>Basic</th>
              <th className={`${thClass} text-right`}>Additions</th>
              <th className={`${thClass} text-right`}>Advance + deduction</th>
              <th className={`${thClass} text-right`}>Net salary</th>
              <th className={`${thClass} text-right`}>Paid</th>
              <th className={`${thClass} text-right`}>Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">Loading report…</td></tr>}
            {error && <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
            {!isLoading && !error && rows.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">No salary records in {year}.</td></tr>
            )}

            {rows.map((r) => (
              <tr key={r.month} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>{monthLabel(r.month)}</td>
                <td className={`${tdClass} text-right`}>{r.count}</td>
                <td className={`${tdClass} text-right`}>{formatPKR(r.basic)}</td>
                <td className={`${tdClass} text-right`}>{formatPKR(r.additions)}</td>
                <td className={`${tdClass} text-right`}>{formatPKR(r.advance + r.deduction)}</td>
                <td className={`${tdClass} text-right font-semibold text-gray-900 dark:text-gray-100`}>{formatPKR(r.net)}</td>
                <td className={`${tdClass} text-right`}>{formatPKR(r.paid)}</td>
                <td className={`${tdClass} text-right ${r.remaining > 0 ? "font-semibold text-amber-700 dark:text-amber-400" : ""}`}>
                  {formatPKR(r.remaining)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && totals && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <td className={`${tdClass} font-semibold text-gray-900 dark:text-gray-100`}>Total {year}</td>
                <td className={`${tdClass} text-right font-semibold`}>{totals.count}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.basic)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.additions)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.advance + totals.deduction)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.net)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.paid)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.remaining)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}