import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import ExpenseEntries from "@/components/accounting/ExpenseEntries";
import ExpenseSummary from "@/components/accounting/ExpenseSummary";

export default function Expenses() {
  const { can } = useAuth();
  const tabs = [
    { value: "entries", label: "Expense entries" },
    ...(can("reports", "view") ? [{ value: "summary", label: "All 18 categories" }] : []),
  ];
  const [tab, setTab] = useState("entries");

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Company-level bills. Fuel, repairs, salaries, trip costs, office and shop costs are added automatically."
      />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "entries" && <ExpenseEntries />}
      {tab === "summary" && <ExpenseSummary />}
    </>
  );
}