// Where the company's DIESEL expense comes from:
//   "fuel_ledger" -> fuel entries in the Diesel module (actual purchases)  [recommended]
//   "trips"       -> the diesel cost typed on each trip (matches vehicle profit exactly)
export const DIESEL_EXPENSE_SOURCE = "fuel_ledger";

// The 18 company expense categories.
// source "auto"   -> calculated from another module
// source "manual" -> typed in the Expenses page
export const COMPANY_EXPENSE_CATEGORIES = [
  {
    key: "diesel",
    label: "Diesel / Fuel",
    source: "auto",
    from: "Diesel module",
  },
  {
    key: "driver_salary",
    label: "Driver salary",
    source: "auto",
    from: "Salaries (drivers)",
  },
  {
    key: "driver_trip_expense",
    label: "Driver trip expense",
    source: "auto",
    from: "Trips",
  },
  {
    key: "vehicle_repair",
    label: "Vehicle repair",
    source: "auto",
    from: "Repairs",
  },
  {
    key: "vehicle_maintenance",
    label: "Vehicle maintenance",
    source: "auto",
    from: "Repairs (oil, general maintenance)",
  },
  { key: "toll_tax", label: "Toll tax", source: "auto", from: "Trips" },
  {
    key: "advance_payment",
    label: "Advance payment",
    source: "manual",
    from: "Expenses",
  },
  {
    key: "office_expense",
    label: "Office expense",
    source: "auto",
    from: "Office",
  },
  {
    key: "shop_expense",
    label: "Shop expense",
    source: "auto",
    from: "Shop (purchases + expenses)",
  },
  {
    key: "staff_salary",
    label: "Staff salary",
    source: "auto",
    from: "Salaries (staff)",
  },
  {
    key: "electricity",
    label: "Electricity",
    source: "manual",
    from: "Expenses",
  },
  {
    key: "internet",
    label: "Internet / Wi-Fi",
    source: "manual",
    from: "Expenses",
  },
  { key: "rent", label: "Rent", source: "manual", from: "Expenses" },
  {
    key: "stationery",
    label: "Stationery",
    source: "manual",
    from: "Expenses",
  },
  { key: "tax", label: "Tax", source: "manual", from: "Expenses" },
  { key: "insurance", label: "Insurance", source: "manual", from: "Expenses" },
  {
    key: "miscellaneous",
    label: "Miscellaneous",
    source: "manual",
    from: "Expenses",
  },
  {
    key: "other",
    label: "Other expenses",
    source: "manual",
    from: "Expenses + trip other expenses",
  },
];

export const MANUAL_EXPENSE_CATEGORIES = COMPANY_EXPENSE_CATEGORIES.filter(
  (c) => c.source === "manual",
).map((c) => c.key);

export const EXPENSE_DEPARTMENTS = ["transport", "shop", "office", "general"];
