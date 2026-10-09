import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { shopService } from "@/services/shopService";
import { SHOP_TYPES, SHOP_EXPENSE_CATEGORIES, shopCategoryLabel } from "@/config/shop";
import { PAYMENT_STATUSES, methodLabel } from "@/config/payment";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatCompact, formatDate, formatPKR, formatSigned } from "@/utils/format";
import StatStrip from "@/components/ui/StatStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, inputClass, primaryBtn, thClass, tdClass, iconBtn } from "@/components/ui/styles";
import ShopTransactionDrawer from "./ShopTransactionDrawer";

export default function ShopTransactions() {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: "", period: "this-month", type: "", category: "", paymentStatus: "", sort: "newest", page: 1,
  });
  const [drawer, setDrawer] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const debouncedSearch = useDebounce(filters.search);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const range = getDateRange(filters.period);
  const params = {
    page: filters.page,
    limit: 10,
    sort: filters.sort,
    search: debouncedSearch || undefined,
    type: filters.type || undefined,
    category: filters.category || undefined,
    paymentStatus: filters.paymentStatus || undefined,
    from: range.from,
    to: range.to,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["shop", "list", params],
    queryFn: () => shopService.list(params),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => shopService.remove(id),
    onSuccess: () => {
      toast.success("Shop entry deleted");
      queryClient.invalidateQueries({ queryKey: ["shop"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const t = list?.totals;
  const entries = list?.data ?? [];
  const stats = [
    { label: "Sales", value: t ? `Rs ${formatCompact(t.sales)}` : "—", sub: "Shop income" },
    { label: "Purchases", value: t ? `Rs ${formatCompact(t.purchases)}` : "—", sub: "Stock bought" },
    { label: "Expenses", value: t ? `Rs ${formatCompact(t.expenses)}` : "—", sub: "Rent, bills, maintenance" },
    { label: "Shop salary", value: t ? `Rs ${formatCompact(t.salary)}` : "—", sub: "Automatic, from Salaries" },
    { label: "Net profit", value: t ? formatSigned(t.profit) : "—", sub: "Sales − purchases − expenses − salary" },
  ];

  return (
    <>
      {can("shop", "add") && (
        <div>
          <button className={primaryBtn} onClick={() => setDrawer({})}>+ Add sale / purchase / expense</button>
        </div>
      )}

      <StatStrip items={stats} />

      <div className={cardClass}>
        <div className="space-y-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Search customer, supplier, description, invoice number…"
            className={inputClass}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Select value={filters.period} onChange={(e) => setFilter("period", e.target.value)}>
              {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
            <Select value={filters.type} onChange={(e) => setFilter("type", e.target.value)}>
              <option value="">All types</option>
              {Object.entries(SHOP_TYPES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <Select value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
              <option value="">All expense categories</option>
              {SHOP_EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Select value={filters.paymentStatus} onChange={(e) => setFilter("paymentStatus", e.target.value)}>
              <option value="">Paid and unpaid</option>
              {Object.entries(PAYMENT_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount">Highest amount</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Date</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Details</th>
                <th className={thClass}>Party</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={thClass}>Payment</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">Loading shop entries…</td></tr>}
              {error && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && entries.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">No shop entries found.</td></tr>
              )}

              {entries.map((e) => {
                const type = SHOP_TYPES[e.type];
                const pay = PAYMENT_STATUSES[e.paymentStatus] || PAYMENT_STATUSES.paid;
                return (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(e.txnDate)}</td>
                    <td className={tdClass}><StatusBadge label={type.label} tone={type.tone} /></td>
                    <td className={`${tdClass} max-w-[260px]`}>
                      <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                        {e.type === "expense" ? shopCategoryLabel(e.category) : e.description || "—"}
                      </p>
                      {e.type === "expense" && e.description && <p className="truncate text-[13px] text-gray-500">{e.description}</p>}
                      {e.reference && <p className="text-[13px] text-gray-500">Ref {e.reference}</p>}
                    </td>
                    <td className={tdClass}>{e.party || "—"}</td>
                    <td className={`${tdClass} text-right font-semibold ${e.type === "sale" ? "text-green-800 dark:text-green-400" : "text-gray-900 dark:text-gray-100"}`}>
                      {formatPKR(e.amount)}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge label={pay.label} tone={pay.tone} />
                      <p className="mt-1 text-[13px] text-gray-500">{methodLabel(e.paymentMethod)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        {can("shop", "edit") && (
                          <button title="Edit" aria-label="Edit shop entry" onClick={() => setDrawer({ entry: e })} className={iconBtn}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                              <path d="M13.5 6.5l4 4" />
                            </svg>
                          </button>
                        )}
                        {can("shop", "delete") && (
                          <button title="Delete" aria-label="Delete shop entry" onClick={() => setToDelete(e)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                            </svg>
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

      {drawer && <ShopTransactionDrawer key={drawer.entry?.id ?? "new"} entry={drawer.entry} onClose={() => setDrawer(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete shop entry"
          message={`This ${SHOP_TYPES[toDelete.type].label.toLowerCase()} of ${formatPKR(toDelete.amount)} will be removed from totals and reports.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}