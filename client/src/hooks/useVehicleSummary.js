import { useQuery } from "@tanstack/react-query";
import { vehicleService } from "@/services/vehicleService";

export function useVehicleSummary(enabled = true) {
  return useQuery({
    queryKey: ["vehicles", "summary"],
    queryFn: vehicleService.summary,
    enabled,
    staleTime: 30_000,
  });
}
