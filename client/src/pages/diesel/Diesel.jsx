import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { dieselService } from "@/services/dieselService";
import { vehicleService } from "@/services/vehicleService";
import { PAYMENT_STATUSES, methodLabel } from "@/config/payment";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatCompact, formatDate, formatNumber, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatStrip from "@/components/ui/StatStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, inputClass, primaryBtn, thClass, tdClass, iconBtn } from "@/components/ui/styles";
import DieselDrawer from "@/components/diesel/DieselDrawer";
import DieselReports from "@/components/diesel/DieselReports";

function Tabs({ value, onChange }) {
  const tabs = [
    { value: "entries", label: "Fuel entries" },
    { value: "reports", label: "Reports" },
  ];
  return (
    <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`-mb-px border-b-2 px-1 pb-3 text-[15px] font-medium transition ${value === t.value
            ? "border-green-800 text-green-800 dark:border-green-400 dark:text-green-400"
            : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Entries() {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: "", period: "this-month", vehicle: "", paymentStatus: "", sort: "newest", page: 1,
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
    paymentStatus: filters.paymentStatus || undefined,
    from: range.from,
    to: range.to,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["diesel", "list", params],
    queryFn: () => dieselService.list(params),
    placeholderData: keepPreviousData,
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles", "options"], queryFn: vehicleService.options });

  const deleteMutation = useMutation({
    mutationFn: (id) => dieselService.remove(id),
    onSuccess: () => {
      toast.success("Fuel entry deleted");
      queryClient.invalidateQueries({ queryKey: ["diesel"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const t = list?.totals;
  const entries = list?.data ?? [];
  const stats = [
    { label: "Fuel entries", value: t ? t.count : "—", sub: "In this selection" },
    { label: "Total liters", value: t ? `${formatNumber(t.liters)} L` : "—", sub: "Diesel purchased" },
    { label: "Total cost", value: t ? `Rs ${formatCompact(t.amount)}` : "—", sub: "Liters × rate" },
    { label: "Average rate", value: t && t.liters ? formatPKR(Math.round((t.amount / t.liters) * 100) / 100) : "—", sub: "Per liter" },
    { label: "Unpaid to stations", value: t ? `Rs ${formatCompact(t.unpaid)}` : "—", sub: "On credit" },
  ];

  return (
    <>
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
              placeholder="Search station, receipt number, route…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={filters.period} onChange={(e) => setFilter("period", e.target.value)}>
              {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
            <Select value={filters.vehicle} onChange={(e) => setFilter("vehicle", e.target.value)}>
              <option value="">All vehicles</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>Truck #{v.vehicleNumber}</option>)}
            </Select>
            <Select value={filters.paymentStatus} onChange={(e) => setFilter("paymentStatus", e.target.value)}>
              <option value="">Paid and unpaid</option>
              {Object.entries(PAYMENT_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount">Highest amount</option>
              <option value="liters">Most liters</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Date</th>
                <th className={thClass}>Vehicle</th>
                <th className={thClass}>Driver</th>
                <th className={thClass}>Station</th>
                <th className={`${thClass} text-right`}>Liters</th>
                <th className={`${thClass} text-right`}>Rate</th>
                <th className={`${thClass} text-right`}>Total</th>
                <th className={thClass}>Payment</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-500">Loading fuel entries…</td></tr>}
              {error && <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && entries.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-500">No fuel entries found.</td></tr>
              )}

              {entries.map((e) => {
                const status = PAYMENT_STATUSES[e.paymentStatus] || PAYMENT_STATUSES.paid;
                return (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(e.fuelDate)}</td>
                    <td className={tdClass}>
                      {e.vehicle ? (
                        <Link to={`/vehicles/${e.vehicle.id}`} className="font-medium text-green-800 hover:underline dark:text-green-400">
                          Truck #{e.vehicle.vehicleNumber}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className={tdClass}>{e.driver?.name || "—"}</td>
                    <td className={tdClass}>
                      <p>{e.fuelStation || "—"}</p>
                      {e.receiptNumber && <p className="text-[13px] text-gray-500">Receipt {e.receiptNumber}</p>}
                    </td>
                    <td className={`${tdClass} text-right`}>{formatNumber(e.liters)} L</td>
                    <td className={`${tdClass} text-right`}>{formatPKR(e.ratePerLiter)}</td>
                    <td className={`${tdClass} text-right font-semibold text-gray-900 dark:text-gray-100`}>{formatPKR(e.totalAmount)}</td>
                    <td className={tdClass}>
                      <StatusBadge label={status.label} tone={status.tone} />
                      <p className="mt-1 text-[13px] text-gray-500">{methodLabel(e.paymentMethod)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        {can("diesel", "edit") && (
                          <button title="Edit" aria-label="Edit fuel entry" onClick={() => setDrawer({ entry: e })} className={iconBtn}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                              <path d="M13.5 6.5l4 4" />
                            </svg>
                          </button>
                        )}
                        {can("diesel", "delete") && (
                          <button title="Delete" aria-label="Delete fuel entry" onClick={() => setToDelete(e)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
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

      {drawer && <DieselDrawer key={drawer.entry?.id ?? "new"} entry={drawer.entry} onClose={() => setDrawer(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete fuel entry"
          message={`The fuel entry of ${formatNumber(toDelete.liters)} L (${formatPKR(toDelete.totalAmount)}) will be removed from totals and reports.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}

      {can("diesel", "add") && (
        <button
          onClick={() => setDrawer({})}
          className={`${primaryBtn} fixed bottom-6 right-6 z-30 shadow-sm sm:hidden`}
        >
          + Add fuel
        </button>
      )}
    </>
  );
}

export default function Diesel() {
  const { can } = useAuth();
  const [tab, setTab] = useState("entries");
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title="Diesel / Fuel"
        crumb="Diesel"
        subtitle="Every fuel purchase, with totals and reports."
        actions={
          can("diesel", "add") &&
          tab === "entries" && (
            <button className={primaryBtn} onClick={() => setAdding(true)}>+ Add fuel entry</button>
          )
        }
      />

      <Tabs value={tab} onChange={setTab} />

      {tab === "entries" ? <Entries key={adding ? "adding" : "idle"} /> : <DieselReports />}

      {adding && <DieselDrawer onClose={() => setAdding(false)} />}
    </>
  );
}