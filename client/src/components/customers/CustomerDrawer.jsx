import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { CUSTOMER_STATUSES } from "@/config/status";
import { customerService } from "@/services/customerService";

const initialForm = (c) => ({
  name: c?.name ?? "",
  companyName: c?.companyName ?? "",
  phone: c?.phone ?? "",
  status: c?.status ?? "active",
  openingBalance: c?.openingBalance ? String(c.openingBalance) : "",
  address: c?.address ?? "",
  notes: c?.notes ?? "",
});

export default function CustomerDrawer({ customer, onClose }) {
  const isEdit = Boolean(customer);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(customer));

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, openingBalance: Number(form.openingBalance) || 0 };
      return isEdit ? customerService.update(customer.id, payload) : customerService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Customer updated" : "Customer added");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer
      title={isEdit ? `Edit ${customer.name}` : "Add customer / party"}
      subtitle="Contact details and opening balance"
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-7 overflow-y-auto p-6">
          <Section title="Customer information">
            <Field label="Customer name" required>
              <input name="name" required value={form.name} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Company name">
              <input name="companyName" value={form.companyName} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" type="tel" value={form.phone} onChange={onChange} placeholder="03XX-XXXXXXX" className={inputClass} />
            </Field>
            <Field label="Status">
              <Select name="status" value={form.status} onChange={onChange}>
                {Object.entries(CUSTOMER_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Address" full>
              <input name="address" value={form.address} onChange={onChange} className={inputClass} />
            </Field>
          </Section>

          <Section title="Account">
            <Field
              label="Opening balance (Rs)"
              full
              hint="Amount this customer already owed you before you started using the software."
            >
              <input name="openingBalance" type="number" step="any" value={form.openingBalance} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Notes" full>
              <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add customer"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}