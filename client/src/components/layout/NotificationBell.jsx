import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";
import NotificationItem from "@/components/notifications/NotificationItem";

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const boxRef = useRef(null);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications", "summary"],
    queryFn: notificationService.summary,
    refetchInterval: 30_000, // checks for news every 30 seconds
    refetchOnWindowFocus: true,
  });

  const readAll = useMutation({
    mutationFn: notificationService.readAll,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  const openItem = (n) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `${unread} new notifications` : "Notifications"}
        className="relative grid h-10 w-10 place-items-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-[20px] place-items-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-5 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[380px] max-w-[92vw] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
            <button
              type="button"
              disabled={unread === 0 || readAll.isPending}
              onClick={() => readAll.mutate()}
              className="text-sm font-medium text-green-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-[70vh] divide-y divide-gray-200 overflow-y-auto dark:divide-gray-800">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-500">Nothing yet. You're all caught up.</p>}
            {items.map((n) => <NotificationItem key={n.id} n={n} compact onOpen={openItem} />)}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-200 px-4 py-3 text-center text-sm font-medium text-green-800 hover:bg-gray-50 dark:border-gray-800 dark:text-green-400 dark:hover:bg-gray-800"
          >
            See today's work and all notifications →
          </Link>
        </div>
      )}
    </div>
  );
}