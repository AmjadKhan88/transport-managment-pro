import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { customerService } from "@/services/customerService";
import { CUSTOMER_STATUSES } from "@/config/status";
import { formatCompact, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatStrip from "@/components/ui/StatStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { inputClass, primaryBtn, smallBtn } from "@/components/ui/styles";
import CustomerDrawer from "@/components/customers/CustomerDrawer";
import { Link } from "react-router-dom";

const iconBtn = "grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition";
const th = "px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400";
const td = "px-4 py-3.5 text-[12.5px] font-medium text-slate-600 dark:text-slate-300";

export default function Customers() {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: "", status: "", sort: "newest", page: 1 });
  const [drawer, setDrawer] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const debouncedSearch = useDebounce(filters.search);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const params = {
    page: filters.page,
    limit: 10,
    sort: filters.sort,
    search: debouncedSearch || undefined,
    status: filters.status || undefined,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["customers", "list", params],
    queryFn: () => customerService.list(params),
    placeholderData: keepPreviousData,
  });
  const { data: summary } = useQuery({
    queryKey: ["customers", "summary"],
    queryFn: customerService.summary,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => customerService.remove(id),
    onSuccess: () => {
      toast.success("Customer deleted");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const customers = list?.data ?? [];

  const stats = [
    { label: "Total Customers", value: summary?.total ?? "—", color: "slate", sub: "Excluding deleted" },
    { label: "Active", value: summary?.byStatus.active ?? "—", color: "emerald", sub: "Currently trading" },
    { label: "Inactive", value: summary?.byStatus.inactive ?? "—", color: "amber", sub: "Not trading" },
    { label: "Opening Balances", value: summary ? `Rs ${formatCompact(summary.openingBalanceTotal)}` : "—", color: "violet", sub: "Owed before the system" },
  ];

  return (
    <>
      <PageHeader
        title="Customers / Parties"
        subtitle="The parties you transport for. Trip totals and ledger arrive with Trips and Receivables."
        crumb="Customers"
        actions={can("customers", "add") && <button className={primaryBtn} onClick={() => setDrawer({})}>+ Add customer</button>}
      />

      <StatStrip items={stats} />

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center dark:border-slate-800">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              placeholder="Search name, company, phone…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[380px]">
            <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(CUSTOMER_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="name">Name (A–Z)</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
                <th className={`${th} px-5`}>Customer</th>
                <th className={th}>Phone</th>
                <th className={th}>Address</th>
                <th className={`${th} text-right`}>Opening balance</th>
                <th className={`${th} text-right`}>Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && <tr><td colSpan={6} className="px-5 py-12 text-center text-[13px] text-slate-400">Loading customers…</td></tr>}
              {error && <tr><td colSpan={6} className="px-5 py-12 text-center text-[13px] text-rose-500">{error.message}</td></tr>}
              {!isLoading && !error && customers.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-[13px] text-slate-400">No customers found.</td></tr>
              )}

              {customers.map((c) => {
                const status = CUSTOMER_STATUSES[c.status] || CUSTOMER_STATUSES.inactive;
                return (
                  <tr key={c.id} className="transition hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.companyName || c.name} variant="soft" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{c.name}</p>
                          <p className="truncate text-[11px] text-slate-400">{c.companyName || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className={td}>{c.phone || "—"}</td>
                    <td className={`${td} max-w-[240px] truncate`}>{c.address || "—"}</td>
                    <td className="px-4 py-3.5 text-right text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{formatPKR(c.openingBalance)}</td>
                    <td className="px-4 py-3.5 text-right"><StatusBadge label={status.label} tone={status.tone} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        {can("receivables", "view") && (
                          <Link to={`/receivables/${c.id}`} className={smallBtn}>Ledger</Link>
                        )}
                        {can("customers", "edit") && (
                          <button title="Edit" aria-label="Edit customer" onClick={() => setDrawer({ customer: c })}
                            className={`${iconBtn} hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400`}>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                              <path d="M13.5 6.5l4 4" />
                            </svg>
                          </button>
                        )}
                        {can("customers", "delete") && (
                          <button title="Delete" aria-label="Delete customer" onClick={() => setToDelete(c)}
                            className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400`}>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

      {drawer && <CustomerDrawer key={drawer.customer?.id ?? "new"} customer={drawer.customer} onClose={() => setDrawer(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete customer"
          message={`${toDelete.name} will be removed from your lists.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}