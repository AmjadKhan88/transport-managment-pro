import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { TRIP_STATUSES } from "@/config/trip";
import { tripService } from "@/services/tripService";
import { vehicleService } from "@/services/vehicleService";
import { driverService } from "@/services/driverService";
import { customerService } from "@/services/customerService";
import { todayStr } from "@/utils/period";
import { formatPKR, formatSigned } from "@/utils/format";

const num = (v) => Number(v) || 0;
const numStr = (n) => (n ? String(n) : "");

const EXPENSES = [
  { key: "dieselCost", label: "Diesel cost (Rs)" },
  { key: "tollTax", label: "Toll tax (Rs)" },
  { key: "driverTripExpense", label: "Driver trip expense (Rs)" },
  { key: "otherExpenses", label: "Other trip expenses (Rs)" },
];

// Keeps a record selectable when editing an old trip whose vehicle/customer is no longer in the dropdown
const withCurrent = (list, current) =>
  current && !list.some((i) => i.id === current.id) ? [current, ...list] : list;

const initialForm = (t, defaults = {}) => ({
  tripDate: t?.tripDate ? t.tripDate.slice(0, 10) : todayStr(),
  customer: t?.customer?.id ?? defaults.customer ?? "",
  vehicle: t?.vehicle?.id ?? defaults.vehicle ?? "",
  driver: t?.driver?.id ?? defaults.driver ?? "",
  biltyNumber: t?.biltyNumber ?? "",
  from: t?.from ?? "",
  to: t?.to ?? "",
  status: t?.status ?? "completed",
  freightAmount: numStr(t?.freightAmount),
  advance: numStr(t?.advance),
  dieselLiters: numStr(t?.dieselLiters),
  dieselCost: numStr(t?.dieselCost),
  tollTax: numStr(t?.tollTax),
  driverTripExpense: numStr(t?.driverTripExpense),
  otherExpenses: numStr(t?.otherExpenses),
  notes: t?.notes ?? "",
});

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-[15px]">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}

export default function TripDrawer({ trip, defaults, onClose }) {
  const isEdit = Boolean(trip);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(trip, defaults));

  const { data: vehicleOptions = [] } = useQuery({ queryKey: ["vehicles", "options"], queryFn: vehicleService.options });
  const { data: driverOptions = [] } = useQuery({ queryKey: ["drivers", "options"], queryFn: driverService.options });
  const { data: customerOptions = [] } = useQuery({ queryKey: ["customers", "options"], queryFn: customerService.options });

  const vehicles = withCurrent(vehicleOptions, trip?.vehicle);
  const drivers = withCurrent(driverOptions, trip?.driver);
  const customers = withCurrent(customerOptions, trip?.customer);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Picking a vehicle fills in its assigned driver (you can still change it)
  const onVehicleChange = (e) => {
    const id = e.target.value;
    const v = vehicleOptions.find((x) => x.id === id);
    setForm((f) => ({ ...f, vehicle: id, driver: v?.driver || f.driver }));
  };

  // Live calculations (the server recalculates the same way)
  const freight = num(form.freightAmount);
  const advance = num(form.advance);
  const remaining = freight - advance;
  const totalExpense = EXPENSES.reduce((sum, { key }) => sum + num(form[key]), 0);
  const net = freight - totalExpense;
  const advanceTooHigh = advance > freight;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        tripDate: form.tripDate,
        customer: form.customer,
        vehicle: form.vehicle,
        driver: form.driver,
        biltyNumber: form.biltyNumber,
        from: form.from,
        to: form.to,
        status: form.status,
        notes: form.notes,
        freightAmount: freight,
        advance,
        dieselLiters: num(form.dieselLiters),
        dieselCost: num(form.dieselCost),
        tollTax: num(form.tollTax),
        driverTripExpense: num(form.driverTripExpense),
        otherExpenses: num(form.otherExpenses),
      };
      return isEdit ? tripService.update(trip.id, payload) : tripService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Trip updated" : "Trip added");
      queryClient.invalidateQueries({ queryKey: ["trips"] });
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
      title={isEdit ? "Edit trip" : "Add trip"}
      subtitle="Trip details, freight and expenses"
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <Section title="Trip details">
            <Field label="Date" required>
              <input name="tripDate" type="date" required value={form.tripDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Bilty number">
              <input name="biltyNumber" value={form.biltyNumber} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Customer / party" required full>
              <Select name="customer" required value={form.customer} onChange={onChange}>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.companyName ? ` — ${c.companyName}` : ""}
                  </option>
                ))}
              </Select>
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
            <Field label="From" required>
              <input name="from" required value={form.from} onChange={onChange} placeholder="e.g. Peshawar" className={inputClass} />
            </Field>
            <Field label="To" required>
              <input name="to" required value={form.to} onChange={onChange} placeholder="e.g. Karachi" className={inputClass} />
            </Field>
            <Field label="Status">
              <Select name="status" value={form.status} onChange={onChange}>
                {Object.entries(TRIP_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </Select>
            </Field>
          </Section>

          <Section title="Freight">
            <Field label="Trip / freight amount (Rs)">
              <input name="freightAmount" type="number" min="0" step="any" value={form.freightAmount} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Advance received (Rs)">
              <input name="advance" type="number" min="0" step="any" value={form.advance} onChange={onChange} className={inputClass} />
              {advanceTooHigh && (
                <p className="mt-1 text-[13px] text-red-700 dark:text-red-400">Advance cannot be more than the freight.</p>
              )}
            </Field>
          </Section>

          <Section title="Trip expenses">
            <Field label="Diesel used (liters)">
              <input name="dieselLiters" type="number" min="0" step="any" value={form.dieselLiters} onChange={onChange} className={inputClass} />
            </Field>
            {EXPENSES.map(({ key, label }) => (
              <Field key={key} label={label}>
                <input name={key} type="number" min="0" step="any" value={form[key]} onChange={onChange} className={inputClass} />
              </Field>
            ))}

            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50 sm:col-span-2">
              <SummaryRow label="Remaining from customer" value={formatPKR(remaining)} />
              <SummaryRow label="Total trip expense" value={formatPKR(totalExpense)} />
              <div className="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Net trip profit</span>
                <span className={`text-lg font-semibold ${net < 0 ? "text-red-700 dark:text-red-400" : "text-green-800 dark:text-green-400"}`}>
                  {formatSigned(net)}
                </span>
              </div>
            </div>
          </Section>

          <Section title="Notes">
            <Field label="Notes" full>
              <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending || advanceTooHigh} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add trip"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}