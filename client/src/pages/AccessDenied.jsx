export default function AccessDenied() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <h1 className="mt-4 text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">Access denied</h1>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
        You don't have permission to view this section. Contact the administrator.
      </p>
    </div>
  );
}