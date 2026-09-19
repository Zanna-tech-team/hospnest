import React from "react";
import { Link } from "@tanstack/react-router";
import type { FrontDeskDashboardData } from "@/lib/role-dashboard.functions";
import { Calendar, Sparkles, Clock, Bed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FrontDeskDashboardProps {
  data: FrontDeskDashboardData;
}

export function FrontDeskDashboard({ data }: FrontDeskDashboardProps) {
  return (
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
              {data.todayAppointmentsCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.onlineBookingsCount} booked directly online
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
              {data.onlineBookingsCount}
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
              {data.checkedInTodayCount}
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
              {data.availableBedsCount} <span className="text-sm font-normal text-muted-foreground">/ {data.totalBedsCount}</span>
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
            {data.todayAppointments.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                No scheduled appointments for today yet.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {data.todayAppointments.map((appt) => (
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
              Live Intake Queue ({data.liveTriageQueue.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Patients currently waiting in front lobby.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.liveTriageQueue.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                Lobby is currently clear.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {data.liveTriageQueue.map((item) => (
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
  );
}
