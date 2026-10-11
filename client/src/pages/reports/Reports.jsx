import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import CompanyProfitLoss from "@/components/accounting/CompanyProfitLoss";
import MonthlyComparison from "@/components/reports/MonthlyComparison";
import AnnualReport from "@/components/reports/AnnualReport";
import VehicleReports from "@/components/reports/VehicleReports";
import RecoveryReport from "@/components/reports/RecoveryReport";
import SalaryReports from "@/components/reports/SalaryReports";
import ExpenseMatrix from "@/components/reports/ExpenseMatrix";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "monthly", label: "Monthly comparison" },
  { value: "annual", label: "Annual report" },
  { value: "vehicles", label: "Vehicles" },
  { value: "recovery", label: "Investment recovery" },
  { value: "salaries", label: "Salaries" },
  { value: "expenses", label: "Expenses by month" },
];

export default function Reports() {
  const [tab, setTab] = useState("overview");

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        crumb="Reports"
        subtitle="Company, vehicle, salary and expense reports. Every table can be exported to PDF or Excel."
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "overview" && <CompanyProfitLoss />}
      {tab === "monthly" && <MonthlyComparison />}
      {tab === "annual" && <AnnualReport />}
      {tab === "vehicles" && <VehicleReports />}
      {tab === "recovery" && <RecoveryReport />}
      {tab === "salaries" && <SalaryReports />}
      {tab === "expenses" && <ExpenseMatrix />}
    </>
  );
}