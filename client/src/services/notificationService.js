import { api } from "./api";

export const notificationService = {
  summary: async () => (await api.get("/notifications/summary")).data.data, // { unread, seenAt, items }
  list: async (params) => (await api.get("/notifications", { params })).data, // { data, meta, seenAt }
  readAll: async () => api.post("/notifications/read-all"),
  today: async (params) =>
    (await api.get("/notifications/today", { params })).data.data,
  preferences: async () =>
    (await api.get("/notifications/preferences")).data.data,
  updatePreferences: async (payload) =>
    (await api.patch("/notifications/preferences", payload)).data.data,
};
