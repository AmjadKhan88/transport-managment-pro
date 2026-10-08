const tones = {
  green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};
const alias = { emerald: "green", rose: "red", slate: "gray" };

export default function StatusBadge({ label, tone = "gray" }) {
  const key = alias[tone] || tone;
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-medium ${tones[key] || tones.gray}`}>
      {label}
    </span>
  );
}