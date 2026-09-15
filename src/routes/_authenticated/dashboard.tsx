import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DoorOpen,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Hospital,
  IdCard,
  Inbox,
  Layers,
  Package,
  Pill,
  Plus,
  Radio,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LabResultReviewModal } from "@/components/clinical-docs/LabResultReviewModal";
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

  const [activeQueueTab, setActiveQueueTab] = useState<"waiting_doctor" | "waiting_triage" | "in_consultation" | "diagnostic_hold" | "pharmacy_hold">("waiting_doctor");
  const [activeReviewLabOrder, setActiveReviewLabOrder] = useState<any | null>(null);
  const [selectedLabPatient, setSelectedLabPatient] = useState<{ id: string; name: string } | null>(null);

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
          {/* Doctor Top KPI Strip */}
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
                  Diagnostic Holds
                </CardTitle>
                <FlaskConical className="size-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.doctorData.labStatusSummary.pendingResults}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lab investigations awaiting processing
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Critical Lab Alerts
                </CardTitle>
                <AlertTriangle className="size-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-rose-600 dark:text-rose-400">
                  {data.doctorData.criticalLabAlerts.length}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.doctorData.labStatusSummary.completedToday} total results completed today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Appointment Metrics & Hourly Traffic Strip */}
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="shadow-soft border-border lg:col-span-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="size-4 text-teal-600" />
                  Today's Appointment Metrics
                </CardTitle>
                <CardDescription className="text-xs">
                  Clinic volume & intake conversion rate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Total Booked</span>
                    <span className="font-display text-xl font-bold text-foreground">{data.doctorData.appointmentMetrics.todayTotal}</span>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300 block">Completed</span>
                    <span className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400">{data.doctorData.appointmentMetrics.completed}</span>
                  </div>
                  <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-teal-800 dark:text-teal-300 block">Checked In</span>
                    <span className="font-display text-xl font-bold text-teal-700 dark:text-teal-400">{data.doctorData.appointmentMetrics.checkedIn}</span>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300 block">Pending / Wait</span>
                    <span className="font-display text-xl font-bold text-amber-700 dark:text-amber-400">{data.doctorData.appointmentMetrics.pending}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Self-Service Online: <strong className="text-foreground">{data.doctorData.appointmentMetrics.externalOnlineBookings}</strong></span>
                  <span>No-Show Rate: <strong className={data.doctorData.appointmentMetrics.noShowRate > 15 ? "text-rose-600" : "text-foreground"}>{data.doctorData.appointmentMetrics.noShowRate}%</strong></span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border lg:col-span-8">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="size-4 text-teal-600" />
                    Hourly Appointment & Patient Inflow
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Distribution of patient arrivals and consultation times across the clinic day.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Clinic Hours 08:00 – 17:00</Badge>
              </CardHeader>
              <CardContent className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.doctorData.appointmentMetrics.hourlyTraffic}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Patients" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Patient Assignment Queues Section */}
          <Card className="shadow-soft border-border">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Layers className="size-4 text-teal-600" />
                    Live Patient Flow & Assignment Queues
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time status of patients across triage, consultation, diagnostic holds, and pharmacy.
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                  <Link to="/consultations">
                    Open Consultations Workspace <ArrowRight className="size-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Tabs
                value={activeQueueTab}
                onValueChange={(val: any) => setActiveQueueTab(val)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1 bg-muted/60">
                  <TabsTrigger value="waiting_doctor" className="text-xs py-1.5">
                    🩺 Awaiting Doctor ({data.doctorData.patientAssignmentQueues.waitingDoctor.length})
                  </TabsTrigger>
                  <TabsTrigger value="waiting_triage" className="text-xs py-1.5">
                    🌡️ Waiting Triage ({data.doctorData.patientAssignmentQueues.waitingTriage.length})
                  </TabsTrigger>
                  <TabsTrigger value="in_consultation" className="text-xs py-1.5">
                    👨‍⚕️ In Consultation ({data.doctorData.patientAssignmentQueues.inConsultation.length})
                  </TabsTrigger>
                  <TabsTrigger value="diagnostic_hold" className="text-xs py-1.5">
                    🔬 Diagnostic Hold ({data.doctorData.patientAssignmentQueues.diagnosticHold.length})
                  </TabsTrigger>
                  <TabsTrigger value="pharmacy_hold" className="text-xs py-1.5">
                    💊 Pharmacy Hold ({data.doctorData.patientAssignmentQueues.pharmacyHold.length})
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Waiting Doctor */}
                <TabsContent value="waiting_doctor" className="pt-3">
                  {data.doctorData.patientAssignmentQueues.waitingDoctor.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      <CheckCircle2 className="mx-auto size-8 text-emerald-500/70" />
                      <p className="mt-2 font-medium">No patients currently waiting for doctor assignment.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.doctorData.patientAssignmentQueues.waitingDoctor.map((item) => (
                        <div key={item.encounterId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-muted/30 text-xs gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{item.patientName}</span>
                              <span className="text-muted-foreground font-mono text-[11px]">NIN: {item.nin}</span>
                              {item.vitals?.isUrgent && (
                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[9px] font-bold">
                                  Urgent Vitals
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground">Complaint: {item.chiefComplaint || "General consultation"}</p>
                            {item.vitals && (
                              <div className="flex gap-2 font-mono text-[11px] text-muted-foreground">
                                <span>Temp: {item.vitals.temperature ?? "--"}°C</span>
                                <span>BP: {item.vitals.bp ?? "--"}</span>
                                <span>SpO2: {item.vitals.spo2 ?? "--"}%</span>
                              </div>
                            )}
                          </div>
                          <Button asChild size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold shrink-0">
                            <Link to="/consultations">Consult Now</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: Waiting Triage */}
                <TabsContent value="waiting_triage" className="pt-3">
                  {data.doctorData.patientAssignmentQueues.waitingTriage.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No patients waiting in triage intake.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.doctorData.patientAssignmentQueues.waitingTriage.map((item) => (
                        <div key={item.encounterId} className="flex items-center justify-between p-3 hover:bg-muted/30 text-xs">
                          <div>
                            <span className="font-bold text-foreground">{item.patientName}</span>
                            <span className="text-muted-foreground font-mono text-[11px] ml-2">NIN: {item.nin}</span>
                            <p className="text-muted-foreground mt-0.5">Complaint: {item.chiefComplaint || "Routine"}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">Awaiting Vitals</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: In Consultation */}
                <TabsContent value="in_consultation" className="pt-3">
                  {data.doctorData.patientAssignmentQueues.inConsultation.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No active consultations currently in progress.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.doctorData.patientAssignmentQueues.inConsultation.map((item) => (
                        <div key={item.encounterId} className="flex items-center justify-between p-3 hover:bg-muted/30 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{item.patientName}</span>
                              {item.isMine && (
                                <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 text-[9px] font-bold">
                                  Your Patient
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-[11px]">Attended by {item.doctorName} • Started {new Date(item.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs border-border">
                            <Link to="/consultations">View File</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 4: Diagnostic Hold */}
                <TabsContent value="diagnostic_hold" className="pt-3">
                  {data.doctorData.patientAssignmentQueues.diagnosticHold.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No patients currently on diagnostic hold.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.doctorData.patientAssignmentQueues.diagnosticHold.map((item) => (
                        <div key={item.orderId} className="flex items-center justify-between p-3 hover:bg-muted/30 text-xs">
                          <div>
                            <span className="font-bold text-foreground">{item.patientName}</span>
                            <span className="text-muted-foreground ml-2">Investigation: <strong className="text-foreground">{item.testName}</strong></span>
                            <p className="text-muted-foreground text-[11px] mt-0.5">Ordered {new Date(item.orderedAt).toLocaleTimeString()}</p>
                          </div>
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-mono">
                            {item.status.replace("_", " ")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 5: Pharmacy Hold */}
                <TabsContent value="pharmacy_hold" className="pt-3">
                  {data.doctorData.patientAssignmentQueues.pharmacyHold.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No patients currently waiting at pharmacy.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {data.doctorData.patientAssignmentQueues.pharmacyHold.map((item) => (
                        <div key={item.prescriptionId} className="flex items-center justify-between p-3 hover:bg-muted/30 text-xs">
                          <div>
                            <span className="font-bold text-foreground">{item.patientName}</span>
                            <p className="text-muted-foreground text-[11px] mt-0.5">{item.drugsCount} prescription item(s) • Sent {new Date(item.orderedAt).toLocaleTimeString()}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">Awaiting Dispense</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Critical Lab Results & Live Notifications Section */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Critical Lab Alert Feed */}
            <Card className="shadow-soft border-border lg:col-span-7">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <FlaskConical className="size-4 text-purple-600" />
                    Critical & Abnormal Lab Results Feed
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Returned laboratory investigations requiring physician review and acknowledgment.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {data.doctorData.criticalLabAlerts.length} Critical
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {data.doctorData.criticalLabAlerts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <CheckCircle2 className="mx-auto size-8 text-emerald-500/70" />
                    <p className="mt-2 font-medium">No critical panic values or abnormal lab alerts flagged today.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-96 overflow-y-auto">
                    {data.doctorData.criticalLabAlerts.map((alert) => (
                      <div key={alert.orderId} className={`p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${alert.isCritical ? "bg-rose-500/5" : "hover:bg-muted/30"}`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{alert.patientName}</span>
                            <span className="text-muted-foreground font-mono text-[10px]">NIN: {alert.nin}</span>
                            {alert.isCritical && (
                              <Badge className="bg-rose-600 text-white text-[9px] font-bold animate-pulse">
                                CRITICAL PANIC
                              </Badge>
                            )}
                            {alert.acknowledgedAt && (
                              <Badge variant="outline" className="text-[9px] text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                Acknowledged
                              </Badge>
                            )}
                          </div>
                          <p className="text-foreground font-semibold">
                            {alert.testName}: <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{alert.resultValue} {alert.units}</span>
                            {alert.referenceRange ? ` (Ref: ${alert.referenceRange})` : ""}
                          </p>
                          <span className="text-[10px] text-muted-foreground block">
                            Verified by {alert.technicianName} • {new Date(alert.completedAt).toLocaleTimeString()}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => {
                            setActiveReviewLabOrder({
                              id: alert.orderId,
                              testName: alert.testName,
                              resultValue: alert.resultValue,
                              units: alert.units,
                              referenceRange: alert.referenceRange,
                              isCritical: alert.isCritical,
                              isOutOfRange: alert.isOutOfRange,
                              technicianName: alert.technicianName,
                              completedAt: alert.completedAt,
                              acknowledgedAt: alert.acknowledgedAt,
                              acknowledgedByName: alert.acknowledgedByName,
                            });
                            setSelectedLabPatient({ id: alert.patientId, name: alert.patientName });
                          }}
                          className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold shrink-0 gap-1"
                        >
                          <Eye className="size-3" /> Review Report
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Doctor Notifications & Inpatients */}
            <div className="space-y-4 lg:col-span-5">
              {/* Doctor Notifications */}
              <Card className="shadow-soft border-border">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Bell className="size-4 text-teal-600" />
                    Doctor Clinical Alerts & Notifications
                  </CardTitle>
                  <span className="text-[10px] font-mono text-muted-foreground">{data.doctorData.notifications.length} total</span>
                </CardHeader>
                <CardContent className="p-0">
                  {data.doctorData.notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground italic">
                      No unread doctor alerts.
                    </div>
                  ) : (
                    <div className="divide-y divide-border max-h-56 overflow-y-auto">
                      {data.doctorData.notifications.map((n) => (
                        <div key={n.id} className={`p-3 text-xs space-y-0.5 ${!n.isRead ? "bg-teal-500/5 font-medium" : ""}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{n.title}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-muted-foreground text-[11px]">{n.message}</p>
                          {n.patientName && (
                            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold block">Patient: {n.patientName}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inpatients Supervised */}
              <Card className="shadow-soft border-border">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Bed className="size-4 text-primary" />
                    Supervised Inpatients ({data.doctorData.inpatients.length})
                  </CardTitle>
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                    <Link to="/wards">Wards</Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {data.doctorData.inpatients.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground italic">
                      No active inpatients currently assigned to your profile.
                    </div>
                  ) : (
                    <div className="divide-y divide-border max-h-48 overflow-y-auto">
                      {data.doctorData.inpatients.map((adm) => (
                        <div key={adm.admissionId} className="p-2.5 hover:bg-muted/30 text-xs flex items-center justify-between">
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
            </div>
          </div>

          {/* Modal for Doctor Closed-Loop Lab Review */}
          {activeReviewLabOrder && (
            <LabResultReviewModal
              isOpen={Boolean(activeReviewLabOrder)}
              onClose={() => setActiveReviewLabOrder(null)}
              order={activeReviewLabOrder}
              patientId={selectedLabPatient?.id || ""}
              patientName={selectedLabPatient?.name || "Patient"}
              onAcknowledged={() => {
                refetch();
              }}
            />
          )}
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

          {/* Appointment Metrics & Hourly Traffic Chart Strip for Hospital Admin */}
          {data.adminData.appointmentStats && (
            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="shadow-soft border-border lg:col-span-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Calendar className="size-4 text-teal-600" />
                    Appointment Operations & Conversion
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Intake metrics, online directory reservations & attendance rates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Today's Bookings</span>
                      <span className="font-display text-xl font-bold text-foreground">{data.adminData.appointmentStats.todayTotal}</span>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300 block">Completed</span>
                      <span className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400">{data.adminData.appointmentStats.completed}</span>
                    </div>
                    <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-teal-800 dark:text-teal-300 block">Checked In</span>
                      <span className="font-display text-xl font-bold text-teal-700 dark:text-teal-400">{data.adminData.appointmentStats.checkedIn}</span>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300 block">Pending / Wait</span>
                      <span className="font-display text-xl font-bold text-amber-700 dark:text-amber-400">{data.adminData.appointmentStats.pending}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>Online Self-Service: <strong className="text-foreground">{data.adminData.appointmentStats.externalOnlineBookings}</strong></span>
                    <span>No-Show Rate: <strong className={data.adminData.appointmentStats.noShowRate > 15 ? "text-rose-600" : "text-foreground"}>{data.adminData.appointmentStats.noShowRate}%</strong></span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-border lg:col-span-8">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="size-4 text-teal-600" />
                      Hourly Clinic Patient Traffic Distribution
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Today's patient arrival density across clinical operating hours.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">08:00 – 17:00</Badge>
                </CardHeader>
                <CardContent className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.adminData.appointmentStats.hourlyTraffic}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Patients" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Patient Flow & Department Queues Strip */}
          {data.adminData.patientFlowQueues && (
            <Card className="shadow-soft border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="size-4 text-teal-600" />
                  Live Patient Flow & Queue Bottleneck Monitor
                </CardTitle>
                <CardDescription className="text-xs">
                  Active patient volume stationed across hospital checkpoints.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Waiting Triage</span>
                    <span className="font-display text-2xl font-bold text-foreground">{data.adminData.patientFlowQueues.waitingTriageCount}</span>
                    <span className="text-[10px] text-muted-foreground block">At front lobby</span>
                  </div>
                  <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-teal-800 dark:text-teal-300 block">Waiting Doctor</span>
                    <span className="font-display text-2xl font-bold text-teal-700 dark:text-teal-400">{data.adminData.patientFlowQueues.waitingDoctorCount}</span>
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 block">Triaged & ready</span>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">In Consultation</span>
                    <span className="font-display text-2xl font-bold text-foreground">{data.adminData.patientFlowQueues.inConsultationCount}</span>
                    <span className="text-[10px] text-muted-foreground block">With physician</span>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300 block">Diagnostic Hold</span>
                    <span className="font-display text-2xl font-bold text-amber-700 dark:text-amber-400">{data.adminData.patientFlowQueues.diagnosticHoldCount}</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 block">Lab / Imaging</span>
                  </div>
                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-purple-800 dark:text-purple-300 block">Pharmacy Hold</span>
                    <span className="font-display text-2xl font-bold text-purple-700 dark:text-purple-400">{data.adminData.patientFlowQueues.pharmacyHoldCount}</span>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 block">Prescription fill</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnostic Turnaround Summary */}
          {data.adminData.diagnosticTurnaround && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-soft border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lab Orders Today
                  </CardTitle>
                  <FlaskConical className="size-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="font-display text-2xl font-bold text-foreground">
                    {data.adminData.diagnosticTurnaround.labOrdersToday}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {data.adminData.diagnosticTurnaround.labPending} pending • {data.adminData.diagnosticTurnaround.labCritical} critical
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Critical Lab Panic Values
                  </CardTitle>
                  <AlertTriangle className="size-4 text-rose-600" />
                </CardHeader>
                <CardContent>
                  <div className="font-display text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {data.adminData.diagnosticTurnaround.labCritical}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Flagged for urgent doctor review
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Radiology Studies Today
                  </CardTitle>
                  <Radio className="size-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="font-display text-2xl font-bold text-foreground">
                    {data.adminData.diagnosticTurnaround.radiologyStudiesToday}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    X-ray, Ultrasound, CT scans ordered
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Radiology Pending
                  </CardTitle>
                  <Clock className="size-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="font-display text-2xl font-bold text-foreground">
                    {data.adminData.diagnosticTurnaround.radiologyPending}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Awaiting scan acquisition or reporting
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

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

      {/* ---------------------------------------------------- */}
      {/* 6. FRONT DESK DASHBOARD VIEW */}
      {/* ---------------------------------------------------- */}
      {role === "front_desk" && data?.frontDeskData && (
        <div className="space-y-6">
          {/* Front Desk KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's Appointments
                </CardTitle>
                <Calendar className="size-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.frontDeskData.todayAppointmentsCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.frontDeskData.onlineBookingsCount} booked directly online
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Online Self-Service Bookings
                </CardTitle>
                <Sparkles className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data.frontDeskData.onlineBookingsCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  From HospNest verified directory
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Waiting in Intake / Triage
                </CardTitle>
                <Clock className="size-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.frontDeskData.checkedInTodayCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Patients currently awaiting routing
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bed Availability
                </CardTitle>
                <Bed className="size-4 text-sky-600" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {data.frontDeskData.availableBedsCount} <span className="text-sm font-normal text-muted-foreground">/ {data.frontDeskData.totalBedsCount}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open inpatient beds ready for admission
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Appointments & Live Triage Layout */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Today's Appointments & Online Direct Bookings */}
            <Card className="shadow-soft border-border lg:col-span-8">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Calendar className="size-4 text-teal-600" />
                    Today's Schedule & Online Bookings
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Scheduled clinic appointments and verified online reservations.
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                  <Link to="/front-desk">Open Front Desk</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {data.frontDeskData.todayAppointments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground italic">
                    No scheduled appointments for today yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-96 overflow-y-auto">
                    {data.frontDeskData.todayAppointments.map((appt) => (
                      <div key={appt.id} className="p-3.5 text-xs flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{appt.patientName}</span>
                            {appt.isExternalBooking && (
                              <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 text-[9px] font-bold">
                                Online Direct Booking
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {appt.status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            Time: <strong className="font-mono text-foreground">{appt.appointmentTime}</strong>
                            {appt.doctorName ? ` • Physician: ${appt.doctorName}` : ""}
                            {appt.bookingReference ? ` • Ref: ${appt.bookingReference}` : ""}
                          </p>
                        </div>

                        <Button asChild size="sm" variant="outline" className="h-7 text-xs border-teal-500/30 text-teal-700 dark:text-teal-300 font-semibold">
                          <Link to="/front-desk">Intake & Check-In</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Triage & Intake Queue */}
            <Card className="shadow-soft border-border lg:col-span-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock className="size-4 text-amber-600" />
                  Live Intake Queue ({data.frontDeskData.liveTriageQueue.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Patients currently waiting in front lobby.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.frontDeskData.liveTriageQueue.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground italic">
                    Lobby is currently clear.
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-96 overflow-y-auto">
                    {data.frontDeskData.liveTriageQueue.map((item) => (
                      <div key={item.encounterId} className="p-3 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="size-6 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono font-bold flex items-center justify-center text-[10px]">
                            #{item.queueNumber || "—"}
                          </span>
                          <div>
                            <span className="font-bold text-foreground block">{item.patientName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              Checked in: {new Date(item.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>

                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {item.status.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 7. PATIENT PORTAL DASHBOARD VIEW */}
      {/* ---------------------------------------------------- */}
      {role === "patient" && data?.patientData && (
        <div className="space-y-6">
          {/* Patient Welcome Banner */}
          <div className="rounded-3xl border border-teal-500/30 bg-teal-500/10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="rounded-full bg-teal-600 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Patient Self-Service Portal
              </span>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Your Personal Health Record & Care Workspace
              </h2>
              <p className="text-xs text-muted-foreground max-w-xl">
                Track your upcoming hospital appointments, digital prescriptions, verified lab investigations, and manage your cross-hospital data privacy.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 shadow-sm">
                <Link to="/portal">Manage Privacy & Records</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Upcoming Appointments */}
            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="size-4 text-teal-600" />
                  Upcoming Appointments ({data.patientData.upcomingAppointments.length})
                </CardTitle>
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <Link to="/portal">View All</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {data.patientData.upcomingAppointments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No scheduled appointments. You can book an appointment at any verified hospital.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {data.patientData.upcomingAppointments.map((a) => (
                      <div key={a.id} className="p-3.5 text-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground block">{a.hospitalName}</span>
                          <p className="text-muted-foreground text-[11px]">
                            {new Date(a.appointmentDate).toLocaleDateString("en-GB", { dateStyle: "medium" })} at {a.appointmentTime}
                            {a.bookingReference ? ` • Ref: #${a.bookingReference}` : ""}
                          </p>
                        </div>
                        <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 text-[10px]">
                          {a.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Prescriptions */}
            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Pill className="size-4 text-emerald-600" />
                  Active Prescriptions & Dosages
                </CardTitle>
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <Link to="/portal">Pharmacy</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {data.patientData.activePrescriptions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No active prescriptions on file.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {data.patientData.activePrescriptions.map((rx) => (
                      <div key={rx.id} className="p-3.5 text-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground block">{rx.drugName}</span>
                          <p className="text-muted-foreground text-[11px]">
                            {rx.dosage} • {rx.frequency} ({rx.duration})
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(rx.prescribedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verified Diagnostic Lab Reports */}
            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FlaskConical className="size-4 text-teal-600" />
                  Diagnostic Lab Results
                </CardTitle>
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <Link to="/portal">All Reports</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {data.patientData.completedLabReports.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No completed diagnostic reports on record.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {data.patientData.completedLabReports.map((lab) => (
                      <div key={lab.id} className="p-3.5 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-foreground block">{lab.testName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(lab.date).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                          </span>
                        </div>
                        <Badge className={lab.isCritical ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}>
                          {lab.resultSummary || "Verified"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Hospital Encounters */}
            <Card className="shadow-soft border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Stethoscope className="size-4 text-primary" />
                  Clinical Encounters & Doctor Notes
                </CardTitle>
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <Link to="/portal">History</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {data.patientData.recentEncounters.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No past clinical encounters recorded.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {data.patientData.recentEncounters.map((enc) => (
                      <div key={enc.id} className="p-3.5 text-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground block">{enc.hospitalName}</span>
                          <p className="text-muted-foreground text-[11px]">
                            Diagnosis: <strong>{enc.diagnosis}</strong> • {enc.doctorName}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(enc.visitDate).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
