import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { TerminalPage } from "../../features/terminals/pages/VirtualTerminalPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "../../features/auth/pages/LoginPage";
import { RegisterPage } from "../../features/auth/pages/RegisterPage";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { MerchantsPage } from "../../features/merchants/pages/MerchantsPage";
import { TerminalsPage } from "../../features/terminals/pages/TerminalsPage";
import { PaymentsPage } from "../../features/payments/pages/PaymentsPage";
import { SyncPage } from "../../features/sync/pages/SyncPage";
import { SettingsPage } from "../../features/settings/pages/SettingsPage";
import { auth } from "../../shared/api/client";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/terminal/:terminalId" element={<TerminalPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/merchants" element={<MerchantsPage />} />
            <Route path="/app/terminals" element={<TerminalsPage />} />
            <Route path="/app/payments" element={<PaymentsPage />} />
            <Route path="/app/sync" element={<SyncPage />} />
            <Route path="/app/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route
          path="*"
          element={<Navigate to={auth.get() ? "/app" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
