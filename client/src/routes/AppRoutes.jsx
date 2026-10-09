import { Routes, Route } from "react-router-dom";
import { navigation, getModuleFromPath } from "@/config/navigation";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RequirePermission from "@/components/auth/RequirePermission";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";
import Users from "@/pages/users/Users";
import Vehicles from "@/pages/vehicles/Vehicles";
import VehicleDetail from "@/pages/vehicles/VehicleDetail";
import Drivers from "@/pages/drivers/Drivers";
import DriverDetail from "@/pages/drivers/DriverDetail";
import Customers from "@/pages/customers/Customers";
import Trips from "@/pages/trips/Trips";
import Diesel from "@/pages/diesel/Diesel";
import Repairs from "@/pages/repairs/Repairs";
import Salaries from "@/pages/salaries/Salaries";
import Shop from "@/pages/shop/Shop";
import Office from "@/pages/office/Office";

// Real pages get registered here as we build them. Everything else shows a placeholder.
const pages = {
  "/users": <Users />,
  "/vehicles": <Vehicles />,
  "/drivers": <Drivers />,
  "/customers": <Customers />,
  "/trips": <Trips />,
  "/diesel": <Diesel />,
  "/repairs": <Repairs />,
  "/employees": <Salaries />,
  "/shop": <Shop />,
  "/office": <Office />,
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
          <Route
            path="/vehicles/:id"
            element={
              <RequirePermission module="vehicles">
                <VehicleDetail />
              </RequirePermission>
            }
          />
          <Route
            path="/drivers/:id"
            element={
              <RequirePermission module="drivers">
                <DriverDetail />
              </RequirePermission>
            }
          />
          <Route path="*" element={<Placeholder title="404 — Page not found" />} />
        </Route>
      </Route>
    </Routes>
  );
}