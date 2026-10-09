import { api } from "./api";

export const salaryService = {
  list: async (params) => (await api.get("/salaries", { params })).data, // { data, meta, totals }
  report: async (params) =>
    (await api.get("/salaries/report", { params })).data, // { data, totals, year }
  payees: async () => (await api.get("/salaries/payees")).data.data, // { drivers, employees }
  generate: async (payload) =>
    (await api.post("/salaries/generate", payload)).data.data,
  create: async (payload) => (await api.post("/salaries", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/salaries/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/salaries/${id}`),
};
