import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { systemService } from "@/services/adminServices";
import { formatDateTime } from "@/utils/format";
import StatusBadge from "@/components/ui/StatusBadge";
import { cardClass } from "@/components/ui/styles";

export default function SystemTab() {
  const { data, isLoading, error } = useQuery({ queryKey: ["system", "status"], queryFn: systemService.status });

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-700 dark:text-red-400">{error.message}</p>;

  return (
    <>
      <div className={cardClass}>
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Security checklist</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Anything marked "Check" needs your attention before you go live.</p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {data.checks.map((c) => (
            <div key={c.key} className="flex items-start justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{c.label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{c.detail}</p>
              </div>
              <StatusBadge label={c.ok ? "OK" : "Check"} tone={c.ok ? "green" : "amber"} />
            </div>
          ))}
        </div>
      </div>

      <div className={`${cardClass} grid grid-cols-2 gap-4 p-5 sm:grid-cols-4`}>
        {[
          ["Environment", data.environment],
          ["Database", data.database],
          ["Server running", `${data.uptimeHours} h`],
          ["Last automatic backup", data.backup.lastAutoAt ? formatDateTime(data.backup.lastAutoAt) : "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-0.5 text-[15px] font-semibold text-gray-900 dark:text-gray-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm font-medium">
        <Link to="/backup" className="text-green-800 hover:underline dark:text-green-400">Backups and activity log →</Link>
        <Link to="/users" className="text-green-800 hover:underline dark:text-green-400">Users and permissions →</Link>
      </div>
    </>
  );
}