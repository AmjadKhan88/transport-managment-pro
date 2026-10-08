import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { tripService } from "@/services/tripService";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatPKR, formatSigned } from "@/utils/format";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, primaryBtn } from "@/components/ui/styles";
import TripDrawer from "@/components/trips/TripDrawer";
import TripsTable from "@/components/trips/TripsTable";
import { repairService } from "@/services/repairService";
import { dieselService } from "@/services/dieselService";
import { formatNumber } from "@/utils/format";

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-[15px]">
      <span className={strong ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}>
        {label}
      </span>
      <span className={strong ? "font-semibold text-gray-900 dark:text-gray-100" : "font-medium text-gray-900 dark:text-gray-100"}>
        {value}
      </span>
    </div>
  );
}

export default function VehicleTrips({ vehicle }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const range = getDateRange(period);
  const params = { vehicle: vehicle.id, page, limit: 10, from: range.from, to: range.to };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["trips", "list", params],
    queryFn: () => tripService.list(params),
    placeholderData: keepPreviousData,
  });

  const canRepairs = can("repairs", "view");
  const canDiesel = can("diesel", "view");
  const repairParams = { vehicle: vehicle.id, from: range.from, to: range.to, limit: 1 };

  const { data: repairData } = useQuery({
    queryKey: ["repairs", "list", repairParams],
    queryFn: () => repairService.list(repairParams),
    enabled: canRepairs,
  });
  const { data: fuelData } = useQuery({
    queryKey: ["diesel", "list", repairParams],
    queryFn: () => dieselService.list(repairParams),
    enabled: canDiesel,
  });

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
  const investment = vehicle.totalInvestment || 0;
  const repairCost = repairData?.totals?.total ?? 0;
  const totalExpense = (t?.expense ?? 0) + repairCost;
  const net = (t?.net ?? 0) - repairCost; // profit after repairs
  const recoveredPct = investment > 0 ? Math.max(0, Math.min((net / investment) * 100, 100)) : 0;
  const recovered = investment > 0 && net >= investment;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Trips &amp; profit</h2>
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); }}>
              {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </div>
          {can("trips", "add") && (
            <button
              className={primaryBtn}
              onClick={() => setDrawer({ defaults: { vehicle: vehicle.id, driver: vehicle.driver?.id } })}
            >
              + Add trip
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* P&L */}
        <div className={`${cardClass} p-5`}>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Vehicle profit &amp; loss</h3>
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            Trip expenses and repairs. Fuel purchases are shown below for reference.
          </p>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            <Row label="Total trips" value={t ? t.count : "—"} />
            <Row label="Total revenue (freight)" value={formatPKR(t?.freight)} />
            <Row label="Diesel expense" value={formatPKR(t?.diesel)} />
            <Row label="Driver trip expense" value={formatPKR(t?.driverExpense)} />
            <Row label="Toll tax" value={formatPKR(t?.toll)} />
            <Row label="Other trip expenses" value={formatPKR(t?.other)} />
            <Row label="Total expenses" value={formatPKR(totalExpense)} strong />
            {canRepairs && <Row label="Repair & maintenance" value={formatPKR(repairCost)} />}
            <div className="flex items-center justify-between py-3">
              <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                {net < 0 ? "Net loss" : "Net profit"}
              </span>
              <span className={`text-xl font-semibold ${net < 0 ? "text-red-700 dark:text-red-400" : "text-green-800 dark:text-green-400"}`}>
                {formatSigned(net)}
              </span>
            </div>
          </div>
          {canDiesel && fuelData?.totals && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Fuel purchased (Diesel module): {formatNumber(fuelData.totals.liters)} L · {formatPKR(fuelData.totals.amount)}.
              For reference only. The diesel cost entered on trips is what counts in profit.
            </p>
          )}
        </div>

        {/* Investment recovery */}
        <div className={`${cardClass} p-5`}>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Investment recovery</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Trip profit compared with the money invested in this vehicle (selected period).
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total investment</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(investment)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Profit after repairs</p>
              <p className={`mt-1 text-xl font-semibold ${net < 0 ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-gray-50"}`}>
                {formatSigned(net)}
              </p>
            </div>
          </div>

          <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div className="h-full rounded-full bg-green-800" style={{ width: `${recoveredPct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-900 dark:text-gray-100">{recoveredPct.toFixed(1)}% recovered</span>
            <span className={recovered ? "font-medium text-green-800 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}>
              {investment === 0
                ? "No investment recorded"
                : recovered
                  ? "Investment recovered"
                  : `${formatPKR(investment - net)} left to recover`}
            </span>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Trip history</h3>
        </div>
        <TripsTable
          trips={list?.data ?? []}
          loading={isLoading}
          error={error}
          hideVehicle
          onEdit={can("trips", "edit") ? (trip) => setDrawer({ trip }) : undefined}
          onDelete={can("trips", "delete") ? setToDelete : undefined}
        />
        <Pagination meta={list?.meta} onChange={setPage} />
      </div>

      {drawer && (
        <TripDrawer
          key={drawer.trip?.id ?? "new"}
          trip={drawer.trip}
          defaults={drawer.defaults}
          onClose={() => setDrawer(null)}
        />
      )}

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