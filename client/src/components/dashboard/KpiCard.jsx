// delta: { pct, label } where pct is the % change vs the previous period (null if not comparable)
function Delta({ delta, upIsGood, solid }) {
  if (!delta) return null;

  if (delta.pct === null) {
    return (
      <p className={`mt-2 text-[13px] ${solid ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
        Nothing to compare with {delta.label}
      </p>
    );
  }

  const up = delta.pct >= 0;
  const good = upIsGood ? up : !up;
  const color = solid ? "text-white" : good ? "text-green-800 dark:text-green-400" : "text-red-700 dark:text-red-400";

  return (
    <p className={`mt-2 text-[13px] ${solid ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
      <span className={`font-semibold ${color}`}>
        {up ? "▲" : "▼"} {Math.abs(delta.pct).toFixed(1)}%
      </span>{" "}
      vs {delta.label}
    </p>
  );
}


export default function KpiCard({ label, value, sub, delta, upIsGood = true, solid }) {
  const isSolid = solid === "green" || solid === "red";

  const surface = isSolid
    ? solid === "green"
      ? "bg-green-800 text-white shadow-sm shadow-green-950/20 dark:shadow-none"
      : "bg-red-700 text-white shadow-sm shadow-red-950/20 dark:shadow-none"
    : [
      // ── light ────────────────────────────────────────────────────────────
      "border border-gray-200/70 bg-linear-to-b from-white to-gray-50/70",
      "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-20px_rgba(16,24,40,0.28)]",
      "hover:border-gray-300 hover:to-gray-100/60",
      "hover:shadow-[0_2px_4px_rgba(16,24,40,0.05),0_20px_40px_-24px_rgba(16,24,40,0.38)]",
      "transition duration-200",
      // ── dark: kept exactly as it was ─────────────────────────────────────
      "dark:border-gray-800 dark:bg-gray-900 dark:bg-none dark:shadow-none",
      "dark:hover:border-gray-800",
    ].join(" ");

  const labelClass = isSolid
    ? "text-white/80"
    : "font-medium tracking-wide text-gray-500 dark:font-normal dark:tracking-normal dark:text-gray-400";

  const valueClass = isSolid
    ? "text-white"
    : "tracking-tight tabular-nums text-gray-900 dark:tracking-normal dark:normal-nums dark:text-gray-50";

  const subClass = isSolid ? "text-white/80" : "text-gray-400 dark:text-gray-400";

  return (
    <div className={`relative rounded-xl p-5 ${surface}`}>
      {!isSolid && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-gray-300 to-transparent dark:hidden"
        />
      )}

      <p className={`text-sm ${labelClass}`}>{label}</p>

      <p className={`mt-1.5 text-[28px] font-semibold leading-tight ${valueClass}`}>
        {value}
      </p>

      {sub && <p className={`mt-1 text-[13px] ${subClass}`}>{sub}</p>}

      <Delta delta={delta} upIsGood={upIsGood} solid={solid} />
    </div>
  );
}