import { api } from "./api";

export const vehicleService = {
  list: async (params) => (await api.get("/vehicles", { params })).data, // { data, meta }
  summary: async () => (await api.get("/vehicles/summary")).data.data,
  get: async (id) => (await api.get(`/vehicles/${id}`)).data.data,
  create: async (payload) => (await api.post("/vehicles", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/vehicles/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/vehicles/${id}`),
  options: async () => (await api.get("/vehicles/options")).data.data,
};
