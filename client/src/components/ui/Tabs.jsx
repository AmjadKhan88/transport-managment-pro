export default function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`-mb-px whitespace-nowrap border-b-2 px-1 pb-3 text-[15px] font-medium transition ${value === t.value
            ? "border-green-800 text-green-800 dark:border-green-400 dark:text-green-400"
            : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}