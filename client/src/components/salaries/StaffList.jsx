import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { employeeService } from "@/services/employeeService";
import { DEPARTMENTS, EMPLOYEE_STATUSES, departmentLabel } from "@/config/salary";
import { formatCompact, formatDate, formatPKR } from "@/utils/format";
import StatStrip from "@/components/ui/StatStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, inputClass, primaryBtn, smallBtn, thClass, tdClass, iconBtn } from "@/components/ui/styles";
import EmployeeDrawer from "./EmployeeDrawer";

export default function StaffList({ onViewHistory }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: "", status: "", department: "", sort: "newest", page: 1 });
  const [drawer, setDrawer] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const debouncedSearch = useDebounce(filters.search);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const params = {
    page: filters.page,
    limit: 10,
    sort: filters.sort,
    search: debouncedSearch || undefined,
    status: filters.status || undefined,
    department: filters.department || undefined,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["employees", "list", params],
    queryFn: () => employeeService.list(params),
    placeholderData: keepPreviousData,
  });
  const { data: summary } = useQuery({
    queryKey: ["employees", "summary"],
    queryFn: employeeService.summary,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => employeeService.remove(id),
    onSuccess: () => {
      toast.success("Staff member deleted");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["salaries", "payees"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const staff = list?.data ?? [];
  const stats = [
    { label: "Total staff", value: summary?.total ?? "—", sub: "Excluding deleted" },
    { label: "Active", value: summary?.byStatus.active ?? "—", sub: "Currently working" },
    { label: "Monthly payroll", value: summary ? `Rs ${formatCompact(summary.monthlyPayroll)}` : "—", sub: "Basic salary, active staff" },
  ];

  return (
    <>
      {can("employees", "add") && (
        <div>
          <button className={primaryBtn} onClick={() => setDrawer({})}>+ Add staff member</button>
        </div>
      )}

      <StatStrip items={stats} />

      <div className={cardClass}>
        <div className="space-y-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Search name, designation, phone…"
            className={inputClass}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select value={filters.department} onChange={(e) => setFilter("department", e.target.value)}>
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
            <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(EMPLOYEE_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
            <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="name">Name (A–Z)</option>
              <option value="salary">Highest salary</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Name</th>
                <th className={thClass}>Designation</th>
                <th className={thClass}>Department</th>
                <th className={thClass}>Joined</th>
                <th className={`${thClass} text-right`}>Salary</th>
                <th className={thClass}>Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">Loading staff…</td></tr>}
              {error && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && staff.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">No staff found.</td></tr>
              )}

              {staff.map((e) => {
                const status = EMPLOYEE_STATUSES[e.status] || EMPLOYEE_STATUSES.inactive;
                return (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <Avatar name={e.name} variant="soft" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{e.name}</p>
                          <p className="text-[13px] text-gray-500">{e.phone || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdClass}>{e.designation || "—"}</td>
                    <td className={tdClass}>{departmentLabel(e.department)}</td>
                    <td className={tdClass}>{formatDate(e.joiningDate)}</td>
                    <td className={`${tdClass} text-right font-medium text-gray-900 dark:text-gray-100`}>{formatPKR(e.salary)}</td>
                    <td className={tdClass}><StatusBadge label={status.label} tone={status.tone} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button className={smallBtn} onClick={() => onViewHistory(e)}>Salary history</button>
                        {can("employees", "edit") && (
                          <button title="Edit" aria-label="Edit staff member" onClick={() => setDrawer({ employee: e })} className={iconBtn}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                              <path d="M13.5 6.5l4 4" />
                            </svg>
                          </button>
                        )}
                        {can("employees", "delete") && (
                          <button title="Delete" aria-label="Delete staff member" onClick={() => setToDelete(e)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
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

      {drawer && <EmployeeDrawer key={drawer.employee?.id ?? "new"} employee={drawer.employee} onClose={() => setDrawer(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete staff member"
          message={`${toDelete.name} will be removed from your lists. Their salary history stays in the records.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}