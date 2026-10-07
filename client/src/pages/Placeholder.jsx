export default function Placeholder({ title }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
        This module will be built in an upcoming step.
      </p>
    </div>
  );
}