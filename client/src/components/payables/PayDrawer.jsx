import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn, smallBtn } from "@/components/ui/styles";
import { SALARY_METHODS } from "@/config/salary";
import { KIND_SINGULAR } from "@/config/payables";
import { payablesService } from "@/services/settlementServices";
import { monthLabel, todayStr } from "@/utils/period";
import { formatDate, formatPKR } from "@/utils/format";

// target: { kind, partyKey, name, outstanding }
export default function PayDrawer({ target, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    amount: String(target.outstanding),
    date: todayStr(),
    method: "cash",
    reference: "",
    notes: "",
  });

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["payables", "bills", target.kind, target.partyKey],
    queryFn: () => payablesService.bills(target.kind, target.partyKey),
  });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const amount = Number(form.amount) || 0;
  const tooMuch = amount > target.outstanding + 0.005;

  const mutation = useMutation({
    mutationFn: () => payablesService.pay({ kind: target.kind, party: target.partyKey, ...form, amount }),
    onSuccess: () => {
      toast.success("Payment recorded");
      // statuses changed in the source modules too
      for (const key of ["payables", "salaries", "diesel", "repairs", "shop", "office", "expenses"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer title={`Pay ${target.name}`} subtitle={KIND_SINGULAR[target.kind]} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-sm text-gray-500 dark:text-gray-400">You owe</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(target.outstanding)}</p>
          </div>

          <section>
            <h3 className="mb-3 border-b border-gray-200 pb-2 text-base font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
              Unpaid bills (oldest first)
            </h3>
            <div className="max-h-56 divide-y divide-gray-200 overflow-y-auto dark:divide-gray-800">
              {isLoading && <p className="py-3 text-sm text-gray-500">Loading…</p>}
              {bills.map((b) => (
                <div key={b.id} className="flex items-start justify-between gap-3 py-2.5 text-[15px]">
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-gray-100">{b.month ? monthLabel(b.month) : formatDate(b.date)}</p>
                    {b.description && <p className="truncate text-[13px] text-gray-500">{b.description}</p>}
                  </div>
                  <span className="shrink-0 font-medium text-gray-900 dark:text-gray-100">{formatPKR(b.outstanding)}</span>
                </div>
              ))}
            </div>
          </section>

          <Section title="Payment">
            <Field label="Amount paid (Rs)" required>
              <div className="flex gap-2">
                <input name="amount" type="number" min="0" step="any" required value={form.amount} onChange={onChange} className={inputClass} />
                <button type="button" className={`${smallBtn} h-11 shrink-0`} onClick={() => setForm((f) => ({ ...f, amount: String(target.outstanding) }))}>
                  Full
                </button>
              </div>
              {tooMuch && <p className="mt-1 text-[13px] text-red-700 dark:text-red-400">More than the amount owed.</p>}
            </Field>
            <Field label="Date" required>
              <input name="date" type="date" required value={form.date} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Method">
              <Select name="method" value={form.method} onChange={onChange}>
                {SALARY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
            <Field label="Reference">
              <input name="reference" value={form.reference} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Notes" full>
              <input name="notes" value={form.notes} onChange={onChange} className={inputClass} />
            </Field>
            {amount > 0 && !tooMuch && (
              <p className="text-[15px] text-gray-700 dark:text-gray-300 sm:col-span-2">
                Still owed after this payment:{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPKR(Math.max(target.outstanding - amount, 0))}</span>
              </p>
            )}
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending || amount <= 0 || tooMuch} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : "Record payment"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}