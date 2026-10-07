import { Routes, Route } from "react-router-dom";
import { navigation } from "@/config/navigation";
import Dashboard from "@/pages/Dashboard";
import Placeholder from "@/pages/Placeholder";

export default function AppRoutes() {
  const items = navigation.flatMap((g) => g.items).filter((i) => i.path !== "/");

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      {items.map((i) => (
        <Route key={i.path} path={i.path} element={<Placeholder title={i.label} />} />
      ))}
      <Route path="*" element={<Placeholder title="404 — Page not found" />} />
    </Routes>
  );
}