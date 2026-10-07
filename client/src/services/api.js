import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";

    if (status === 401 && !url.includes("/auth/")) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    const message =
      err.response?.data?.message || err.message || "Something went wrong";
    return Promise.reject(Object.assign(new Error(message), { status }));
  },
);
