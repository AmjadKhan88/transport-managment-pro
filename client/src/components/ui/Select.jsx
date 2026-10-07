import { inputClass } from "./styles";

export default function Select({ className = "", children, ...props }) {
  return (
    <div className="relative">
      <select {...props} className={`${inputClass} cursor-pointer pr-9 ${className}`}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}