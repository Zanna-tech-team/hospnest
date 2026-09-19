import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getRoleDashboardData,
  type RoleDashboardResult,
  type DoctorDashboardData,
  type NurseDashboardData,
  type LabTechDashboardData,
  type PharmacistDashboardData,
  type FrontDeskDashboardData,
} from "@/lib/role-dashboard.functions";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  AlertTriangle,
  FlaskConical,
  LayoutDashboard,
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

// ─── Safe empty default data structures for instant pre-data rendering ─────────

const DEFAULT_DOCTOR_DATA: DoctorDashboardData = {
  queueCount: 0,
  myPatientsCount: 0,
  unassignedCount: 0,
  urgentVitalsCount: 0,
  pendingLabOrdersCount: 0,
  completedLabResultsCount: 0,
  supervisedInpatientsCount: 0,
  appointmentMetrics: {
    todayTotal: 0,
    completed: 0,
    checkedIn: 0,
    pending: 0,
    cancelled: 0,
    noShowRate: 0,
    externalOnlineBookings: 0,
    hourlyTraffic: [],
  },
  patientAssignmentQueues: {
    waitingTriage: [],
    waitingDoctor: [],
    inConsultation: [],
    diagnosticHold: [],
    pharmacyHold: [],
  },
  waitingQueue: [],
  inpatients: [],
  criticalLabAlerts: [],
  recentLabResults: [],
  labStatusSummary: {
    requestedToday: 0,
    pendingResults: 0,
    completedToday: 0,
    criticalAlertsCount: 0,
  },
  notifications: [],
};

const DEFAULT_NURSE_DATA: NurseDashboardData = {
  triageQueueCount: 0,
  vitalsCapturedTodayCount: 0,
  activeInpatientsCount: 0,
  totalBedsCount: 0,
  availableBedsCount: 0,
  occupancyRate: 0,
  todayShift: null,
  triageQueue: [],
  urgentVitalsAlerts: [],
};

const DEFAULT_LAB_DATA: LabTechDashboardData = {
  requestedCount: 0,
  sampleCollectedCount: 0,
  inProgressCount: 0,
  completedTodayCount: 0,
  criticalResultsCount: 0,
  avgTurnaroundHours: 2.0,
  activeWorklist: [],
};

const DEFAULT_PHARMACIST_DATA: PharmacistDashboardData = {
  pendingPrescriptionsCount: 0,
  dispensedTodayCount: 0,
  lowStockItemsCount: 0,
  outOfStockItemsCount: 0,
  totalMedicationsCount: 0,
  pendingQueue: [],
  lowStockAlerts: [],
};

const DEFAULT_FRONT_DESK_DATA: FrontDeskDashboardData = {
  todayAppointmentsCount: 0,
  onlineBookingsCount: 0,
  checkedInTodayCount: 0,
  availableBedsCount: 0,
  totalBedsCount: 0,
  todayAppointments: [],
  liveTriageQueue: [],
};

// ─── Role metadata for dashboard header labels & action buttons ────────────────

const ROLE_CONFIG: Record<
  string,
  { title: string; subtitle: string; badgeLabel: string; badgeColor: string }
> = {
  doctor: {
    title: "Doctor Clinical Workspace",
    subtitle: "Your consultation queue, patient vitals, and clinical metrics.",
    badgeLabel: "Doctor",
    badgeColor: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  nurse: {
    title: "Nursing & Triage Station",
    subtitle: "Triage queue, ward beds, and shift summary.",
    badgeLabel: "Nurse",
    badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  lab_tech: {
    title: "Laboratory Diagnostic Hub",
    subtitle: "Specimen worklist, test processing, and critical result alerts.",
    badgeLabel: "Lab Tech",
    badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  pharmacist: {
    title: "Pharmacy Operations Center",
    subtitle: "Prescription dispensary queue, drug inventory, and stock alerts.",
    badgeLabel: "Pharmacist",
    badgeColor: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  front_desk: {
    title: "Front Desk & Intake",
    subtitle: "Daily appointments, walk-in check-ins, and lobby queue.",
    badgeLabel: "Front Desk",
    badgeColor: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  hospital_admin: {
    title: "Executive Hospital Dashboard",
    subtitle: "Full facility overview, financials, staff, and operational metrics.",
    badgeLabel: "Hospital Admin",
    badgeColor: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  super_admin: {
    title: "Executive Hospital Dashboard",
    subtitle: "Platform-level oversight and clinical operations.",
    badgeLabel: "Super Admin",
    badgeColor: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  billing_officer: {
    title: "Billing & Revenue Dashboard",
    subtitle: "Invoices, claims, collections, and financial reporting.",
    badgeLabel: "Billing Officer",
    badgeColor: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  patient: {
    title: "Patient Health Portal",
    subtitle: "Your clinical records, prescriptions, and health overview.",
    badgeLabel: "Patient",
    badgeColor: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
};

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
    shellData,
  } = useAuth();
  const getDashboardDataFn = useServerFn(getRoleDashboardData);

  // Patient: redirect immediately — don't wait for dashboard data
  useEffect(() => {
    if (isAuthLoading) return;
    if (isPatient) {
      navigate({ to: "/portal" });
      return;
    }
    if (isSuperAdmin && !activeHospitalId) {
      navigate({ to: "/superadmin" });
    }
  }, [isPatient, isSuperAdmin, activeHospitalId, isAuthLoading, navigate]);

  // Effective role: use authRole immediately (includes cached role from localStorage)
  // so UI renders the correct skeleton while server data is loading
  const effectiveRole = authRole;

  const { data, isLoading: isDashLoading, isError, refetch, isRefetching } = useQuery<RoleDashboardResult>({
    queryKey: ["role-dashboard-data", activeHospitalId, effectiveRole],
    queryFn: () =>
      getDashboardDataFn({
        data: {
          hospitalId: activeHospitalId || undefined,
          role: effectiveRole || undefined,
        },
      }),
    enabled:
      !isAuthLoading &&
      !isPatient &&
      Boolean(effectiveRole) &&
      (Boolean(activeHospitalId) || Boolean(isSuperAdmin)),
    staleTime: 1000 * 20, // 20s — refresh every 20s
    refetchInterval: 30000,
  });

  // ── Loading state: show role-branded skeleton while auth resolves ──────────
  if (isAuthLoading && !effectiveRole) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-500/10">
          <LayoutDashboard className="size-7 text-teal-600 animate-pulse" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-foreground">Loading your workspace...</p>
          <p className="text-xs text-muted-foreground">Authenticating and resolving your role permissions</p>
        </div>
        <RefreshCw className="h-5 w-5 animate-spin text-teal-500/60" />
      </div>
    );
  }

  // Patient redirect placeholder
  if (isPatient) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm font-medium text-muted-foreground">Redirecting to Patient Health Portal...</p>
      </div>
    );
  }

  // Super admin without hospital: redirect placeholder
  if (isSuperAdmin && !activeHospitalId) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-sm font-medium text-muted-foreground">Redirecting to Super Admin Command Center...</p>
      </div>
    );
  }

  // No role resolved at all (auth complete but no role record) — check if pending approval
  if (!isAuthLoading && !effectiveRole) {
    const isPendingStaff = !isPatient && Boolean(shellData?.profileDetails?.id);

    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center px-4">
        {isPendingStaff ? (
          <>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10">
              <Activity className="size-7 text-amber-500" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <p className="text-base font-semibold text-foreground">Pending Hospital Approval</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your staff affiliation request has been received. Please wait while the Hospital
                Administrator reviews and approves your credentials. You will receive a notification
                once your account is activated.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 size-3.5" /> Check Again
            </Button>
          </>
        ) : (
          <>
            <AlertTriangle className="size-12 text-amber-500" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Workspace Role Not Found</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your account is not yet linked to a hospital workspace. Please contact your hospital
                administrator or sign in with the correct account.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 size-3.5" /> Try Again
            </Button>
          </>
        )}
      </div>
    );
  }

  const roleCfg = (effectiveRole && ROLE_CONFIG[effectiveRole]) || ROLE_CONFIG["hospital_admin"];

  return (
    <div className="space-y-6 pb-16">
      {/* Non-fatal network error notice */}
      {isError && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Could not refresh live statistics. Showing workstation in offline-resilient mode.</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            className="h-7 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {roleCfg?.title ?? "Clinical Workspace"}
            </h1>
            {effectiveRole && (
              <Badge
                variant="outline"
                className={`font-semibold uppercase text-[10px] ${roleCfg?.badgeColor}`}
              >
                {roleCfg?.badgeLabel ?? effectiveRole.replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.hospitalName || shellData?.activeWorkplace?.name || "Active Facility"}{" "}
            {roleCfg?.subtitle && `• ${roleCfg.subtitle}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching || isDashLoading}
            className="gap-1.5 border-border"
          >
            <RefreshCw className={`size-3.5 ${isRefetching || isDashLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {effectiveRole === "doctor" && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/consultations">
                <Stethoscope className="size-3.5" /> Consultations Queue
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
          {(effectiveRole === "front_desk" ||
            effectiveRole === "hospital_admin" ||
            effectiveRole === "super_admin") && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/front-desk">
                <UserPlus className="size-3.5" /> Patient Intake
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Role-Specific Modular Dashboards ─────────────────────────────────── */}
      {/* Each dashboard receives live data OR safe default — renders immediately */}

      {effectiveRole === "doctor" && (
        <DoctorDashboard data={data?.doctorData ?? DEFAULT_DOCTOR_DATA} refetch={refetch} />
      )}

      {effectiveRole === "nurse" && (
        <NurseDashboard data={data?.nurseData ?? DEFAULT_NURSE_DATA} />
      )}

      {effectiveRole === "lab_tech" && (
        <LabTechDashboard data={data?.labTechData ?? DEFAULT_LAB_DATA} />
      )}

      {effectiveRole === "pharmacist" && (
        <PharmacistDashboard data={data?.pharmacistData ?? DEFAULT_PHARMACIST_DATA} />
      )}

      {effectiveRole === "front_desk" && (
        <FrontDeskDashboard data={data?.frontDeskData ?? DEFAULT_FRONT_DESK_DATA} />
      )}

      {(effectiveRole === "hospital_admin" ||
        effectiveRole === "super_admin" ||
        effectiveRole === "billing_officer") && (
        <HospitalAdminDashboard data={data?.adminData} />
      )}

      {effectiveRole === "patient" && data?.patientData && (
        <PatientDashboard data={data.patientData} />
      )}
    </div>
  );
}
