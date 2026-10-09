import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn, smallBtn } from "@/components/ui/styles";
import { SALARY_METHODS } from "@/config/salary";
import { salaryService } from "@/services/salaryService";
import { currentMonth, monthLabel } from "@/utils/period";
import { formatPKR } from "@/utils/format";

const num = (v) => Number(v) || 0;
const numStr = (n) => (n ? String(n) : "");

const initialForm = (r) => ({
  payeeType: r?.payeeType ?? "driver",
  driver: r?.driver?.id ?? "",
  employee: r?.employee?.id ?? "",
  month: r?.month ?? currentMonth(),
  basicSalary: numStr(r?.basicSalary),
  tripAllowance: numStr(r?.tripAllowance),
  bonus: numStr(r?.bonus),
  otherPayment: numStr(r?.otherPayment),
  advance: numStr(r?.advance),
  deduction: numStr(r?.deduction),
  paidAmount: numStr(r?.paidAmount),
  paymentDate: r?.paymentDate ? r.paymentDate.slice(0, 10) : "",
  paymentMethod: r?.paymentMethod ?? "cash",
  notes: r?.notes ?? "",
});

function SummaryRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between text-[15px]">
      <span className={strong ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}>{label}</span>
      <span className={strong ? "text-lg font-semibold text-gray-900 dark:text-gray-100" : "font-medium text-gray-900 dark:text-gray-100"}>{value}</span>
    </div>
  );
}

export default function SalaryDrawer({ record, onClose }) {
  const isEdit = Boolean(record);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(record));

  const { data: payees = { drivers: [], employees: [] } } = useQuery({
    queryKey: ["salaries", "payees"],
    queryFn: salaryService.payees,
    enabled: !isEdit,
  });

  const isDriver = form.payeeType === "driver";
  const payeeKey = isDriver ? "driver" : "employee";
  const payeeList = isDriver ? payees.drivers : payees.employees;
  const selectedId = form[payeeKey];
  const payeeName = isEdit ? (record.driver?.name ?? record.employee?.name ?? "—") : "";

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onTypeChange = (e) =>
    setForm((f) => ({ ...f, payeeType: e.target.value, driver: "", employee: "", basicSalary: "" }));

  // Picking a person fills in his basic salary
  const onPayeeChange = (e) => {
    const id = e.target.value;
    const person = payeeList.find((p) => p.id === id);
    setForm((f) => ({ ...f, [payeeKey]: id, basicSalary: person?.salary ? String(person.salary) : f.basicSalary }));
  };

  // Live calculations (the server recalculates the same way)
  const additions = num(form.tripAllowance) + num(form.bonus) + num(form.otherPayment);
  const earnings = num(form.basicSalary) + additions;
  const net = earnings - num(form.advance) - num(form.deduction);
  const paid = num(form.paidAmount);
  const remaining = net - paid;
  const negativeNet = net < 0;
  const overPaid = !negativeNet && paid > net;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        payeeType: form.payeeType,
        driver: form.driver,
        employee: form.employee,
        month: form.month,
        basicSalary: num(form.basicSalary),
        tripAllowance: num(form.tripAllowance),
        bonus: num(form.bonus),
        otherPayment: num(form.otherPayment),
        advance: num(form.advance),
        deduction: num(form.deduction),
        paidAmount: paid,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      };
      return isEdit ? salaryService.update(record.id, payload) : salaryService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Salary record updated" : "Salary record added");
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  const blocked = negativeNet || overPaid || (!isEdit && !selectedId);

  return (
    <Drawer title={isEdit ? "Edit salary record" : "Add salary record"} subtitle="Monthly salary and payment" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <Section title="Who and when">
            {isEdit ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50 sm:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Salary for</p>
                <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                  {payeeName} — {monthLabel(record.month)}
                </p>
              </div>
            ) : (
              <>
                <Field label="Paid to" required>
                  <Select value={form.payeeType} onChange={onTypeChange}>
                    <option value="driver">Driver</option>
                    <option value="employee">Staff</option>
                  </Select>
                </Field>
                <Field label="Month" required>
                  <input name="month" type="month" required value={form.month} onChange={onChange} className={inputClass} />
                </Field>
                <Field label={isDriver ? "Driver" : "Staff member"} required full>
                  <Select required value={selectedId} onChange={onPayeeChange}>
                    <option value="">{isDriver ? "Select driver" : "Select staff member"}</option>
                    {payeeList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.designation ? ` — ${p.designation}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
          </Section>

          <Section title="Salary">
            <Field label="Basic salary (Rs)">
              <input name="basicSalary" type="number" min="0" step="any" value={form.basicSalary} onChange={onChange} className={inputClass} />
            </Field>
            <Field
              label="Trip allowance (Rs)"
              hint={isDriver ? "Don't repeat amounts already entered as driver trip expense on trips." : undefined}
            >
              <input name="tripAllowance" type="number" min="0" step="any" value={form.tripAllowance} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Bonus (Rs)">
              <input name="bonus" type="number" min="0" step="any" value={form.bonus} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Other payment (Rs)">
              <input name="otherPayment" type="number" min="0" step="any" value={form.otherPayment} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Advance to deduct (Rs)" hint="Advance already given, adjusted from this month.">
              <input name="advance" type="number" min="0" step="any" value={form.advance} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Deduction (Rs)">
              <input name="deduction" type="number" min="0" step="any" value={form.deduction} onChange={onChange} className={inputClass} />
            </Field>

            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50 sm:col-span-2">
              <SummaryRow label="Total earnings" value={formatPKR(earnings)} />
              <SummaryRow label="Advance and deduction" value={`− ${formatPKR(num(form.advance) + num(form.deduction))}`} />
              <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                <SummaryRow label="Net salary" value={formatPKR(net)} strong />
              </div>
              {negativeNet && (
                <p className="text-[13px] text-red-700 dark:text-red-400">Advance and deduction cannot be more than the earnings.</p>
              )}
            </div>
          </Section>

          <Section title="Payment">
            <Field label="Amount paid (Rs)">
              <div className="flex gap-2">
                <input name="paidAmount" type="number" min="0" step="any" value={form.paidAmount} onChange={onChange} className={inputClass} />
                <button
                  type="button"
                  className={`${smallBtn} h-11 shrink-0`}
                  onClick={() => setForm((f) => ({ ...f, paidAmount: net > 0 ? String(net) : "" }))}
                >
                  Full
                </button>
              </div>
              {overPaid && (
                <p className="mt-1 text-[13px] text-red-700 dark:text-red-400">Paid amount cannot be more than the net salary.</p>
              )}
            </Field>
            <Field label="Payment date" hint="Leave empty to use today when something is paid.">
              <input name="paymentDate" type="date" value={form.paymentDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Payment method">
              <Select name="paymentMethod" value={form.paymentMethod} onChange={onChange}>
                {SALARY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
              <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Remaining</span>
              <span className={`text-lg font-semibold ${remaining > 0 ? "text-amber-700 dark:text-amber-400" : "text-green-800 dark:text-green-400"}`}>
                {formatPKR(Math.max(remaining, 0))}
              </span>
            </div>
            <Field label="Notes" full>
              <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending || blocked} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add record"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}