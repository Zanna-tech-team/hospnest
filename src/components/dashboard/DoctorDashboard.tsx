import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { DoctorDashboardData } from "@/lib/role-dashboard.functions";
import {
  Users,
  ShieldAlert,
  FlaskConical,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Layers,
  CheckCircle2,
  ArrowRight,
  Eye,
  Bell,
  Bed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LabResultReviewModal } from "@/components/clinical-docs/LabResultReviewModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DoctorDashboardProps {
  data: DoctorDashboardData;
  refetch: () => void;
}

export function DoctorDashboard({ data, refetch }: DoctorDashboardProps) {
  const [activeQueueTab, setActiveQueueTab] = useState<
    "waiting_doctor" | "waiting_triage" | "in_consultation" | "diagnostic_hold" | "pharmacy_hold"
  >("waiting_doctor");
  const [activeReviewLabOrder, setActiveReviewLabOrder] = useState<any | null>(null);
  const [selectedLabPatient, setSelectedLabPatient] = useState<{ id: string; name: string } | null>(null);

  return (
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
              {data.queueCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <strong className="text-teal-600 font-bold">{data.myPatientsCount}</strong> claimed by you • {data.unassignedCount} waiting
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
              {data.urgentVitalsCount}
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
              {data.labStatusSummary.pendingResults}
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
              {data.criticalLabAlerts.length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.labStatusSummary.completedToday} total results completed today
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
                <span className="font-display text-xl font-bold text-foreground">{data.appointmentMetrics.todayTotal}</span>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                <span className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300 block">Completed</span>
                <span className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400">{data.appointmentMetrics.completed}</span>
              </div>
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-2.5">
                <span className="text-[10px] uppercase font-semibold text-teal-800 dark:text-teal-300 block">Checked In</span>
                <span className="font-display text-xl font-bold text-teal-700 dark:text-teal-400">{data.appointmentMetrics.checkedIn}</span>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                <span className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300 block">Pending / Wait</span>
                <span className="font-display text-xl font-bold text-amber-700 dark:text-amber-400">{data.appointmentMetrics.pending}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Self-Service Online: <strong className="text-foreground">{data.appointmentMetrics.externalOnlineBookings}</strong></span>
              <span>No-Show Rate: <strong className={data.appointmentMetrics.noShowRate > 15 ? "text-rose-600" : "text-foreground"}>{data.appointmentMetrics.noShowRate}%</strong></span>
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
              <BarChart data={data.appointmentMetrics.hourlyTraffic}>
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
                🩺 Awaiting Doctor ({data.patientAssignmentQueues.waitingDoctor.length})
              </TabsTrigger>
              <TabsTrigger value="waiting_triage" className="text-xs py-1.5">
                🌡️ Waiting Triage ({data.patientAssignmentQueues.waitingTriage.length})
              </TabsTrigger>
              <TabsTrigger value="in_consultation" className="text-xs py-1.5">
                👨‍⚕️ In Consultation ({data.patientAssignmentQueues.inConsultation.length})
              </TabsTrigger>
              <TabsTrigger value="diagnostic_hold" className="text-xs py-1.5">
                🔬 Diagnostic Hold ({data.patientAssignmentQueues.diagnosticHold.length})
              </TabsTrigger>
              <TabsTrigger value="pharmacy_hold" className="text-xs py-1.5">
                💊 Pharmacy Hold ({data.patientAssignmentQueues.pharmacyHold.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Waiting Doctor */}
            <TabsContent value="waiting_doctor" className="pt-3">
              {data.patientAssignmentQueues.waitingDoctor.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-500/70" />
                  <p className="mt-2 font-medium">No patients currently waiting for doctor assignment.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.patientAssignmentQueues.waitingDoctor.map((item) => (
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
              {data.patientAssignmentQueues.waitingTriage.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No patients waiting in triage intake.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.patientAssignmentQueues.waitingTriage.map((item) => (
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
              {data.patientAssignmentQueues.inConsultation.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No active consultations currently in progress.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.patientAssignmentQueues.inConsultation.map((item) => (
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
              {data.patientAssignmentQueues.diagnosticHold.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No patients currently on diagnostic hold.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.patientAssignmentQueues.diagnosticHold.map((item) => (
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
              {data.patientAssignmentQueues.pharmacyHold.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No patients currently waiting at pharmacy.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.patientAssignmentQueues.pharmacyHold.map((item) => (
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
              {data.criticalLabAlerts.length} Critical
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {data.criticalLabAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mx-auto size-8 text-emerald-500/70" />
                <p className="mt-2 font-medium">No critical panic values or abnormal lab alerts flagged today.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {data.criticalLabAlerts.map((alert) => (
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
              <span className="text-[10px] font-mono text-muted-foreground">{data.notifications.length} total</span>
            </CardHeader>
            <CardContent className="p-0">
              {data.notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  No unread doctor alerts.
                </div>
              ) : (
                <div className="divide-y divide-border max-h-56 overflow-y-auto">
                  {data.notifications.map((n) => (
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
                Supervised Inpatients ({data.inpatients.length})
              </CardTitle>
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <Link to="/wards">Wards</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.inpatients.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  No active inpatients currently assigned to your profile.
                </div>
              ) : (
                <div className="divide-y divide-border max-h-48 overflow-y-auto">
                  {data.inpatients.map((adm) => (
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
  );
}
