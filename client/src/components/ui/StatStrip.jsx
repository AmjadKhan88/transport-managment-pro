const dotColors = {
  emerald: "bg-emerald-500", sky: "bg-sky-500", amber: "bg-amber-500",
  violet: "bg-violet-500", rose: "bg-rose-500", slate: "bg-slate-400",
};

export default function StatStrip({ items }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="-mb-px -mr-px grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="border-b border-r border-slate-100 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${dotColors[item.color] || dotColors.slate}`} />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
            </div>
            <p className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">
              {item.value}
              {item.suffix && <span className="ml-1 text-xs font-semibold text-slate-400">{item.suffix}</span>}
            </p>
            {item.progress !== undefined ? (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                  style={{ width: `${Math.min(item.progress, 100)}%` }}
                />
              </div>
            ) : (
              item.sub && <p className="mt-1 text-[11px] font-medium text-slate-400">{item.sub}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}