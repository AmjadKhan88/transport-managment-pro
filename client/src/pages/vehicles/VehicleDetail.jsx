import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { vehicleService } from "@/services/vehicleService";
import { INVESTMENT_FIELDS, VEHICLE_STATUSES, typeLabel, ownershipLabel } from "@/config/vehicle";
import { formatDate, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import VehicleStatusBadge from "@/components/vehicles/VehicleStatusBadge";
import VehicleDrawer from "@/components/vehicles/VehicleDrawer";
import { primaryBtn, secondaryBtn } from "@/components/ui/styles";
import VehicleTrips from "@/components/vehicles/VehicleTrips";

const card = "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900";

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{value || "—"}</p>
    </div>
  );
}

export default function VehicleDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const [editing, setEditing] = useState(false);

  const { data: v, isLoading, error } = useQuery({
    queryKey: ["vehicles", "detail", id],
    queryFn: () => vehicleService.get(id),
  });

  if (isLoading) return <p className="text-[13px] text-slate-400">Loading vehicle…</p>;

  if (error) {
    return (
      <div className={card}>
        <p className="text-[13px] font-semibold text-rose-500">{error.message}</p>
        <Link to="/vehicles" className={`${secondaryBtn} mt-4`}>← Back to vehicles</Link>
      </div>
    );
  }

  const breakdown = [
    { label: "Purchase cost", value: v.purchasePrice },
    ...INVESTMENT_FIELDS.map(({ key, label }) => ({ label, value: v.investment?.[key] || 0 })),
  ];

  return (
    <>
      <PageHeader
        title={`Truck #${v.vehicleNumber}`}
        crumb={`Vehicles / #${v.vehicleNumber}`}
        subtitle={[v.make, v.model].filter(Boolean).join(" ") || "Vehicle record"}
        actions={
          <>
            <Link to="/vehicles" className={secondaryBtn}>← Back</Link>
            {can("vehicles", "edit") && (
              <button className={primaryBtn} onClick={() => setEditing(true)}>Edit vehicle</button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Info */}
        <div className={`${card} xl:col-span-2`}>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Vehicle information</h2>
            <VehicleStatusBadge status={v.status} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">
            <Info label="Registration" value={v.registrationNumber} />
            <Info label="Type" value={typeLabel(v.type)} />
            <Info label="Make" value={v.make} />
            <Info label="Model" value={v.model} />
            <Info label="Purchase date" value={v.purchaseDate ? formatDate(v.purchaseDate) : ""} />
            <Info label="Current value" value={v.currentValue ? formatPKR(v.currentValue) : ""} />
            <Info label="Owner" value={v.ownership?.ownerName} />
            <Info label="Ownership" value={ownershipLabel(v.ownership?.ownershipType)} />
            <Info
              label="Assigned driver"
              value={
                v.driver ? (
                  <Link to={`/drivers/${v.driver.id}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                    {v.driver.name}
                  </Link>
                ) : (
                  "Unassigned"
                )
              }
            />
          </div>
          {v.ownership?.details && (
            <p className="mt-5 text-[12.5px] text-slate-500 dark:text-slate-400">{v.ownership.details}</p>
          )}
          {v.notes && (
            <div className="mt-5 rounded-xl bg-slate-50 p-3.5 text-[12.5px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              {v.notes}
            </div>
          )}
        </div>

        {/* Investment */}
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-card dark:border-slate-800 dark:from-slate-900 dark:to-emerald-500/5">
          <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Investment</h2>
          <p className="mt-0.5 text-[12px] text-slate-400">Total — {formatPKR(v.totalInvestment)}</p>

          <div className="mt-4 space-y-3.5">
            {breakdown.map((row) => {
              const pct = v.totalInvestment ? (row.value / v.totalInvestment) * 100 : 0;
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{row.label}</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">{formatPKR(row.value)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <VehicleTrips vehicle={v} />

      {editing && <VehicleDrawer vehicle={v} onClose={() => setEditing(false)} />}
    </>
  );
}