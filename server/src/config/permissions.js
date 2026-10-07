export const ROLES = Object.freeze({
  ADMIN: "admin",
  ACCOUNTS: "accounts",
  VEHICLE_MANAGER: "vehicle_manager",
  DATA_ENTRY: "data_entry",
  VIEW_ONLY: "view_only",
});

export const MODULES = [
  "dashboard",
  "vehicles",
  "trips",
  "drivers",
  "diesel",
  "repairs",
  "customers",
  "shop",
  "office",
  "employees",
  "income",
  "expenses",
  "investments",
  "receivables",
  "payables",
  "reports",
  "documents",
  "users",
  "settings",
  "backup",
];

export const ACTIONS = ["view", "add", "edit", "delete"];

const grant = (modules, actions) =>
  Object.fromEntries(modules.map((m) => [m, actions]));
const V = ["view"];
const VA = ["view", "add"];
const VAE = ["view", "add", "edit"];

const matrix = {
  [ROLES.ADMIN]: grant(MODULES, ACTIONS),

  [ROLES.ACCOUNTS]: {
    ...grant(["dashboard", "vehicles", "drivers", "reports"], V),
    ...grant(
      [
        "trips",
        "diesel",
        "repairs",
        "customers",
        "shop",
        "office",
        "employees",
        "income",
        "expenses",
        "investments",
        "receivables",
        "payables",
      ],
      VAE,
    ),
    documents: VA,
  },

  [ROLES.VEHICLE_MANAGER]: {
    ...grant(["dashboard", "customers", "reports"], V),
    ...grant(["vehicles", "drivers", "trips", "diesel", "repairs"], VAE),
    documents: VA,
  },

  [ROLES.DATA_ENTRY]: {
    dashboard: V,
    ...grant(
      [
        "trips",
        "diesel",
        "repairs",
        "customers",
        "income",
        "expenses",
        "documents",
      ],
      VA,
    ),
  },

  [ROLES.VIEW_ONLY]: grant(
    MODULES.filter((m) => !["users", "settings", "backup"].includes(m)),
    V,
  ),
};

export const getPermissions = (role) => matrix[role] ?? {};

export const hasPermission = (role, module, action) =>
  matrix[role]?.[module]?.includes(action) ?? false;
