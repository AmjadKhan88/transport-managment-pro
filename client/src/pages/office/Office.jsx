import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import OfficeExpenses from "@/components/office/OfficeExpenses";
import OfficeReport from "@/components/office/OfficeReport";

const TABS = [
  { value: "expenses", label: "Expenses" },
  { value: "report", label: "Monthly report" },
];

export default function Office() {
  const [tab, setTab] = useState("expenses");

  return (
    <>
      <PageHeader title="Office" subtitle="Office running costs, bills and staff salary." />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "expenses" && <OfficeExpenses />}
      {tab === "report" && <OfficeReport />}
    </>
  );
}