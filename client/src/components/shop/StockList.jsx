import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { shopService } from "@/services/shopService";
import { formatCompact, formatNumber, formatPKR } from "@/utils/format";
import Drawer from "@/components/ui/Drawer";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import StatStrip from "@/components/ui/StatStrip";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Section, Field } from "@/components/ui/FormParts";
import {
  cardClass, inputClass, primaryBtn, secondaryBtn, smallBtn, thClass, tdClass, iconBtn,
} from "@/components/ui/styles";

const numStr = (n) => (n ? String(n) : "");
const isLow = (i) => i.reorderLevel > 0 && i.quantity <= i.reorderLevel;

function StockDrawer({ item, onClose }) {
  const isEdit = Boolean(item);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({
    name: item?.name ?? "",
    unit: item?.unit ?? "pcs",
    quantity: numStr(item?.quantity),
    reorderLevel: numStr(item?.reorderLevel),
    costPrice: numStr(item?.costPrice),
    salePrice: numStr(item?.salePrice),
    notes: item?.notes ?? "",
  }));

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        quantity: Number(form.quantity) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        costPrice: Number(form.costPrice) || 0,
        salePrice: Number(form.salePrice) || 0,
      };
      return isEdit ? shopService.stockUpdate(item.id, payload) : shopService.stockCreate(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Item updated" : "Item added");
      queryClient.invalidateQueries({ queryKey: ["shop", "stock"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Drawer title={isEdit ? `Edit ${item.name}` : "Add stock item"} subtitle="Shop stock" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <Section title="Item">
            <Field label="Item name" required full>
              <input name="name" required value={form.name} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Unit">
              <input name="unit" value={form.unit} onChange={onChange} placeholder="pcs, kg, box…" className={inputClass} />
            </Field>
            <Field label="Quantity in stock">
              <input name="quantity" type="number" min="0" step="any" value={form.quantity} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Reorder level" hint="You'll see a low-stock flag at or below this. 0 = no alert.">
              <input name="reorderLevel" type="number" min="0" step="any" value={form.reorderLevel} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Cost price (Rs)">
              <input name="costPrice" type="number" min="0" step="any" value={form.costPrice} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Sale price (Rs)">
              <input name="salePrice" type="number" min="0" step="any" value={form.salePrice} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Notes" full>
              <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add item"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

function AdjustDialog({ item, onClose }) {
  const queryClient = useQueryClient();
  const [delta, setDelta] = useState("");
  const change = Number(delta) || 0;
  const newQty = item.quantity + change;

  const mutation = useMutation({
    mutationFn: () => shopService.stockAdjust(item.id, change),
    onSuccess: () => {
      toast.success("Stock updated");
      queryClient.invalidateQueries({ queryKey: ["shop", "stock"] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal title={`Adjust stock — ${item.name}`} onClose={onClose}>
      <p className="mb-4 text-[15px] text-gray-600 dark:text-gray-400">
        Currently {formatNumber(item.quantity)} {item.unit}. Enter a positive number to add stock or a negative number to remove it.
      </p>
      <Field label="Change">
        <input type="number" step="any" autoFocus value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 20 or -5" className={inputClass} />
      </Field>
      <p className={`mt-3 text-[15px] font-medium ${newQty < 0 ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
        New quantity: {formatNumber(newQty)} {item.unit}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        <button type="button" disabled={change === 0 || newQty < 0 || mutation.isPending} onClick={() => mutation.mutate()} className={primaryBtn}>
          {mutation.isPending ? "Saving…" : "Update stock"}
        </button>
      </div>
    </Modal>
  );
}

export default function StockList() {
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: "", low: "", page: 1 });
  const [drawer, setDrawer] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const debouncedSearch = useDebounce(filters.search);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const params = { page: filters.page, limit: 10, search: debouncedSearch || undefined, low: filters.low || undefined };

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["shop", "stock", "list", params],
    queryFn: () => shopService.stockList(params),
    placeholderData: keepPreviousData,
  });
  const { data: summary } = useQuery({
    queryKey: ["shop", "stock", "summary"],
    queryFn: shopService.stockSummary,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => shopService.stockRemove(id),
    onSuccess: () => {
      toast.success("Item deleted");
      queryClient.invalidateQueries({ queryKey: ["shop", "stock"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const items = list?.data ?? [];
  const stats = [
    { label: "Items", value: summary?.items ?? "—", sub: "In stock list" },
    { label: "Stock value", value: summary ? `Rs ${formatCompact(summary.value)}` : "—", sub: "Quantity × cost price" },
    { label: "Low stock", value: summary?.low ?? "—", sub: "At or below reorder level" },
  ];

  return (
    <>
      {can("shop", "add") && (
        <div>
          <button className={primaryBtn} onClick={() => setDrawer({})}>+ Add stock item</button>
        </div>
      )}

      <StatStrip items={stats} />

      <div className={cardClass}>
        <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 sm:grid-cols-3 dark:border-gray-800">
          <input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Search item name…"
            className={`${inputClass} sm:col-span-2`}
          />
          <Select value={filters.low} onChange={(e) => setFilter("low", e.target.value)}>
            <option value="">All items</option>
            <option value="true">Low stock only</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className={thClass}>Item</th>
                <th className={`${thClass} text-right`}>In stock</th>
                <th className={`${thClass} text-right`}>Reorder level</th>
                <th className={`${thClass} text-right`}>Cost price</th>
                <th className={`${thClass} text-right`}>Sale price</th>
                <th className={`${thClass} text-right`}>Stock value</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">Loading stock…</td></tr>}
              {error && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-red-700 dark:text-red-400">{error.message}</td></tr>}
              {!isLoading && !error && items.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">No stock items found.</td></tr>
              )}

              {items.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className={`${tdClass} font-medium text-gray-900 dark:text-gray-100`}>{i.name}</td>
                  <td className={`${tdClass} text-right`}>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(i.quantity)} {i.unit}</span>
                    {isLow(i) && <div className="mt-1"><StatusBadge label="Low stock" tone="red" /></div>}
                  </td>
                  <td className={`${tdClass} text-right`}>{i.reorderLevel ? formatNumber(i.reorderLevel) : "—"}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(i.costPrice)}</td>
                  <td className={`${tdClass} text-right`}>{i.salePrice ? formatPKR(i.salePrice) : "—"}</td>
                  <td className={`${tdClass} text-right`}>{formatPKR(i.quantity * i.costPrice)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {can("shop", "edit") && (
                        <>
                          <button className={smallBtn} onClick={() => setAdjusting(i)}>Adjust</button>
                          <button title="Edit" aria-label="Edit item" onClick={() => setDrawer({ item: i })} className={iconBtn}>
                            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                              <path d="M13.5 6.5l4 4" />
                            </svg>
                          </button>
                        </>
                      )}
                      {can("shop", "delete") && (
                        <button title="Delete" aria-label="Delete item" onClick={() => setToDelete(i)} className={`${iconBtn} hover:!text-red-700 dark:hover:!text-red-400`}>
                          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={list?.meta} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
      </div>

      {drawer && <StockDrawer key={drawer.item?.id ?? "new"} item={drawer.item} onClose={() => setDrawer(null)} />}
      {adjusting && <AdjustDialog key={adjusting.id} item={adjusting} onClose={() => setAdjusting(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Delete stock item"
          message={`${toDelete.name} will be removed from the stock list.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}