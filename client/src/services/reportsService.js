import { api } from "./api";

const get = async (path, params) =>
  (await api.get(`/reports/${path}`, { params })).data.data;

export const reportsService = {
  monthly: (year) => get("monthly", { year }),
  annual: (year) => get("annual", { year }),
  vehicles: (params) => get("vehicles", params),
  trips: (params) => get("trips", params),
  recovery: () => get("recovery"),
  salaries: (params) => get("salaries", params),
};
