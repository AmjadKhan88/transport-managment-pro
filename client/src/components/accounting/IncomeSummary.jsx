import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { companyService } from "@/services/accountingServices";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatPKR } from "@/utils/format";
import Select from "@/components/ui/Select";
import { cardClass, thClass, tdClass } from "@/components/ui/styles";

export default function IncomeSummary() {
  const [period, setPeriod] = useState("this-month");
  const range = getDateRange(period);
  const params = { from: range.from, to: range.to };

  const { data, isLoading, error } = useQuery({
    queryKey: ["company", "overview", params],
    queryFn: () => companyService.overview(params),
  });

  const inc = data?.income;
  const rows = inc
    ? [
      { label: "Trip freight", from: "Trips (automatic)", amount: inc.freight },
      { label: "Shop sales", from: "Shop (automatic)", amount: inc.shopSales },
      { label: "Other business income", from: "Income entries", amount: inc.otherBusiness },
      { label: "Other receipts", from: "Income entries", amount: inc.otherReceipts },
    ]
    : [];

  return (
    <>
      <div className="max-w-xs">
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </div>

      <div className={cardClass}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Income source</th>
                <th className={thClass}>Comes from</th>
                <th className={`${thClass} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-gray-500">Loading…</td></tr>}
              {error && <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>{r.label}</td>
                  <td className={tdClass}>{r.from}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            {inc && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <td className={`${tdClass} font-semibold text-gray-900 dark:text-gray-100`} colSpan={2}>Total company income</td>
                  <td className={`${tdClass} text-right text-base font-semibold text-green-800 dark:text-green-400`}>{formatPKR(inc.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {data && (
        <div className={`${cardClass} p-5`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Customer payments received (memo)</p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(data.customerPayments)}</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            This is cash coming in against freight you already counted from Trips, so it is not added to income again.
            It reduces what customers owe you (Receivables).
          </p>
        </div>
      )}
    </>
  );
}