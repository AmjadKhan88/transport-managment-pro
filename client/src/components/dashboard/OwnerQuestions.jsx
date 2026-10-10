import { cardClass } from "@/components/ui/styles";
import { formatPKR, formatSigned } from "@/utils/format";

const sum = (cats, keys) => keys.reduce((s, k) => s + (cats.find((c) => c.key === k)?.amount || 0), 0);
const vehicleName = (v) => `Truck #${v.vehicleNumber}`;
const maxBy = (arr, fn) => arr.reduce((best, x) => (best === null || fn(x) > fn(best) ? x : best), null);

export default function OwnerQuestions({ data, periodName, previousLabel }) {
  const { overview: o, previous, vehicles, investment, receivables, payables } = data;
  const cats = o.expenses.categories;
  const perf = vehicles.performance;

  const mostProfit = maxBy(perf, (v) => v.net);
  const highestExpense = maxBy(perf, (v) => v.expenses);
  const mostInvested = maxBy(perf, (v) => v.investment);
  const shop = o.departments.find((d) => d.key === "shop");
  const office = o.departments.find((d) => d.key === "office");

  let improvement = "There is no earlier period to compare with.";
  if (previous) {
    const diff = o.netProfit - previous.netProfit;
    if (diff === 0) improvement = `No change compared with ${previousLabel}.`;
    else
      improvement = `${diff > 0 ? "Yes, better" : "No, worse"} than ${previousLabel}: net result changed by ${formatSigned(diff)} (was ${formatSigned(previous.netProfit)}, now ${formatSigned(o.netProfit)}).`;
  }

  const items = [
    ["How much has the company invested in total?", `${formatPKR(investment.total)} (vehicles ${formatPKR(investment.vehicles)}, shop, office and other ${formatPKR(investment.other)}).`],
    ["Which vehicle has the most money invested in it?", mostInvested && mostInvested.investment > 0 ? `${vehicleName(mostInvested)}: ${formatPKR(mostInvested.investment)}. Every vehicle's investment is in the table above.` : "No vehicle investment recorded yet."],
    ["Which vehicle made the most profit?", mostProfit && mostProfit.net > 0 ? `${vehicleName(mostProfit)}: ${formatSigned(mostProfit.net)} ${periodName}.` : `No vehicle made a profit ${periodName}.`],
    ["Which vehicle has the highest expenses?", highestExpense && highestExpense.expenses > 0 ? `${vehicleName(highestExpense)}: ${formatPKR(highestExpense.expenses)} ${periodName}.` : `No vehicle expenses ${periodName}.`],
    [`How much income came in ${periodName}?`, formatPKR(o.income.total)],
    [`How much was spent ${periodName}?`, formatPKR(o.expenses.total)],
    ["How much was spent on diesel?", formatPKR(sum(cats, ["diesel"]))],
    ["How much was spent on repairs and maintenance?", formatPKR(sum(cats, ["vehicle_repair", "vehicle_maintenance"]))],
    ["What is the drivers' total salary?", formatPKR(sum(cats, ["driver_salary"]))],
    ["How much did the office cost?", `${formatPKR(office?.expenses ?? 0)} (including office staff salary).`],
    ["How much profit did the shop make?", formatSigned(shop?.profit ?? 0)],
    ["How much do customers owe the company?", formatPKR(receivables.total)],
    ["How much does the company owe others?", formatPKR(payables.total)],
    [o.netProfit < 0 ? "What is the overall net loss?" : "What is the overall net profit?", formatSigned(o.netProfit)],
    [`Did the business improve compared with ${previousLabel ?? "the previous period"}?`, improvement],
  ];

  return (
    <div className={cardClass}>
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">The owner's questions</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Straight answers for {periodName}.</p>
      </div>
      <dl className="divide-y divide-gray-200 dark:divide-gray-800">
        {items.map(([q, a]) => (
          <div key={q} className="grid grid-cols-1 gap-1 px-5 py-3.5 md:grid-cols-5 md:gap-4">
            <dt className="text-[15px] text-gray-600 dark:text-gray-400 md:col-span-2">{q}</dt>
            <dd className="text-[15px] font-medium text-gray-900 dark:text-gray-100 md:col-span-3">{a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}