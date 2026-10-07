import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { driverService } from "@/services/driverService";
import { DRIVER_STATUSES } from "@/config/status";
import { formatCompact, formatDate, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatStrip from "@/components/ui/StatStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { inputClass, primaryBtn } from "@/components/ui/styles";
import DriverDrawer from "@/components/drivers/DriverDrawer";

const iconBtn = "grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition";
const th = "px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400";
const td = "px-4 py-3.5 text-[12.5px] font-medium text-slate-600 dark:text-slate-300";

export default function Drivers() {
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
    queryKey: ["drivers", "list", params],
    queryFn: () => driverService.list(params),
    placeholderData: keepPreviousData,
  });
  const { data: summary } = useQuery({
    queryKey: ["drivers", "summary"],
    queryFn: driverService.summary,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => driverService.remove(id),
    onSuccess: () => {
      toast.success("Driver deleted");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const drivers = list?.data ?? [];
  const activePct = summary?.total ? (summary.byStatus.active / summary.total) * 100 : 0;

  const stats = [
    { label: "Total Drivers", value: summary?.total ?? "—", color: "sky", sub: "Excluding deleted" },
    { label: "Active", value: summary?.byStatus.active ?? "—", suffix: summary ? `/ ${summary.total}` : "", color: "emerald", progress: activePct },
    { label: "On Leave", value: summary?.byStatus.on_leave ?? "—", color: "amber", sub: "Currently away" },
    { label: "Without Vehicle", value: summary?.unassigned ?? "—", color: "rose", sub: "Active, unassigned" },
    { label: "Monthly Payroll", value: summary ? `Rs ${formatCompact(summary.monthlyPayroll)}` : "—", color: "violet", sub: "Basic salary, active" },
  ];

  return (
    <>
      <PageHeader
        title="Drivers"
        subtitle="Complete record of every driver, salary and assigned vehicle."
        actions={
          can("drivers", "add") && (
            <button className={primaryBtn} onClick={() => setDrawer({})}>+ Add driver</button>
          )
        }
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
              placeholder="Search name, father name, CNIC, phone…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[380px]">
            <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(DRIVER_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="name">Name (A–Z)</option>
              <option value="salary">Highest salary</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
                <th className={`${th} px-5`}>Driver</th>
                <th className={th}>CNIC</th>
                <th className={th}>Phone</th>
                <th className={th}>Vehicle</th>
                <th className={th}>Joined</th>
                <th className={`${th} text-right`}>Salary</th>
                <th className={`${th} text-right`}>Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && <tr><td colSpan={8} className="px-5 py-12 text-center text-[13px] text-slate-400">Loading drivers…</td></tr>}
              {error && <tr><td colSpan={8} className="px-5 py-12 text-center text-[13px] text-rose-500">{error.message}</td></tr>}
              {!isLoading && !error && drivers.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-[13px] text-slate-400">No drivers found.</td></tr>
              )}

              {drivers.map((d) => {
                const status = DRIVER_STATUSES[d.status] || DRIVER_STATUSES.inactive;
                return (
                  <tr key={d.id} className="group transition hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5">
                    <td className="px-5 py-3.5">
                      <Link to={`/drivers/${d.id}`} className="flex items-center gap-3">
                        <Avatar name={d.name} />
                        <div>
                          <p className="text-[13px] font-bold text-slate-800 group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400">{d.name}</p>
                          <p className="text-[11px] text-slate-400">{d.fatherName ? `S/O ${d.fatherName}` : "—"}</p>
                        </div>
                      </Link>
                    </td>
                    <td className={td}>{d.cnic || "—"}</td>
                    <td className={td}>{d.phone || "—"}</td>
                    <td className={td}>
                      {d.vehicle ? (
                        <Link to={`/vehicles/${d.vehicle.id}`} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                          Truck #{d.vehicle.vehicleNumber}
                        </Link>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Unassigned</span>
                      )}
                    </td>
                    <td className={td}>{formatDate(d.joiningDate)}</td>
                    <td className="px-4 py-3.5 text-right text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{formatPKR(d.salary)}</td>
                    <td className="px-4 py-3.5 text-right"><StatusBadge label={status.label} tone={status.tone} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        {can("drivers", "edit") && (
                          <button title="Edit" aria-label="Edit driver" onClick={() => setDrawer({ driver: d })}
                            className={`${iconBtn} hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400`}>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                              <path d="M13.5 6.5l4 4" />
                            </svg>
                          </button>
                        )}
                        {can("drivers", "delete") && (
                          <button title="Delete" aria-label="Delete driver" onClick={() => setToDelete(d)}
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

      {drawer && <DriverDrawer key={drawer.driver?.id ?? "new"} driver={drawer.driver} onClose={() => setDrawer(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete driver"
          message={`${toDelete.name} will be removed from your lists and unassigned from any vehicle.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}