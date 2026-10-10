import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn } from "@/components/ui/styles";
import { INVESTMENT_GROUPS, MANUAL_INVESTMENT_GROUPS } from "@/config/accounting";
import { investmentService } from "@/services/accountingServices";
import { todayStr } from "@/utils/period";

const initialForm = (i) => ({
  investDate: i?.investDate ? i.investDate.slice(0, 10) : todayStr(),
  group: i?.group ?? "shop",
  category: i?.category ?? "",
  amount: i?.amount ? String(i.amount) : "",
  description: i?.description ?? "",
  reference: i?.reference ?? "",
});

export default function InvestmentDrawer({ investment, onClose }) {
  const isEdit = Boolean(investment);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(investment));

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onGroupChange = (e) => setForm((f) => ({ ...f, group: e.target.value, category: "" }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      return isEdit ? investmentService.update(investment.id, payload) : investmentService.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Investment updated" : "Investment added");
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer title={isEdit ? "Edit investment" : "Add investment"} subtitle="Shop, office and other assets" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
            Vehicle investment is added automatically from the Vehicles page. To record extra cost on a truck, edit that vehicle.
          </div>

          <Section title="Investment">
            <Field label="Date" required>
              <input name="investDate" type="date" required value={form.investDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Reference">
              <input name="reference" value={form.reference} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Group" required>
              <Select name="group" value={form.group} onChange={onGroupChange}>
                {MANUAL_INVESTMENT_GROUPS.map((g) => <option key={g} value={g}>{INVESTMENT_GROUPS[g].label}</option>)}
              </Select>
            </Field>
            <Field
              label="Category"
              required
              hint={form.group === "shop" ? "\"Opening stock\" is only the stock you started with. Later purchases go in the Shop page." : undefined}
            >
              <Select name="category" required value={form.category} onChange={onChange}>
                <option value="">Select category</option>
                {INVESTMENT_GROUPS[form.group].categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Amount (Rs)" required>
              <input name="amount" type="number" min="0" step="any" required value={form.amount} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Description" full>
              <input name="description" value={form.description} onChange={onChange} className={inputClass} />
            </Field>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add investment"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}