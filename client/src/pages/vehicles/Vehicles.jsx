import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { useVehicleSummary } from "@/hooks/useVehicleSummary";
import { vehicleService } from "@/services/vehicleService";
import { VEHICLE_TYPES, VEHICLE_STATUSES, VEHICLE_STATUSES as STATUS_MAP, typeLabel } from "@/config/vehicle";
import { formatCompact, formatDate, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatStrip from "@/components/ui/StatStrip";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { inputClass, primaryBtn } from "@/components/ui/styles";
import VehicleDrawer from "@/components/vehicles/VehicleDrawer";
import VehicleStatusBadge from "@/components/vehicles/VehicleStatusBadge";

const iconBtn =
  "grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition";

export default function Vehicles() {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: "", status: "", type: "", sort: "newest", page: 1 });
  const [drawer, setDrawer] = useState(null); // { vehicle? }
  const [toDelete, setToDelete] = useState(null);

  const debouncedSearch = useDebounce(filters.search);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const params = {
    page: filters.page,
    limit: 10,
    sort: filters.sort,
    search: debouncedSearch || undefined,
    status: filters.status || undefined,
    type: filters.type || undefined,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["vehicles", "list", params],
    queryFn: () => vehicleService.list(params),
    placeholderData: keepPreviousData,
  });
  const { data: summary } = useVehicleSummary();

  const deleteMutation = useMutation({
    mutationFn: (id) => vehicleService.remove(id),
    onSuccess: () => {
      toast.success("Vehicle deleted");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const vehicles = list?.data ?? [];
  const activePct = summary?.total ? (summary.byStatus.active / summary.total) * 100 : 0;

  const stats = [
    { label: "Total Vehicles", value: summary?.total ?? "—", color: "slate", sub: "Excluding deleted" },
    { label: "Active", value: summary?.byStatus.active ?? "—", suffix: summary ? `/ ${summary.total}` : "", color: "emerald", progress: activePct },
    { label: "In Repair", value: summary?.byStatus.in_repair ?? "—", color: "amber", sub: "In workshop" },
    { label: "Available", value: summary?.byStatus.available ?? "—", color: "sky", sub: "Ready to assign" },
    { label: "Total Investment", value: summary ? `Rs ${formatCompact(summary.totalInvestment)}` : "—", color: "violet", sub: "All vehicles" },
  ];

  return (
    <>
      <PageHeader
        title="Vehicles"
        subtitle="Every truck, its status and total investment — in one place."
        actions={
          can("vehicles", "add") && (
            <button className={primaryBtn} onClick={() => setDrawer({})}>
              + Add vehicle
            </button>
          )
        }
      />

      <StatStrip items={stats} />

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center dark:border-slate-800">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              placeholder="Search number, registration, make, model…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[560px]">
            <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_MAP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <Select value={filters.type} onChange={(e) => setFilter("type", e.target.value)}>
              <option value="">All types</option>
              {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="number">Vehicle number</option>
              <option value="investment">Highest investment</option>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
                <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Vehicle</th>
                <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Registration</th>
                <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Purchased</th>
                <th className="px-4 py-3 text-right text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Investment</th>
                <th className="px-4 py-3 text-right text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] text-slate-400">Loading vehicles…</td></tr>
              )}
              {error && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] text-rose-500">{error.message}</td></tr>
              )}
              {!isLoading && !error && vehicles.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] text-slate-400">No vehicles found.</td></tr>
              )}

              {vehicles.map((v) => (
                <tr key={v.id} className="group transition hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5">
                  <td className="px-5 py-3.5">
                    <Link to={`/vehicles/${v.id}`} className="flex items-center gap-3">
                      <div className={`grid h-9 min-w-9 place-items-center rounded-lg bg-gradient-to-br px-1.5 text-[10px] font-extrabold text-white ${(VEHICLE_STATUSES[v.status] || VEHICLE_STATUSES.inactive).avatar}`}>
                        {v.vehicleNumber}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800 group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400">
                          Truck #{v.vehicleNumber}
                        </p>
                        <p className="text-[11px] text-slate-400">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-[12.5px] font-medium text-slate-600 dark:text-slate-300">{v.registrationNumber || "—"}</td>
                  <td className="px-4 py-3.5 text-[12.5px] font-medium text-slate-600 dark:text-slate-300">{typeLabel(v.type)}</td>
                  <td className="px-4 py-3.5 text-[12.5px] font-medium text-slate-600 dark:text-slate-300">{formatDate(v.purchaseDate)}</td>
                  <td className="px-4 py-3.5 text-right text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{formatPKR(v.totalInvestment)}</td>
                  <td className="px-4 py-3.5 text-right"><VehicleStatusBadge status={v.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      {can("vehicles", "edit") && (
                        <button
                          title="Edit"
                          aria-label="Edit vehicle"
                          onClick={() => setDrawer({ vehicle: v })}
                          className={`${iconBtn} hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400`}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                            <path d="M13.5 6.5l4 4" />
                          </svg>
                        </button>
                      )}
                      {can("vehicles", "delete") && (
                        <button
                          title="Delete"
                          aria-label="Delete vehicle"
                          onClick={() => setToDelete(v)}
                          className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400`}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                          </svg>
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

      {drawer && (
        <VehicleDrawer
          key={drawer.vehicle?.id ?? "new"}
          vehicle={drawer.vehicle}
          onClose={() => setDrawer(null)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete vehicle"
          message={`Truck #${toDelete.vehicleNumber} will be removed from your lists. You can reuse this vehicle number afterwards.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}