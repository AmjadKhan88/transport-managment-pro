import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { salaryService } from "@/services/salaryService";
import { currentMonth } from "@/utils/period";

export default function GenerateDialog({ onClose }) {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [payeeType, setPayeeType] = useState("all");

  const mutation = useMutation({
    mutationFn: () => salaryService.generate({ month, payeeType }),
    onSuccess: (r) => {
      toast.success(
        `Created ${r.created} record(s). ${r.existing} already existed` +
        (r.noSalary ? `, ${r.noSalary} skipped (no salary set).` : ".")
      );
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal title="Generate monthly salaries" onClose={onClose}>
      <p className="mb-4 text-[15px] text-gray-600 dark:text-gray-400">
        Creates a salary record with the basic salary for every active driver and staff member who doesn't have one
        for the month. You can then add allowances, deductions and payments.
      </p>
      <div className="space-y-4">
        <Field label="Month">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
        </Field>
        <Field label="For">
          <Select value={payeeType} onChange={(e) => setPayeeType(e.target.value)}>
            <option value="all">Drivers and staff</option>
            <option value="driver">Drivers only</option>
            <option value="employee">Staff only</option>
          </Select>
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        <button type="button" disabled={!month || mutation.isPending} onClick={() => mutation.mutate()} className={primaryBtn}>
          {mutation.isPending ? "Generating…" : "Generate"}
        </button>
      </div>
    </Modal>
  );
}