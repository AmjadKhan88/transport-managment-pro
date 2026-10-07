import { secondaryBtn } from "./styles";

export default function Pagination({ meta, onChange }) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-[12px] text-slate-500 sm:flex-row dark:border-slate-800 dark:text-slate-400">
      <p>
        Showing <span className="font-bold text-slate-700 dark:text-slate-200">{from}–{to}</span> of{" "}
        <span className="font-bold text-slate-700 dark:text-slate-200">{meta.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          className={`${secondaryBtn} !h-8 !px-3 !text-[12px] disabled:opacity-50`}
          disabled={meta.page <= 1}
          onClick={() => onChange(meta.page - 1)}
        >
          Previous
        </button>
        <span className="px-1 font-semibold">Page {meta.page} / {meta.pages}</span>
        <button
          className={`${secondaryBtn} !h-8 !px-3 !text-[12px] disabled:opacity-50`}
          disabled={meta.page >= meta.pages}
          onClick={() => onChange(meta.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}