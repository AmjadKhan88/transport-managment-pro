import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { investmentService } from "@/services/accountingServices";
import { INVESTMENT_GROUPS, MANUAL_INVESTMENT_GROUPS, investmentCategoryLabel } from "@/config/accounting";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatDate, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, inputClass, primaryBtn, thClass, tdClass, iconBtn } from "@/components/ui/styles";
import InvestmentDrawer from "@/components/accounting/InvestmentDrawer";

function GroupCard({ group }) {
  const meta = INVESTMENT_GROUPS[group.group];
  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{meta.label}</p>
        {group.auto && <StatusBadge label="Automatic" tone="sky" />}
      </div>
      <p className="mt-1.5 text-2xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(group.total)}</p>

      <div className="mt-4 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-800">
        {group.items.length === 0 && <p className="text-sm text-gray-500">Nothing recorded yet.</p>}
        {group.items.map((i) => (
          <div key={i.category} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{investmentCategoryLabel(group.group, i.category)}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{formatPKR(i.amount)}</span>
          </div>
        ))}
      </div>

      {group.auto && (
        <Link to="/vehicles" className="mt-3 inline-block text-sm font-medium text-green-800 hover:underline dark:text-green-400">
          {group.count} vehicle{group.count === 1 ? "" : "s"} — manage in Vehicles →
        </Link>
      )}
    </div>
  );
}

export default function Investments() {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: "", period: "all", group: "", page: 1 });
  const [drawer, setDrawer] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const debouncedSearch = useDebounce(filters.search);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const range = getDateRange(filters.period);
  const dateParams = { from: range.from, to: range.to };
  const listParams = {
    page: filters.page, limit: 10, ...dateParams,
    search: debouncedSearch || undefined, group: filters.group || undefined,
  };

  const { data: summary } = useQuery({
    queryKey: ["investments", "summary", dateParams],
    queryFn: () => investmentService.summary(dateParams),
  });
  const { data: list, isLoading, error } = useQuery({
    queryKey: ["investments", "list", listParams],
    queryFn: () => investmentService.list(listParams),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => investmentService.remove(id),
    onSuccess: () => {
      toast.success("Investment deleted");
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const investments = list?.data ?? [];

  return (
    <>
      <PageHeader
        title="Investments"
        subtitle="Everything the company has invested, and where."
        actions={can("investments", "add") && <button className={primaryBtn} onClick={() => setDrawer({})}>+ Add investment</button>}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className={`${cardClass} flex-1 p-5`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total company investment</p>
          <p className="mt-1.5 text-3xl font-semibold text-gray-900 dark:text-gray-50">{summary ? formatPKR(summary.total) : "—"}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Investment is capital. It is not deducted from profit; it is compared against profit to see recovery.
          </p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={filters.period} onChange={(e) => setFilter("period", e.target.value)}>
            {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {(summary?.groups ?? []).map((g) => <GroupCard key={g.group} group={g} />)}
      </div>

      <div className={cardClass}>
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Shop, office and other investments</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 sm:grid-cols-3 dark:border-gray-800">
          <input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Search description or reference…"
            className={`${inputClass} sm:col-span-2`}
          />
          <Select value={filters.group} onChange={(e) => setFilter("group", e.target.value)}>
            <option value="">All groups</option>
            {MANUAL_INVESTMENT_GROUPS.map((g) => <option key={g} value={g}>{INVESTMENT_GROUPS[g].label}</option>)}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Date</th>
                <th className={thClass}>Group</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Description</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">Loading investments…</td></tr>}
              {error && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && investments.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">No investments recorded.</td></tr>
              )}

              {investments.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(i.investDate)}</td>
                  <td className={tdClass}>{INVESTMENT_GROUPS[i.group]?.label}</td>
                  <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>{investmentCategoryLabel(i.group, i.category)}</td>
                  <td className={`${tdClass} max-w-[240px]`}>
                    <p className="truncate">{i.description || "—"}</p>
                    {i.reference && <p className="text-[13px] text-gray-500">Ref {i.reference}</p>}
                  </td>
                  <td className={`${tdClass} text-right font-semibold text-gray-900 dark:text-gray-100`}>{formatPKR(i.amount)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      {can("investments", "edit") && (
                        <button title="Edit" aria-label="Edit investment" onClick={() => setDrawer({ investment: i })} className={iconBtn}>
                          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
                        </button>
                      )}
                      {can("investments", "delete") && (
                        <button title="Delete" aria-label="Delete investment" onClick={() => setToDelete(i)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
                          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={list?.meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
      </div>

      {drawer && <InvestmentDrawer key={drawer.investment?.id ?? "new"} investment={drawer.investment} onClose={() => setDrawer(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete investment"
          message={`The ${formatPKR(toDelete.amount)} investment will be removed from the totals.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}