import { api } from "./api";

export const driverService = {
  list: async (params) => (await api.get("/drivers", { params })).data, // { data, meta }
  summary: async () => (await api.get("/drivers/summary")).data.data,
  options: async () => (await api.get("/drivers/options")).data.data,
  get: async (id) => (await api.get(`/drivers/${id}`)).data.data,
  create: async (payload) => (await api.post("/drivers", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/drivers/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/drivers/${id}`),
};
