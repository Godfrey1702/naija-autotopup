/**
 * @fileoverview Protected route wrapper that requires admin role.
 */

import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/admin/contexts/AdminAuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { FullPageLoading } from "@/components/ui/loading-spinner";

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading } = useAdminAuth();

  if (authLoading || isLoading) {
    return <FullPageLoading message="Verifying admin access..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
