import { useState } from "react";
import { useMutation, useQueryClient, useQuery, } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { inputClass, labelClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { VEHICLE_TYPES, VEHICLE_STATUSES, OWNERSHIP_TYPES, INVESTMENT_FIELDS } from "@/config/vehicle";
import { vehicleService } from "@/services/vehicleService";
import { formatPKR } from "@/utils/format";
import { Section, Field } from "@/components/ui/FormParts";
import { driverService } from "@/services/driverService";

const num = (v) => Number(v) || 0;
const numStr = (n) => (n ? String(n) : "");

const initialForm = (v) => ({
  vehicleNumber: v?.vehicleNumber ?? "",
  registrationNumber: v?.registrationNumber ?? "",
  type: v?.type ?? "truck",
  make: v?.make ?? "",
  model: v?.model ?? "",
  purchaseDate: v?.purchaseDate ? v.purchaseDate.slice(0, 10) : "",
  purchasePrice: numStr(v?.purchasePrice),
  currentValue: numStr(v?.currentValue),
  status: v?.status ?? "active",
  ownerName: v?.ownership?.ownerName ?? "",
  ownershipType: v?.ownership?.ownershipType ?? "company",
  ownershipDetails: v?.ownership?.details ?? "",
  driverId: v?.driver?.id ?? "",
  notes: v?.notes ?? "",
  ...Object.fromEntries(INVESTMENT_FIELDS.map(({ key }) => [key, numStr(v?.investment?.[key])])),
});



export default function VehicleDrawer({ vehicle, onClose }) {
  const isEdit = Boolean(vehicle);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(vehicle));

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers", "options"],
    queryFn: driverService.options,
  });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const additional = INVESTMENT_FIELDS.reduce((sum, { key }) => sum + num(form[key]), 0);
  const total = num(form.purchasePrice) + additional;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        vehicleNumber: form.vehicleNumber,
        registrationNumber: form.registrationNumber,
        type: form.type,
        make: form.make,
        model: form.model,
        driver: form.driverId,
        purchaseDate: form.purchaseDate,
        purchasePrice: num(form.purchasePrice),
        currentValue: num(form.currentValue),
        status: form.status,
        ownership: {
          ownerName: form.ownerName,
          ownershipType: form.ownershipType,
          details: form.ownershipDetails,
        },
        investment: Object.fromEntries(INVESTMENT_FIELDS.map(({ key }) => [key, num(form[key])])),
        notes: form.notes,
      };
      return isEdit ? vehicleService.update(vehicle.id, payload) : vehicleService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Vehicle updated" : "Vehicle added");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
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
      title={isEdit ? `Edit Truck #${vehicle.vehicleNumber}` : "Add vehicle"}
      subtitle="Vehicle details and investment breakdown"
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-7 overflow-y-auto p-6">
          <Section title="Vehicle information">
            <Field label="Vehicle number" required>
              <input name="vehicleNumber" required value={form.vehicleNumber} onChange={onChange} placeholder="e.g. 311" className={inputClass} />
            </Field>
            <Field label="Registration number">
              <input name="registrationNumber" value={form.registrationNumber} onChange={onChange} placeholder="e.g. TLA-1234" className={inputClass} />
            </Field>
            <Field label="Vehicle type">
              <Select name="type" value={form.type} onChange={onChange}>
                {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" value={form.status} onChange={onChange}>
                {Object.entries(VEHICLE_STATUSES).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Make / Company">
              <input name="make" value={form.make} onChange={onChange} placeholder="e.g. Volvo" className={inputClass} />
            </Field>
            <Field label="Model">
              <input name="model" value={form.model} onChange={onChange} placeholder="e.g. FH16" className={inputClass} />
            </Field>
            <Field label="Assigned driver" full>
              <Select name="driverId" value={form.driverId} onChange={onChange}>
                <option value="">— No driver —</option>
                {drivers.map((d) => {
                  const busy = d.vehicle && d.vehicle.id !== vehicle?.id;
                  return (
                    <option key={d.id} value={d.id} disabled={Boolean(busy)}>
                      {d.name}
                      {busy ? ` — on Truck #${d.vehicle.vehicleNumber}` : ""}
                    </option>
                  );
                })}
              </Select>
            </Field>
            <Field label="Purchase date">
              <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Current value (Rs)">
              <input name="currentValue" type="number" min="0" step="any" value={form.currentValue} onChange={onChange} className={inputClass} />
            </Field>
          </Section>

          <Section title="Ownership">
            <Field label="Owner name">
              <input name="ownerName" value={form.ownerName} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Ownership type">
              <Select name="ownershipType" value={form.ownershipType} onChange={onChange}>
                {OWNERSHIP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
            <Field label="Details" full>
              <input name="ownershipDetails" value={form.ownershipDetails} onChange={onChange} placeholder="Partners, lease terms, etc." className={inputClass} />
            </Field>
          </Section>

          <Section title="Investment (Rs)">
            <Field label="Purchase cost">
              <input name="purchasePrice" type="number" min="0" step="any" value={form.purchasePrice} onChange={onChange} className={inputClass} />
            </Field>
            {INVESTMENT_FIELDS.map(({ key, label }) => (
              <Field key={key} label={label}>
                <input name={key} type="number" min="0" step="any" value={form[key]} onChange={onChange} className={inputClass} />
              </Field>
            ))}
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100 sm:col-span-2 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
              <span className="text-[12px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Total investment</span>
              <span className="text-[16px] font-extrabold text-emerald-700 dark:text-emerald-400">{formatPKR(total)}</span>
            </div>
          </Section>

          <Section title="Notes">
            <Field label="Notes" full>
              <textarea
                name="notes"
                rows={3}
                value={form.notes}
                onChange={onChange}
                className={`${inputClass} h-auto py-2.5`}
              />
            </Field>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add vehicle"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}