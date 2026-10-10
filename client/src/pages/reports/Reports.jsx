import PageHeader from "@/components/ui/PageHeader";
import CompanyProfitLoss from "@/components/accounting/CompanyProfitLoss";

export default function Reports() {
  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        crumb="Reports"
        subtitle="Overall company profit and loss. More reports (vehicle, monthly, yearly, export) come in a later step."
      />
      <CompanyProfitLoss />
    </>
  );
}