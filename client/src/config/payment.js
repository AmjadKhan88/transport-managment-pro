export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "credit", label: "On credit" },
];

export const PAYMENT_STATUSES = {
  paid: { label: "Paid", tone: "green" },
  unpaid: { label: "Unpaid", tone: "amber" },
};

export const methodLabel = (v) =>
  PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v ?? "—";
