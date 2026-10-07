export const ROLE_LABELS = {
  admin: "Administrator",
  accounts: "Accounts",
  vehicle_manager: "Vehicle Manager",
  data_entry: "Data Entry",
  view_only: "View Only",
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(
  ([value, label]) => ({ value, label }),
);
