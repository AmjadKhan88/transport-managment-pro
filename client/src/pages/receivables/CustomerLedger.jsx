import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { receivablesService } from "@/services/settlementServices";
import { formatDate, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { cardClass, primaryBtn, secondaryBtn, thClass, tdClass } from "@/components/ui/styles";
import ReceivePaymentDrawer from "@/components/receivables/ReceivePaymentDrawer";

const TYPE = {
  opening: { label: "Opening", tone: "gray" },
  trip: { label: "Trip", tone: "sky" },
  payment: { label: "Payment", tone: "green" },
};

function Stat({ label, value, emphasis }) {
  return (
    <div className={`${cardClass} p-5`}>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1.5 text-xl font-semibold ${emphasis ?? "text-gray-900 dark:text-gray-50"}`}>{value}</p>
    </div>
  );
}

export default function CustomerLedger() {
  const { id } = useParams();
  const { can } = useAuth();
  const [paying, setPaying] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["receivables", "statement", id],
    queryFn: () => receivablesService.statement(id),
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading ledger…</p>;
  if (error) {
    return (
      <div className={`${cardClass} p-5`}>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">{error.message}</p>
        <Link to="/receivables" className={`${secondaryBtn} mt-4`}>← Back to receivables</Link>
      </div>
    );
  }

  const { customer, summary, statement } = data;
  const b = summary.buckets;

  return (
    <>
      <PageHeader
        title={customer.name}
        crumb={`Receivables / ${customer.name}`}
        subtitle={[customer.companyName, customer.phone].filter(Boolean).join(" · ") || "Customer ledger"}
        actions={
          <>
            <Link to="/receivables" className={secondaryBtn}>← Back</Link>
            {can("receivables", "add") && (
              <button className={primaryBtn} onClick={() => setPaying(true)}>Receive payment</button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Stat label="Total trips" value={summary.trips} />
        <Stat label="Total freight" value={formatPKR(summary.freight)} />
        <Stat label="Advances received" value={formatPKR(summary.advances)} />
        <Stat label="Payments received" value={formatPKR(summary.payments)} />
        <Stat
          label={summary.balance < 0 ? "Customer credit" : "Balance owed"}
          value={formatPKR(Math.abs(summary.balance))}
          emphasis={summary.balance > 0 ? "text-red-700 dark:text-red-400" : "text-green-800 dark:text-green-400"}
        />
      </div>

      <div className={`${cardClass} p-5`}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">How old is the unpaid amount</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            ["Opening", b.opening], ["0–30 days", b.d30], ["31–60 days", b.d60], ["61–90 days", b.d90], ["90+ days", b.d90plus],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`mt-0.5 text-[15px] font-semibold ${label === "90+ days" && value ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
                {value ? formatPKR(value) : "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Statement</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Date</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Details</th>
                <th className={`${thClass} text-right`}>Charged</th>
                <th className={`${thClass} text-right`}>Received</th>
                <th className={`${thClass} text-right`}>Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {statement.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">No activity for this customer yet.</td></tr>
              )}
              {statement.map((r) => {
                const type = TYPE[r.type];
                return (
                  <tr key={`${r.type}-${r.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={`${tdClass} whitespace-nowrap`}>{r.date ? formatDate(r.date) : "—"}</td>
                    <td className={tdClass}><StatusBadge label={type.label} tone={type.tone} /></td>
                    <td className={`${tdClass} max-w-[320px]`}>{r.description}</td>
                    <td className={`${tdClass} text-right`}>{r.debit ? formatPKR(r.debit) : "—"}</td>
                    <td className={`${tdClass} text-right`}>{r.credit ? formatPKR(r.credit) : "—"}</td>
                    <td className={`${tdClass} text-right font-semibold text-gray-900 dark:text-gray-100`}>{formatPKR(r.balance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {paying && (
        <ReceivePaymentDrawer
          customer={{ id: customer.id, name: customer.name, balance: summary.balance }}
          onClose={() => setPaying(false)}
        />
      )}
    </>
  );
}