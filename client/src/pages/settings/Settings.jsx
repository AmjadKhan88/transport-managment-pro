import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import AccountTab from "@/components/settings/AccountTab";
import SystemTab from "@/components/settings/SystemTab";

export default function Settings() {
  const { user } = useAuth();
  const tabs = [
    { value: "account", label: "My account" },
    ...(user.role === "admin" ? [{ value: "system", label: "System" }] : []),
  ];
  const [tab, setTab] = useState("account");

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account, and the health of the system." />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "account" && <AccountTab />}
      {tab === "system" && <SystemTab />}
    </>
  );
}