import { useState } from "react";
import toast from "react-hot-toast";
import { exportReport } from "@/utils/exportReport";
import { smallBtn } from "@/components/ui/styles";

export default function ExportButtons({ config, disabled }) {
  const [busy, setBusy] = useState(null);

  const run = async (format) => {
    setBusy(format);
    try {
      await exportReport({ ...config, format });
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button className={smallBtn} disabled={disabled || Boolean(busy)} onClick={() => run("pdf")}>
        {busy === "pdf" ? "Preparing…" : "PDF"}
      </button>
      <button className={smallBtn} disabled={disabled || Boolean(busy)} onClick={() => run("excel")}>
        {busy === "excel" ? "Preparing…" : "Excel"}
      </button>
    </div>
  );
}