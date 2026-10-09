import { api } from "./api";

export const employeeService = {
  list: async (params) => (await api.get("/employees", { params })).data, // { data, meta }
  summary: async () => (await api.get("/employees/summary")).data.data,
  create: async (payload) => (await api.post("/employees", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/employees/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/employees/${id}`),
};
