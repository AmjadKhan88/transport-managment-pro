import { api } from "./api";

export const tripService = {
  list: async (params) => (await api.get("/trips", { params })).data, // { data, meta, totals }
  get: async (id) => (await api.get(`/trips/${id}`)).data.data,
  create: async (payload) => (await api.post("/trips", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/trips/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/trips/${id}`),
};
