import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getRoleDashboardData,
  type RoleDashboardResult,
} from "@/lib/role-dashboard.functions";
import { useAppShell } from "@/components/layout/AppShell";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bed,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DoorOpen,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Hospital,
  IdCard,
  Layers,
  Package,
  Pill,
  Plus,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Clinical & Operations Dashboard — HospNest" },
      { name: "description", content: "Role-specific operational dashboard for doctors, nurses, lab techs, pharmacists, and hospital administrators." },
    ],
  }),
  component: DashboardPage,
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

const DEPT_COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];

export function DashboardPage() {
  const { activeHospitalId } = useAppShell();
  const getDashboardDataFn = useServerFn(getRoleDashboardData);

  const { data, isLoading, refetch, isRefetching } = useQuery<RoleDashboardResult>({
    queryKey: ["role-dashboard-data", activeHospitalId],
    queryFn: () => getDashboardDataFn({ data: { hospitalId: activeHospitalId } }),
    enabled: Boolean(activeHospitalId),
    refetchInterval: 20000,
  });

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

  const role = data?.role || "hospital_admin";

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {role === "doctor"
                ? "Doctor Clinical Workspace"
                : role === "nurse"
                ? "Nursing & Triage Station"
                : role === "lab_tech"
                ? "Laboratory Diagnostic Hub"
                : role === "pharmacist"
                ? "Pharmacy Operations Center"
                : "Executive Hospital Dashboard"}
            </h1>
            <Badge
              variant="outline"
              className="border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold uppercase text-[10px]"
            >
              {role.replace("_", " ")}
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
          {role === "doctor" && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/consultations">
                <Stethoscope className="size-3.5" /> Open Consultations Queue
              </Link>
            </Button>
          )}
          {role === "nurse" && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/triage">
                <Activity className="size-3.5" /> Start Triage & Vitals
              </Link>
            </Button>
          )}
          {role === "lab_tech" && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/lab">
                <FlaskConical className="size-3.5" /> Open Lab Workbench
              </Link>
            </Button>
          )}
          {role === "pharmacist" && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/pharmacy">
                <Pill className="size-3.5" /> Dispense Prescriptions
              </Link>
            </Button>
          )}
          {(role === "hospital_admin" || role === "super_admin") && (
            <Button asChild size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold">
              <Link to="/front-desk">
                <UserPlus className="size-3.5" /> Patient Intake
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. DOCTOR DASHBOARD VIEW */}
      {/* ---------------------------------------------------- */}
      {role === "doctor" && data?.doctorData && (
        <div className="space-y-6">
          {/* Doctor KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Consultation Queue
                </CardTitle>
                <Users className="size-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.doctorData.queueCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <strong className="text-teal-600 font-bold">{data.doctorData.myPatientsCount}</strong> claimed by you • {data.doctorData.unassignedCount} waiting
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Urgent Vitals Alerts
                </CardTitle>
                <ShieldAlert className="size-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-rose-600 dark:text-rose-400">
                  {data.doctorData.urgentVitalsCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hypertensive / High fever cases flagged
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  My Inpatients
                </CardTitle>
                <Bed className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.doctorData.supervisedInpatientsCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Admitted under your clinical supervision
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ready Lab Results
                </CardTitle>
                <FlaskConical className="size-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.doctorData.completedLabResultsCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Investigations returned from diagnostic lab
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Doctor Main Grid: Waiting Patients & Supervised Inpatients */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Waiting Queue Worklist */}
            <div className="space-y-4 lg:col-span-7">
              <Card className="shadow-soft border-border">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Awaiting Patients Worklist
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Patients in triage and consultation queue ready for clinical review.
                    </CardDescription>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="gap-1 text-xs">
                    <Link to="/consultations">
                      View All <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {data.doctorData.waitingQueue.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      <CheckCircle2 className="mx-auto size-8 text-emerald-500/70" />
                      <p className="mt-2 font-medium">No patients waiting in consultation queue.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.doctorData.waitingQueue.map((item) => (
                        <div key={item.encounterId} className="flex items-center justify-between p-3.5 hover:bg-muted/30 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{item.patientName}</span>
                              <span className="rounded bg-secondary px-1.5 py-0.2 text-[10px]">
                                {item.age} • {item.gender}
                              </span>
                              {item.vitals?.isUrgent && (
                                <span className="rounded-full bg-rose-500/15 px-1.5 py-0.2 font-mono text-[10px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-0.5">
                                  <ShieldAlert className="size-3" /> Alert
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground">
                              Complaint: {item.chiefComplaint || "Routine consultation"}
                            </p>
                            {item.vitals && (
                              <div className="flex gap-2 font-mono text-[11px] text-muted-foreground">
                                <span>Temp: {item.vitals.temperature ?? "--"}°C</span>
                                <span>BP: {item.vitals.bp ?? "--"}</span>
                                <span>SpO2: {item.vitals.spo2 ?? "--"}%</span>
                              </div>
                            )}
                          </div>
                          <Button asChild size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                            <Link to="/consultations">
                              Consult
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Inpatients & Quick Tools */}
            <div className="space-y-4 lg:col-span-5">
              {/* Supervised Inpatients */}
              <Card className="shadow-soft border-border">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                  <CardTitle className="text-base font-bold text-foreground">
                    Inpatients Supervised ({data.doctorData.inpatients.length})
                  </CardTitle>
                  <Button asChild size="sm" variant="ghost" className="gap-1 text-xs">
                    <Link to="/wards">
                      Ward Matrix <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {data.doctorData.inpatients.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground italic">
                      No active inpatients currently assigned to your profile.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.doctorData.inpatients.map((adm) => (
                        <div key={adm.admissionId} className="p-3 hover:bg-muted/30 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-foreground">{adm.patientName}</span>
                            <p className="text-[11px] text-muted-foreground">
                              {adm.wardName} • Bed: <strong className="font-mono text-teal-700 dark:text-teal-400">{adm.bedNumber}</strong>
                            </p>
                          </div>
                          <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px]">
                            Day {adm.lengthOfStayDays}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Clinical Tool Shortcuts */}
              <Card className="shadow-soft border-border bg-gradient-to-br from-teal-500/5 via-card to-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-purple-600" /> Clinical Action Shortcuts
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-xs">
                  <Button asChild variant="outline" size="sm" className="h-9 justify-start gap-1.5 border-border">
                    <Link to="/consultations">
                      <Stethoscope className="size-3.5 text-teal-600" /> Start SOAP Note
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-9 justify-start gap-1.5 border-border">
                    <Link to="/wards">
                      <Bed className="size-3.5 text-primary" /> Ward Round
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-9 justify-start gap-1.5 border-border">
                    <Link to="/transfers">
                      <ArrowRight className="size-3.5 text-amber-600" /> Patient Transfer
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-9 justify-start gap-1.5 border-border">
                    <Link to="/patients">
                      <Users className="size-3.5 text-blue-600" /> Patient 360
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. NURSE DASHBOARD VIEW */}
      {/* ---------------------------------------------------- */}
      {role === "nurse" && data?.nurseData && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Triage Queue
                </CardTitle>
                <Activity className="size-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.nurseData.triageQueueCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Patients checked-in awaiting vitals
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vitals Recorded Today
                </CardTitle>
                <Heart className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data.nurseData.vitalsCapturedTodayCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Triaged and routed to doctors
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ward Inpatients
                </CardTitle>
                <Bed className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.nurseData.activeInpatientsCount} / {data.nurseData.totalBedsCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.nurseData.availableBedsCount} beds available ({data.nurseData.occupancyRate}% occupancy)
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's Ward Shift
                </CardTitle>
                <Calendar className="size-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-lg font-bold text-foreground truncate">
                  {data.nurseData.todayShift?.wardName || "General Nursing"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground capitalize">
                  {data.nurseData.todayShift?.shiftType || "Standard Shift"} • {data.nurseData.todayShift?.roleInWard.replace("_", " ") || "Staff Nurse"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Nurse Triage Queue & Vitals Alerts */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <Card className="shadow-soft border-border">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Triage Intake Queue
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Walk-in and appointment arrivals waiting for vital signs capture.
                    </CardDescription>
                  </div>
                  <Button asChild size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                    <Link to="/triage">
                      <Plus className="size-3" /> Capture Vitals
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {data.nurseData.triageQueue.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      <CheckCircle2 className="mx-auto size-8 text-emerald-500/70" />
                      <p className="mt-2 font-medium">No patients currently waiting in triage queue.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.nurseData.triageQueue.map((item) => (
                        <div key={item.encounterId} className="flex items-center justify-between p-3.5 hover:bg-muted/30 text-xs">
                          <div>
                            <div className="font-bold text-foreground">{item.patientName}</div>
                            <div className="text-[11px] text-muted-foreground">
                              NIN: {item.nin} • {item.age} • Arrived: {new Date(item.checkedInAt).toLocaleTimeString()}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Complaint: {item.chiefComplaint || "General checkup"}
                            </p>
                          </div>
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs border-border">
                            <Link to="/triage">
                              Triage Now
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 lg:col-span-5">
              <Card className="shadow-soft border-border">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <ShieldAlert className="size-4 text-rose-600" /> Recent Vitals Red Flags
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {data.nurseData.urgentVitalsAlerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground italic">
                      No abnormal vitals flagged today.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.nurseData.urgentVitalsAlerts.map((alert) => (
                        <div key={alert.vitalId} className="p-3 text-xs space-y-1 bg-rose-500/5">
                          <span className="font-bold text-foreground">{alert.patientName}</span>
                          <p className="text-rose-700 dark:text-rose-300 font-semibold">{alert.flagReason}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(alert.recordedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. LAB TECH DASHBOARD VIEW */}
      {/* ---------------------------------------------------- */}
      {role === "lab_tech" && data?.labTechData && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Orders Requested
                </CardTitle>
                <Clock className="size-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {data.labTechData.requestedCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Awaiting sample collection</p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  In Progress / Testing
                </CardTitle>
                <FlaskConical className="size-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.labTechData.inProgressCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Samples undergoing analysis</p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Completed Today
                </CardTitle>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data.labTechData.completedTodayCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Results published to doctors</p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Avg Turnaround
                </CardTitle>
                <Activity className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.labTechData.avgTurnaroundHours} hrs
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Within clinical target</p>
              </CardContent>
            </Card>
          </div>

          {/* Lab Worklist */}
          <Card className="shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Diagnostic Lab Workbench Queue</CardTitle>
                <CardDescription className="text-xs">Ordered investigations awaiting processing and result entry.</CardDescription>
              </div>
              <Button asChild size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                <Link to="/lab">
                  Open Lab Workbench <ArrowRight className="size-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Test Name</th>
                      <th className="p-3">Sample Type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Ordered At</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.labTechData.activeWorklist.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No pending lab orders.
                        </td>
                      </tr>
                    ) : (
                      data.labTechData.activeWorklist.map((order) => (
                        <tr key={order.orderId} className="hover:bg-muted/30">
                          <td className="p-3 font-bold text-foreground">{order.patientName}</td>
                          <td className="p-3 font-semibold text-foreground">{order.testName}</td>
                          <td className="p-3 text-muted-foreground">{order.sampleType || "Blood"}</td>
                          <td className="p-3">
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                              {order.status}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground font-mono">
                            {new Date(order.orderedAt).toLocaleTimeString()}
                          </td>
                          <td className="p-3 text-right">
                            <Button asChild size="sm" variant="outline" className="h-6 text-[11px] border-border">
                              <Link to="/lab">Process Test</Link>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. PHARMACIST DASHBOARD VIEW */}
      {/* ---------------------------------------------------- */}
      {role === "pharmacist" && data?.pharmacistData && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pending Prescriptions
                </CardTitle>
                <Clock className="size-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {data.pharmacistData.pendingPrescriptionsCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Awaiting dispensing</p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Low-Stock Drugs
                </CardTitle>
                <AlertTriangle className="size-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-rose-600 dark:text-rose-400">
                  {data.pharmacistData.lowStockItemsCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Below reorder threshold</p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Formulary Items
                </CardTitle>
                <Package className="size-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.pharmacistData.totalMedicationsCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Active in drug inventory</p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dispensed Today
                </CardTitle>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data.pharmacistData.dispensedTodayCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Prescriptions fulfilled</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <Card className="shadow-soft border-border">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                  <CardTitle className="text-base font-bold text-foreground">Pending Prescriptions Queue</CardTitle>
                  <Button asChild size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                    <Link to="/pharmacy">
                      Dispense Now <ArrowRight className="size-3 ml-1" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {data.pharmacistData.pendingQueue.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No prescriptions waiting in dispensing queue.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.pharmacistData.pendingQueue.map((rx) => (
                        <div key={rx.prescriptionId} className="flex items-center justify-between p-3.5 hover:bg-muted/30 text-xs">
                          <div>
                            <span className="font-bold text-foreground">{rx.patientName}</span>
                            <p className="text-muted-foreground text-[11px]">
                              {rx.drugsCount} medication(s) prescribed • Ordered {new Date(rx.orderedAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs border-border">
                            <Link to="/pharmacy">Dispense</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 lg:col-span-5">
              <Card className="shadow-soft border-border">
                <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="size-4 text-rose-600" /> Low Stock Warnings
                  </CardTitle>
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                    <Link to="/pharmacy/inventory">Inventory</Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {data.pharmacistData.lowStockAlerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground italic">
                      All inventory items are sufficiently stocked.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.pharmacistData.lowStockAlerts.map((item) => (
                        <div key={item.medicationId} className="p-3 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-foreground">{item.drugName}</span>
                            <p className="text-[11px] text-muted-foreground">Reorder level: {item.reorderLevel}</p>
                          </div>
                          <span className="rounded bg-rose-500/10 px-2 py-0.5 font-bold text-rose-700 dark:text-rose-300">
                            {item.currentStock} left
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. HOSPITAL ADMIN & SUPER ADMIN VIEW */}
      {/* ---------------------------------------------------- */}
      {(role === "hospital_admin" || role === "super_admin") && data?.adminData && (
        <div className="space-y-6">
          {/* Admin KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's Patient Visits
                </CardTitle>
                <Users className="size-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.adminData.kpis.patientsToday}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.adminData.kpis.visitsThisWeek} total visits this week
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Revenue Collected Today
                </CardTitle>
                <CreditCard className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(data.adminData.kpis.revenueToday)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatCurrency(data.adminData.kpis.revenueThisMonth)} this month
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Outstanding Invoices
                </CardTitle>
                <Receipt className="size-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {formatCurrency(data.adminData.kpis.outstandingInvoicesAmount)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.adminData.kpis.outstandingInvoicesCount} unpaid invoices
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Operational Alerts
                </CardTitle>
                <AlertCircle className="size-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.adminData.kpis.lowStockDrugsCount + data.adminData.kpis.pendingLabOrdersCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.adminData.kpis.lowStockDrugsCount} low stock • {data.adminData.kpis.pendingLabOrdersCount} pending labs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="shadow-soft border-border lg:col-span-8">
              <CardHeader>
                <CardTitle className="text-base font-bold text-foreground">
                  Patient Inflow (Last 30 Days)
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily patient registrations and encounter check-ins across departments.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.adminData.charts.visitsPerDay}>
                    <defs>
                      <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} fill="url(#visitsGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base font-bold text-foreground">
                  Visits by Department
                </CardTitle>
                <CardDescription className="text-xs">
                  Proportional utilization breakdown.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex flex-col justify-center">
                {data.adminData.charts.departmentVisits.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground">No department visit data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.adminData.charts.departmentVisits}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name }) => name}
                      >
                        {data.adminData.charts.departmentVisits.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
