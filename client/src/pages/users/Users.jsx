import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/userService";
import { ROLE_LABELS } from "@/config/roles";
import { primaryBtn, secondaryBtn } from "@/components/ui/styles";
import UserModal from "@/components/users/UserModal";

export default function Users() {
  const { user: me, can } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // { mode, user }

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: userService.list,
  });

  const toggleActive = useMutation({
    mutationFn: (u) => userService.update(u.id, { isActive: !u.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    onError: (err) => toast.error(err.message),
  });

  const canEdit = can("users", "edit");

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">Users &amp; Permissions</h1>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
            Manage staff accounts and what each role can access.
          </p>
        </div>
        {can("users", "add") && (
          <button className={primaryBtn} onClick={() => setModal({ mode: "create" })}>
            + Add user
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
                {["User", "Role", "Status", "Last login", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-slate-400">Loading…</td></tr>
              )}
              {error && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-rose-500">{error.message}</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="transition hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5">
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                      {u.name} {u.id === me.id && <span className="ml-1 text-[10px] font-semibold text-emerald-600">(you)</span>}
                    </p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1 ${u.isActive
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                        : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
                        }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-5 py-3.5">
                    {canEdit && (
                      <div className="flex justify-end gap-2">
                        <button className={`${secondaryBtn} !h-8 !px-3 !text-[12px]`} onClick={() => setModal({ mode: "edit", user: u })}>Edit</button>
                        <button className={`${secondaryBtn} !h-8 !px-3 !text-[12px]`} onClick={() => setModal({ mode: "password", user: u })}>Reset password</button>
                        {u.id !== me.id && (
                          <button className={`${secondaryBtn} !h-8 !px-3 !text-[12px]`} onClick={() => toggleActive.mutate(u)}>
                            {u.isActive ? "Disable" : "Enable"}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <UserModal key={`${modal.mode}-${modal.user?.id ?? "new"}`} mode={modal.mode} user={modal.user} onClose={() => setModal(null)} />
      )}
    </>
  );
}