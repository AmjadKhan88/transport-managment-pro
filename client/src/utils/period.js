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
