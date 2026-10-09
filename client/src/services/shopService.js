import { api } from "./api";

export const shopService = {
  list: async (params) => (await api.get("/shop", { params })).data, // { data, meta, totals }
  report: async (params) => (await api.get("/shop/report", { params })).data, // { data, totals, groupBy }
  create: async (payload) => (await api.post("/shop", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/shop/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/shop/${id}`),

  stockList: async (params) => (await api.get("/shop/stock", { params })).data, // { data, meta }
  stockSummary: async () => (await api.get("/shop/stock/summary")).data.data,
  stockCreate: async (payload) =>
    (await api.post("/shop/stock", payload)).data.data,
  stockUpdate: async (id, payload) =>
    (await api.patch(`/shop/stock/${id}`, payload)).data.data,
  stockAdjust: async (id, delta) =>
    (await api.post(`/shop/stock/${id}/adjust`, { delta })).data.data,
  stockRemove: async (id) => api.delete(`/shop/stock/${id}`),
};
