import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import ShopTransactions from "@/components/shop/ShopTransactions";
import StockList from "@/components/shop/StockList";
import ShopReport from "@/components/shop/ShopReport";

const TABS = [
  { value: "transactions", label: "Sales & expenses" },
  { value: "stock", label: "Stock" },
  { value: "report", label: "Profit report" },
];

export default function Shop() {
  const [tab, setTab] = useState("transactions");

  return (
    <>
      <PageHeader
        title="Shop"
        subtitle="Sales, purchases, expenses and stock of the company shop."
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "transactions" && <ShopTransactions />}
      {tab === "stock" && <StockList />}
      {tab === "report" && <ShopReport />}
    </>
  );
}