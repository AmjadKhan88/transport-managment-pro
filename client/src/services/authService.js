import { api } from "./api";

export const authService = {
  login: async (email, password) =>
    (await api.post("/auth/login", { email, password })).data.data.user,
  logout: async () => api.post("/auth/logout"),
  me: async () => (await api.get("/auth/me")).data.data.user,
  changePassword: async (currentPassword, newPassword) =>
    api.patch("/auth/change-password", { currentPassword, newPassword }),
};
