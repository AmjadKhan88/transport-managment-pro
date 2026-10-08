import { labelClass } from "./styles";

export function Section({ title, children }) {
  return (
    <section>
      <h3 className="mb-4 border-b border-gray-200 pb-2 text-base font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({ label, required, full, hint, children }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelClass}>
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}