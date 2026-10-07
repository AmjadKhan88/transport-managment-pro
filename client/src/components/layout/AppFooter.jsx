export default function AppFooter() {
  return (
    <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/70 pb-2 pt-6 text-[11.5px] text-slate-400 sm:flex-row dark:border-slate-800">
      <p>
        © {new Date().getFullYear()}{" "}
        <span className="font-bold text-slate-600 dark:text-slate-300">Geo Shalmani Company</span> —
        Transportation &amp; Business Management System
      </p>
      <p className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        All systems operational
      </p>
    </footer>
  );
}