import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getRoleDashboardData,
  type RoleDashboardResult,
} from "@/lib/role-dashboard.functions";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  FlaskConical,
  Pill,
  RefreshCw,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DoctorDashboard } from "@/components/dashboard/DoctorDashboard";
import { NurseDashboard } from "@/components/dashboard/NurseDashboard";
import { LabTechDashboard } from "@/components/dashboard/LabTechDashboard";
import { PharmacistDashboard } from "@/components/dashboard/PharmacistDashboard";
import { HospitalAdminDashboard } from "@/components/dashboard/HospitalAdminDashboard";
import { FrontDeskDashboard } from "@/components/dashboard/FrontDeskDashboard";
import { PatientDashboard } from "@/components/dashboard/PatientDashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Clinical & Operations Dashboard — HospNest" },
      {
        name: "description",
        content:
          "Role-specific operational dashboard for doctors, nurses, lab techs, pharmacists, and hospital administrators.",
      },
    ],
  }),
  component: DashboardPage,
});

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    activeHospitalId,
    role: authRole,
    isPatient,
    isSuperAdmin,
    isLoading: isAuthLoading,
  } = useAuth();
  const getDashboardDataFn = useServerFn(getRoleDashboardData);

  useEffect(() => {
    if (isAuthLoading) return;

    if (isPatient) {
      navigate({ to: "/portal" });
      return;
    }
    // If user is superadmin and not actively inspecting a specific hospital, send them to global command center
    if (isSuperAdmin && !activeHospitalId) {
      navigate({ to: "/superadmin" });
    }
  }, [isPatient, isSuperAdmin, activeHospitalId, isAuthLoading, navigate]);

  const { data, isLoading, refetch, isRefetching } = useQuery<RoleDashboardResult>({
    queryKey: ["role-dashboard-data", activeHospitalId, authRole],
    queryFn: () =>
      getDashboardDataFn({
        data: {
          hospitalId: activeHospitalId,
          role: authRole || undefined,
        },
      }),
    enabled:
      !isAuthLoading &&
      !isPatient &&
      (Boolean(activeHospitalId) || Boolean(isSuperAdmin)),
    refetchInterval: 20000,
  });

  if (isAuthLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm font-medium text-muted-foreground">
          Authenticating workspace...
        </p>
      </div>
    );
  }

  if (isPatient) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm font-medium text-muted-foreground">
          Redirecting to Patient Health Portal...
        </p>
      </div>
    );
  }

  if (isSuperAdmin && !activeHospitalId) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-sm font-medium text-muted-foreground">
          Redirecting to Super Admin Global Command Center...
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading your clinical workspace dashboard...
        </p>
      </div>
    );
  }

  const effectiveRole = data?.role || authRole || "hospital_admin";

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {effectiveRole === "doctor"
                ? "Doctor Clinical Workspace"
                : effectiveRole === "nurse"
                ? "Nursing & Triage Station"
                : effectiveRole === "lab_tech"
                ? "Laboratory Diagnostic Hub"
                : effectiveRole === "pharmacist"
                ? "Pharmacy Operations Center"
                : effectiveRole === "front_desk"
                ? "Front Desk & Intake"
                : effectiveRole === "patient"
                ? "Patient Personal Portal"
                : "Executive Hospital Dashboard"}
            </h1>
            <Badge
              variant="outline"
              className="border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold uppercase text-[10px]"
            >
              {effectiveRole.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.hospitalName} • Real-time patient queues, clinical metrics, and department actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5 border-border"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Role-Specific Primary Action */}
          {effectiveRole === "doctor" && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/consultations">
                <Stethoscope className="size-3.5" /> Open Consultations Queue
              </Link>
            </Button>
          )}
          {effectiveRole === "nurse" && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/triage">
                <Activity className="size-3.5" /> Start Triage & Vitals
              </Link>
            </Button>
          )}
          {effectiveRole === "lab_tech" && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/lab">
                <FlaskConical className="size-3.5" /> Open Lab Workbench
              </Link>
            </Button>
          )}
          {effectiveRole === "pharmacist" && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/pharmacy">
                <Pill className="size-3.5" /> Dispense Prescriptions
              </Link>
            </Button>
          )}
          {effectiveRole === "front_desk" && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/front-desk">
                <UserPlus className="size-3.5" /> Patient Intake
              </Link>
            </Button>
          )}
          {(effectiveRole === "hospital_admin" || effectiveRole === "super_admin") && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/front-desk">
                <UserPlus className="size-3.5" /> Patient Intake
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Role-Specific Modular Dashboards */}
      {effectiveRole === "doctor" && data?.doctorData && (
        <DoctorDashboard data={data.doctorData} refetch={refetch} />
      )}

      {effectiveRole === "nurse" && data?.nurseData && (
        <NurseDashboard data={data.nurseData} />
      )}

      {effectiveRole === "lab_tech" && data?.labTechData && (
        <LabTechDashboard data={data.labTechData} />
      )}

      {effectiveRole === "pharmacist" && data?.pharmacistData && (
        <PharmacistDashboard data={data.pharmacistData} />
      )}

      {effectiveRole === "front_desk" && data?.frontDeskData && (
        <FrontDeskDashboard data={data.frontDeskData} />
      )}

      {(effectiveRole === "hospital_admin" ||
        effectiveRole === "super_admin" ||
        effectiveRole === "billing_officer") &&
        data?.adminData && <HospitalAdminDashboard data={data.adminData} />}

      {effectiveRole === "patient" && data?.patientData && (
        <PatientDashboard data={data.patientData} />
      )}
    </div>
  );
}
