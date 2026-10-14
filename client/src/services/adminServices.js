import { api } from "./api";

const LONG = { timeout: 10 * 60 * 1000 }; // backups and restores can take a while

export const backupService = {
  list: async () => (await api.get("/backups")).data, // { data, status }
  create: async () => (await api.post("/backups", null, LONG)).data.data,
  info: async (name) =>
    (await api.get(`/backups/${name}/info`, LONG)).data.data,
  remove: async (name) => api.delete(`/backups/${name}`),
  restore: async (name) =>
    (await api.post(`/backups/${name}/restore`, { confirm: "RESTORE" }, LONG))
      .data.data,
  upload: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return (await api.post("/backups/upload", fd, LONG)).data.data;
  },
  downloadUrl: (name) => `${api.defaults.baseURL}/backups/${name}/download`,
};

export const auditService = {
  list: async (params) => (await api.get("/audit", { params })).data, // { data, meta }
};

export const systemService = {
  status: async () => (await api.get("/system/status")).data.data,
};
