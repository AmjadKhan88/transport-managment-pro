export default function Placeholder({ title }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-card">
      <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1 text-[13px] text-slate-500">This module will be built in an upcoming step.</p>
    </div>
  );
}