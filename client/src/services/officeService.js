import { api } from "./api";

export const officeService = {
  list: async (params) => (await api.get("/office", { params })).data, // { data, meta, totals }
  report: async (params) => (await api.get("/office/report", { params })).data, // { data, byCategory, totals }
  create: async (payload) => (await api.post("/office", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/office/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/office/${id}`),
};
