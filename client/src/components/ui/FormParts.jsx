import { labelClass } from "./styles";

export function Section({ title, children }) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({ label, required, full, hint, children }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelClass}>
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}