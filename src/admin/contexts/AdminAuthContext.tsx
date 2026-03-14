/**
 * @fileoverview Admin Authentication Context
 * 
 * Provides admin role verification. Wraps the main AuthContext
 * and adds admin-specific role checking via the has_role database function.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { checkAdminRole } from "@/api/admin";

interface AdminAuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType>({ isAdmin: false, isLoading: true });

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    checkAdminRole().then((result) => {
      setIsAdmin(result);
      setIsLoading(false);
    });
  }, [user, authLoading]);

  return (
    <AdminAuthContext.Provider value={{ isAdmin, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
