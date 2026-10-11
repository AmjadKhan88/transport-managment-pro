import { cardClass } from "@/components/ui/styles";
import ExportButtons from "./ExportButtons";

export default function ReportSection({ title, description, exportConfig, disabled, children }) {
  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        <ExportButtons config={exportConfig} disabled={disabled} />
      </div>
      {children}
    </div>
  );
}