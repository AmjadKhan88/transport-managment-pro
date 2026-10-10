import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Cell, ReferenceLine, PieChart, Pie,
} from "recharts";
import { useTheme } from "@/hooks/useTheme";
import { formatCompact, formatPKR, formatSigned } from "@/utils/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const GREEN = "#166534"; // green-800
const RED = "#b91c1c"; // red-700
const GRAY = "#9ca3af"; // gray-400

function useChartColors() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    axis: dark ? "#9ca3af" : "#6b7280",
    grid: dark ? "#1f2937" : "#e5e7eb",
    cursor: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    tooltip: {
      backgroundColor: dark ? "#111827" : "#ffffff",
      border: `1px solid ${dark ? "#374151" : "#e5e7eb"}`,
      borderRadius: 8,
      color: dark ? "#f3f4f6" : "#111827",
      fontSize: 14,
    },
  };
}

const axisProps = (c) => ({
  tick: { fill: c.axis, fontSize: 13 },
  axisLine: false,
  tickLine: false,
});

export function IncomeExpenseChart({ monthly }) {
  const c = useChartColors();
  const data = monthly.map((m, i) => ({ name: MONTHS[i], Income: m.income, Expenses: m.expenses }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="name" {...axisProps(c)} />
        <YAxis {...axisProps(c)} width={64} tickFormatter={formatCompact} />
        <Tooltip formatter={(v) => formatPKR(v)} contentStyle={c.tooltip} cursor={{ fill: c.cursor }} />
        <Legend wrapperStyle={{ fontSize: 14, color: c.axis }} />
        <Bar dataKey="Income" fill={GREEN} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill={GRAY} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProfitChart({ monthly }) {
  const c = useChartColors();
  const data = monthly.map((m, i) => ({ name: MONTHS[i], Profit: m.profit }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="name" {...axisProps(c)} />
        <YAxis {...axisProps(c)} width={64} tickFormatter={formatCompact} />
        <Tooltip
          formatter={(v) => [formatSigned(v), v < 0 ? "Loss" : "Profit"]}
          contentStyle={c.tooltip}
          cursor={{ fill: c.cursor }}
        />
        <ReferenceLine y={0} stroke={c.axis} />
        <Bar dataKey="Profit" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.Profit < 0 ? RED : GREEN} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const SLICES = ["#166534", "#0369a1", "#d97706", "#6b7280", "#7c3aed", "#b91c1c"];

const sumOf = (categories, keys) =>
  keys.reduce((s, k) => s + (categories.find((c) => c.key === k)?.amount || 0), 0);

// Groups the 18 categories the way the spec's expense chart does
export function ExpenseDonut({ expenses }) {
  const c = useChartColors();
  const cats = expenses.categories;

  const groups = [
    { name: "Diesel / Fuel", value: sumOf(cats, ["diesel"]) },
    { name: "Salaries", value: sumOf(cats, ["driver_salary", "staff_salary"]) },
    { name: "Repair & maintenance", value: sumOf(cats, ["vehicle_repair", "vehicle_maintenance"]) },
    { name: "Office", value: sumOf(cats, ["office_expense"]) },
    { name: "Shop", value: sumOf(cats, ["shop_expense"]) },
  ];
  const other = expenses.total - groups.reduce((s, g) => s + g.value, 0);
  groups.push({ name: "Other", value: Math.max(other, 0) });

  const data = groups.filter((g) => g.value > 0);
  const total = expenses.total;

  if (data.length === 0) {
    return <p className="py-16 text-center text-[15px] text-gray-500 dark:text-gray-400">No expenses in this period.</p>;
  }

  return (
    <div>
      <div className="relative mx-auto h-[210px] w-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={66} outerRadius={98} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={SLICES[groups.findIndex((g) => g.name === d.name)]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatPKR(v)} contentStyle={c.tooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{formatCompact(total)}</p>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-3 text-[15px]">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: SLICES[groups.findIndex((g) => g.name === d.name)] }} />
            <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
            <span className="ml-auto font-medium text-gray-900 dark:text-gray-100">{((d.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}