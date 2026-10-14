import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import BackupsTab from "@/components/backup/BackupsTab";
import ActivityLog from "@/components/backup/ActivityLog";

const TABS = [
  { value: "backups", label: "Backups" },
  { value: "activity", label: "Activity log" },
];

export default function Backup() {
  const [tab, setTab] = useState("backups");

  return (
    <>
      <PageHeader
        title="Backup & Security"
        crumb="Backup"
        subtitle="Protect your data and see who did what."
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "backups" ? <BackupsTab /> : <ActivityLog />}
    </>
  );
}