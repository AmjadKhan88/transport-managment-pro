import { useAuth } from "@/hooks/useAuth";
import AccessDenied from "@/pages/AccessDenied";

export default function RequirePermission({ module, action = "view", children }) {
  const { can } = useAuth();
  return can(module, action) ? children : <AccessDenied />;
}