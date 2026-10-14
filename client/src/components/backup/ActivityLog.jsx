import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { auditService } from "@/services/adminServices";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatDateTime } from "@/utils/format";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";
import { cardClass, inputClass, thClass, tdClass } from "@/components/ui/styles";

const ACTIONS = {
  create: { label: "Created", tone: "green" },
  update: { label: "Changed", tone: "sky" },
  delete: { label: "Deleted", tone: "red" },
  login: { label: "Logged in", tone: "gray" },
  login_failed: { label: "Failed login", tone: "red" },
  logout: { label: "Logged out", tone: "gray" },
  password_change: { label: "Password changed", tone: "amber" },
  backup: { label: "Backup", tone: "amber" },
  restore: { label: "Restore", tone: "red" },
  forbidden: { label: "Blocked", tone: "amber" },
};

const RESOURCES = [
  "vehicles", "drivers", "customers", "trips", "diesel", "repairs", "salaries", "employees", "shop", "office",
  "income", "expenses", "investments", "receivables", "payables", "documents", "users", "backups", "auth",
];

export default function ActivityLog() {
  const [filters, setFilters] = useState({ search: "", action: "", resource: "", period: "this-month", page: 1 });
  const debounced = useDebounce(filters.search);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const range = getDateRange(filters.period);
  const params = {
    page: filters.page, limit: 15,
    search: debounced || undefined,
    action: filters.action || undefined,
    resource: filters.resource || undefined,
    from: range.from, to: range.to,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["audit", params],
    queryFn: () => auditService.list(params),
    placeholderData: keepPreviousData,
  });
  const rows = list?.data ?? [];

  return (
    <div className={cardClass}>
      <div className="space-y-3 border-b border-gray-200 p-4 dark:border-gray-800">
        <input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Search a person, email, IP or record id…" className={inputClass} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={filters.period} onChange={(e) => setFilter("period", e.target.value)}>
            {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <Select value={filters.action} onChange={(e) => setFilter("action", e.target.value)}>
            <option value="">All actions</option>
            {Object.entries(ACTIONS).map(([v, a]) => <option key={v} value={v}>{a.label}</option>)}
          </Select>
          <Select value={filters.resource} onChange={(e) => setFilter("resource", e.target.value)}>
            <option value="">All areas</option>
            {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <th className={thClass}>When</th>
              <th className={thClass}>Who</th>
              <th className={thClass}>Action</th>
              <th className={thClass}>What</th>
              <th className={thClass}>IP address</th>
              <th className={thClass}>Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {isLoading && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">Loading activity…</td></tr>}
            {error && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
            {!isLoading && !error && rows.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">No activity found.</td></tr>
            )}

            {rows.map((r) => {
              const action = ACTIONS[r.action] ?? { label: r.action, tone: "gray" };
              return (
                <tr key={r.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(r.createdAt)}</td>
                  <td className={tdClass}>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{r.userName || r.userEmail || "Unknown"}</p>
                    {r.userName && r.userEmail && <p className="text-[13px] text-gray-500">{r.userEmail}</p>}
                  </td>
                  <td className={tdClass}><StatusBadge label={action.label} tone={action.tone} /></td>
                  <td className={tdClass}>
                    <p>{r.resource}{r.resourceId ? ` · …${r.resourceId.slice(-6)}` : ""}</p>
                    <p className="text-[13px] text-gray-500">{r.method} {r.path} · {r.status}</p>
                  </td>
                  <td className={tdClass}>{r.ip || "—"}</td>
                  <td className={tdClass}>
                    {r.details ? (
                      <details>
                        <summary className="cursor-pointer text-green-800 hover:underline dark:text-green-400">View</summary>
                        <pre className="mt-2 max-h-48 max-w-xs overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {JSON.stringify(r.details, null, 2)}
                        </pre>
                      </details>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination meta={list?.meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </div>
  );
}