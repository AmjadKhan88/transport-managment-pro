export const SHOP_TYPES = {
  sale: { label: "Sale", tone: "green" },
  purchase: { label: "Purchase", tone: "sky" },
  expense: { label: "Expense", tone: "amber" },
};

export const SHOP_EXPENSE_CATEGORIES = [
  { value: "electricity", label: "Electricity bill" },
  { value: "internet", label: "Internet / Wi-Fi" },
  { value: "rent", label: "Rent" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other expenses" },
];

export const shopCategoryLabel = (v) =>
  SHOP_EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? "—";
