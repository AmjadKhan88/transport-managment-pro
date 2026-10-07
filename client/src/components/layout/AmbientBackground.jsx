export default function AmbientBackground() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/30" />
      <div className="pointer-events-none fixed -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-emerald-200/25 blur-[120px] dark:bg-emerald-500/10" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 -z-10 h-[420px] w-[420px] rounded-full bg-green-200/20 blur-[120px] dark:bg-green-500/10" />
    </>
  );
}