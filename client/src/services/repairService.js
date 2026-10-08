import { api } from "./api";

export const repairService = {
  list: async (params) => (await api.get("/repairs", { params })).data, // { data, meta, totals }
  upcoming: async (days = 30) =>
    (await api.get("/repairs/upcoming", { params: { days } })).data.data,
  workshops: async () => (await api.get("/repairs/workshops")).data.data,
  create: async (payload) => (await api.post("/repairs", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/repairs/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/repairs/${id}`),
};
