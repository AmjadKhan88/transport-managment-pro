import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { documentService } from "@/services/documentService";
import { ACCEPT, DEFAULT_CATEGORY, MAX_MB, docCategoryLabel, expiryStatus, isImage } from "@/config/documents";
import { formatBytes, formatDate } from "@/utils/format";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, smallBtn, iconBtn } from "@/components/ui/styles";

// Attach to one record: <DocumentsPanel entityType="repair" entityId={id} />
// Or show everything of a vehicle: <DocumentsPanel vehicleId={id} />
export default function DocumentsPanel({ entityType, entityId, vehicleId, defaultCategory, title = "Documents", bare = false }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [toDelete, setToDelete] = useState(null);

  const linkType = vehicleId ? "vehicle" : entityType;
  const linkId = vehicleId ?? entityId;

  const params = vehicleId ? { vehicle: vehicleId, limit: 50 } : { entityType, entityId, limit: 50 };
  const { data, isLoading } = useQuery({
    queryKey: ["documents", "list", params],
    queryFn: () => documentService.list(params),
    enabled: can("documents", "view") && Boolean(linkId),
  });

  const upload = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", file.name.replace(/\.[^.]+$/, ""));
      fd.append("category", defaultCategory || DEFAULT_CATEGORY[linkType] || "other");
      fd.append("entityType", linkType);
      fd.append("entityId", linkId);
      return documentService.create(fd);
    },
    onSuccess: () => {
      toast.success("File attached");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id) => documentService.remove(id),
    onSuccess: () => {
      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!can("documents", "view")) return null;

  const onPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`The file is larger than ${MAX_MB} MB`);
    upload.mutate(file);
  };

  const docs = data?.data ?? [];

  return (
    <div className={bare ? "" : `${cardClass} p-5`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {can("documents", "add") && (
          <>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
            <button type="button" className={smallBtn} disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
              {upload.isPending ? "Uploading…" : "+ Attach file"}
            </button>
          </>
        )}
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {!isLoading && docs.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No files attached yet. PDF, images, Word or Excel, up to {MAX_MB} MB.</p>
      )}

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {docs.map((d) => {
          const expiry = expiryStatus(d.expiryDate);
          return (
            <div key={d.id} className="flex items-center gap-3 py-2.5">
              {isImage(d.mimeType) ? (
                <img src={documentService.fileUrl(d.id)} alt="" className="h-10 w-10 shrink-0 rounded-md border border-gray-200 object-cover dark:border-gray-700" />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {d.originalName.split(".").pop().toUpperCase().slice(0, 4)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <a href={documentService.fileUrl(d.id)} target="_blank" rel="noreferrer" className="block truncate text-[15px] font-medium text-green-800 hover:underline dark:text-green-400">
                  {d.title}
                </a>
                <p className="truncate text-[13px] text-gray-500 dark:text-gray-400">
                  {[docCategoryLabel(d.category), vehicleId && d.label, formatBytes(d.size), formatDate(d.createdAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
              {expiry && <StatusBadge label={expiry.label} tone={expiry.tone} />}
              {can("documents", "delete") && (
                <button type="button" title="Delete" aria-label="Delete document" onClick={() => setToDelete(d)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Delete document"
          message={`"${toDelete.title}" will be deleted and the file removed permanently.`}
          loading={remove.isPending}
          onConfirm={() => remove.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}