import { Link } from "react-router-dom";
import { cardClass } from "@/components/ui/styles";
import { formatPKR } from "@/utils/format";

function PanelHeader({ title, to, linkText }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      {to && (
        <Link to={to} className="text-sm font-medium text-green-800 hover:underline dark:text-green-400">
          {linkText} →
        </Link>
      )}
    </div>
  );
}

export function ReceivablesPanel({ receivables }) {
  return (
    <div className={`${cardClass} p-5`}>
      <PanelHeader title="Receivables" to="/receivables" linkText="View all" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Customers owe you</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(receivables.total)}</p>
      {receivables.d90plus > 0 && (
        <p className="mt-1 text-sm font-medium text-red-700 dark:text-red-400">
          {formatPKR(receivables.d90plus)} is over 90 days old
        </p>
      )}

      <div className="mt-4 divide-y divide-gray-200 border-t border-gray-200 dark:divide-gray-800 dark:border-gray-800">
        {receivables.top.length === 0 && <p className="py-3 text-sm text-gray-500">No customer owes you anything.</p>}
        {receivables.top.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
            <Link to={`/receivables/${c.id}`} className="min-w-0 truncate text-gray-800 hover:underline dark:text-gray-200">
              {c.name}
            </Link>
            <span className="shrink-0 font-medium text-gray-900 dark:text-gray-100">{formatPKR(c.balance)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PayablesPanel({ payables }) {
  const rows = payables.kinds.filter((k) => k.total > 0);
  const max = Math.max(...rows.map((k) => k.total), 1);

  return (
    <div className={`${cardClass} p-5`}>
      <PanelHeader title="Payables" to="/payables" linkText="View all" />
      <p className="text-sm text-gray-500 dark:text-gray-400">You owe</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(payables.total)}</p>

      <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-800">
        {rows.length === 0 && <p className="text-sm text-gray-500">Nothing is outstanding.</p>}
        {rows.map((k) => (
          <div key={k.kind}>
            <div className="flex items-center justify-between text-[15px]">
              <span className="text-gray-700 dark:text-gray-300">{k.label}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatPKR(k.total)}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div className="h-full rounded-full bg-green-800" style={{ width: `${(k.total / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssetsPanel({ assets, investment }) {
  const Row = ({ label, value }) => (
    <div className="flex items-center justify-between py-2.5 text-[15px]">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">{formatPKR(value)}</span>
    </div>
  );

  return (
    <div className={`${cardClass} p-5`}>
      <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Current assets (estimate)</h2>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        <Row label="Receivables" value={assets.receivables} />
        <Row label="Shop stock (at cost)" value={assets.stock} />
        <div className="flex items-center justify-between py-3">
          <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Total</span>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">{formatPKR(assets.total)}</span>
        </div>
      </div>
      <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400">
        Cash and bank balances are not tracked in this system, so they are not included.
      </p>

      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
        <div className="flex items-center justify-between text-[15px]">
          <span className="text-gray-600 dark:text-gray-400">Vehicle investment</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{formatPKR(investment.vehicles)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[15px]">
          <span className="text-gray-600 dark:text-gray-400">Shop, office and other</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{formatPKR(investment.other)}</span>
        </div>
      </div>
    </div>
  );
}