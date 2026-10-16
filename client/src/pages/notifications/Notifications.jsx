import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import TodayTab from "@/components/notifications/TodayTab";
import AllTab from "@/components/notifications/AllTab";
import PrefsTab from "@/components/notifications/PrefsTab";

const TABS = [
  { value: "today", label: "Today's work" },
  { value: "all", label: "All notifications" },
  { value: "prefs", label: "Settings" },
];

export default function Notifications() {
  const [tab, setTab] = useState("today");

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="See who did what, and get reminders when something needs attention."
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "today" && <TodayTab />}
      {tab === "all" && <AllTab />}
      {tab === "prefs" && <PrefsTab />}
    </>
  );
}