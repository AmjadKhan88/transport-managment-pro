import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import { useUrlSearch } from "@/hooks/useUrlSearch";
import { documentService } from "@/services/documentService";
import { DOC_CATEGORIES, docCategoryLabel, expiryStatus, isImage } from "@/config/documents";
import { formatBytes, formatDate } from "@/utils/format";
import PageHeader from "@/components/ui/PageHeader";
import StatStrip from "@/components/ui/StatStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cardClass, inputClass, primaryBtn, smallBtn, thClass, tdClass, iconBtn } from "@/components/ui/styles";
import DocumentDrawer from "@/components/documents/DocumentDrawer";

export default function Documents() {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = usePersistedFilters("documents", { search: "", category: "", expiry: "", page: 1 });
  useUrlSearch((q) => setFilters((f) => ({ ...f, search: q, page: 1 })));

  const [drawer, setDrawer] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const debouncedSearch = useDebounce(filters.search);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const params = {
    page: filters.page, limit: 10,
    search: debouncedSearch || undefined,
    category: filters.category || undefined,
    expiry: filters.expiry || undefined,
  };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["documents", "list", params],
    queryFn: () => documentService.list(params),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => documentService.remove(id),
    onSuccess: () => {
      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const t = list?.totals;
  const docs = list?.data ?? [];
  const stats = [
    { label: "Documents", value: t ? t.count : "—", sub: "Uploaded files" },
    { label: "Expiring in 30 days", value: t ? t.soon : "—", sub: "Renew soon" },
    { label: "Expired", value: t ? t.expired : "—", sub: "Needs renewal" },
    { label: "Storage used", value: t ? formatBytes(t.size) : "—", sub: "On the server" },
  ];

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Papers and receipts: CNIC copies, registration, insurance, repair bills, diesel receipts and more."
        actions={can("documents", "add") && <button className={primaryBtn} onClick={() => setDrawer({})}>+ Upload document</button>}
      />

      <StatStrip items={stats} />

      <div className={cardClass}>
        <div className="space-y-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Search title, file name, notes…" className={inputClass} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
              <option value="">All categories</option>
              {DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Select value={filters.expiry} onChange={(e) => setFilter("expiry", e.target.value)}>
              <option value="">Any expiry</option>
              <option value="soon">Expiring in 30 days</option>
              <option value="expired">Expired</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Document</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Linked to</th>
                <th className={thClass}>Expiry</th>
                <th className={`${thClass} text-right`}>Size</th>
                <th className={thClass}>Uploaded</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">Loading documents…</td></tr>}
              {error && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && docs.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">No documents found.</td></tr>
              )}

              {docs.map((d) => {
                const expiry = expiryStatus(d.expiryDate);
                return (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        {isImage(d.mimeType) ? (
                          <img src={documentService.fileUrl(d.id)} alt="" className="h-10 w-10 shrink-0 rounded-md border border-gray-200 object-cover dark:border-gray-700" />
                        ) : (
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {d.originalName.split(".").pop().toUpperCase().slice(0, 4)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900 dark:text-gray-100">{d.title}</p>
                          <p className="truncate text-[13px] text-gray-500">{d.originalName}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdClass}>{docCategoryLabel(d.category)}</td>
                    <td className={tdClass}>
                      {d.link ? (
                        <Link to={d.link} className="font-medium text-green-800 hover:underline dark:text-green-400">{d.label}</Link>
                      ) : (
                        d.label || "—"
                      )}
                    </td>
                    <td className={tdClass}>
                      {expiry ? (
                        <>
                          <StatusBadge label={expiry.label} tone={expiry.tone} />
                          <p className="mt-1 text-[13px] text-gray-500">{formatDate(d.expiryDate)}</p>
                        </>
                      ) : "—"}
                    </td>
                    <td className={`${tdClass} text-right`}>{formatBytes(d.size)}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <a href={documentService.fileUrl(d.id)} target="_blank" rel="noreferrer" className={smallBtn}>Open</a>
                        {can("documents", "edit") && (
                          <button title="Edit" aria-label="Edit document" onClick={() => setDrawer({ document: d })} className={iconBtn}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
                          </button>
                        )}
                        {can("documents", "delete") && (
                          <button title="Delete" aria-label="Delete document" onClick={() => setToDelete(d)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination meta={list?.meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
      </div>

      {drawer && <DocumentDrawer key={drawer.document?.id ?? "new"} document={drawer.document} onClose={() => setDrawer(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete document"
          message={`"${toDelete.title}" will be deleted and the file removed permanently.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}