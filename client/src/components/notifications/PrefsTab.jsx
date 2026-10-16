import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { notificationService } from "@/services/notificationService";
import { cardClass } from "@/components/ui/styles";

const OPTIONS = [
  { key: "added", title: "When other people add something", text: "New trips, fuel entries, payments, vehicles and so on." },
  { key: "changed", title: "When other people change something", text: "Edits to existing records." },
  { key: "deleted", title: "When other people delete something", text: "Deleted records." },
  { key: "alerts", title: "Reminders", text: "Maintenance due, documents expiring, overdue customers, low stock." },
];

export default function PrefsTab() {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: notificationService.preferences,
  });

  const mutation = useMutation({
    mutationFn: notificationService.updatePreferences,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className={cardClass}>
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">What should appear in your bell?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You only ever get items for areas you have access to, and never for your own actions. The Today tab always shows all work.
        </p>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {OPTIONS.map((o) => (
          <label key={o.key} className="flex cursor-pointer items-start gap-4 px-5 py-4">
            <input
              type="checkbox"
              checked={Boolean(prefs?.[o.key])}
              disabled={mutation.isPending}
              onChange={(e) => mutation.mutate({ [o.key]: e.target.checked })}
              className="mt-1 h-5 w-5 shrink-0 accent-green-800"
            />
            <span>
              <span className="block text-[15px] font-medium text-gray-900 dark:text-gray-100">{o.title}</span>
              <span className="block text-sm text-gray-500 dark:text-gray-400">{o.text}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}