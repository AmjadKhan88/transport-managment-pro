import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get("/health")).data,
  });

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">Business Dashboard</h1>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
        Every vehicle, trip, expense &amp; rupee — one complete system.
      </p>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
        <span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-rose-500" : "bg-emerald-500"}`} />
        {isLoading ? "Checking API…" : error ? error.message : `API ${data.message} · DB ${data.db}`}
      </div>
    </div>
  );
}