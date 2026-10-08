export default function PageHeader({ title, subtitle, crumb, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
          Home / <span className="text-gray-700 dark:text-gray-300">{crumb || title}</span>
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-gray-600 dark:text-gray-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}