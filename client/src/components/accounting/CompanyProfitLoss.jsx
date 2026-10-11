import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { companyService } from "@/services/accountingServices";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import { formatPKR, formatSigned } from "@/utils/format";
import Select from "@/components/ui/Select";
import { cardClass, thClass, tdClass } from "@/components/ui/styles";
import ReportSection from "@/components/reports/ReportSection";
import ReportTable from "@/components/reports/ReportTable";

const profitClass = (n) => (n < 0 ? "text-red-700 dark:text-red-400" : "text-green-800 dark:text-green-400");

const STATEMENT_COLUMNS = [
  { key: "item", header: "Item", type: "text" },
  { key: "from", header: "Comes from", type: "text" },
  { key: "amount", header: "Amount", type: "money" },
];

export default function CompanyProfitLoss() {
  const [period, setPeriod] = useState("this-month");
  const range = getDateRange(period);
  const params = { from: range.from, to: range.to };
  const periodLabel = PERIOD_CHOICES.find((p) => p.value === period)?.label;

  const { data, isLoading, error } = useQuery({
    queryKey: ["company", "overview", params],
    queryFn: () => companyService.overview(params),
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading company figures…</p>;
  if (error) return <p className="text-sm text-red-700 dark:text-red-400">{error.message}</p>;

  const { income, expenses, netProfit, departments, diesel, customerPayments } = data;
  const dieselGap = diesel.fuelPurchased - diesel.tripDiesel;

  const statement = [
    { item: "Trip freight", from: "Trips", amount: income.freight },
    { item: "Shop sales", from: "Shop", amount: income.shopSales },
    { item: "Other business income", from: "Income entries", amount: income.otherBusiness },
    { item: "Other receipts", from: "Income entries", amount: income.otherReceipts },
    { item: "Total income", from: "", amount: income.total, _bold: true },
    ...expenses.categories.map((c) => ({ item: c.label, from: c.from, amount: c.amount })),
    { item: "Total expenses", from: "", amount: expenses.total, _bold: true },
    { item: netProfit < 0 ? "Net loss" : "Net profit", from: "Total income - total expenses", amount: netProfit, _bold: true },
  ];

  return (
    <>
      <div className="max-w-xs">
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={`${cardClass} p-5`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total income</p>
          <p className="mt-1.5 text-2xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(income.total)}</p>
          <p className="mt-1 text-[13px] text-gray-500">Freight + shop sales + other income</p>
        </div>
        <div className={`${cardClass} p-5`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total expenses</p>
          <p className="mt-1.5 text-2xl font-semibold text-gray-900 dark:text-gray-50">{formatPKR(expenses.total)}</p>
          <p className="mt-1 text-[13px] text-gray-500">All 18 categories</p>
        </div>
        <div className={`rounded-xl p-5 text-white ${netProfit < 0 ? "bg-red-700" : "bg-green-800"}`}>
          <p className="text-sm text-white/80">{netProfit < 0 ? "Net loss" : "Net profit"}</p>
          <p className="mt-1.5 text-2xl font-semibold">{formatSigned(netProfit)}</p>
          <p className="mt-1 text-[13px] text-white/80">Income − expenses (investment not deducted)</p>
        </div>
      </div>

      <div className={cardClass}>
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">By department</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Department</th>
                <th className={`${thClass} text-right`}>Income</th>
                <th className={`${thClass} text-right`}>Expenses</th>
                <th className={`${thClass} text-right`}>Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {departments.map((d) => (
                <tr key={d.key}>
                  <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>{d.label}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(d.income)}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(d.expenses)}</td>
                  <td className={`${tdClass} text-right font-semibold ${profitClass(d.profit)}`}>{formatSigned(d.profit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <td className={`${tdClass} font-semibold text-gray-900 dark:text-gray-100`}>Company</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(income.total)}</td>
                <td className={`${tdClass} text-right font-semibold`}>{formatPKR(expenses.total)}</td>
                <td className={`${tdClass} text-right font-semibold ${profitClass(netProfit)}`}>{formatSigned(netProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <ReportSection
        title="Profit & loss statement"
        description={`${periodLabel}. Every expense category and where it comes from.`}
        exportConfig={{
          title: "Profit and loss statement",
          subtitle: periodLabel,
          columns: STATEMENT_COLUMNS,
          rows: statement,
          filename: "profit-and-loss",
          sheetName: "Profit and loss",
        }}
      >
        <ReportTable columns={STATEMENT_COLUMNS} rows={statement} minWidth={560} />
      </ReportSection>

      <div className={`${cardClass} space-y-2 p-5 text-sm text-gray-700 dark:text-gray-300`}>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">How these numbers are counted</h3>
        <p>
          Diesel is taken from <span className="font-medium">{diesel.source === "trips" ? "the diesel cost typed on trips" : "fuel entries in the Diesel module"}</span>.
          Fuel purchased: {formatPKR(diesel.fuelPurchased)}. Diesel cost typed on trips: {formatPKR(diesel.tripDiesel)}.
          {dieselGap !== 0 && ` Difference: ${formatSigned(dieselGap)}. Vehicle profit uses the trip figure, so company profit can differ from the sum of vehicle profits by this amount.`}
        </p>
        <p>Customer payments received this period ({formatPKR(customerPayments)}) are not added to income. They settle freight already counted from Trips.</p>
        <p>Salaries come from salary records only. Shop and office salary lines are department views of the same data.</p>
      </div>
    </>
  );
}