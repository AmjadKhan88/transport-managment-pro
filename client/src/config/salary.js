export const SALARY_STATUSES = {
  unpaid: { label: "Unpaid", tone: "amber" },
  partial: { label: "Partly paid", tone: "sky" },
  paid: { label: "Paid", tone: "green" },
};

export const DEPARTMENTS = [
  { value: "office", label: "Office" },
  { value: "shop", label: "Shop" },
  { value: "workshop", label: "Workshop" },
  { value: "other", label: "Other" },
];

export const EMPLOYEE_STATUSES = {
  active: { label: "Active", tone: "green" },
  inactive: { label: "Inactive", tone: "gray" },
};

export const SALARY_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
];

export const departmentLabel = (v) =>
  DEPARTMENTS.find((d) => d.value === v)?.label ?? v ?? "—";
