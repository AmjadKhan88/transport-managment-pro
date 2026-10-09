import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { DEPARTMENTS, EMPLOYEE_STATUSES } from "@/config/salary";
import { employeeService } from "@/services/employeeService";

const initialForm = (e) => ({
  name: e?.name ?? "",
  designation: e?.designation ?? "",
  department: e?.department ?? "office",
  phone: e?.phone ?? "",
  address: e?.address ?? "",
  joiningDate: e?.joiningDate ? e.joiningDate.slice(0, 10) : "",
  salary: e?.salary ? String(e.salary) : "",
  status: e?.status ?? "active",
  notes: e?.notes ?? "",
});

export default function EmployeeDrawer({ employee, onClose }) {
  const isEdit = Boolean(employee);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(employee));

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, salary: Number(form.salary) || 0 };
      return isEdit ? employeeService.update(employee.id, payload) : employeeService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Staff member updated" : "Staff member added");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["salaries", "payees"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer title={isEdit ? `Edit ${employee.name}` : "Add staff member"} subtitle="Office, shop and workshop staff" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <Section title="Staff information">
            <Field label="Name" required>
              <input name="name" required value={form.name} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Designation">
              <input name="designation" value={form.designation} onChange={onChange} placeholder="e.g. Accountant" className={inputClass} />
            </Field>
            <Field label="Department">
              <Select name="department" value={form.department} onChange={onChange}>
                {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label="Phone">
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
                {Object.entries(EMPLOYEE_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Basic monthly salary (Rs)" full>
              <input name="salary" type="number" min="0" step="any" value={form.salary} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Notes" full>
              <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add staff"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}