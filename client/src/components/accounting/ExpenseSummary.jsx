import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { companyService } from "@/services/accountingServices";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatPKR } from "@/utils/format";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import { cardClass, thClass, tdClass } from "@/components/ui/styles";

export default function ExpenseSummary() {
  const [period, setPeriod] = useState("this-month");
  const range = getDateRange(period);
  const params = { from: range.from, to: range.to };

  const { data, isLoading, error } = useQuery({
    queryKey: ["company", "overview", params],
    queryFn: () => companyService.overview(params),
  });

  const categories = data?.expenses.categories ?? [];
  const total = data?.expenses.total ?? 0;

  return (
    <>
      <div className="max-w-xs">
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </div>

      <div className={cardClass}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Category</th>
                <th className={thClass}>Entered</th>
                <th className={thClass}>Comes from</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={`${thClass} text-right`}>Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-500">Loading…</td></tr>}
              {error && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {categories.map((c) => (
                <tr key={c.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>{c.label}</td>
                  <td className={tdClass}><StatusBadge label={c.source === "auto" ? "Automatic" : "Typed"} tone={c.source === "auto" ? "sky" : "gray"} /></td>
                  <td className={tdClass}>{c.from}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(c.amount)}</td>
                  <td className={`${tdClass} text-right`}>{total ? `${((c.amount / total) * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
            {data && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <td className={`${tdClass} font-semibold text-gray-900 dark:text-gray-100`} colSpan={3}>Total company expenses</td>
                  <td className={`${tdClass} text-right text-base font-semibold text-gray-900 dark:text-gray-100`}>{formatPKR(total)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}