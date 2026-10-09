import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { salaryService } from "@/services/salaryService";
import { SALARY_STATUSES, departmentLabel } from "@/config/salary";
import { currentMonth, monthLabel } from "@/utils/period";
import { formatCompact, formatPKR } from "@/utils/format";
import StatStrip from "@/components/ui/StatStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, inputClass, primaryBtn, secondaryBtn, smallBtn, thClass, tdClass, iconBtn } from "@/components/ui/styles";
import SalaryDrawer from "./SalaryDrawer";
import GenerateDialog from "./GenerateDialog";

export default function SalaryRecords({ payee, onClearPayee }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState(() => ({
    payeeType: "", month: payee ? "" : currentMonth(), status: "", sort: "newest", page: 1,
  }));
  const [drawer, setDrawer] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const params = {
    page: filters.page,
    limit: 10,
    sort: filters.sort,
    payeeType: payee ? undefined : filters.payeeType || undefined,
    driver: payee?.type === "driver" ? payee.id : undefined,
    employee: payee?.type === "employee" ? payee.id : undefined,
    month: filters.month || undefined,
    paymentStatus: filters.status || undefined,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["salaries", "list", params],
    queryFn: () => salaryService.list(params),
    placeholderData: keepPreviousData,
  });

  const payMutation = useMutation({
    mutationFn: (r) => salaryService.update(r.id, { paidAmount: r.netSalary }),
    onSuccess: () => {
      toast.success("Marked as paid");
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => salaryService.remove(id),
    onSuccess: () => {
      toast.success("Salary record deleted");
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const t = list?.totals;
  const records = list?.data ?? [];
  const stats = [
    { label: "Records", value: t ? t.count : "—", sub: filters.month ? monthLabel(filters.month) : "All months" },
    { label: "Net salary", value: t ? `Rs ${formatCompact(t.net)}` : "—", sub: "After advance and deduction" },
    { label: "Paid", value: t ? `Rs ${formatCompact(t.paid)}` : "—", sub: "Already paid out" },
    { label: "Remaining", value: t ? `Rs ${formatCompact(t.remaining)}` : "—", sub: "Still to pay" },
    { label: "Advances adjusted", value: t ? `Rs ${formatCompact(t.advance)}` : "—", sub: "Deducted from salaries" },
  ];

  return (
    <>
      {payee && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-[15px] text-gray-700 dark:text-gray-300">
            Salary history of <span className="font-semibold text-gray-900 dark:text-gray-100">{payee.name}</span>
          </p>
          <button className={smallBtn} onClick={onClearPayee}>Show everyone</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {can("employees", "add") && (
          <>
            <button className={primaryBtn} onClick={() => setDrawer({})}>+ Add salary record</button>
            <button className={secondaryBtn} onClick={() => setGenerating(true)}>Generate monthly salaries</button>
          </>
        )}
      </div>

      <StatStrip items={stats} />

      <div className={cardClass}>
        <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-gray-800">
          <input
            type="month"
            value={filters.month}
            onChange={(e) => setFilter("month", e.target.value)}
            aria-label="Month"
            className={inputClass}
          />
          {!payee && (
            <Select value={filters.payeeType} onChange={(e) => setFilter("payeeType", e.target.value)}>
              <option value="">Drivers and staff</option>
              <option value="driver">Drivers</option>
              <option value="employee">Staff</option>
            </Select>
          )}
          <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">All payment statuses</option>
            <option value="due">Not fully paid</option>
            {Object.entries(SALARY_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </Select>
          <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
            <option value="newest">Newest month first</option>
            <option value="oldest">Oldest month first</option>
            <option value="amount">Highest net salary</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Month</th>
                <th className={thClass}>Name</th>
                <th className={`${thClass} text-right`}>Basic</th>
                <th className={`${thClass} text-right`}>Additions</th>
                <th className={`${thClass} text-right`}>Advance + deduction</th>
                <th className={`${thClass} text-right`}>Net salary</th>
                <th className={`${thClass} text-right`}>Paid</th>
                <th className={`${thClass} text-right`}>Remaining</th>
                <th className={thClass}>Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-gray-500">Loading salary records…</td></tr>}
              {error && <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && records.length === 0 && (
                <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-gray-500">No salary records found.</td></tr>
              )}

              {records.map((r) => {
                const status = SALARY_STATUSES[r.paymentStatus] || SALARY_STATUSES.unpaid;
                const remaining = r.netSalary - r.paidAmount;
                const isDriver = r.payeeType === "driver";
                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={`${tdClass} whitespace-nowrap`}>{monthLabel(r.month)}</td>
                    <td className={tdClass}>
                      {isDriver && r.driver ? (
                        <Link to={`/drivers/${r.driver.id}`} className="font-medium text-green-800 hover:underline dark:text-green-400">
                          {r.driver.name}
                        </Link>
                      ) : (
                        <p className="font-medium text-gray-900 dark:text-gray-100">{r.employee?.name ?? "—"}</p>
                      )}
                      <p className="text-[13px] text-gray-500">
                        {isDriver ? "Driver" : [r.employee?.designation, departmentLabel(r.employee?.department)].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className={`${tdClass} text-right`}>{formatPKR(r.basicSalary)}</td>
                    <td className={`${tdClass} text-right`}>{formatPKR(r.tripAllowance + r.bonus + r.otherPayment)}</td>
                    <td className={`${tdClass} text-right`}>{formatPKR(r.advance + r.deduction)}</td>
                    <td className={`${tdClass} text-right font-semibold text-gray-900 dark:text-gray-100`}>{formatPKR(r.netSalary)}</td>
                    <td className={`${tdClass} text-right`}>{formatPKR(r.paidAmount)}</td>
                    <td className={`${tdClass} text-right ${remaining > 0 ? "font-semibold text-amber-700 dark:text-amber-400" : ""}`}>
                      {formatPKR(remaining)}
                    </td>
                    <td className={tdClass}><StatusBadge label={status.label} tone={status.tone} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {can("employees", "edit") && remaining > 0 && (
                          <button className={smallBtn} disabled={payMutation.isPending} onClick={() => payMutation.mutate(r)}>
                            Mark paid
                          </button>
                        )}
                        {can("employees", "edit") && (
                          <button title="Edit" aria-label="Edit salary record" onClick={() => setDrawer({ record: r })} className={iconBtn}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                              <path d="M13.5 6.5l4 4" />
                            </svg>
                          </button>
                        )}
                        {can("employees", "delete") && (
                          <button title="Delete" aria-label="Delete salary record" onClick={() => setToDelete(r)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
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

      {drawer && <SalaryDrawer key={drawer.record?.id ?? "new"} record={drawer.record} onClose={() => setDrawer(null)} />}
      {generating && <GenerateDialog onClose={() => setGenerating(false)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete salary record"
          message={`The ${monthLabel(toDelete.month)} salary record of ${toDelete.driver?.name ?? toDelete.employee?.name ?? "this person"} will be removed.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}