import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { tripService } from "@/services/tripService";
import { vehicleService } from "@/services/vehicleService";
import { customerService } from "@/services/customerService";
import { TRIP_STATUSES } from "@/config/trip";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatCompact, formatSigned } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatStrip from "@/components/ui/StatStrip";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, inputClass, primaryBtn } from "@/components/ui/styles";
import TripDrawer from "@/components/trips/TripDrawer";
import TripsTable from "@/components/trips/TripsTable";

export default function Trips() {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: "", period: "this-month", vehicle: "", customer: "", status: "", sort: "newest", page: 1,
  });
  const [drawer, setDrawer] = useState(null); // { trip? }
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
    customer: filters.customer || undefined,
    status: filters.status || undefined,
    from: range.from,
    to: range.to,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["trips", "list", params],
    queryFn: () => tripService.list(params),
    placeholderData: keepPreviousData,
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles", "options"], queryFn: vehicleService.options });
  const { data: customers = [] } = useQuery({ queryKey: ["customers", "options"], queryFn: customerService.options });

  const deleteMutation = useMutation({
    mutationFn: (id) => tripService.remove(id),
    onSuccess: () => {
      toast.success("Trip deleted");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const t = list?.totals;
  const stats = [
    { label: "Trips", value: t ? t.count : "—", sub: "Cancelled not counted" },
    { label: "Total freight", value: t ? `Rs ${formatCompact(t.freight)}` : "—", sub: "Revenue from trips" },
    { label: "Trip expenses", value: t ? `Rs ${formatCompact(t.expense)}` : "—", sub: "Diesel, toll, driver, other" },
    { label: "Net profit", value: t ? formatSigned(t.net).replace("Rs ", "Rs ") : "—", sub: "Freight minus expenses" },
    { label: "Remaining", value: t ? `Rs ${formatCompact(t.remaining)}` : "—", sub: "Freight minus advances" },
  ];

  return (
    <>
      <PageHeader
        title="Trips"
        subtitle="Every trip with its freight, expenses and profit."
        actions={can("trips", "add") && <button className={primaryBtn} onClick={() => setDrawer({})}>+ Add trip</button>}
      />

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
              placeholder="Search bilty number, from, to…"
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
            <Select value={filters.customer} onChange={(e) => setFilter("customer", e.target.value)}>
              <option value="">All customers</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(TRIP_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="profit">Highest profit</option>
              <option value="freight">Highest freight</option>
            </Select>
          </div>
        </div>

        <TripsTable
          trips={list?.data ?? []}
          loading={isLoading}
          error={error}
          onEdit={can("trips", "edit") ? (trip) => setDrawer({ trip }) : undefined}
          onDelete={can("trips", "delete") ? setToDelete : undefined}
        />

        <Pagination meta={list?.meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
      </div>

      {drawer && <TripDrawer key={drawer.trip?.id ?? "new"} trip={drawer.trip} onClose={() => setDrawer(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete trip"
          message={`The trip ${toDelete.from} → ${toDelete.to} will be removed and its amounts will no longer count in totals.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}