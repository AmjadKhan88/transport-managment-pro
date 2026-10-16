import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";
import { areaLabel } from "@/config/notifications";
import { ROLE_LABELS } from "@/config/roles";
import { todayStr } from "@/utils/period";
import { formatDate } from "@/utils/format";
import StatStrip from "@/components/ui/StatStrip";
import { cardClass, inputClass, smallBtn, thClass, tdClass } from "@/components/ui/styles";
import NotificationItem from "./NotificationItem";

export default function TodayTab() {
  const [day, setDay] = useState(todayStr());
  const isToday = day === todayStr();

  // the chosen day, from midnight to midnight in this computer's time
  const from = new Date(`${day}T00:00:00`).toISOString();
  const to = new Date(`${day}T23:59:59.999`).toISOString();

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications", "today", day],
    queryFn: () => notificationService.today({ from, to }),
    refetchInterval: isToday ? 60_000 : false,
  });

  const busiest = data?.areas[0];
  const stats = [
    { label: "Actions recorded", value: data ? data.total : "—", sub: isToday ? "Today so far" : formatDate(`${day}T00:00:00`) },
    { label: "People working", value: data ? data.people.length : "—", sub: "Who made entries" },
    { label: "Busiest area", value: busiest ? areaLabel(busiest.resource) : "—", sub: busiest ? `${busiest.count} action${busiest.count === 1 ? "" : "s"}` : "No activity" },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={day} max={todayStr()} onChange={(e) => e.target.value && setDay(e.target.value)} className={`${inputClass} !w-auto`} aria-label="Day" />
        {!isToday && <button className={smallBtn} onClick={() => setDay(todayStr())}>Back to today</button>}
      </div>

      <StatStrip items={stats} />

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error.message}</p>}

      {data && (
        <>
          <div className={cardClass}>
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Who did what</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Everyone's work, including yours, in the areas you can access.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                    <th className={thClass}>Person</th>
                    <th className={`${thClass} text-right`}>Actions</th>
                    <th className={thClass}>Where</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data.people.length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-gray-500">No work recorded for this day.</td></tr>
                  )}
                  {data.people.map((p) => (
                    <tr key={p.id}>
                      <td className={tdClass}>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                        <p className="text-[13px] text-gray-500">{ROLE_LABELS[p.role] ?? p.role}</p>
                      </td>
                      <td className={`${tdClass} text-right text-base font-semibold text-gray-900 dark:text-gray-100`}>{p.total}</td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-1.5">
                          {p.areas.map((a) => (
                            <span key={a.resource} className="rounded-md bg-gray-100 px-2 py-0.5 text-[13px] text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {areaLabel(a.resource)} <span className="font-semibold">{a.count}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cardClass}>
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">What happened</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Newest first. The latest 100 events are shown.</p>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {data.items.length === 0 && <p className="px-5 py-10 text-center text-sm text-gray-500">Nothing to show.</p>}
              {data.items.map((n) => <NotificationItem key={n.id} n={n} />)}
            </div>
          </div>
        </>
      )}
    </>
  );
}