import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { salaryService } from "@/services/salaryService";
import { SALARY_STATUSES } from "@/config/salary";
import { monthLabel } from "@/utils/period";
import { formatPKR } from "@/utils/format";
import StatusBadge from "@/components/ui/StatusBadge";
import { cardClass, thClass, tdClass } from "@/components/ui/styles";

export default function DriverSalaryHistory({ driverId }) {
  const { can } = useAuth();
  const allowed = can("employees", "view");

  const params = { driver: driverId, limit: 12 };
  const { data, isLoading } = useQuery({
    queryKey: ["salaries", "list", params],
    queryFn: () => salaryService.list(params),
    enabled: allowed,
  });

  if (!allowed) return null;

  const t = data?.totals;
  const records = data?.data ?? [];

  return (
    <div className={cardClass}>
      <div className="grid grid-cols-1 gap-4 border-b border-gray-200 p-5 sm:grid-cols-3 dark:border-gray-800">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Remaining salary</p>
          <p className={`mt-1 text-xl font-semibold ${t?.remaining > 0 ? "text-amber-700 dark:text-amber-400" : "text-gray-900 dark:text-gray-50"}`}>
            {formatPKR(t?.remaining)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total paid</p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(t?.paid)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Advances adjusted</p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(t?.advance)}</p>
        </div>
      </div>

      <div className="px-5 pt-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Salary history</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className={thClass}>Month</th>
              <th className={`${thClass} text-right`}>Net salary</th>
              <th className={`${thClass} text-right`}>Paid</th>
              <th className={`${thClass} text-right`}>Remaining</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">Loading…</td></tr>}
            {!isLoading && records.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">No salary records yet.</td></tr>
            )}
            {records.map((r) => {
              const status = SALARY_STATUSES[r.paymentStatus] || SALARY_STATUSES.unpaid;
              return (
                <tr key={r.id}>
                  <td className={tdClass}>{monthLabel(r.month)}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(r.netSalary)}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(r.paidAmount)}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(r.netSalary - r.paidAmount)}</td>
                  <td className={tdClass}><StatusBadge label={status.label} tone={status.tone} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}