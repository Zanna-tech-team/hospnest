import React from "react";
import { Link } from "@tanstack/react-router";
import type { PatientPortalDashboardData } from "@/lib/role-dashboard.functions";
import { Calendar, Pill, FlaskConical, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PatientDashboardProps {
  data: PatientPortalDashboardData;
}

export function PatientDashboard({ data }: PatientDashboardProps) {
  return (
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
              Upcoming Appointments ({data.upcomingAppointments.length})
            </CardTitle>
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link to="/portal">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.upcomingAppointments.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground italic">
                No scheduled appointments. You can book an appointment at any verified hospital.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.upcomingAppointments.map((a) => (
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
            {data.activePrescriptions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground italic">
                No active prescriptions on file.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.activePrescriptions.map((rx) => (
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
            {data.completedLabReports.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground italic">
                No completed diagnostic reports on record.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.completedLabReports.map((lab) => (
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
            {data.recentEncounters.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground italic">
                No past clinical encounters recorded.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentEncounters.map((enc) => (
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
  );
}
