const monthName = (d) => d.toLocaleString("en-US", { month: "long" });

export function getPeriodOptions(now = new Date()) {
  const y = now.getFullYear();
  const last = new Date(y, now.getMonth() - 1, 1);

  return [
    { value: "this-month", label: `This Month — ${monthName(now)} ${y}` },
    {
      value: "last-month",
      label: `Last Month — ${monthName(last)} ${last.getFullYear()}`,
    },
    { value: "this-year", label: `This Year — ${y}` },
    { value: "last-year", label: `Last Year — ${y - 1}` },
  ];
}

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayStr = () => ymd(new Date());

export const PERIOD_CHOICES = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
  { value: "all", label: "All time" },
];

// Returns { from, to } as YYYY-MM-DD, or {} for all time
export function getDateRange(period, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "this-month":
      return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
    case "last-month":
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case "this-year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "last-year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default:
      return {};
  }
}
