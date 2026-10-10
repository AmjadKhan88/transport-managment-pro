import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { incomeService } from "@/services/accountingServices";
import { INCOME_TYPES, incomeMethodLabel } from "@/config/accounting";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatCompact, formatDate, formatPKR } from "@/utils/format";
import StatStrip from "@/components/ui/StatStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, inputClass, primaryBtn, thClass, tdClass, iconBtn } from "@/components/ui/styles";
import IncomeDrawer from "./IncomeDrawer";

export default function IncomeEntries() {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: "", period: "this-month", type: "", sort: "newest", page: 1 });
  const [drawer, setDrawer] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const debouncedSearch = useDebounce(filters.search);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const range = getDateRange(filters.period);
  const params = {
    page: filters.page, limit: 10, sort: filters.sort,
    search: debouncedSearch || undefined, type: filters.type || undefined,
    from: range.from, to: range.to,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["income", "list", params],
    queryFn: () => incomeService.list(params),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => incomeService.remove(id),
    onSuccess: () => {
      toast.success("Income entry deleted");
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["company"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const t = list?.totals;
  const entries = list?.data ?? [];
  const stats = [
    { label: "Customer payments", value: t ? `Rs ${formatCompact(t.customerPayments)}` : "—", sub: "Cash received, not added to income" },
    { label: "Other business income", value: t ? `Rs ${formatCompact(t.otherBusiness)}` : "—", sub: "Counted as income" },
    { label: "Other receipts", value: t ? `Rs ${formatCompact(t.otherReceipts)}` : "—", sub: "Counted as income" },
  ];

  return (
    <>
      {can("income", "add") && (
        <div>
          <button className={primaryBtn} onClick={() => setDrawer({})}>+ Add income entry</button>
        </div>
      )}

      <StatStrip items={stats} />

      <div className={cardClass}>
        <div className="space-y-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Search source, reference, notes…" className={inputClass} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select value={filters.period} onChange={(e) => setFilter("period", e.target.value)}>
              {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
            <Select value={filters.type} onChange={(e) => setFilter("type", e.target.value)}>
              <option value="">All types</option>
              {Object.entries(INCOME_TYPES).map(([v, t2]) => <option key={v} value={v}>{t2.label}</option>)}
            </Select>
            <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount">Highest amount</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Date</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Customer / source</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={thClass}>Method</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">Loading income…</td></tr>}
              {error && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && entries.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">No income entries found.</td></tr>
              )}

              {entries.map((e) => {
                const type = INCOME_TYPES[e.type];
                return (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(e.incomeDate)}</td>
                    <td className={tdClass}><StatusBadge label={type.label} tone={type.tone} /></td>
                    <td className={tdClass}>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{e.customer?.name || e.source || "—"}</p>
                      {e.customer && e.source && <p className="text-[13px] text-gray-500">{e.source}</p>}
                    </td>
                    <td className={`${tdClass} text-right font-semibold text-gray-900 dark:text-gray-100`}>{formatPKR(e.amount)}</td>
                    <td className={tdClass}>
                      <p>{incomeMethodLabel(e.paymentMethod)}</p>
                      {e.reference && <p className="text-[13px] text-gray-500">{e.reference}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        {can("income", "edit") && (
                          <button title="Edit" aria-label="Edit income entry" onClick={() => setDrawer({ entry: e })} className={iconBtn}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
                          </button>
                        )}
                        {can("income", "delete") && (
                          <button title="Delete" aria-label="Delete income entry" onClick={() => setToDelete(e)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination meta={list?.meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
      </div>

      {drawer && <IncomeDrawer key={drawer.entry?.id ?? "new"} entry={drawer.entry} onClose={() => setDrawer(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete income entry"
          message={`The entry of ${formatPKR(toDelete.amount)} will be removed from totals.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}