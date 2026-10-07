import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AppFooter from "./AppFooter";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSidebarOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/30" />
      <div className="pointer-events-none fixed -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-emerald-200/25 blur-[120px] dark:bg-emerald-500/10" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 -z-10 h-[420px] w-[420px] rounded-full bg-green-200/20 blur-[120px] dark:bg-green-500/10" />

      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
            <Outlet />
            <AppFooter />
          </main>
        </div>
      </div>
    </>
  );
}