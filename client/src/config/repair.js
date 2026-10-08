export const REPAIR_CATEGORIES = [
  { value: "engine", label: "Engine" },
  { value: "tyres", label: "Tyres" },
  { value: "oil", label: "Oil" },
  { value: "battery", label: "Battery" },
  { value: "brakes", label: "Brakes" },
  { value: "suspension", label: "Suspension" },
  { value: "electrical", label: "Electrical" },
  { value: "body_work", label: "Body work" },
  { value: "general_maintenance", label: "General maintenance" },
  { value: "other", label: "Other" },
];

export const categoryLabel = (v) =>
  REPAIR_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? "—";
