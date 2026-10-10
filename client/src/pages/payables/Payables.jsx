import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { payablesService } from "@/services/settlementServices";
import { KIND_LABELS, partyLabel } from "@/config/payables";
import { methodLabel } from "@/config/payment";
import { monthLabel } from "@/utils/period";
import { formatCompact, formatDate, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatStrip from "@/components/ui/StatStrip";
import Tabs from "@/components/ui/Tabs";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, primaryBtn, thClass, tdClass, iconBtn } from "@/components/ui/styles";
import PayDrawer from "@/components/payables/PayDrawer";

const TABS = [
  { value: "outstanding", label: "Outstanding" },
  { value: "history", label: "Payment history" },
];

function Outstanding() {
  const { can } = useAuth();
  const [paying, setPaying] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["payables", "overview"],
    queryFn: payablesService.overview,
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading payables…</p>;
  if (error) return <p className="text-sm text-red-700 dark:text-red-400">{error.message}</p>;

  const stats = [
    { label: "Total payable", value: `Rs ${formatCompact(data.total)}`, sub: "You owe everyone" },
    ...data.kinds.map((k) => ({ label: k.label, value: `Rs ${formatCompact(k.total)}`, sub: `${k.parties.length} to pay` })),
  ];
  const withDebt = data.kinds.filter((k) => k.parties.length > 0);

  return (
    <>
      <StatStrip items={stats} />

      {withDebt.length === 0 && (
        <div className={`${cardClass} p-8 text-center text-[15px] text-gray-600 dark:text-gray-400`}>
          Nothing is outstanding. All bills are settled.
        </div>
      )}

      {withDebt.map((kind) => (
        <div key={kind.kind} className={cardClass}>
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{kind.label}</h2>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{formatPKR(kind.total)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className={thClass}>{kind.kind === "salary" ? "Person" : "Pay to"}</th>
                  <th className={`${thClass} text-right`}>Bills</th>
                  <th className={thClass}>Oldest</th>
                  <th className={`${thClass} text-right`}>You owe</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {kind.parties.map((p) => (
                  <tr key={p.key || "unspecified"} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>{partyLabel(kind.kind, p)}</td>
                    <td className={`${tdClass} text-right`}>{p.count}</td>
                    <td className={tdClass}>{kind.kind === "salary" ? monthLabel(p.oldest) : formatDate(p.oldest)}</td>
                    <td className={`${tdClass} text-right font-semibold text-gray-900 dark:text-gray-100`}>{formatPKR(p.outstanding)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {can("payables", "add") && (
                        <button
                          className={`${primaryBtn} !h-9 !px-3 !text-[13px]`}
                          onClick={() =>
                            setPaying({ kind: kind.kind, partyKey: p.key, name: partyLabel(kind.kind, p), outstanding: p.outstanding })
                          }
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {paying && <PayDrawer key={`${paying.kind}-${paying.partyKey}`} target={paying} onClose={() => setPaying(null)} />}
    </>
  );
}

function History() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);

  const params = { page, limit: 10, kind: kind || undefined };
  const { data: list, isLoading, error } = useQuery({
    queryKey: ["payables", "payments", params],
    queryFn: () => payablesService.payments(params),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => payablesService.removePayment(id),
    onSuccess: () => {
      toast.success("Payment reversed");
      for (const key of ["payables", "diesel", "repairs", "shop", "office", "expenses"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const payments = list?.data ?? [];

  return (
    <>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Salary payments are not listed here. They are recorded on the salary records (Employees &amp; Salaries).
      </p>

      <div className={cardClass}>
        <div className="max-w-xs border-b border-gray-200 p-4 dark:border-gray-800">
          <Select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}>
            <option value="">All types</option>
            {["repair", "fuel", "shop", "office", "expense"].map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Date</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Paid to</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={thClass}>Method</th>
                <th className={`${thClass} text-right`}>Bills</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">Loading payments…</td></tr>}
              {error && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && payments.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">No payments recorded yet.</td></tr>
              )}

              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(p.paymentDate)}</td>
                  <td className={tdClass}>{KIND_LABELS[p.kind]}</td>
                  <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>{partyLabel(p.kind, { key: p.party, label: p.party })}</td>
                  <td className={`${tdClass} text-right font-semibold text-gray-900 dark:text-gray-100`}>{formatPKR(p.amount)}</td>
                  <td className={tdClass}>
                    <p>{methodLabel(p.paymentMethod)}</p>
                    {p.reference && <p className="text-[13px] text-gray-500">{p.reference}</p>}
                  </td>
                  <td className={`${tdClass} text-right`}>{p.bills}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end">
                      {can("payables", "delete") && (
                        <button title="Reverse payment" aria-label="Reverse payment" onClick={() => setToDelete(p)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
                          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={list?.meta} onChange={setPage} />
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Reverse payment"
          confirmLabel="Reverse"
          message={`The payment of ${formatPKR(toDelete.amount)} will be undone and the bills it covered will become unpaid again.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}

export default function Payables() {
  const [tab, setTab] = useState("outstanding");

  return (
    <>
      <PageHeader title="Payables" subtitle="Everything you owe, and who you owe it to." />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "outstanding" ? <Outstanding /> : <History />}
    </>
  );
}