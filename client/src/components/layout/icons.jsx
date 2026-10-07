const gear = (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
  </>
);

const bars = (
  <>
    <path d="M3 20h18" />
    <path d="M6 20v-6M11 20V8M16 20v-9M21 20V4" />
  </>
);

const paths = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.8" />
    </>
  ),
  vehicles: (
    <>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  trips: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5V13a3 3 0 0 0 3 3h6" />
    </>
  ),
  drivers: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  diesel: <path d="M12 3s5.5 5.5 5.5 9.5a5.5 5.5 0 1 1-11 0C6.5 8.5 12 3 12 3z" />,
  repairs: gear,
  customers: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5" />
      <path d="M18 19a6 6 0 0 0-2-4.5" />
    </>
  ),
  shop: (
    <>
      <path d="M4 8h16l-1 12H5L4 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  office: (
    <>
      <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
      <path d="M14 10h5a1 1 0 0 1 1 1v10" />
      <path d="M7 8h3M7 12h3M7 16h3M17 14h1M17 18h1" />
    </>
  ),
  employees: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  income: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  expenses: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </>
  ),
  investments: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
    </>
  ),
  receivables: (
    <>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  payables: (
    <>
      <path d="M12 21V9" />
      <path d="M7 14l5-5 5 5" />
      <path d="M4 4h16" />
    </>
  ),
  reports: bars,
  documents: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5" />
    </>
  ),
  users: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </>
  ),
  settings: gear,
  backup: (
    <>
      <path d="M6.5 19a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.6-1.5A4.5 4.5 0 0 1 17.5 19h-11z" />
      <path d="M12 12v5M9.5 14.5L12 12l2.5 2.5" />
    </>
  ),
};

export function NavIcon({ name, className = "h-[18px] w-[18px]" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}