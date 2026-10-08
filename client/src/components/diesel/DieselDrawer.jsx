import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import PaymentFields from "@/components/ui/PaymentFields";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { dieselService } from "@/services/dieselService";
import { vehicleService } from "@/services/vehicleService";
import { driverService } from "@/services/driverService";
import { todayStr } from "@/utils/period";
import { formatPKR } from "@/utils/format";

const num = (v) => Number(v) || 0;
const numStr = (n) => (n ? String(n) : "");
const withCurrent = (list, current) =>
  current && !list.some((i) => i.id === current.id) ? [current, ...list] : list;

const initialForm = (e) => ({
  fuelDate: e?.fuelDate ? e.fuelDate.slice(0, 10) : todayStr(),
  vehicle: e?.vehicle?.id ?? "",
  driver: e?.driver?.id ?? "",
  liters: numStr(e?.liters),
  ratePerLiter: numStr(e?.ratePerLiter),
  fuelStation: e?.fuelStation ?? "",
  paymentMethod: e?.paymentMethod ?? "cash",
  paymentStatus: e?.paymentStatus ?? "paid",
  route: e?.route ?? "",
  receiptNumber: e?.receiptNumber ?? "",
  notes: e?.notes ?? "",
});

export default function DieselDrawer({ entry, onClose }) {
  const isEdit = Boolean(entry);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(entry));

  const { data: vehicleOptions = [] } = useQuery({ queryKey: ["vehicles", "options"], queryFn: vehicleService.options });
  const { data: driverOptions = [] } = useQuery({ queryKey: ["drivers", "options"], queryFn: driverService.options });
  const { data: stations = [] } = useQuery({ queryKey: ["diesel", "stations"], queryFn: dieselService.stations });

  const vehicles = withCurrent(vehicleOptions, entry?.vehicle);
  const drivers = withCurrent(driverOptions, entry?.driver);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onVehicleChange = (e) => {
    const id = e.target.value;
    const v = vehicleOptions.find((x) => x.id === id);
    setForm((f) => ({ ...f, vehicle: id, driver: v?.driver || f.driver }));
  };

  const total = Math.round(num(form.liters) * num(form.ratePerLiter) * 100) / 100;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, liters: num(form.liters), ratePerLiter: num(form.ratePerLiter) };
      return isEdit ? dieselService.update(entry.id, payload) : dieselService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Fuel entry updated" : "Fuel entry added");
      queryClient.invalidateQueries({ queryKey: ["diesel"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer title={isEdit ? "Edit fuel entry" : "Add fuel entry"} subtitle="Diesel purchase details" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <Section title="Fuel details">
            <Field label="Date" required>
              <input name="fuelDate" type="date" required value={form.fuelDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Receipt number">
              <input name="receiptNumber" value={form.receiptNumber} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Vehicle" required>
              <Select name="vehicle" required value={form.vehicle} onChange={onVehicleChange}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    Truck #{v.vehicleNumber} {[v.make, v.model].filter(Boolean).join(" ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Driver">
              <Select name="driver" value={form.driver} onChange={onChange}>
                <option value="">Select driver</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Fuel station">
              <input name="fuelStation" list="fuel-stations" value={form.fuelStation} onChange={onChange} className={inputClass} />
              <datalist id="fuel-stations">
                {stations.map((s) => <option key={s} value={s} />)}
              </datalist>
            </Field>
            <Field label="Trip / route">
              <input name="route" value={form.route} onChange={onChange} placeholder="e.g. Peshawar to Karachi" className={inputClass} />
            </Field>
          </Section>

          <Section title="Quantity and cost">
            <Field label="Quantity (liters)" required>
              <input name="liters" type="number" min="0" step="any" required value={form.liters} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Rate per liter (Rs)" required>
              <input name="ratePerLiter" type="number" min="0" step="any" required value={form.ratePerLiter} onChange={onChange} className={inputClass} />
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50 sm:col-span-2">
              <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Total amount</span>
              <span className="text-lg font-semibold text-green-800 dark:text-green-400">{formatPKR(total)}</span>
            </div>
            <PaymentFields
              method={form.paymentMethod}
              status={form.paymentStatus}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
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