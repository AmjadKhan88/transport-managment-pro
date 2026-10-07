import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "./authContext";
import { authService } from "@/services/authService";

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on page load
  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((u) => active && setUser(u))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Any 401 from the API -> drop session
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [queryClient]);

  const login = useCallback(async (email, password) => {
    const u = await authService.login(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const can = useCallback(
    (module, action = "view") => Boolean(user?.permissions?.[module]?.includes(action)),
    [user]
  );

  const value = useMemo(() => ({ user, loading, login, logout, can }), [user, loading, login, logout, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}