import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reportsService";
import { vehicleService } from "@/services/vehicleService";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatDate } from "@/utils/format";
import { TRIP_STATUSES } from "@/config/trip";
import Select from "@/components/ui/Select";
import ReportSection from "./ReportSection";
import ReportTable from "./ReportTable";

const sumOf = (rows, keys) => Object.fromEntries(keys.map((k) => [k, rows.reduce((s, r) => s + (r[k] || 0), 0)]));

const VEHICLE_COLUMNS = [
  { key: "vehicle", header: "Vehicle", type: "text", value: (r) => `Truck #${r.vehicleNumber}` },
  { key: "investment", header: "Investment", type: "money" },
  { key: "trips", header: "Trips", type: "number" },
  { key: "revenue", header: "Revenue", type: "money" },
  { key: "diesel", header: "Diesel (trips)", type: "money" },
  { key: "driverExpense", header: "Driver expense", type: "money" },
  { key: "toll", header: "Toll tax", type: "money" },
  { key: "other", header: "Other", type: "money" },
  { key: "repairs", header: "Repairs", type: "money" },
  { key: "expenses", header: "Total expenses", type: "money" },
  { key: "net", header: "Profit / loss", type: "signed" },
  { key: "fuelLiters", header: "Fuel bought (L)", type: "number" },
  { key: "fuelAmount", header: "Fuel bought (Rs)", type: "money" },
];
const VEHICLE_SUMS = ["investment", "trips", "revenue", "diesel", "driverExpense", "toll", "other", "repairs", "expenses", "net", "fuelLiters", "fuelAmount"];

const TRIP_COLUMNS = [
  { key: "date", header: "Date", type: "text", value: (r) => formatDate(r.date) },
  { key: "driver", header: "Driver", type: "text" },
  { key: "customer", header: "Customer", type: "text" },
  { key: "route", header: "Route", type: "text" },
  { key: "bilty", header: "Bilty", type: "text" },
  { key: "freight", header: "Freight", type: "money" },
  { key: "advance", header: "Advance", type: "money" },
  { key: "diesel", header: "Diesel", type: "money" },
  { key: "toll", header: "Toll", type: "money" },
  { key: "driverExpense", header: "Driver exp.", type: "money" },
  { key: "other", header: "Other", type: "money" },
  { key: "expense", header: "Total expense", type: "money" },
  { key: "net", header: "Net profit", type: "signed" },
  { key: "status", header: "Status", type: "text", value: (r) => TRIP_STATUSES[r.status]?.label ?? r.status },
];
const TRIP_SUMS = ["freight", "advance", "diesel", "toll", "driverExpense", "other", "expense", "net"];

export default function VehicleReports() {
  const [period, setPeriod] = useState("this-year");
  const [vehicleId, setVehicleId] = useState("");

  const range = getDateRange(period);
  const params = { from: range.from, to: range.to };
  const periodLabel = PERIOD_CHOICES.find((p) => p.value === period)?.label;

  const vehiclesQ = useQuery({
    queryKey: ["reports", "vehicles", params],
    queryFn: () => reportsService.vehicles(params),
  });
  const { data: options = [] } = useQuery({ queryKey: ["vehicles", "options"], queryFn: vehicleService.options });
  const tripsQ = useQuery({
    queryKey: ["reports", "trips", vehicleId, params],
    queryFn: () => reportsService.trips({ vehicle: vehicleId, ...params }),
    enabled: Boolean(vehicleId),
  });

  const vehicles = vehiclesQ.data ?? [];
  const vehicleTotals = sumOf(vehicles, VEHICLE_SUMS);
  const trips = (tripsQ.data ?? []).filter((t) => t.status !== "cancelled" || true);
  const live = trips.filter((t) => t.status !== "cancelled"); // totals skip cancelled trips
  const tripTotals = sumOf(live, TRIP_SUMS);
  const selected = options.find((v) => v.id === vehicleId);

  return (
    <>
      <div className="max-w-xs">
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </div>

      <ReportSection
        title="Vehicle-wise report"
        description={`${periodLabel}. Profit = revenue − (trip diesel + driver expense + toll + other + repairs). Fuel bought is for reference.`}
        disabled={!vehicles.length}
        exportConfig={{
          title: "Vehicle-wise report",
          subtitle: periodLabel,
          columns: VEHICLE_COLUMNS,
          rows: vehicles,
          totals: vehicleTotals,
          filename: "vehicle-report",
          landscape: true,
          sheetName: "Vehicles",
        }}
      >
        <ReportTable columns={VEHICLE_COLUMNS} rows={vehicles} totals={vehicleTotals} loading={vehiclesQ.isLoading} error={vehiclesQ.error} minWidth={1300} />
      </ReportSection>

      <div className="max-w-sm">
        <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="">Choose a vehicle for its trip history…</option>
          {options.map((v) => <option key={v.id} value={v.id}>Truck #{v.vehicleNumber} {[v.make, v.model].filter(Boolean).join(" ")}</option>)}
        </Select>
      </div>

      {vehicleId && (
        <ReportSection
          title={`Trip history — Truck #${selected?.vehicleNumber ?? ""}`}
          description={`${periodLabel}. Totals skip cancelled trips.`}
          disabled={!trips.length}
          exportConfig={{
            title: `Trip history - Truck #${selected?.vehicleNumber ?? ""}`,
            subtitle: periodLabel,
            columns: TRIP_COLUMNS,
            rows: trips,
            totals: tripTotals,
            filename: `trip-history-truck-${selected?.vehicleNumber ?? "vehicle"}`,
            landscape: true,
            sheetName: "Trip history",
          }}
        >
          <ReportTable columns={TRIP_COLUMNS} rows={trips} totals={tripTotals} loading={tripsQ.isLoading} error={tripsQ.error} emptyText="No trips for this vehicle in this period." minWidth={1300} />
        </ReportSection>
      )}
    </>
  );
}