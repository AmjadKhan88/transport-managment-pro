import { todayStr } from "@/utils/period";

export const DOC_CATEGORIES = [
  { value: "vehicle_document", label: "Vehicle document" },
  { value: "registration", label: "Registration" },
  { value: "insurance", label: "Insurance" },
  { value: "driver_cnic", label: "Driver CNIC / license" },
  { value: "repair_bill", label: "Repair bill" },
  { value: "diesel_receipt", label: "Diesel receipt" },
  { value: "salary_receipt", label: "Salary receipt" },
  { value: "office_bill", label: "Office bill" },
  { value: "shop_bill", label: "Shop bill" },
  { value: "other", label: "Other" },
];

export const docCategoryLabel = (v) =>
  DOC_CATEGORIES.find((c) => c.value === v)?.label ?? v;

// Category suggested when you attach a file to each kind of record
export const DEFAULT_CATEGORY = {
  vehicle: "vehicle_document",
  driver: "driver_cnic",
  repair: "repair_bill",
  diesel: "diesel_receipt",
  salary: "salary_receipt",
  office: "office_bill",
  shop: "shop_bill",
  expense: "other",
  income: "other",
  customer: "other",
};

export const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx";
export const MAX_MB = 10;

export const isImage = (mime) => mime?.startsWith("image/");

export function expiryStatus(iso) {
  if (!iso) return null;
  const days = Math.round(
    (Date.parse(iso.slice(0, 10)) - Date.parse(todayStr())) / 86400000,
  );
  if (days < 0) return { label: "Expired", tone: "red" };
  if (days <= 30)
    return {
      label: days === 0 ? "Expires today" : `Expires in ${days} d`,
      tone: "amber",
    };
  return { label: "Valid", tone: "green" };
}
