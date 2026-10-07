import { useEffect, useMemo, useRef } from "react";
import { getPeriodOptions } from "@/utils/period";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function Topbar({ onMenuClick }) {
  const searchRef = useRef(null);
  const periods = useMemo(() => getPeriodOptions(), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 lg:hidden dark:border-slate-700 dark:text-slate-400"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        {/* Search */}
        <div className="relative hidden max-w-md flex-1 sm:block">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search vehicle #311, driver, party, trip…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-16 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-emerald-500/60 dark:focus:bg-slate-800"
          />
          <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
            ⌘K
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Period */}
          <div className="relative hidden md:block">
            <select
              defaultValue="this-month"
              className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white pl-3.5 pr-9 text-[13px] font-semibold text-slate-600 outline-none transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-500/50"
            >
              {periods.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          <ThemeToggle />

          {/* Bell */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-emerald-500/50 dark:hover:text-emerald-400"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800" />
          </button>

          {/* User (static until Auth step) */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}