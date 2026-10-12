import { api } from "./api";

export const documentService = {
  list: async (params) => (await api.get("/documents", { params })).data, // { data, meta, totals }
  create: async (formData) =>
    (await api.post("/documents", formData)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/documents/${id}`, payload)).data.data,
  remove: async (id) => api.delete(`/documents/${id}`),
  fileUrl: (id) => `${api.defaults.baseURL}/documents/${id}/file`,
};
