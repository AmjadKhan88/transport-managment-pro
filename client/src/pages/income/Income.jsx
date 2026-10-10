import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import IncomeEntries from "@/components/accounting/IncomeEntries";
import IncomeSummary from "@/components/accounting/IncomeSummary";

export default function Income() {
  const { can } = useAuth();
  const tabs = [
    { value: "entries", label: "Income entries" },
    ...(can("reports", "view") ? [{ value: "summary", label: "Income summary" }] : []),
  ];
  const [tab, setTab] = useState("entries");

  return (
    <>
      <PageHeader
        title="Income"
        subtitle="Money received: customer payments and other income. Freight and shop sales are added automatically."
      />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "entries" && <IncomeEntries />}
      {tab === "summary" && <IncomeSummary />}
    </>
  );
}