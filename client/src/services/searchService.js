import { api } from "./api";

export const searchService = {
  search: async (q) => (await api.get("/search", { params: { q } })).data.data, // [{ type, label, items }]
};
