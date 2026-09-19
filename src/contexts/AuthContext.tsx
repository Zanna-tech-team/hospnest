import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getAppShellData,
  type AppShellData,
  type Workplace,
  type UserProfileDetails,
} from "@/lib/auth-shell.functions";
import type { StaffRole } from "@/lib/team.functions";

export type AuthContextType = {
  user: { id: string; email: string; fullName: string } | null;
  role: StaffRole | "patient" | null;
  hospitalId: string | null;
  activeHospitalId: string;
  setActiveHospitalId: (id: string) => void;
  shellData?: AppShellData | undefined;
  profile: UserProfileDetails | null;
  workplaces: Workplace[];
  activeWorkplace: Workplace | null;
  modulePermissions: string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPatient: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refetch: () => Promise<any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_HOSPITAL_KEY = "hospnest_active_hospital_id";
const STORAGE_ROLE_KEY = "hospnest_cached_role";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [selectedHospitalId, setSelectedHospitalIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_HOSPITAL_KEY) || "";
    }
    return "";
  });

  const [cachedRole, setCachedRole] = useState<StaffRole | "patient" | null>(() => {
    if (typeof window !== "undefined") {
      const r = localStorage.getItem(STORAGE_ROLE_KEY);
      return r ? (r as StaffRole | "patient") : null;
    }
    return null;
  });

  const setSelectedHospitalId = (id: string) => {
    setSelectedHospitalIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem(STORAGE_HOSPITAL_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_HOSPITAL_KEY);
      }
    }
  };

  const shellFn = useServerFn(getAppShellData);
  const {
    data: shellData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["auth-shell-data", selectedHospitalId],
    queryFn: () => shellFn({ data: { hospitalId: selectedHospitalId || undefined } }),
    staleTime: 1000 * 60 * 3,   // 3 minutes
    gcTime: 1000 * 60 * 10,     // 10 minutes
    retry: 1,
  });

  const activeHospitalId =
    selectedHospitalId || shellData?.activeWorkplace?.hospitalId || "";

  // Strict role extraction:
  let resolvedRole: StaffRole | "patient" | null = null;
  if (!isLoading && shellData) {
    if (shellData.isSuperAdmin) {
      resolvedRole = "super_admin";
    } else if (shellData.activeWorkplace?.role) {
      resolvedRole = shellData.activeWorkplace.role as StaffRole;
    } else if (shellData.isPatient) {
      resolvedRole = "patient";
    } else if (shellData.workplaces?.[0]?.role) {
      resolvedRole = shellData.workplaces[0].role as StaffRole;
    }
  }

  const role: StaffRole | "patient" | null = resolvedRole ?? (isLoading ? cachedRole : null);

  useEffect(() => {
    if (resolvedRole && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_ROLE_KEY, resolvedRole);
    }
  }, [resolvedRole]);

  const isSuperAdmin = Boolean(shellData?.isSuperAdmin || role === "super_admin");
  const isAdmin = Boolean(shellData?.isAdmin || isSuperAdmin || role === "hospital_admin");
  const isPatient = Boolean(shellData?.isPatient && !isSuperAdmin && !isAdmin && role === "patient");

  const signOut = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_HOSPITAL_KEY);
        localStorage.removeItem(STORAGE_ROLE_KEY);
      }
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      window.location.href = "/auth";
    }
  };

  const value: AuthContextType = {
    user: shellData?.user || null,
    role,
    hospitalId: activeHospitalId || null,
    activeHospitalId,
    setActiveHospitalId: setSelectedHospitalId,
    shellData,
    profile: shellData?.profileDetails || null,
    workplaces: shellData?.workplaces || [],
    activeWorkplace: shellData?.activeWorkplace || null,
    modulePermissions:
      shellData?.activeWorkplace?.modulePermissions ||
      shellData?.modulePermissions ||
      [],
    isAdmin,
    isSuperAdmin,
    isPatient,
    isLoading,
    isAuthenticated: Boolean(shellData?.user?.id),
    signOut,
    refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
