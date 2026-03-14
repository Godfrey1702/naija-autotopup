import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { PhoneNumberProvider } from "@/contexts/PhoneNumberContext";
import { AdminAuthProvider } from "@/admin/contexts/AdminAuthContext";
import { ProtectedAdminRoute } from "@/admin/components/ProtectedAdminRoute";
import { AdminLayout } from "@/admin/components/AdminLayout";
import { DashboardPage } from "@/admin/pages/DashboardPage";
import { UsersPage } from "@/admin/pages/UsersPage";
import { WalletsPage } from "@/admin/pages/WalletsPage";
import { TransactionsPage } from "@/admin/pages/TransactionsPage";
import { ScheduledPage } from "@/admin/pages/ScheduledPage";
import { AnalyticsPage } from "@/admin/pages/AnalyticsPage";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <AdminAuthProvider>
              <WalletProvider>
                <PhoneNumberProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* Admin routes */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedAdminRoute>
                          <AdminLayout />
                        </ProtectedAdminRoute>
                      }
                    >
                      <Route index element={<DashboardPage />} />
                      <Route path="users" element={<UsersPage />} />
                      <Route path="wallets" element={<WalletsPage />} />
                      <Route path="transactions" element={<TransactionsPage />} />
                      <Route path="scheduled" element={<ScheduledPage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PhoneNumberProvider>
              </WalletProvider>
            </AdminAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
