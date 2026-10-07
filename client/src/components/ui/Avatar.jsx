export default function Avatar({ name = "", variant = "solid" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const styles =
    variant === "soft"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : "bg-gradient-to-br from-emerald-500 to-green-700 text-white";

  return (
    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[11px] font-extrabold ${styles}`}>
      {initials || "?"}
    </div>
  );
}