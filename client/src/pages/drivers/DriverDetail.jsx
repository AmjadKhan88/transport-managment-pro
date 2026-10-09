import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { driverService } from "@/services/driverService";
import { DRIVER_STATUSES } from "@/config/status";
import { formatDate, formatPKR } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import DriverDrawer from "@/components/drivers/DriverDrawer";
import { primaryBtn, secondaryBtn } from "@/components/ui/styles";
import DriverSalaryHistory from "@/components/salaries/DriverSalaryHistory";

const card = "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900";

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{value || "—"}</p>
    </div>
  );
}

export default function DriverDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const [editing, setEditing] = useState(false);

  const { data: d, isLoading, error } = useQuery({
    queryKey: ["drivers", "detail", id],
    queryFn: () => driverService.get(id),
  });

  if (isLoading) return <p className="text-[13px] text-slate-400">Loading driver…</p>;

  if (error) {
    return (
      <div className={card}>
        <p className="text-[13px] font-semibold text-rose-500">{error.message}</p>
        <Link to="/drivers" className={`${secondaryBtn} mt-4`}>← Back to drivers</Link>
      </div>
    );
  }

  const status = DRIVER_STATUSES[d.status] || DRIVER_STATUSES.inactive;

  return (
    <>
      <PageHeader
        title={d.name}
        crumb={`Drivers / ${d.name}`}
        subtitle={d.fatherName ? `S/O ${d.fatherName}` : "Driver record"}
        actions={
          <>
            <Link to="/drivers" className={secondaryBtn}>← Back</Link>
            {can("drivers", "edit") && <button className={primaryBtn} onClick={() => setEditing(true)}>Edit driver</button>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className={`${card} xl:col-span-2`}>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Driver information</h2>
            <StatusBadge label={status.label} tone={status.tone} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">
            <Info label="CNIC" value={d.cnic} />
            <Info label="Phone" value={d.phone} />
            <Info label="Joined" value={d.joiningDate ? formatDate(d.joiningDate) : ""} />
            <Info
              label="Assigned vehicle"
              value={
                d.vehicle ? (
                  <Link to={`/vehicles/${d.vehicle.id}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                    Truck #{d.vehicle.vehicleNumber}
                  </Link>
                ) : (
                  "Unassigned"
                )
              }
            />
            <div className="col-span-2">
              <Info label="Address" value={d.address} />
            </div>
          </div>
          {d.notes && (
            <div className="mt-5 rounded-xl bg-slate-50 p-3.5 text-[12.5px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              {d.notes}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-card dark:border-slate-800 dark:from-slate-900 dark:to-emerald-500/5">
          <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">Salary</h2>
          <p className="mt-0.5 text-[12px] text-slate-400">Basic monthly salary</p>
          <p className="mt-4 text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">{formatPKR(d.salary)}</p>
          <p className="mt-3 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            Advances, payments and remaining salary are shown in the salary history below
          </p>
        </div>
      </div>

      <DriverSalaryHistory driverId={d.id} />

      {editing && <DriverDrawer driver={d} onClose={() => setEditing(false)} />}
    </>
  );
}