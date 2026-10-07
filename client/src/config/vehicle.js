export const VEHICLE_TYPES = [
  { value: "truck", label: "Truck" },
  { value: "trailer", label: "Trailer" },
  { value: "dumper", label: "Dumper" },
  { value: "mini_truck", label: "Mini Truck" },
  { value: "pickup", label: "Pickup" },
  { value: "container", label: "Container" },
  { value: "tanker", label: "Tanker" },
  { value: "other", label: "Other" },
];

export const OWNERSHIP_TYPES = [
  { value: "company", label: "Company" },
  { value: "partnership", label: "Partnership" },
  { value: "leased", label: "Leased" },
  { value: "other", label: "Other" },
];

export const INVESTMENT_FIELDS = [
  { key: "registration", label: "Registration" },
  { key: "tax", label: "Tax" },
  { key: "insurance", label: "Insurance" },
  { key: "initialRepair", label: "Initial repair" },
  { key: "accessories", label: "Accessories" },
  { key: "otherCosts", label: "Other costs" },
];

const slate =
  "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700";

export const VEHICLE_STATUSES = {
  active: {
    label: "Active",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    dot: "bg-emerald-500",
    avatar: "from-emerald-500 to-green-700",
  },
  in_repair: {
    label: "In Repair",
    badge:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    dot: "bg-amber-500",
    avatar: "from-amber-500 to-orange-600",
  },
  available: {
    label: "Available",
    badge:
      "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20",
    dot: "bg-sky-500",
    avatar: "from-sky-500 to-blue-700",
  },
  sold: {
    label: "Sold",
    badge: slate,
    dot: "bg-slate-400",
    avatar: "from-slate-500 to-slate-700",
  },
  inactive: {
    label: "Inactive",
    badge: slate,
    dot: "bg-slate-400",
    avatar: "from-slate-500 to-slate-700",
  },
};

export const typeLabel = (v) =>
  VEHICLE_TYPES.find((t) => t.value === v)?.label ?? v ?? "—";
export const ownershipLabel = (v) =>
  OWNERSHIP_TYPES.find((t) => t.value === v)?.label ?? v ?? "—";
