import { useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { VEHICLE_STATUSES } from "@/config/vehicle";
import { formatPKR, formatSigned } from "@/utils/format";
import { cardClass, thClass, tdClass } from "@/components/ui/styles";

const TONE = { active: "green", in_repair: "amber", available: "sky", sold: "gray", inactive: "gray" };
const LIMIT = 8;

export default function VehiclePerformance({ vehicles }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? vehicles : vehicles.slice(0, LIMIT);

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Vehicle-wise profit &amp; loss</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trip income minus trip expenses and repairs, before salaries and overheads. Best vehicle first.
          </p>
        </div>
        <Link to="/vehicles" className="text-sm font-medium text-green-800 hover:underline dark:text-green-400">
          All vehicles →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <th className={thClass}>Vehicle</th>
              <th className={thClass}>Driver</th>
              <th className={`${thClass} text-right`}>Trips</th>
              <th className={`${thClass} text-right`}>Revenue</th>
              <th className={`${thClass} text-right`}>Expenses</th>
              <th className={`${thClass} text-right`}>Profit / loss</th>
              <th className={`${thClass} text-right`}>Investment</th>
              <th className={`${thClass} text-right`}>Recovered</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-500">No vehicles yet.</td></tr>
            )}
            {rows.map((v) => {
              const status = VEHICLE_STATUSES[v.status];
              return (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className={tdClass}>
                    <Link to={`/vehicles/${v.id}`} className="font-medium text-green-800 hover:underline dark:text-green-400">
                      Truck #{v.vehicleNumber}
                    </Link>
                    <p className="text-[13px] text-gray-500">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</p>
                  </td>
                  <td className={tdClass}>{v.driver || "—"}</td>
                  <td className={`${tdClass} text-right`}>{v.trips}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(v.revenue)}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(v.expenses)}</td>
                  <td className={`${tdClass} whitespace-nowrap text-right font-semibold ${v.net < 0 ? "text-red-700 dark:text-red-400" : "text-green-800 dark:text-green-400"}`}>
                    {formatSigned(v.net)}
                  </td>
                  <td className={`${tdClass} text-right`}>{formatPKR(v.investment)}</td>
                  <td className={`${tdClass} text-right`}>
                    {v.recovery === null ? (
                      "—"
                    ) : v.recovery >= 100 ? (
                      <span className="font-medium text-green-800 dark:text-green-400">Recovered</span>
                    ) : (
                      <span className={v.recovery < 0 ? "text-red-700 dark:text-red-400" : ""}>{v.recovery.toFixed(0)}%</span>
                    )}
                  </td>
                  <td className={tdClass}>
                    <StatusBadge label={status?.label ?? v.status} tone={TONE[v.status] ?? "gray"} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {vehicles.length > LIMIT && (
        <div className="border-t border-gray-200 px-5 py-3 dark:border-gray-800">
          <button
            className="text-sm font-medium text-green-800 hover:underline dark:text-green-400"
            onClick={() => setShowAll((s) => !s)}
          >
            {showAll ? "Show fewer" : `Show all ${vehicles.length} vehicles`}
          </button>
        </div>
      )}
    </div>
  );
}