import { api } from "./api";

export const receivablesService = {
  list: async (params) => (await api.get("/receivables", { params })).data, // { data, meta, totals }
  statement: async (id, params) =>
    (await api.get(`/receivables/customers/${id}`, { params })).data.data,
  receivePayment: async (payload) =>
    (await api.post("/receivables/payments", payload)).data.data,
};

export const payablesService = {
  overview: async () => (await api.get("/payables")).data.data,
  bills: async (kind, party) =>
    (await api.get("/payables/bills", { params: { kind, party } })).data.data,
  pay: async (payload) => (await api.post("/payables/pay", payload)).data.data,
  payments: async (params) =>
    (await api.get("/payables/payments", { params })).data, // { data, meta }
  removePayment: async (id) => api.delete(`/payables/payments/${id}`),
};
