import { Routes, Route } from "react-router-dom";
import { navigation, getModuleFromPath } from "@/config/navigation";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RequirePermission from "@/components/auth/RequirePermission";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";
import Users from "@/pages/users/Users";

// Real pages get registered here as we build them. Everything else shows a placeholder.
const pages = {
  "/users": <Users />,
};

export default function AppRoutes() {
  const items = navigation.flatMap((g) => g.items).filter((i) => i.path !== "/");

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <RequirePermission module="dashboard">
                <Dashboard />
              </RequirePermission>
            }
          />
          {items.map((i) => (
            <Route
              key={i.path}
              path={i.path}
              element={
                <RequirePermission module={getModuleFromPath(i.path)}>
                  {pages[i.path] ?? <Placeholder title={i.label} />}
                </RequirePermission>
              }
            />
          ))}
          <Route path="*" element={<Placeholder title="404 — Page not found" />} />
        </Route>
      </Route>
    </Routes>
  );
}