import React from "react";
import type { AdminDashboardStats } from "@/lib/admin.functions";
import {
  Users,
  CreditCard,
  Receipt,
  AlertCircle,
  Calendar,
  TrendingUp,
  Layers,
  FlaskConical,
  AlertTriangle,
  Radio,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface HospitalAdminDashboardProps {
  data: AdminDashboardStats;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

const DEPT_COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];

export function HospitalAdminDashboard({ data }: HospitalAdminDashboardProps) {
  return (
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
              {data.kpis.patientsToday}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.kpis.visitsThisWeek} total visits this week
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
              {formatCurrency(data.kpis.revenueToday)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(data.kpis.revenueThisMonth)} this month
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
              {formatCurrency(data.kpis.outstandingInvoicesAmount)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.kpis.outstandingInvoicesCount} unpaid invoices
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
              {data.kpis.lowStockDrugsCount + data.kpis.pendingLabOrdersCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.kpis.lowStockDrugsCount} low stock • {data.kpis.pendingLabOrdersCount} pending labs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Metrics & Hourly Traffic Chart Strip for Hospital Admin */}
      {data.appointmentStats && (
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
                  <span className="font-display text-xl font-bold text-foreground">{data.appointmentStats.todayTotal}</span>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300 block">Completed</span>
                  <span className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400">{data.appointmentStats.completed}</span>
                </div>
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-teal-800 dark:text-teal-300 block">Checked In</span>
                  <span className="font-display text-xl font-bold text-teal-700 dark:text-teal-400">{data.appointmentStats.checkedIn}</span>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300 block">Pending / Wait</span>
                  <span className="font-display text-xl font-bold text-amber-700 dark:text-amber-400">{data.appointmentStats.pending}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Online Self-Service: <strong className="text-foreground">{data.appointmentStats.externalOnlineBookings}</strong></span>
                <span>No-Show Rate: <strong className={data.appointmentStats.noShowRate > 15 ? "text-rose-600" : "text-foreground"}>{data.appointmentStats.noShowRate}%</strong></span>
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
                <BarChart data={data.appointmentStats.hourlyTraffic}>
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
      {data.patientFlowQueues && (
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
                <span className="font-display text-2xl font-bold text-foreground">{data.patientFlowQueues.waitingTriageCount}</span>
                <span className="text-[10px] text-muted-foreground block">At front lobby</span>
              </div>
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-teal-800 dark:text-teal-300 block">Waiting Doctor</span>
                <span className="font-display text-2xl font-bold text-teal-700 dark:text-teal-400">{data.patientFlowQueues.waitingDoctorCount}</span>
                <span className="text-[10px] text-teal-700 dark:text-teal-300 block">Triaged & ready</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">In Consultation</span>
                <span className="font-display text-2xl font-bold text-foreground">{data.patientFlowQueues.inConsultationCount}</span>
                <span className="text-[10px] text-muted-foreground block">With physician</span>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300 block">Diagnostic Hold</span>
                <span className="font-display text-2xl font-bold text-amber-700 dark:text-amber-400">{data.patientFlowQueues.diagnosticHoldCount}</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 block">Lab / Imaging</span>
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-purple-800 dark:text-purple-300 block">Pharmacy Hold</span>
                <span className="font-display text-2xl font-bold text-purple-700 dark:text-purple-400">{data.patientFlowQueues.pharmacyHoldCount}</span>
                <span className="text-[10px] text-purple-700 dark:text-purple-300 block">Prescription fill</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostic Turnaround Summary */}
      {data.diagnosticTurnaround && (
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
                {data.diagnosticTurnaround.labOrdersToday}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.diagnosticTurnaround.labPending} pending • {data.diagnosticTurnaround.labCritical} critical
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
                {data.diagnosticTurnaround.labCritical}
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
                {data.diagnosticTurnaround.radiologyStudiesToday}
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
                {data.diagnosticTurnaround.radiologyPending}
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
              <AreaChart data={data.charts.visitsPerDay}>
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
            {data.charts.departmentVisits.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">No department visit data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.departmentVisits}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name }) => name}
                  >
                    {data.charts.departmentVisits.map((_, index) => (
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
  );
}
