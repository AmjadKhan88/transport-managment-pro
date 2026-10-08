import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import PaymentFields from "@/components/ui/PaymentFields";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { REPAIR_CATEGORIES } from "@/config/repair";
import { repairService } from "@/services/repairService";
import { vehicleService } from "@/services/vehicleService";
import { todayStr } from "@/utils/period";
import { formatPKR } from "@/utils/format";

const num = (v) => Number(v) || 0;
const numStr = (n) => (n ? String(n) : "");
const withCurrent = (list, current) =>
  current && !list.some((i) => i.id === current.id) ? [current, ...list] : list;

const initialForm = (r) => ({
  repairDate: r?.repairDate ? r.repairDate.slice(0, 10) : todayStr(),
  vehicle: r?.vehicle?.id ?? "",
  category: r?.category ?? "",
  mechanic: r?.mechanic ?? "",
  parts: r?.parts ?? "",
  partsCost: numStr(r?.partsCost),
  laborCost: numStr(r?.laborCost),
  description: r?.description ?? "",
  billNumber: r?.billNumber ?? "",
  nextMaintenanceDate: r?.nextMaintenanceDate ? r.nextMaintenanceDate.slice(0, 10) : "",
  paymentMethod: r?.paymentMethod ?? "cash",
  paymentStatus: r?.paymentStatus ?? "paid",
});

export default function RepairDrawer({ repair, defaults, onClose }) {
  const isEdit = Boolean(repair);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({ ...initialForm(repair), ...(isEdit ? {} : defaults) }));

  const { data: vehicleOptions = [] } = useQuery({ queryKey: ["vehicles", "options"], queryFn: vehicleService.options });
  const { data: workshops = [] } = useQuery({ queryKey: ["repairs", "workshops"], queryFn: repairService.workshops });
  const vehicles = withCurrent(vehicleOptions, repair?.vehicle);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const total = num(form.partsCost) + num(form.laborCost);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, partsCost: num(form.partsCost), laborCost: num(form.laborCost) };
      return isEdit ? repairService.update(repair.id, payload) : repairService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Repair updated" : "Repair added");
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer title={isEdit ? "Edit repair" : "Add repair / maintenance"} subtitle="Workshop work and costs" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <Section title="Repair details">
            <Field label="Date" required>
              <input name="repairDate" type="date" required value={form.repairDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Receipt / bill number">
              <input name="billNumber" value={form.billNumber} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Vehicle" required>
              <Select name="vehicle" required value={form.vehicle} onChange={onChange}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    Truck #{v.vehicleNumber} {[v.make, v.model].filter(Boolean).join(" ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Repair type" required>
              <Select name="category" required value={form.category} onChange={onChange}>
                <option value="">Select type</option>
                {REPAIR_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Mechanic / workshop" full>
              <input name="mechanic" list="workshops" value={form.mechanic} onChange={onChange} className={inputClass} />
              <datalist id="workshops">
                {workshops.map((w) => <option key={w} value={w} />)}
              </datalist>
            </Field>
            <Field label="Parts used" full>
              <input name="parts" value={form.parts} onChange={onChange} placeholder="e.g. Oil filter, air filter" className={inputClass} />
            </Field>
            <Field label="Description" full>
              <textarea name="description" rows={3} value={form.description} onChange={onChange} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </Section>

          <Section title="Cost">
            <Field label="Parts cost (Rs)">
              <input name="partsCost" type="number" min="0" step="any" value={form.partsCost} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Labor cost (Rs)">
              <input name="laborCost" type="number" min="0" step="any" value={form.laborCost} onChange={onChange} className={inputClass} />
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50 sm:col-span-2">
              <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Total cost</span>
              <span className="text-lg font-semibold text-green-800 dark:text-green-400">{formatPKR(total)}</span>
            </div>
            <PaymentFields
              method={form.paymentMethod}
              status={form.paymentStatus}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
          </Section>

          <Section title="Next maintenance">
            <Field
              label="Next maintenance date"
              full
              hint="You'll get a reminder on the Repairs page when it is due. Leave empty if none."
            >
              <input name="nextMaintenanceDate" type="date" value={form.nextMaintenanceDate} onChange={onChange} className={inputClass} />
            </Field>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add repair"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}