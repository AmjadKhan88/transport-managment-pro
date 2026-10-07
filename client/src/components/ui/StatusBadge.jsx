const tones = {
  emerald: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  amber: {
    badge: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    dot: "bg-amber-500",
  },
  sky: {
    badge: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20",
    dot: "bg-sky-500",
  },
  rose: {
    badge: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
    dot: "bg-rose-500",
  },
  slate: {
    badge: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
    dot: "bg-slate-400",
  },
};

export default function StatusBadge({ label, tone = "slate" }) {
  const t = tones[tone] || tones.slate;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1 ${t.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {label}
    </span>
  );
}