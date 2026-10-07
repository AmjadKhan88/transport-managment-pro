export const navigation = [
  {
    group: "Main",
    items: [
      { label: "Dashboard", path: "/", icon: "dashboard" },
      { label: "Vehicles", path: "/vehicles", icon: "vehicles", badge: "24" },
      { label: "Trips", path: "/trips", icon: "trips" },
      { label: "Drivers", path: "/drivers", icon: "drivers" },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Diesel / Fuel", path: "/diesel", icon: "diesel" },
      { label: "Repair & Maintenance", path: "/repairs", icon: "repairs" },
      { label: "Customers / Parties", path: "/customers", icon: "customers" },
      { label: "Shop", path: "/shop", icon: "shop" },
      { label: "Office", path: "/office", icon: "office" },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Employees & Salaries", path: "/employees", icon: "employees" },
      { label: "Income", path: "/income", icon: "income" },
      { label: "Expenses", path: "/expenses", icon: "expenses" },
      { label: "Investments", path: "/investments", icon: "investments" },
      {
        label: "Receivables",
        path: "/receivables",
        icon: "receivables",
        dot: true,
      },
      { label: "Payables", path: "/payables", icon: "payables" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Reports & Analytics", path: "/reports", icon: "reports" },
      { label: "Documents", path: "/documents", icon: "documents" },
      { label: "Users & Permissions", path: "/users", icon: "users" },
      { label: "Settings", path: "/settings", icon: "settings" },
      { label: "Backup & Security", path: "/backup", icon: "backup" },
    ],
  },
];
