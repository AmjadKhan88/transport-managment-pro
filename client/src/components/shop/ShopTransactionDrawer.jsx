import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import PaymentFields from "@/components/ui/PaymentFields";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { SHOP_TYPES, SHOP_EXPENSE_CATEGORIES } from "@/config/shop";
import { shopService } from "@/services/shopService";
import { todayStr } from "@/utils/period";

const PARTY_LABEL = { sale: "Customer (optional)", purchase: "Supplier (optional)", expense: "Paid to (optional)" };
const UNPAID_HINT = {
  sale: "Unpaid = amount still to receive from the customer.",
  purchase: "Unpaid = amount you still owe the supplier (shows in Payables).",
  expense: "Unpaid = amount you still owe (shows in Payables).",
};

const initialForm = (t) => ({
  txnDate: t?.txnDate ? t.txnDate.slice(0, 10) : todayStr(),
  type: t?.type ?? "sale",
  category: t?.category ?? "",
  amount: t?.amount ? String(t.amount) : "",
  party: t?.party ?? "",
  description: t?.description ?? "",
  reference: t?.reference ?? "",
  paymentMethod: t?.paymentMethod ?? "cash",
  paymentStatus: t?.paymentStatus ?? "paid",
});

export default function ShopTransactionDrawer({ entry, onClose }) {
  const isEdit = Boolean(entry);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(entry));

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      if (form.type !== "expense") delete payload.category;
      return isEdit ? shopService.update(entry.id, payload) : shopService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Shop entry updated" : "Shop entry added");
      queryClient.invalidateQueries({ queryKey: ["shop"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer title={isEdit ? "Edit shop entry" : "Add shop entry"} subtitle="Sale, purchase or expense" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <Section title="Entry">
            <Field label="Date" required>
              <input name="txnDate" type="date" required value={form.txnDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Type" required>
              <Select name="type" value={form.type} onChange={onChange}>
                {Object.entries(SHOP_TYPES).map(([v, t]) => <option key={v} value={v}>{t.label}</option>)}
              </Select>
            </Field>

            {form.type === "expense" && (
              <Field
                label="Expense category"
                required
                full
                hint="Shop staff salaries are added automatically from Salaries (department: Shop). Don't enter them here."
              >
                <Select name="category" required value={form.category} onChange={onChange}>
                  <option value="">Select category</option>
                  {SHOP_EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </Field>
            )}

            <Field label="Amount (Rs)" required>
              <input name="amount" type="number" min="0" step="any" required value={form.amount} onChange={onChange} className={inputClass} />
            </Field>
            <Field label={PARTY_LABEL[form.type]}>
              <input name="party" value={form.party} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Description" full>
              <input name="description" value={form.description} onChange={onChange} placeholder="e.g. Daily sales, new stock, shop rent" className={inputClass} />
            </Field>
            <Field label="Invoice / bill number" full>
              <input name="reference" value={form.reference} onChange={onChange} className={inputClass} />
            </Field>
          </Section>

          <Section title="Payment">
            <PaymentFields
              method={form.paymentMethod}
              status={form.paymentStatus}
              unpaidHint={UNPAID_HINT[form.type]}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
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