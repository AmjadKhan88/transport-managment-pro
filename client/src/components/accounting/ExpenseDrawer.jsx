import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import PaymentFields from "@/components/ui/PaymentFields";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { EXPENSE_CATEGORIES, DEPARTMENT_TAGS, CATEGORY_HINTS } from "@/config/accounting";
import { expenseService } from "@/services/accountingServices";
import { vehicleService } from "@/services/vehicleService";
import { todayStr } from "@/utils/period";

const withCurrent = (list, current) =>
  current && !list.some((i) => i.id === current.id) ? [current, ...list] : list;

const initialForm = (e) => ({
  expenseDate: e?.expenseDate ? e.expenseDate.slice(0, 10) : todayStr(),
  category: e?.category ?? "",
  amount: e?.amount ? String(e.amount) : "",
  vehicle: e?.vehicle?.id ?? "",
  department: e?.department ?? "general",
  description: e?.description ?? "",
  reference: e?.reference ?? "",
  paymentMethod: e?.paymentMethod ?? "cash",
  paymentStatus: e?.paymentStatus ?? "paid",
});

export default function ExpenseDrawer({ expense, onClose }) {
  const isEdit = Boolean(expense);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(expense));

  const { data: vehicleOptions = [] } = useQuery({ queryKey: ["vehicles", "options"], queryFn: vehicleService.options });
  const vehicles = withCurrent(vehicleOptions, expense?.vehicle);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      return isEdit ? expenseService.update(expense.id, payload) : expenseService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Expense updated" : "Expense added");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["company"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer title={isEdit ? "Edit expense" : "Add expense"} subtitle="Company-level expense" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <Section title="Expense">
            <Field label="Date" required>
              <input name="expenseDate" type="date" required value={form.expenseDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Reference / bill number">
              <input name="reference" value={form.reference} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Category" required full hint={CATEGORY_HINTS[form.category]}>
              <Select name="category" required value={form.category} onChange={onChange}>
                <option value="">Select category</option>
                {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Amount (Rs)" required>
              <input name="amount" type="number" min="0" step="any" required value={form.amount} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Department (for reports)">
              <Select name="department" value={form.department} onChange={onChange}>
                {DEPARTMENT_TAGS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label="Related vehicle (optional)" full>
              <Select name="vehicle" value={form.vehicle} onChange={onChange}>
                <option value="">No vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>Truck #{v.vehicleNumber} {[v.make, v.model].filter(Boolean).join(" ")}</option>
                ))}
              </Select>
            </Field>
            <Field label="Description" full>
              <input name="description" value={form.description} onChange={onChange} className={inputClass} />
            </Field>
          </Section>

          <Section title="Payment">
            <PaymentFields
              method={form.paymentMethod}
              status={form.paymentStatus}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add expense"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}