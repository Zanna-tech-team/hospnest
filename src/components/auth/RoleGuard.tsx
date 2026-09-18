import React from "react";
import { Link } from "@tanstack/react-router";
import { useAppShell } from "@/components/layout/AppShell";
import type { StaffRole } from "@/lib/team.functions";
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock, Stethoscope, HeartPulse } from "lucide-react";
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
  const { shellData, isLoading } = useAppShell();

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

  const isSuperAdmin = Boolean(shellData?.isSuperAdmin);
  const isAdmin = Boolean(shellData?.isAdmin);
  const isPatient = Boolean(shellData?.isPatient);
  const currentRole = (shellData?.activeWorkplace?.role || (isPatient ? "patient" : isSuperAdmin ? "super_admin" : "doctor")) as StaffRole | "patient";
  const userPermissions = shellData?.activeWorkplace?.modulePermissions || shellData?.modulePermissions || [];

  // Super Admin and Hospital Admin always pass
  if (isSuperAdmin || isAdmin) {
    return <>{children}</>;
  }

  // Check role-based permission
  const hasRoleAccess = allowedRoles ? allowedRoles.includes(currentRole) : true;

  // Check dynamic module permission grant
  const hasModulePermission = requiredPermission ? userPermissions.includes(requiredPermission) : false;

  if (hasRoleAccess || hasModulePermission) {
    return <>{children}</>;
  }

  // Not authorized - render friendly locked screen
  const defaultMessage = `Your current clinical workstation role (${currentRole.replace("_", " ").toUpperCase()}) is restricted from accessing this module. If you require operational access to this department, please contact your Hospital Medical Director or Administrative Lead to grant you delegated permissions.`;

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-6 sm:p-8 text-center shadow-lg">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-5 shadow-xs ring-4 ring-destructive/5">
          <ShieldAlert className="size-7" />
        </div>

        <div className="flex justify-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-border">
            Role: {currentRole.replace("_", " ")}
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
              <LayoutDashboard className="mr-2 size-4" />
              Return to My Station
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

