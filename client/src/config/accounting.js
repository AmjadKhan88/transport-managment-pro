export const INCOME_TYPES = {
  customer_payment: { label: "Customer payment", tone: "sky" },
  other_business: { label: "Other business income", tone: "green" },
  other_receipt: { label: "Other receipt", tone: "gray" },
};

export const INCOME_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
];
export const incomeMethodLabel = (v) =>
  INCOME_METHODS.find((m) => m.value === v)?.label ?? v ?? "—";

// Categories you can type in the Expenses page. The rest of the 18 are automatic.
export const EXPENSE_CATEGORIES = [
  { value: "advance_payment", label: "Advance payment" },
  { value: "electricity", label: "Electricity" },
  { value: "internet", label: "Internet / Wi-Fi" },
  { value: "rent", label: "Rent" },
  { value: "stationery", label: "Stationery" },
  { value: "tax", label: "Tax" },
  { value: "insurance", label: "Insurance" },
  { value: "miscellaneous", label: "Miscellaneous" },
  { value: "other", label: "Other expenses" },
];
export const expenseCategoryLabel = (v) =>
  EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? "—";

export const CATEGORY_HINTS = {
  advance_payment:
    "Driver and staff advances adjusted in salary belong on the salary record, not here.",
  tax: "Tax paid when buying a vehicle belongs in the vehicle's investment. Use this for renewals and other taxes.",
  insurance:
    "Insurance paid when buying a vehicle belongs in the vehicle's investment. Use this for renewals.",
  electricity:
    "Office and shop bills belong in Office / Shop. Use this only for company-level bills.",
  internet:
    "Office and shop bills belong in Office / Shop. Use this only for company-level bills.",
  rent: "Office and shop rent belongs in Office / Shop. Use this only for company-level rent (e.g. yard, workshop).",
  stationery:
    "Office stationery belongs in Office. Use this only for company-level purchases.",
};

export const DEPARTMENT_TAGS = [
  { value: "general", label: "General" },
  { value: "transport", label: "Transport" },
  { value: "shop", label: "Shop" },
  { value: "office", label: "Office" },
];
export const departmentTagLabel = (v) =>
  DEPARTMENT_TAGS.find((d) => d.value === v)?.label ?? v ?? "—";

export const INVESTMENT_GROUPS = {
  vehicle: {
    label: "Vehicle investment",
    auto: true,
    categories: [
      { value: "purchase", label: "Truck purchase" },
      { value: "registration", label: "Registration" },
      { value: "tax", label: "Tax" },
      { value: "insurance", label: "Insurance" },
      { value: "initial_repair", label: "Initial repair" },
      { value: "accessories", label: "Accessories" },
      { value: "other_costs", label: "Other costs" },
    ],
  },
  shop: {
    label: "Shop investment",
    categories: [
      { value: "purchase_rent", label: "Shop purchase / rent deposit" },
      { value: "equipment", label: "Equipment" },
      { value: "stock", label: "Opening stock" },
      { value: "furniture", label: "Furniture" },
      { value: "other", label: "Other" },
    ],
  },
  office: {
    label: "Office investment",
    categories: [
      { value: "furniture", label: "Furniture" },
      { value: "computers", label: "Computers" },
      { value: "equipment", label: "Equipment" },
      { value: "renovation", label: "Renovation" },
      { value: "other_assets", label: "Other assets" },
    ],
  },
  other: {
    label: "Other investment",
    categories: [
      { value: "land_property", label: "Land / property" },
      { value: "machinery", label: "Machinery" },
      { value: "business_expansion", label: "Business expansion" },
      { value: "other_investments", label: "Other investments" },
    ],
  },
};

export const MANUAL_INVESTMENT_GROUPS = ["shop", "office", "other"];

export const investmentCategoryLabel = (group, category) =>
  INVESTMENT_GROUPS[group]?.categories.find((c) => c.value === category)
    ?.label ??
  category ??
  "—";
