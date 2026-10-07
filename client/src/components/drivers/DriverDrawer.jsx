import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { DRIVER_STATUSES } from "@/config/status";
import { driverService } from "@/services/driverService";
import { vehicleService } from "@/services/vehicleService";

const maskCnic = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 13);
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12)].filter(Boolean).join("-");
};

const initialForm = (d) => ({
  name: d?.name ?? "",
  fatherName: d?.fatherName ?? "",
  cnic: d?.cnic ?? "",
  phone: d?.phone ?? "",
  address: d?.address ?? "",
  joiningDate: d?.joiningDate ? d.joiningDate.slice(0, 10) : "",
  salary: d?.salary ? String(d.salary) : "",
  status: d?.status ?? "active",
  vehicleId: d?.vehicle?.id ?? "",
  notes: d?.notes ?? "",
});

export default function DriverDrawer({ driver, onClose }) {
  const isEdit = Boolean(driver);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(driver));

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles", "options"],
    queryFn: vehicleService.options,
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "cnic" ? maskCnic(value) : value }));
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, salary: Number(form.salary) || 0 };
      return isEdit ? driverService.update(driver.id, payload) : driverService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Driver updated" : "Driver added");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] }); // assignment changed
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
      title={isEdit ? `Edit ${driver.name}` : "Add driver"}
      subtitle="Driver profile, salary and vehicle assignment"
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-7 overflow-y-auto p-6">
          <Section title="Personal information">
            <Field label="Driver name" required>
              <input name="name" required value={form.name} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Father name">
              <input name="fatherName" value={form.fatherName} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="CNIC">
              <input name="cnic" inputMode="numeric" value={form.cnic} onChange={onChange} placeholder="12345-1234567-1" className={inputClass} />
            </Field>
            <Field label="Phone number">
              <input name="phone" type="tel" value={form.phone} onChange={onChange} placeholder="03XX-XXXXXXX" className={inputClass} />
            </Field>
            <Field label="Address" full>
              <input name="address" value={form.address} onChange={onChange} className={inputClass} />
            </Field>
          </Section>

          <Section title="Employment">
            <Field label="Joining date">
              <input name="joiningDate" type="date" value={form.joiningDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Status">
              <Select name="status" value={form.status} onChange={onChange}>
                {Object.entries(DRIVER_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Basic monthly salary (Rs)" hint="Advance and remaining salary are tracked in Salaries.">
              <input name="salary" type="number" min="0" step="any" value={form.salary} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Assigned vehicle">
              <Select name="vehicleId" value={form.vehicleId} onChange={onChange}>
                <option value="">— No vehicle —</option>
                {vehicles.map((v) => {
                  const busy = v.driver && v.driver !== driver?.vehicle?.id && v.id !== form.vehicleId && v.driver !== driver?.id;
                  return (
                    <option key={v.id} value={v.id} disabled={Boolean(busy)}>
                      Truck #{v.vehicleNumber} {[v.make, v.model].filter(Boolean).join(" ")}
                      {busy ? " — has a driver" : ""}
                    </option>
                  );
                })}
              </Select>
            </Field>
          </Section>

          <Section title="Notes">
            <Field label="Notes" full>
              <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add driver"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}