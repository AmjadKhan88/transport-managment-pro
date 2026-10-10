import { api } from "./api";

export const dashboardService = {
  get: async (params) => (await api.get("/dashboard", { params })).data.data,
};