import { useState } from "react";
import { Link } from "react-router-dom";
import { timeAgo } from "@/utils/format";

const dotColor = (n) => {
  if (n.kind === "alert") return n.severity === "critical" ? "bg-red-600" : "bg-amber-500";
  if (n.action === "delete") return "bg-red-600";
  if (n.action === "update") return "bg-sky-600";
  return "bg-green-700";
};

// onOpen: in the bell the whole row opens the item. On the page the title is a link.
export default function NotificationItem({ n, onOpen, compact = false }) {
  const [open, setOpen] = useState(false);
  const extra = (n.entries?.length ?? 0) > 1;

  const title = (
    <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{n.title}</span>
  );

  return (
    <div
      className={`flex gap-3 ${compact ? "px-4 py-3" : "px-5 py-4"} ${n.unread ? "bg-green-50 dark:bg-green-900/10" : ""
        }`}
    >
      <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor(n)}`} />

      <div className="min-w-0 flex-1">
        {onOpen ? (
          <button type="button" onClick={() => onOpen(n)} className="block w-full text-left">
            {title}
          </button>
        ) : n.link ? (
          <Link to={n.link} className="hover:underline">{title}</Link>
        ) : (
          title
        )}

        {n.message && <p className="mt-0.5 break-words text-sm text-gray-600 dark:text-gray-400">{n.message}</p>}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-gray-500 dark:text-gray-400">
          <span>{timeAgo(n.updatedAt ?? n.createdAt)}</span>
          {n.unread && <span className="font-semibold text-green-800 dark:text-green-400">New</span>}
          {extra && !compact && (
            <button type="button" onClick={() => setOpen((o) => !o)} className="font-medium text-green-800 hover:underline dark:text-green-400">
              {open ? "Hide items" : `Show ${n.entries.length} item${n.entries.length === 1 ? "" : "s"}${n.count > n.entries.length ? ` (latest of ${n.count})` : ""}`}
            </button>
          )}
        </div>

        {open && (
          <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {[...n.entries].reverse().map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                {e.link ? (
                  <Link to={e.link} className="min-w-0 truncate text-gray-800 hover:underline dark:text-gray-200">{e.label}</Link>
                ) : (
                  <span className="min-w-0 truncate text-gray-800 dark:text-gray-200">{e.label}</span>
                )}
                <span className="shrink-0 text-[13px] text-gray-500">{timeAgo(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}