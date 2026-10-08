import { Link } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { TRIP_STATUSES } from "@/config/trip";
import { formatDate, formatPKR, formatSigned } from "@/utils/format";
import { thClass, tdClass, iconBtn } from "@/components/ui/styles";

export default function TripsTable({ trips, loading, error, hideVehicle = false, onEdit, onDelete }) {
  const hasActions = Boolean(onEdit || onDelete);
  const columns = 8 + (hideVehicle ? 0 : 1) + (hasActions ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px]">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <th className={thClass}>Date</th>
            {!hideVehicle && <th className={thClass}>Vehicle</th>}
            <th className={thClass}>Driver</th>
            <th className={thClass}>Customer</th>
            <th className={thClass}>Route</th>
            <th className={`${thClass} text-right`}>Freight</th>
            <th className={`${thClass} text-right`}>Expenses</th>
            <th className={`${thClass} text-right`}>Net profit</th>
            <th className={thClass}>Status</th>
            {hasActions && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {loading && (
            <tr><td colSpan={columns} className="px-5 py-12 text-center text-sm text-gray-500">Loading trips…</td></tr>
          )}
          {error && (
            <tr><td colSpan={columns} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>
          )}
          {!loading && !error && trips.length === 0 && (
            <tr><td colSpan={columns} className="px-5 py-12 text-center text-sm text-gray-500">No trips found.</td></tr>
          )}

          {trips.map((t) => {
            const status = TRIP_STATUSES[t.status] || TRIP_STATUSES.completed;
            return (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className={`${tdClass} whitespace-nowrap`}>{formatDate(t.tripDate)}</td>
                {!hideVehicle && (
                  <td className={tdClass}>
                    {t.vehicle ? (
                      <Link to={`/vehicles/${t.vehicle.id}`} className="font-medium text-green-800 hover:underline dark:text-green-400">
                        Truck #{t.vehicle.vehicleNumber}
                      </Link>
                    ) : "—"}
                  </td>
                )}
                <td className={tdClass}>{t.driver?.name || "—"}</td>
                <td className={tdClass}>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{t.customer?.name || "—"}</p>
                  {t.biltyNumber && <p className="text-[13px] text-gray-500">Bilty {t.biltyNumber}</p>}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>{t.from} → {t.to}</td>
                <td className={`${tdClass} text-right`}>{formatPKR(t.freightAmount)}</td>
                <td className={`${tdClass} text-right`}>{formatPKR(t.totalExpense)}</td>
                <td className={`${tdClass} whitespace-nowrap text-right font-semibold ${t.netProfit < 0 ? "text-red-700 dark:text-red-400" : "text-green-800 dark:text-green-400"}`}>
                  {formatSigned(t.netProfit)}
                </td>
                <td className={tdClass}><StatusBadge label={status.label} tone={status.tone} /></td>
                {hasActions && (
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      {onEdit && (
                        <button title="Edit" aria-label="Edit trip" onClick={() => onEdit(t)} className={iconBtn}>
                          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                            <path d="M13.5 6.5l4 4" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button title="Delete" aria-label="Delete trip" onClick={() => onDelete(t)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
                          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}