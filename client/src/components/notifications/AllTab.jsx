import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";
import { AREA_LABELS } from "@/config/notifications";
import { PERIOD_CHOICES, getDateRange } from "@/utils/period";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import { cardClass, secondaryBtn } from "@/components/ui/styles";
import NotificationItem from "./NotificationItem";

export default function AllTab() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ kind: "", resource: "", period: "this-month", page: 1 });
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const range = getDateRange(filters.period);
  const params = {
    page: filters.page, limit: 15,
    kind: filters.kind || undefined,
    resource: filters.resource || undefined,
    from: range.from, to: range.to,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["notifications", "list", params],
    queryFn: () => notificationService.list(params),
    placeholderData: keepPreviousData,
  });

  const readAll = useMutation({
    mutationFn: notificationService.readAll,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = list?.data ?? [];

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={filters.kind} onChange={(e) => setFilter("kind", e.target.value)}>
            <option value="">Work and reminders</option>
            <option value="activity">Work done by others</option>
            <option value="alert">Reminders only</option>
          </Select>
          <Select value={filters.resource} onChange={(e) => setFilter("resource", e.target.value)}>
            <option value="">All areas</option>
            {Object.entries(AREA_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select value={filters.period} onChange={(e) => setFilter("period", e.target.value)}>
            {PERIOD_CHOICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </div>
        <button className={secondaryBtn} disabled={readAll.isPending} onClick={() => readAll.mutate()}>Mark all as read</button>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {isLoading && <p className="px-5 py-10 text-center text-sm text-gray-500">Loading…</p>}
        {error && <p className="px-5 py-10 text-center text-sm text-red-700 dark:text-red-400">{error.message}</p>}
        {!isLoading && !error && items.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-gray-500">No notifications for this selection.</p>
        )}
        {items.map((n) => <NotificationItem key={n.id} n={n} />)}
      </div>

      <Pagination meta={list?.meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </div>
  );
}