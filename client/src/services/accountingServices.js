import { api } from "./api";

const crud = (path) => ({
  list: async (params) => (await api.get(path, { params })).data, // { data, meta, totals }
  create: async (payload) => (await api.post(path, payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`${path}/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`${path}/${id}`),
});

export const incomeService = crud("/income");
export const expenseService = crud("/expenses");

export const investmentService = {
  ...crud("/investments"),
  summary: async (params) =>
    (await api.get("/investments/summary", { params })).data.data,
};

export const companyService = {
  overview: async (params) =>
    (await api.get("/company/overview", { params })).data.data,
};
