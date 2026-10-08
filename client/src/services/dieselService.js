import { api } from "./api";

export const dieselService = {
  list: async (params) => (await api.get("/diesel", { params })).data, // { data, meta, totals }
  report: async (params) => (await api.get("/diesel/report", { params })).data, // { data, totals, groupBy }
  stations: async () => (await api.get("/diesel/stations")).data.data,
  create: async (payload) => (await api.post("/diesel", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/diesel/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/diesel/${id}`),
};
