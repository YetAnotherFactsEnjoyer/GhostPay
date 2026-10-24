import { useSyncExternalStore } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { auth } from "../../shared/api/client";

export function ProtectedRoute() {
  const location = useLocation();
  const token = useSyncExternalStore(auth.subscribe, auth.get);
  return token ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
}
