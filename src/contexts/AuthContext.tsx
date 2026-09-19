import React, { createContext, useContext, useState, type ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");

  const shellFn = useServerFn(getAppShellData);
  const {
    data: shellData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["auth-shell-data", selectedHospitalId],
    queryFn: () => shellFn({ data: { hospitalId: selectedHospitalId || undefined } }),
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
  });

  const activeHospitalId =
    selectedHospitalId || shellData?.activeWorkplace?.hospitalId || "";

  // Strict role extraction: NO hardcoded fallback to "doctor" or "hospital_admin"
  let role: StaffRole | "patient" | null = null;
  if (!isLoading && shellData) {
    if (shellData.activeWorkplace?.role) {
      role = shellData.activeWorkplace.role as StaffRole;
    } else if (shellData.isPatient) {
      role = "patient";
    } else if (shellData.isSuperAdmin) {
      role = "super_admin";
    }
  }

  const isSuperAdmin = Boolean(shellData?.isSuperAdmin);
  const isAdmin = Boolean(shellData?.isAdmin);
  const isPatient = Boolean(shellData?.isPatient);

  const signOut = async () => {
    try {
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
