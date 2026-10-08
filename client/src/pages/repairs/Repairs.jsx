import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { repairService } from "@/services/repairService";
import { vehicleService } from "@/services/vehicleService";
import { REPAIR_CATEGORIES, categoryLabel } from "@/config/repair";
import { PAYMENT_STATUSES } from "@/config/payment";
import { PERIOD_CHOICES, getDateRange, todayStr } from "@/utils/period";
import { formatCompact, formatDate, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatStrip from "@/components/ui/StatStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, inputClass, primaryBtn, thClass, tdClass, iconBtn } from "@/components/ui/styles";
import RepairDrawer from "@/components/repairs/RepairDrawer";

const daysUntil = (iso) => Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(todayStr())) / 86400000);

function MaintenanceDue() {
  const { data: due = [] } = useQuery({
    queryKey: ["repairs", "upcoming"],
    queryFn: () => repairService.upcoming(30),
  });

  if (due.length === 0) return null;

  return (
    <div className={`${cardClass} p-5`}>
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Maintenance due</h2>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Overdue and due within 30 days.</p>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {due.map((d) => {
          const days = daysUntil(d.nextMaintenanceDate);
          return (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link to={`/vehicles/${d.vehicle.id}`} className="text-[15px] font-medium text-green-800 hover:underline dark:text-green-400">
                  Truck #{d.vehicle.vehicleNumber}
                </Link>
                <span className="text-[15px] text-gray-700 dark:text-gray-300"> — {categoryLabel(d.category)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(d.nextMaintenanceDate)}</span>
                <StatusBadge
                  tone={days < 0 ? "red" : "amber"}
                  label={days < 0 ? `Overdue ${Math.abs(days)} d` : days === 0 ? "Due today" : `In ${days} d`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Repairs() {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: "", period: "this-year", vehicle: "", category: "", paymentStatus: "", sort: "newest", page: 1,
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
    vehicle: filters.vehicle || undefined,
    category: filters.category || undefined,
    paymentStatus: filters.paymentStatus || undefined,
    from: range.from,
    to: range.to,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["repairs", "list", params],
    queryFn: () => repairService.list(params),
    placeholderData: keepPreviousData,
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles", "options"], queryFn: vehicleService.options });

  const deleteMutation = useMutation({
    mutationFn: (id) => repairService.remove(id),
    onSuccess: () => {
      toast.success("Repair record deleted");
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const t = list?.totals;
  const repairs = list?.data ?? [];
  const stats = [
    { label: "Repair records", value: t ? t.count : "—", sub: "In this selection" },
    { label: "Total cost", value: t ? `Rs ${formatCompact(t.total)}` : "—", sub: "Parts + labor" },
    { label: "Parts cost", value: t ? `Rs ${formatCompact(t.parts)}` : "—", sub: "Spare parts" },
    { label: "Labor cost", value: t ? `Rs ${formatCompact(t.labor)}` : "—", sub: "Workshop charges" },
    { label: "Unpaid to workshops", value: t ? `Rs ${formatCompact(t.unpaid)}` : "—", sub: "On credit" },
  ];

  return (
    <>
      <PageHeader
        title="Repair & Maintenance"
        crumb="Repairs"
        subtitle="Every repair, its cost and when the next service is due."
        actions={can("repairs", "add") && <button className={primaryBtn} onClick={() => setDrawer({})}>+ Add repair</button>}
      />

      <MaintenanceDue />

      <StatStrip items={stats} />

      <div className={cardClass}>
        <div className="space-y-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              placeholder="Search workshop, parts, description, bill number…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Select value={filters.period} onChange={(e) => setFilter("period", e.target.value)}>
              {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
            <Select value={filters.vehicle} onChange={(e) => setFilter("vehicle", e.target.value)}>
              <option value="">All vehicles</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>Truck #{v.vehicleNumber}</option>)}
            </Select>
            <Select value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
              <option value="">All repair types</option>
              {REPAIR_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Select value={filters.paymentStatus} onChange={(e) => setFilter("paymentStatus", e.target.value)}>
              <option value="">Paid and unpaid</option>
              {Object.entries(PAYMENT_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="cost">Highest cost</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Date</th>
                <th className={thClass}>Vehicle</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Workshop</th>
                <th className={thClass}>Description</th>
                <th className={`${thClass} text-right`}>Total cost</th>
                <th className={thClass}>Next due</th>
                <th className={thClass}>Payment</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-500">Loading repairs…</td></tr>}
              {error && <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && repairs.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-500">No repair records found.</td></tr>
              )}

              {repairs.map((r) => {
                const status = PAYMENT_STATUSES[r.paymentStatus] || PAYMENT_STATUSES.paid;
                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(r.repairDate)}</td>
                    <td className={tdClass}>
                      {r.vehicle ? (
                        <Link to={`/vehicles/${r.vehicle.id}`} className="font-medium text-green-800 hover:underline dark:text-green-400">
                          Truck #{r.vehicle.vehicleNumber}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>{categoryLabel(r.category)}</td>
                    <td className={tdClass}>
                      <p>{r.mechanic || "—"}</p>
                      {r.billNumber && <p className="text-[13px] text-gray-500">Bill {r.billNumber}</p>}
                    </td>
                    <td className={`${tdClass} max-w-[240px]`}>
                      <p className="truncate">{r.description || r.parts || "—"}</p>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatPKR(r.totalCost)}</p>
                      <p className="text-[13px] text-gray-500">Parts {formatCompact(r.partsCost)} · Labor {formatCompact(r.laborCost)}</p>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap`}>{r.nextMaintenanceDate ? formatDate(r.nextMaintenanceDate) : "—"}</td>
                    <td className={tdClass}><StatusBadge label={status.label} tone={status.tone} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        {can("repairs", "edit") && (
                          <button title="Edit" aria-label="Edit repair" onClick={() => setDrawer({ repair: r })} className={iconBtn}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                              <path d="M13.5 6.5l4 4" />
                            </svg>
                          </button>
                        )}
                        {can("repairs", "delete") && (
                          <button title="Delete" aria-label="Delete repair" onClick={() => setToDelete(r)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
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

      {drawer && <RepairDrawer key={drawer.repair?.id ?? "new"} repair={drawer.repair} onClose={() => setDrawer(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete repair record"
          message={`The ${categoryLabel(toDelete.category).toLowerCase()} repair of ${formatPKR(toDelete.totalCost)} will be removed from totals and vehicle profit.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}