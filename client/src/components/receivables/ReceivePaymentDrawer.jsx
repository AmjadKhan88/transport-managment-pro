import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn, smallBtn } from "@/components/ui/styles";
import { SALARY_METHODS } from "@/config/salary";
import { receivablesService } from "@/services/settlementServices";
import { todayStr } from "@/utils/period";
import { formatPKR } from "@/utils/format";

// customer: { id, name, balance }
export default function ReceivePaymentDrawer({ customer, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    amount: customer.balance > 0 ? String(customer.balance) : "",
    date: todayStr(),
    method: "cash",
    reference: "",
    notes: "",
  });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const amount = Number(form.amount) || 0;
  const after = customer.balance - amount;

  const mutation = useMutation({
    mutationFn: () => receivablesService.receivePayment({ customer: customer.id, ...form, amount }),
    onSuccess: () => {
      toast.success("Payment recorded");
      for (const key of ["receivables", "income", "company"]) queryClient.invalidateQueries({ queryKey: [key] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer title="Receive payment" subtitle={customer.name} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-sm text-gray-500 dark:text-gray-400">Currently owes you</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(customer.balance)}</p>
          </div>

          <Section title="Payment">
            <Field label="Amount received (Rs)" required>
              <div className="flex gap-2">
                <input name="amount" type="number" min="0" step="any" required value={form.amount} onChange={onChange} className={inputClass} />
                {customer.balance > 0 && (
                  <button type="button" className={`${smallBtn} h-11 shrink-0`} onClick={() => setForm((f) => ({ ...f, amount: String(customer.balance) }))}>
                    Full
                  </button>
                )}
              </div>
            </Field>
            <Field label="Date" required>
              <input name="date" type="date" required value={form.date} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Method">
              <Select name="method" value={form.method} onChange={onChange}>
                {SALARY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
            <Field label="Reference (cheque / transfer no.)">
              <input name="reference" value={form.reference} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Notes" full>
              <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className={`${inputClass} h-auto py-2.5`} />
            </Field>
            {amount > 0 && (
              <p className="text-[15px] text-gray-700 dark:text-gray-300 sm:col-span-2">
                {after >= 0 ? "Balance after this payment: " : "Customer credit after this payment: "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPKR(Math.abs(after))}</span>
              </p>
            )}
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending || amount <= 0} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : "Record payment"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}