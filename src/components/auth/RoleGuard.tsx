import React from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import type { StaffRole } from "@/lib/team.functions";
import { ShieldAlert, ArrowLeft, LayoutDashboard, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: (StaffRole | "patient")[];
  requiredPermission?: string;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function RoleGuard({
  children,
  allowedRoles,
  requiredPermission,
  fallbackTitle = "Access Restricted",
  fallbackMessage,
}: RoleGuardProps) {
  const { role, isSuperAdmin, isAdmin, isPatient, modulePermissions, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-3 border-teal-600 border-t-transparent dark:border-teal-400" />
          <p className="text-xs text-muted-foreground animate-pulse font-medium">Verifying clinical credentials...</p>
        </div>
      </div>
    );
  }

  // Super Admin and Hospital Admin always pass unrestricted
  if (isSuperAdmin || isAdmin || role === "super_admin" || role === "hospital_admin") {
    return <>{children}</>;
  }

  // Strict role checking - NO fallback to "doctor"
  const currentRole = role || (isPatient ? "patient" : null);

  // Check role-based permission
  const hasRoleAccess = Boolean(currentRole && allowedRoles ? allowedRoles.includes(currentRole) : !allowedRoles);

  // Check dynamic module permission grant
  const hasModulePermission = Boolean(requiredPermission ? modulePermissions.includes(requiredPermission) : false);

  if (hasRoleAccess || hasModulePermission) {
    return <>{children}</>;
  }

  const roleLabel = currentRole ? currentRole.replace("_", " ").toUpperCase() : "UNASSIGNED ROLE";

  // Not authorized - render friendly locked screen
  const defaultMessage = isPatient
    ? "This clinical department is restricted to licensed hospital personnel. Please visit your Patient Health Portal for your appointments, records, and prescriptions."
    : `Your clinical workstation role (${roleLabel}) does not have permission to access this department. If you require access, please request delegated module permissions from your Hospital Administrator.`;

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-6 sm:p-8 text-center shadow-lg">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-5 shadow-xs ring-4 ring-destructive/5">
          <ShieldAlert className="size-7" />
        </div>

        <div className="flex justify-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-border">
            Role: {roleLabel}
          </Badge>
          {requiredPermission && (
            <Badge variant="outline" className="text-xs font-mono text-destructive border-destructive/30 bg-destructive/5">
              Requires: {requiredPermission}
            </Badge>
          )}
        </div>

        <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {fallbackTitle}
        </h2>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {fallbackMessage || defaultMessage}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild variant="default" className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white shadow-xs">
            <Link to={isPatient ? "/portal" : "/dashboard"}>
              {isPatient ? <HeartPulse className="mr-2 size-4" /> : <LayoutDashboard className="mr-2 size-4" />}
              {isPatient ? "Go to Health Portal" : "Return to My Station"}
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to={-1 as any}>
              <ArrowLeft className="mr-2 size-4" />
              Go Back
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

