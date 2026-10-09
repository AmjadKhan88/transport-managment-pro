import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { shopService } from "@/services/shopService";
import { PERIOD_CHOICES, getDateRange, monthLabel } from "@/utils/period";
import { formatPKR, formatSigned } from "@/utils/format";
import Select from "@/components/ui/Select";
import { cardClass, thClass, tdClass } from "@/components/ui/styles";

const profitClass = (n) => (n < 0 ? "text-red-700 dark:text-red-400" : "text-green-800 dark:text-green-400");

export default function ShopReport() {
  const [groupBy, setGroupBy] = useState("month");
  const [period, setPeriod] = useState("this-year");

  const range = getDateRange(period);
  const params = { groupBy, from: range.from, to: range.to };

  const { data, isLoading, error } = useQuery({
    queryKey: ["shop", "report", params],
    queryFn: () => shopService.report(params),
  });

  const rows = data?.data ?? [];
  const totals = data?.totals;

  return (
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

      <p className="border-b border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400">
        Net profit = Sales − (Purchases + Expenses + Shop salary). Shop salary comes automatically from staff in the Shop department.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <th className={thClass}>{groupBy === "year" ? "Year" : "Month"}</th>
              <th className={`${thClass} text-right`}>Sales</th>
              <th className={`${thClass} text-right`}>Purchases</th>
              <th className={`${thClass} text-right`}>Gross profit</th>
              <th className={`${thClass} text-right`}>Expenses</th>
              <th className={`${thClass} text-right`}>Shop salary</th>
              <th className={`${thClass} text-right`}>Net profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">Loading report…</td></tr>}
            {error && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
            {!isLoading && !error && rows.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">No shop activity for this selection.</td></tr>
            )}

            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>
                  {groupBy === "year" ? r.key : monthLabel(r.key)}
                </td>
                <td className={`${tdClass} text-right`}>{formatPKR(r.sales)}</td>
                <td className={`${tdClass} text-right`}>{formatPKR(r.purchases)}</td>
                <td className={`${tdClass} text-right ${profitClass(r.grossProfit)}`}>{formatSigned(r.grossProfit)}</td>
                <td className={`${tdClass} text-right`}>{formatPKR(r.expenses)}</td>
                <td className={`${tdClass} text-right`}>{formatPKR(r.salary)}</td>
                <td className={`${tdClass} text-right font-semibold ${profitClass(r.profit)}`}>{formatSigned(r.profit)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && totals && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <td className={`${tdClass} font-semibold text-gray-900 dark:text-gray-100`}>Total</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.sales)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.purchases)}</td>
                <td className={`${tdClass} text-right font-semibold ${profitClass(totals.grossProfit)}`}>{formatSigned(totals.grossProfit)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.expenses)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.salary)}</td>
                <td className={`${tdClass} text-right font-semibold ${profitClass(totals.profit)}`}>{formatSigned(totals.profit)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}