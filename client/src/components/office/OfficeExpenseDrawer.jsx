import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import PaymentFields from "@/components/ui/PaymentFields";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { OFFICE_CATEGORIES } from "@/config/office";
import { officeService } from "@/services/officeService";
import { todayStr } from "@/utils/period";

const initialForm = (e) => ({
  expenseDate: e?.expenseDate ? e.expenseDate.slice(0, 10) : todayStr(),
  category: e?.category ?? "",
  amount: e?.amount ? String(e.amount) : "",
  description: e?.description ?? "",
  billNumber: e?.billNumber ?? "",
  paymentMethod: e?.paymentMethod ?? "cash",
  paymentStatus: e?.paymentStatus ?? "paid",
});

export default function OfficeExpenseDrawer({ expense, onClose }) {
  const isEdit = Boolean(expense);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(expense));

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      return isEdit ? officeService.update(expense.id, payload) : officeService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Office expense updated" : "Office expense added");
      queryClient.invalidateQueries({ queryKey: ["office"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer title={isEdit ? "Edit office expense" : "Add office expense"} subtitle="Day-to-day office costs" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <Section title="Expense">
            <Field label="Date" required>
              <input name="expenseDate" type="date" required value={form.expenseDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Bill number">
              <input name="billNumber" value={form.billNumber} onChange={onChange} className={inputClass} />
            </Field>
            <Field
              label="Category"
              required
              full
              hint="Office staff salaries are added automatically from Salaries (department: Office). Don't enter them here."
            >
              <Select name="category" required value={form.category} onChange={onChange}>
                <option value="">Select category</option>
                {OFFICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Amount (Rs)" required>
              <input name="amount" type="number" min="0" step="any" required value={form.amount} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Description">
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