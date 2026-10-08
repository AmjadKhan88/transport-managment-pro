import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dieselService } from "@/services/dieselService";
import { vehicleService } from "@/services/vehicleService";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatDate, formatNumber, formatPKR } from "@/utils/format";
import Select from "@/components/ui/Select";
import { cardClass, thClass, tdClass } from "@/components/ui/styles";

const GROUPS = [
  { value: "day", label: "Daily" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
  { value: "vehicle", label: "Vehicle-wise" },
];

const periodLabel = (groupBy, key) => {
  if (groupBy === "day") return formatDate(key);
  if (groupBy === "month")
    return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return key;
};

export default function DieselReports() {
  const [groupBy, setGroupBy] = useState("month");
  const [period, setPeriod] = useState("this-year");
  const [vehicle, setVehicle] = useState("");

  const range = getDateRange(period);
  const params = { groupBy, vehicle: vehicle || undefined, from: range.from, to: range.to };

  const { data, isLoading, error } = useQuery({
    queryKey: ["diesel", "report", params],
    queryFn: () => dieselService.report(params),
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles", "options"], queryFn: vehicleService.options });

  const rows = data?.data ?? [];
  const totals = data?.totals;
  const isVehicle = groupBy === "vehicle";
  const columns = isVehicle ? 7 : 5;

  return (
    <div className={cardClass}>
      <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 sm:grid-cols-3 dark:border-gray-800">
        <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
          {GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </Select>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
        <Select value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
          <option value="">All vehicles</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>Truck #{v.vehicleNumber}</option>)}
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <th className={thClass}>{isVehicle ? "Vehicle" : "Period"}</th>
              <th className={`${thClass} text-right`}>Entries</th>
              <th className={`${thClass} text-right`}>Liters</th>
              <th className={`${thClass} text-right`}>Total cost</th>
              <th className={`${thClass} text-right`}>Avg rate / L</th>
              {isVehicle && <th className={`${thClass} text-right`}>Trips</th>}
              {isVehicle && <th className={`${thClass} text-right`}>Cost per trip</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={columns} className="px-5 py-12 text-center text-sm text-gray-500">Loading report…</td></tr>}
            {error && <tr><td colSpan={columns} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
            {!isLoading && !error && rows.length === 0 && (
              <tr><td colSpan={columns} className="px-5 py-12 text-center text-sm text-gray-500">No fuel entries for this selection.</td></tr>
            )}

            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>
                  {isVehicle ? (r.vehicle ? `Truck #${r.vehicle.vehicleNumber}` : "Deleted vehicle") : periodLabel(groupBy, r.key)}
                </td>
                <td className={`${tdClass} text-right`}>{r.entries}</td>
                <td className={`${tdClass} text-right`}>{formatNumber(r.liters)} L</td>
                <td className={`${tdClass} text-right`}>{formatPKR(r.amount)}</td>
                <td className={`${tdClass} text-right`}>{formatPKR(Math.round(r.avgRate * 100) / 100)}</td>
                {isVehicle && <td className={`${tdClass} text-right`}>{r.trips}</td>}
                {isVehicle && (
                  <td className={`${tdClass} text-right`}>{r.costPerTrip === null ? "—" : formatPKR(Math.round(r.costPerTrip))}</td>
                )}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && totals && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <td className={`${tdClass} font-semibold text-gray-900 dark:text-gray-100`}>Total</td>
                <td className={`${tdClass} text-right font-semibold`}>{totals.entries}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatNumber(totals.liters)} L</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(totals.amount)}</td>
                <td className={`${tdClass} text-right font-semibold`}>
                  {totals.liters ? formatPKR(Math.round((totals.amount / totals.liters) * 100) / 100) : "—"}
                </td>
                {isVehicle && <td />}
                {isVehicle && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}