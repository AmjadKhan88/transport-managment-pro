import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import SalaryRecords from "@/components/salaries/SalaryRecords";
import StaffList from "@/components/salaries/StaffList";
import SalaryReport from "@/components/salaries/SalaryReport";

const TABS = [
  { value: "records", label: "Salary records" },
  { value: "staff", label: "Staff" },
  { value: "report", label: "Monthly report" },
];

export default function Salaries() {
  const [tab, setTab] = useState("records");
  const [payee, setPayee] = useState(null); // { type, id, name } when viewing one person's history

  const showStaffHistory = (e) => {
    setPayee({ type: "employee", id: e.id, name: e.name });
    setTab("records");
  };

  return (
    <>
      <PageHeader
        title="Employees & Salaries"
        crumb="Salaries"
        subtitle="Driver and staff salaries, payments and what is still owed."
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "records" && (
        <SalaryRecords key={payee?.id ?? "all"} payee={payee} onClearPayee={() => setPayee(null)} />
      )}
      {tab === "staff" && <StaffList onViewHistory={showStaffHistory} />}
      {tab === "report" && <SalaryReport />}
    </>
  );
}