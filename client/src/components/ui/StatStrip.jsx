export default function StatStrip({ items }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-gray-900 dark:text-gray-50">
            {item.value}
            {item.suffix && <span className="ml-1.5 text-base font-normal text-gray-500">{item.suffix}</span>}
          </p>
          {item.progress !== undefined ? (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div className="h-full rounded-full bg-green-800" style={{ width: `${Math.min(item.progress, 100)}%` }} />
            </div>
          ) : (
            item.sub && <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">{item.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}