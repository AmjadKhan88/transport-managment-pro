import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { receivablesService } from "@/services/settlementServices";
import { todayStr } from "@/utils/period";
import { formatCompact, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatStrip from "@/components/ui/StatStrip";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import { cardClass, inputClass, smallBtn, primaryBtn, thClass, tdClass } from "@/components/ui/styles";
import ReceivePaymentDrawer from "@/components/receivables/ReceivePaymentDrawer";

const money = (n) => (n ? formatPKR(n) : "—");

export default function Receivables() {
  const { can } = useAuth();
  const [filters, setFilters] = useState({ search: "", all: "", asOf: todayStr(), page: 1 });
  const [paying, setPaying] = useState(null);

  const debouncedSearch = useDebounce(filters.search);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const params = {
    page: filters.page, limit: 10, asOf: filters.asOf || undefined,
    search: debouncedSearch || undefined, all: filters.all || undefined,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["receivables", "list", params],
    queryFn: () => receivablesService.list(params),
    placeholderData: keepPreviousData,
  });

  const t = list?.totals;
  const rows = list?.data ?? [];
  const stats = [
    { label: "Total receivable", value: t ? `Rs ${formatCompact(t.receivable)}` : "—", sub: "Customers owe you" },
    { label: "Customers owing", value: t ? t.customers : "—", sub: "With a balance" },
    { label: "Over 90 days", value: t ? `Rs ${formatCompact(t.buckets.d90plus)}` : "—", sub: "Needs follow-up" },
    { label: "Customer credit", value: t ? `Rs ${formatCompact(t.credit)}` : "—", sub: "Paid more than owed" },
  ];

  return (
    <>
      <PageHeader
        title="Receivables"
        subtitle="What customers owe you, and how old it is."
      />

      <StatStrip items={stats} />

      <div className={cardClass}>
        <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 sm:grid-cols-3 dark:border-gray-800">
          <input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Search customer, company, phone…"
            className={inputClass}
          />
          <input
            type="date"
            value={filters.asOf}
            onChange={(e) => setFilter("asOf", e.target.value)}
            aria-label="As of date"
            className={inputClass}
          />
          <Select value={filters.all} onChange={(e) => setFilter("all", e.target.value)}>
            <option value="">Customers with a balance</option>
            <option value="true">All customers</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Customer</th>
                <th className={`${thClass} text-right`}>Opening</th>
                <th className={`${thClass} text-right`}>0–30 days</th>
                <th className={`${thClass} text-right`}>31–60</th>
                <th className={`${thClass} text-right`}>61–90</th>
                <th className={`${thClass} text-right`}>90+ days</th>
                <th className={`${thClass} text-right`}>Balance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">Loading receivables…</td></tr>}
              {error && <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && rows.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">No customers owe you anything.</td></tr>
              )}

              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className={tdClass}>
                    <Link to={`/receivables/${r.id}`} className="font-medium text-green-800 hover:underline dark:text-green-400">
                      {r.name}
                    </Link>
                    {r.companyName && <p className="text-[13px] text-gray-500">{r.companyName}</p>}
                  </td>
                  <td className={`${tdClass} text-right`}>{money(r.buckets.opening)}</td>
                  <td className={`${tdClass} text-right`}>{money(r.buckets.d30)}</td>
                  <td className={`${tdClass} text-right`}>{money(r.buckets.d60)}</td>
                  <td className={`${tdClass} text-right`}>{money(r.buckets.d90)}</td>
                  <td className={`${tdClass} text-right ${r.buckets.d90plus ? "font-semibold text-red-700 dark:text-red-400" : ""}`}>
                    {money(r.buckets.d90plus)}
                  </td>
                  <td className={`${tdClass} text-right font-semibold text-gray-900 dark:text-gray-100`}>
                    {r.balance < 0 ? <span className="text-green-800 dark:text-green-400">{formatPKR(-r.balance)} credit</span> : formatPKR(r.balance)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/receivables/${r.id}`} className={smallBtn}>Ledger</Link>
                      {can("receivables", "add") && (
                        <button className={`${primaryBtn} !h-9 !px-3 !text-[13px]`} onClick={() => setPaying(r)}>
                          Receive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {t && rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <td className={`${tdClass} font-semibold text-gray-900 dark:text-gray-100`}>All customers</td>
                  <td className={`${tdClass} text-right font-semibold`}>{money(t.buckets.opening)}</td>
                  <td className={`${tdClass} text-right font-semibold`}>{money(t.buckets.d30)}</td>
                  <td className={`${tdClass} text-right font-semibold`}>{money(t.buckets.d60)}</td>
                  <td className={`${tdClass} text-right font-semibold`}>{money(t.buckets.d90)}</td>
                  <td className={`${tdClass} text-right font-semibold`}>{money(t.buckets.d90plus)}</td>
                  <td className={`${tdClass} text-right font-semibold`}>{formatPKR(t.receivable)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <Pagination meta={list?.meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Payments are applied to the oldest amounts first (opening balance, then the oldest trips). The age shown is the age of what is still unpaid.
      </p>

      {paying && <ReceivePaymentDrawer key={paying.id} customer={paying} onClose={() => setPaying(null)} />}
    </>
  );
}