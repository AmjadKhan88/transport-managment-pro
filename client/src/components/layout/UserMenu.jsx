import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/config/roles";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 transition hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-500/50"
      >
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-green-700 text-[11px] font-bold text-white">
          {initials}
        </div>
        <div className="hidden text-left leading-tight sm:block">
          <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{user.name}</p>
          <p className="text-[10px] font-medium text-green-700 dark:text-emerald-400">{ROLE_LABELS[user.role]}</p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
              <path d="M10 17l-5-5 5-5M5 12h11" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}