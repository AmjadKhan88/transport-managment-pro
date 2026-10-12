import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { Section, Field } from "@/components/ui/FormParts";
import { inputClass, primaryBtn, secondaryBtn, smallBtn } from "@/components/ui/styles";
import { ACCEPT, DEFAULT_CATEGORY, DOC_CATEGORIES, MAX_MB } from "@/config/documents";
import { documentService } from "@/services/documentService";
import { vehicleService } from "@/services/vehicleService";
import { driverService } from "@/services/driverService";
import { customerService } from "@/services/customerService";
import { formatBytes } from "@/utils/format";

const LINK_TYPES = [
  { value: "", label: "Not linked to anything" },
  { value: "vehicle", label: "A vehicle" },
  { value: "driver", label: "A driver" },
  { value: "customer", label: "A customer" },
];

export default function DocumentDrawer({ document: doc, onClose }) {
  const isEdit = Boolean(doc);
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: doc?.title ?? "",
    category: doc?.category ?? "other",
    linkType: "",
    linkId: "",
    expiryDate: doc?.expiryDate ? doc.expiryDate.slice(0, 10) : "",
    notes: doc?.notes ?? "",
  });

  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles", "options"], queryFn: vehicleService.options, enabled: !isEdit });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers", "options"], queryFn: driverService.options, enabled: !isEdit });
  const { data: customers = [] } = useQuery({ queryKey: ["customers", "options"], queryFn: customerService.options, enabled: !isEdit });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onLinkType = (e) => {
    const linkType = e.target.value;
    setForm((f) => ({
      ...f,
      linkType,
      linkId: "",
      category: linkType && f.category === "other" ? DEFAULT_CATEGORY[linkType] : f.category,
    }));
  };

  const onPickFile = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (picked.size > MAX_MB * 1024 * 1024) {
      toast.error(`The file is larger than ${MAX_MB} MB`);
      e.target.value = "";
      return;
    }
    setFile(picked);
    setForm((f) => ({ ...f, title: f.title || picked.name.replace(/\.[^.]+$/, "") }));
  };

  const options = form.linkType === "vehicle" ? vehicles : form.linkType === "driver" ? drivers : customers;
  const optionLabel = (o) =>
    form.linkType === "vehicle" ? `Truck #${o.vehicleNumber} ${[o.make, o.model].filter(Boolean).join(" ")}` : o.name;

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return documentService.update(doc.id, {
          title: form.title, category: form.category, expiryDate: form.expiryDate, notes: form.notes,
        });
      }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", form.title);
      fd.append("category", form.category);
      if (form.expiryDate) fd.append("expiryDate", form.expiryDate);
      if (form.notes) fd.append("notes", form.notes);
      if (form.linkType && form.linkId) {
        fd.append("entityType", form.linkType);
        fd.append("entityId", form.linkId);
      }
      return documentService.create(fd);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Document updated" : "Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  const blocked = (!isEdit && !file) || (form.linkType && !form.linkId);

  return (
    <Drawer title={isEdit ? "Edit document" : "Upload document"} subtitle="PDF, images, Word or Excel up to 10 MB" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          {!isEdit && (
            <Section title="File">
              <div className="sm:col-span-2">
                <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onPickFile} />
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
                  <button type="button" className={smallBtn} onClick={() => fileRef.current?.click()}>Choose file</button>
                  <p className="min-w-0 truncate text-[15px] text-gray-700 dark:text-gray-300">
                    {file ? `${file.name} (${formatBytes(file.size)})` : "No file chosen"}
                  </p>
                </div>
              </div>
            </Section>
          )}

          <Section title="Details">
            <Field label="Title" required full>
              <input name="title" required value={form.title} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Category">
              <Select name="category" value={form.category} onChange={onChange}>
                {DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Expiry date" hint="For registration, insurance, license. You get an expiry warning.">
              <input name="expiryDate" type="date" value={form.expiryDate} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Notes" full>
              <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </Section>

          {!isEdit && (
            <Section title="Attach to">
              <Field label="Linked to">
                <Select value={form.linkType} onChange={onLinkType}>
                  {LINK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              {form.linkType && (
                <Field label={LINK_TYPES.find((t) => t.value === form.linkType).label.replace("A ", "")} required>
                  <Select name="linkId" required value={form.linkId} onChange={onChange}>
                    <option value="">Select…</option>
                    {options.map((o) => <option key={o.id} value={o.id}>{optionLabel(o)}</option>)}
                  </Select>
                </Field>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 sm:col-span-2">
                Repair bills, fuel receipts, salary receipts and other bills are attached from inside those records.
              </p>
            </Section>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending || blocked} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Upload"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}