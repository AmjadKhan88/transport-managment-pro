import { api } from "./api";

export const userService = {
  list: async () => (await api.get("/users")).data.data,
  create: async (payload) => (await api.post("/users", payload)).data.data,
  update: async (id, payload) =>
    (await api.patch(`/users/${id}`, payload)).data.data,
  resetPassword: async (id, password) =>
    api.patch(`/users/${id}/password`, { password }),
};
