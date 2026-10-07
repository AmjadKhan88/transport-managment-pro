import { VEHICLE_STATUSES } from "@/config/vehicle";

export default function VehicleStatusBadge({ status }) {
  const s = VEHICLE_STATUSES[status] || VEHICLE_STATUSES.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1 ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}