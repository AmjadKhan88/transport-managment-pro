export const OFFICE_CATEGORIES = [
  { value: "electricity", label: "Electricity" },
  { value: "gas", label: "Gas" },
  { value: "internet", label: "Internet / Wi-Fi" },
  { value: "rent", label: "Rent" },
  { value: "stationery", label: "Stationery" },
  { value: "computer_it", label: "Computer / IT" },
  { value: "maintenance", label: "Maintenance" },
  { value: "tea_food", label: "Tea / Food" },
  { value: "transport", label: "Transport" },
  { value: "miscellaneous", label: "Miscellaneous" },
];

// "salary" only appears in reports (it is calculated from salary records)
export const officeCategoryLabel = (v) =>
  v === "salary"
    ? "Office salary"
    : (OFFICE_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? "—");
