import { api } from "./api";

export const customerService = {
  list: async (params) => (await api.get("/customers", { params })).data, // { data, meta }
  summary: async () => (await api.get("/customers/summary")).data.data,
  get: async (id) => (await api.get(`/customers/${id}`)).data.data,
  create: async (payload) => (await api.post("/customers", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/customers/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/customers/${id}`),
  options: async () => (await api.get("/customers/options")).data.data,
};
