import Modal from "./Modal";
import { secondaryBtn } from "./styles";

export default function ConfirmDialog({ title, message, confirmLabel = "Delete", loading, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 text-[13px] font-bold text-white shadow-lg shadow-rose-600/25 transition hover:from-rose-700 hover:to-red-700 active:scale-[.98] disabled:opacity-60"
        >
          {loading ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}