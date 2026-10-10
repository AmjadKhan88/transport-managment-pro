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
  const surface =
    solid === "green"
      ? "bg-green-800 text-white"
      : solid === "red"
        ? "bg-red-700 text-white"
        : "border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900";

  const labelColor = solid ? "text-white/80" : "text-gray-500 dark:text-gray-400";
  const valueColor = solid ? "text-white" : "text-gray-900 dark:text-gray-50";

  return (
    <div className={`rounded-xl p-5 ${surface}`}>
      <p className={`text-sm ${labelColor}`}>{label}</p>
      <p className={`mt-1.5 text-[28px] font-semibold leading-tight ${valueColor}`}>{value}</p>
      {sub && <p className={`mt-1 text-[13px] ${labelColor}`}>{sub}</p>}
      <Delta delta={delta} upIsGood={upIsGood} solid={solid} />
    </div>
  );
}