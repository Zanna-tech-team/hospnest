import React from "react";
import { Link } from "@tanstack/react-router";
import type { NurseDashboardData } from "@/lib/role-dashboard.functions";
import {
  Activity,
  Heart,
  Bed,
  Calendar,
  CheckCircle2,
  Plus,
  ShieldAlert,
  IdCard,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface NurseDashboardProps {
  data: NurseDashboardData;
}

export function NurseDashboard({ data }: NurseDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Top Strip */}
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
              {data.triageQueueCount}
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
              {data.vitalsCapturedTodayCount}
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
              {data.activeInpatientsCount} / {data.totalBedsCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.availableBedsCount} beds available ({data.occupancyRate}% occupancy)
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
              {data.todayShift?.wardName || "General Nursing"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground capitalize">
              {data.todayShift?.shiftType || "Standard Shift"} • {data.todayShift?.roleInWard.replace("_", " ") || "Staff Nurse"}
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
              {data.triageQueue.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-500/70" />
                  <p className="mt-2 font-medium">No patients currently waiting in triage queue.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.triageQueue.map((item) => (
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
              {data.urgentVitalsAlerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  No abnormal vitals flagged today.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.urgentVitalsAlerts.map((alert) => (
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

      {/* Nurse Patient Deck & Registration Workstation */}
      <Card className="shadow-soft border-teal-500/30 bg-teal-500/5">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3 border-teal-500/20">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <IdCard className="size-5 text-teal-600" />
              Front Desk & Patient Deck Registration Station
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Nurses can enroll new walk-in patients via NIN, verify records, and instantly route patients to triage vitals or doctors.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 shadow-sm">
              <Link to="/front-desk">
                <UserPlus className="size-3.5" />
                Open Intake Deck (New Patient)
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs border-teal-500/30 font-semibold gap-1.5 bg-background">
              <Link to="/triage">
                <Activity className="size-3.5" />
                Triage Workbench
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-border bg-background p-3 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <UserCheck className="size-3.5 text-teal-600" /> Fast NIN Verification
              </span>
              <p className="text-muted-foreground text-[11px]">
                Lookup national demographic & medical histories using verified 11-digit NINs.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Activity className="size-3.5 text-emerald-600" /> Immediate NEWS2 Scoring
              </span>
              <p className="text-muted-foreground text-[11px]">
                Automatic clinical acuity calculation (BP, HR, RR, SpO2, Temp) to flag emergencies.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Bed className="size-3.5 text-purple-600" /> Direct Inpatient Ward Bedding
              </span>
              <p className="text-muted-foreground text-[11px]">
                Allocate available general and maternity beds during admission directly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
