import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { INCOME_TYPES, INCOME_METHODS } from "@/config/accounting";
import { incomeService } from "@/services/accountingServices";
import { customerService } from "@/services/customerService";
import { todayStr } from "@/utils/period";

const TYPE_HINT = {
  customer_payment: "Settles what the customer owes. It is NOT added to income again, because the freight was already counted from Trips.",
  other_business: "Counted as company income.",
  other_receipt: "Counted as company income.",
};

const withCurrent = (list, current) =>
  current && !list.some((i) => i.id === current.id) ? [current, ...list] : list;

const initialForm = (i) => ({
  incomeDate: i?.incomeDate ? i.incomeDate.slice(0, 10) : todayStr(),
  type: i?.type ?? "customer_payment",
  customer: i?.customer?.id ?? "",
  source: i?.source ?? "",
  amount: i?.amount ? String(i.amount) : "",
  paymentMethod: i?.paymentMethod ?? "cash",
  reference: i?.reference ?? "",
  notes: i?.notes ?? "",
});

export default function IncomeDrawer({ entry, onClose }) {
  const isEdit = Boolean(entry);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(entry));

  const { data: customerOptions = [] } = useQuery({ queryKey: ["customers", "options"], queryFn: customerService.options });
  const customers = withCurrent(customerOptions, entry?.customer);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const isPayment = form.type === "customer_payment";

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      if (!isPayment) delete payload.customer;
      return isEdit ? incomeService.update(entry.id, payload) : incomeService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Income entry updated" : "Income entry added");
      queryClient.invalidateQueries({ queryKey: ["income"] });
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
    <Drawer title={isEdit ? "Edit income entry" : "Add income entry"} subtitle="Money received" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <Section title="Income">
            <Field label="Date" required>
              <input name="incomeDate" type="date" required value={form.incomeDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Income type" required>
              <Select name="type" value={form.type} onChange={onChange}>
                {Object.entries(INCOME_TYPES).map(([v, t]) => <option key={v} value={v}>{t.label}</option>)}
              </Select>
            </Field>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300 sm:col-span-2">
              {TYPE_HINT[form.type]}
            </div>

            {isPayment && (
              <Field label="Customer / party" required full>
                <Select name="customer" required value={form.customer} onChange={onChange}>
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.companyName ? ` — ${c.companyName}` : ""}</option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Amount (Rs)" required>
              <input name="amount" type="number" min="0" step="any" required value={form.amount} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Payment method">
              <Select name="paymentMethod" value={form.paymentMethod} onChange={onChange}>
                {INCOME_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
            <Field label={isPayment ? "Note (e.g. which trips)" : "Source / received from"} full>
              <input name="source" value={form.source} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Reference (cheque / transfer no.)" full>
              <input name="reference" value={form.reference} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Notes" full>
              <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add entry"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}