import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { backupService } from "@/services/adminServices";
import { formatBytes, formatDateTime } from "@/utils/format";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, inputClass, primaryBtn, secondaryBtn, smallBtn, thClass, tdClass } from "@/components/ui/styles";

const TYPE = {
  auto: { label: "Automatic", tone: "green" },
  manual: { label: "Manual", tone: "sky" },
  prerestore: { label: "Before a restore", tone: "amber" },
  uploaded: { label: "Uploaded", tone: "gray" },
};

const describeCron = (cron) => {
  const m = /^(\d+) (\d+) \* \* \*$/.exec(cron || "");
  return m ? `Every day at ${m[2].padStart(2, "0")}:${m[1].padStart(2, "0")}` : cron;
};

function RestoreDialog({ backup, onClose }) {
  const [text, setText] = useState("");

  const { data: info, isLoading, error } = useQuery({
    queryKey: ["backups", "info", backup.name],
    queryFn: () => backupService.info(backup.name),
  });

  const mutation = useMutation({
    mutationFn: () => backupService.restore(backup.name),
    onSuccess: () => {
      toast.success("Restore finished. Reloading…");
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  const rows = Object.entries(info?.counts ?? {}).filter(([, n]) => n > 0);
  const total = rows.reduce((s, [, n]) => s + n, 0);

  return (
    <Modal title="Restore this backup?" onClose={mutation.isPending ? () => { } : onClose}>
      <p className="text-[15px] text-gray-700 dark:text-gray-300">
        Backup from <span className="font-semibold">{formatDateTime(backup.createdAt)}</span>.
      </p>

      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
        <strong>This replaces ALL current data</strong> with the data in this backup. Anything entered after the backup
        was made will be lost. A safety backup of the current data is made first, so you can undo it. Do this when
        nobody else is using the system.
      </div>

      <div className="mt-4">
        {isLoading && <p className="text-sm text-gray-500">Checking the file…</p>}
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error.message}</p>}
        {info && (
          <>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              The file is valid and contains {total.toLocaleString()} records:
            </p>
            <div className="grid max-h-40 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto text-sm text-gray-600 dark:text-gray-400">
              {rows.map(([name, n]) => (
                <div key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{n.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Type RESTORE to confirm</label>
        <input value={text} onChange={(e) => setText(e.target.value)} className={inputClass} autoComplete="off" />
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={mutation.isPending} className={secondaryBtn}>Cancel</button>
        <button
          type="button"
          disabled={text !== "RESTORE" || !info || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? "Restoring… do not close this page" : "Restore"}
        </button>
      </div>
    </Modal>
  );
}

export default function BackupsTab() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [restoring, setRestoring] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["backups", "list"], queryFn: backupService.list });
  const backups = data?.data ?? [];
  const status = data?.status;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["backups"] });

  const create = useMutation({
    mutationFn: backupService.create,
    onSuccess: () => { toast.success("Backup created"); refresh(); },
    onError: (err) => toast.error(err.message),
  });
  const upload = useMutation({
    mutationFn: backupService.upload,
    onSuccess: () => { toast.success("Backup file added"); refresh(); },
    onError: (err) => toast.error(err.message),
  });
  const remove = useMutation({
    mutationFn: (name) => backupService.remove(name),
    onSuccess: () => { toast.success("Backup deleted"); refresh(); setToDelete(null); },
    onError: (err) => toast.error(err.message),
  });

  const onPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) upload.mutate(file);
  };

  return (
    <>
      <div className={`${cardClass} grid grid-cols-1 gap-4 p-5 sm:grid-cols-3`}>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Automatic backups</p>
          <p className="mt-0.5 text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            {status ? (status.auto ? describeCron(status.cron) : "Switched off") : "—"}
          </p>
          {status?.auto && <p className="text-[13px] text-gray-500">Keeps the last {status.keep}</p>}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Last automatic backup</p>
          <p className="mt-0.5 text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            {status?.lastAutoAt ? formatDateTime(status.lastAutoAt) : "Not yet since the server started"}
          </p>
          {status?.lastAutoError && <p className="text-[13px] text-red-700 dark:text-red-400">Failed: {status.lastAutoError}</p>}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">What is included</p>
          <p className="mt-0.5 text-[15px] text-gray-700 dark:text-gray-300">
            All records in the database. Uploaded documents are stored on Cloudinary and are not part of these files.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {can("backup", "add") && (
          <>
            <button className={primaryBtn} disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Creating backup…" : "Create backup now"}
            </button>
            <input ref={fileRef} type="file" accept=".gz" className="hidden" onChange={onPick} />
            <button className={secondaryBtn} disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
              {upload.isPending ? "Checking file…" : "Upload a backup file"}
            </button>
          </>
        )}
      </div>

      <div className={cardClass}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Created</th>
                <th className={thClass}>Type</th>
                <th className={`${thClass} text-right`}>Size</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-500">Loading backups…</td></tr>}
              {error && <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && backups.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-500">No backups yet. Create the first one.</td></tr>
              )}

              {backups.map((b) => {
                const type = TYPE[b.type];
                return (
                  <tr key={b.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={tdClass}>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{formatDateTime(b.createdAt)}</p>
                      <p className="text-[13px] text-gray-500">{b.name}</p>
                    </td>
                    <td className={tdClass}><StatusBadge label={type.label} tone={type.tone} /></td>
                    <td className={`${tdClass} text-right`}>{formatBytes(b.size)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <a href={backupService.downloadUrl(b.name)} className={smallBtn}>Download</a>
                        {can("backup", "edit") && <button className={smallBtn} onClick={() => setRestoring(b)}>Restore</button>}
                        {can("backup", "delete") && (
                          <button className={`${smallBtn} hover:!text-red-700 dark:hover:!text-red-400`} onClick={() => setToDelete(b)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Tip: download a backup every week and keep it on your own computer or a USB drive. A backup that lives only on the
        server is lost if the server is lost. These files contain all your business data and password hashes, so keep them private.
      </p>

      {restoring && <RestoreDialog key={restoring.name} backup={restoring} onClose={() => setRestoring(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete backup"
          message={`The backup from ${formatDateTime(toDelete.createdAt)} will be deleted permanently.`}
          loading={remove.isPending}
          onConfirm={() => remove.mutate(toDelete.name)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}