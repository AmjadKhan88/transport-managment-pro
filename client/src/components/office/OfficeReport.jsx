import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { officeService } from "@/services/officeService";
import { officeCategoryLabel } from "@/config/office";
import { PERIOD_CHOICES, getDateRange, monthLabel } from "@/utils/period";
import { formatPKR } from "@/utils/format";
import Select from "@/components/ui/Select";
import { cardClass, thClass, tdClass } from "@/components/ui/styles";

export default function OfficeReport() {
  const [groupBy, setGroupBy] = useState("month");
  const [period, setPeriod] = useState("this-year");

  const range = getDateRange(period);
  const params = { groupBy, from: range.from, to: range.to };

  const { data, isLoading, error } = useQuery({
    queryKey: ["office", "report", params],
    queryFn: () => officeService.report(params),
  });

  const rows = data?.data ?? [];
  const totals = data?.totals;
  const categories = data?.byCategory ?? [];
  const grand = categories.reduce((s, c) => s + c.amount, 0);

  return (
    <>
      <div className={cardClass}>
        <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 sm:grid-cols-2 dark:border-gray-800">
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </Select>
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>{groupBy === "year" ? "Year" : "Month"}</th>
                <th className={`${thClass} text-right`}>Office expenses</th>
                <th className={`${thClass} text-right`}>Office salary</th>
                <th className={`${thClass} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-500">Loading report…</td></tr>}
              {error && <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && rows.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-500">No office costs for this selection.</td></tr>
              )}

              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>
                    {groupBy === "year" ? r.key : monthLabel(r.key)}
                  </td>
                  <td className={`${tdClass} text-right`}>{formatPKR(r.expenses)}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(r.salary)}</td>
                  <td className={`${tdClass} text-right font-semibold text-gray-900 dark:text-gray-100`}>{formatPKR(r.total)}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && totals && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <td className={`${tdClass} font-semibold text-gray-900 dark:text-gray-100`}>Total</td>
                  <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.expenses)}</td>
                  <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.salary)}</td>
                  <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {categories.length > 0 && (
        <div className={`${cardClass} p-5`}>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Where the money went</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Office costs by category for the selected period.</p>
          <div className="space-y-4">
            {categories.map((c) => {
              const pct = grand ? (c.amount / grand) * 100 : 0;
              return (
                <div key={c.category}>
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="text-gray-700 dark:text-gray-300">{officeCategoryLabel(c.category)}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatPKR(c.amount)} <span className="text-sm font-normal text-gray-500">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <div className="h-full rounded-full bg-green-800" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}