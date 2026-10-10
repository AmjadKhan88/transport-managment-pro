import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { dashboardService } from "@/services/dashboardService";
import {
  PERIOD_CHOICES, PERIOD_NAME, PREVIOUS_LABEL, getDateRange, getPreviousRange,
} from "@/utils/period";
import { formatCompact, formatPKR, formatSigned } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatStrip from "@/components/ui/StatStrip";
import Select from "@/components/ui/Select";
import { cardClass } from "@/components/ui/styles";
import KpiCard from "@/components/dashboard/KpiCard";
import { IncomeExpenseChart, ProfitChart, ExpenseDonut } from "@/components/dashboard/charts";
import VehiclePerformance from "@/components/dashboard/VehiclePerformance";
import { ReceivablesPanel, PayablesPanel, AssetsPanel } from "@/components/dashboard/DuesPanels";
import OwnerQuestions from "@/components/dashboard/OwnerQuestions";

const pctChange = (cur, prev) => (prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100);
const sum = (cats, keys) => keys.reduce((s, k) => s + (cats.find((c) => c.key === k)?.amount || 0), 0);

export default function Dashboard() {
  const { user, can } = useAuth();
  const [period, setPeriod] = useState("this-month");

  const range = getDateRange(period);
  const prev = getPreviousRange(period);
  const year = range.to ? range.to.slice(0, 4) : String(new Date().getFullYear());
  const params = { from: range.from, to: range.to, prevFrom: prev.from, prevTo: prev.to, year };

  const allowed = can("reports", "view");
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", params],
    queryFn: () => dashboardService.get(params),
    enabled: allowed,
  });

  if (!allowed) {
    return (
      <div className={`${cardClass} p-8`}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Welcome, {user?.name}</h1>
        <p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
          Use the menu on the left to enter and manage your records. Company totals are visible to users with report access.
        </p>
      </div>
    );
  }

  const periodName = PERIOD_NAME[period];
  const prevLabel = PREVIOUS_LABEL[period];

  const header = (
    <PageHeader
      title="Business Dashboard"
      subtitle="Every vehicle, trip, expense and rupee — one complete system."
      actions={
        <div className="w-52">
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </div>
      }
    />
  );

  if (isLoading) return <>{header}<p className="text-sm text-gray-500">Loading dashboard…</p></>;
  if (error) return <>{header}<p className="text-sm text-red-700 dark:text-red-400">{error.message}</p></>;

  const o = data.overview;
  const p = data.previous;
  const cats = o.expenses.categories;
  const compare = (cur, before) => (p ? { pct: pctChange(cur, before), label: prevLabel } : undefined);

  const activePct = data.vehicles.total ? (data.vehicles.active / data.vehicles.total) * 100 : 0;
  const quick = [
    { label: "Active vehicles", value: data.vehicles.active, suffix: `/ ${data.vehicles.total}`, progress: activePct },
    { label: "Drivers", value: data.drivers.active, suffix: `/ ${data.drivers.total}`, sub: "Active of total" },
    { label: "Diesel expense", value: `Rs ${formatCompact(sum(cats, ["diesel"]))}`, sub: "Fuel entries" },
    { label: "Repair & maintenance", value: `Rs ${formatCompact(sum(cats, ["vehicle_repair", "vehicle_maintenance"]))}`, sub: periodName },
    { label: "Receivables", value: `Rs ${formatCompact(data.receivables.total)}`, sub: "Customers owe you" },
    { label: "Payables", value: `Rs ${formatCompact(data.payables.total)}`, sub: "You owe" },
  ];

  const loss = o.netProfit < 0;

  return (
    <>
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total investment" value={`Rs ${formatCompact(data.investment.total)}`} sub="All time, all departments" />
        <KpiCard
          label="Total income"
          value={`Rs ${formatCompact(o.income.total)}`}
          sub={periodName}
          delta={compare(o.income.total, p?.income.total ?? 0)}
          upIsGood
        />
        <KpiCard
          label="Total expenses"
          value={`Rs ${formatCompact(o.expenses.total)}`}
          sub={periodName}
          delta={compare(o.expenses.total, p?.expenses.total ?? 0)}
          upIsGood={false}
        />
        <KpiCard
          solid={loss ? "red" : "green"}
          label={loss ? "Net loss" : "Net profit"}
          value={formatSigned(o.netProfit).replace("Rs ", "Rs ")}
          sub={periodName}
          delta={compare(o.netProfit, p?.netProfit ?? 0)}
          upIsGood
        />
      </div>

      <StatStrip items={quick} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className={`${cardClass} p-5 xl:col-span-2`}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Income vs expenses</h2>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Month by month, {data.chartYear}</p>
          <IncomeExpenseChart monthly={data.monthly} />
        </div>

        <div className={`${cardClass} p-5`}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Where the money went</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Expenses {periodName}</p>
          <ExpenseDonut expenses={o.expenses} />
        </div>
      </div>

      <div className={`${cardClass} p-5`}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Monthly profit &amp; loss</h2>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Green months made a profit, red months made a loss — {data.chartYear}
        </p>
        <ProfitChart monthly={data.monthly} />
      </div>

      <VehiclePerformance vehicles={data.vehicles.performance} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ReceivablesPanel receivables={data.receivables} />
        <PayablesPanel payables={data.payables} />
        <AssetsPanel assets={data.assets} investment={data.investment} />
      </div>

      <OwnerQuestions data={data} periodName={periodName} previousLabel={p ? prevLabel : null} />
    </>
  );
}