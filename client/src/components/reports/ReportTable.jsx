import { formatCompact, formatNumber, formatPKR, formatSigned } from "@/utils/format";
import { thClass, tdClass } from "@/components/ui/styles";

export function formatCell(type, v) {
  if (v === null || v === undefined || v === "") return "—";
  switch (type) {
    case "money": return formatPKR(v);
    case "compact": return Number(v) ? formatCompact(v) : "—";
    case "signed":
    case "delta": return formatSigned(v);
    case "number": return formatNumber(v);
    case "percent": return `${Number(v).toFixed(1)}%`;
    default: return String(v);
  }
}

const isNumeric = (c) => c.type && c.type !== "text";
const valueOf = (c, row) => (c.value ? c.value(row) : row[c.key]);
const signClass = (v) =>
  v < 0 ? "text-red-700 dark:text-red-400" : v > 0 ? "text-green-800 dark:text-green-400" : "";

export default function ReportTable({ columns, rows, totals, loading, error, emptyText = "No data for this selection.", minWidth = 720 }) {
  const span = columns.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            {columns.map((c) => (
              <th key={c.key} className={`${thClass} ${isNumeric(c) ? "text-right" : ""}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {loading && <tr><td colSpan={span} className="px-5 py-12 text-center text-sm text-gray-500">Loading report…</td></tr>}
          {error && <tr><td colSpan={span} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
          {!loading && !error && rows.length === 0 && (
            <tr><td colSpan={span} className="px-5 py-12 text-center text-sm text-gray-500">{emptyText}</td></tr>
          )}

          {rows.map((row, i) => (
            <tr
              key={row.id ?? row.key ?? i}
              className={row._bold ? "bg-gray-50 dark:bg-gray-800/50" : "hover:bg-gray-50 dark:hover:bg-gray-800/40"}
            >
              {columns.map((c) => {
                const v = valueOf(c, row);
                return (
                  <td
                    key={c.key}
                    className={`${tdClass} ${isNumeric(c) ? "whitespace-nowrap text-right" : ""} ${c.type === "signed" ? signClass(v) : ""
                      } ${row._bold ? "font-semibold text-gray-900 dark:text-gray-100" : ""}`}
                  >
                    {c.cell ? c.cell(row) : formatCell(c.type, v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>

        {totals && rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
              {columns.map((c, i) => (
                <td
                  key={c.key}
                  className={`${tdClass} font-semibold text-gray-900 dark:text-gray-100 ${isNumeric(c) ? "whitespace-nowrap text-right" : ""} ${c.type === "signed" ? signClass(totals[c.key]) : ""
                    }`}
                >
                  {i === 0 ? "Total" : formatCell(c.type, totals[c.key])}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}