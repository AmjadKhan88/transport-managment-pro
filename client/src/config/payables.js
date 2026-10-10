import { officeCategoryLabel } from "./office";
import { expenseCategoryLabel } from "./accounting";

export const KIND_LABELS = {
  salary: "Salaries",
  repair: "Workshops",
  fuel: "Fuel stations",
  shop: "Shop suppliers",
  office: "Office bills",
  expense: "Other bills",
};

export const KIND_SINGULAR = {
  salary: "Salary",
  repair: "Workshop",
  fuel: "Fuel station",
  shop: "Shop supplier",
  office: "Office bill",
  expense: "Other bill",
};

// Name shown for "who we owe"
export const partyLabel = (kind, party) => {
  if (kind === "office") return officeCategoryLabel(party.key);
  if (kind === "expense") return expenseCategoryLabel(party.key);
  return party.label || "Unspecified";
};
