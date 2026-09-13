import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  Building2,
  Stethoscope,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock3,
  XCircle,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Tv,
  AlertTriangle,
  FileText,
  CalendarDays,
  Loader2,
  ChevronDown,
  Sparkles,
  Phone,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getHospitalAppointmentsCalendar,
  getAvailableDoctorSlots,
  createStaffAppointment,
  checkInClinicAppointment,
  rescheduleClinicAppointment,
  cancelClinicAppointment,
  type CalendarAppointmentItem,
  type AppointmentPriority,
  type AppointmentStatus,
} from "@/lib/appointments.functions";
import { lookupPatientByNin } from "@/lib/frontdesk.functions";
import { SkeletonAppointmentCalendar } from "@/components/appointments/SkeletonAppointmentCalendar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/appointments/")({
  head: () => ({
    meta: [
      { title: "Appointments & Scheduling — HospNest" },
      { name: "description", content: "Master outpatient appointment calendar, multi-doctor scheduling, real-time availability slots, and patient check-in." },
    ],
  }),
  component: AppointmentsCalendarPage,
});

type ViewMode = "day" | "week" | "month";

function AppointmentsCalendarPage() {
  const { activeHospitalId } = useAppShell();
  const queryClient = useQueryClient();

  const getCalendarFn = useServerFn(getHospitalAppointmentsCalendar);
  const getSlotsFn = useServerFn(getAvailableDoctorSlots);
  const createAppointmentFn = useServerFn(createStaffAppointment);
  const checkInFn = useServerFn(checkInClinicAppointment);
  const rescheduleFn = useServerFn(rescheduleClinicAppointment);
  const cancelFn = useServerFn(cancelClinicAppointment);
  const lookupPatientFn = useServerFn(lookupPatientByNin);

  // Calendar view state
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<CalendarAppointmentItem | null>(null);

  // Booking Form State
  const [patientSearchNin, setPatientSearchNin] = useState("");
  const [foundPatient, setFoundPatient] = useState<any>(null);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [bookDeptId, setBookDeptId] = useState<string>("");
  const [bookDoctorId, setBookDoctorId] = useState<string>("");
  const [bookDate, setBookDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [bookSlotTime, setBookSlotTime] = useState<string>("");
  const [bookPriority, setBookPriority] = useState<AppointmentPriority>("routine");
  const [bookReason, setBookReason] = useState<string>("");
  const [bookNotes, setBookNotes] = useState<string>("");
  const [isWalkIn, setIsWalkIn] = useState<boolean>(false);

  // Reschedule Form State
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState<string>("");
  const [rescheduleSlotTime, setRescheduleSlotTime] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");

  // Cancel Form State
  const [cancelReason, setCancelReason] = useState<string>("");

  const [isPending, startTransition] = useTransition();

  // Compute date range for query
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === "day") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === "week") {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [currentDate, viewMode]);

  // Query appointments calendar
  const {
    data: calendarData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "appointments-calendar",
      activeHospitalId,
      dateRange.startDate,
      dateRange.endDate,
      selectedDeptFilter,
      selectedDoctorFilter,
      selectedStatusFilter,
    ],
    queryFn: () =>
      getCalendarFn({
        data: {
          hospitalId: activeHospitalId || undefined,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          departmentId: selectedDeptFilter,
          doctorId: selectedDoctorFilter,
          statusFilter: selectedStatusFilter,
        },
      }),
    enabled: Boolean(activeHospitalId),
  });

  // Query available slots when booking or rescheduling
  const { data: slotData, isLoading: isLoadingSlots } = useQuery({
    queryKey: ["doctor-slots", activeHospitalId, bookDate, bookDeptId, bookDoctorId],
    queryFn: () =>
      getSlotsFn({
        data: {
          hospitalId: activeHospitalId || undefined,
          date: bookDate,
          departmentId: bookDeptId || undefined,
          doctorId: bookDoctorId || undefined,
        },
      }),
    enabled: Boolean(activeHospitalId && bookDate && isBookModalOpen),
  });

  // Filter appointments locally by search query
  const filteredAppointments = useMemo(() => {
    if (!calendarData?.appointments) return [];
    if (!searchQuery.trim()) return calendarData.appointments;
    const q = searchQuery.toLowerCase();
    return calendarData.appointments.filter(
      (a) =>
        a.patientName.toLowerCase().includes(q) ||
        a.patientNin.toLowerCase().includes(q) ||
        (a.doctorName && a.doctorName.toLowerCase().includes(q)) ||
        (a.symptomsSummary && a.symptomsSummary.toLowerCase().includes(q))
    );
  }, [calendarData?.appointments, searchQuery]);

  // Calendar Navigation handlers
  const handlePrevDate = () => {
    const next = new Date(currentDate);
    if (viewMode === "day") next.setDate(next.getDate() - 1);
    else if (viewMode === "week") next.setDate(next.getDate() - 7);
    else next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNextDate = () => {
    const next = new Date(currentDate);
    if (viewMode === "day") next.setDate(next.getDate() + 1);
    else if (viewMode === "week") next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Patient Lookup handler
  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSearchNin.trim()) return;
    setIsSearchingPatient(true);
    try {
      const res = await lookupPatientFn({
        data: { nin: patientSearchNin.trim(), hospitalId: activeHospitalId! },
      });
      if (res?.found && res.patient) {
        setFoundPatient(res.patient);
        toast.success(`Found patient: ${res.patient.first_name} ${res.patient.last_name || ""}`);
      } else {
        setFoundPatient(null);
        toast.error("No enrolled patient found with this 11-digit NIN.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to search patient.");
    } finally {
      setIsSearchingPatient(false);
    }
  };

  // Booking Submit handler
  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundPatient) {
      toast.error("Please search and select a patient first.");
      return;
    }
    if (!bookSlotTime) {
      toast.error("Please select an available appointment time slot.");
      return;
    }
    if (!bookReason.trim()) {
      toast.error("Please provide the primary reason for visit.");
      return;
    }

    startTransition(async () => {
      try {
        await createAppointmentFn({
          data: {
            hospitalId: activeHospitalId!,
            patientId: foundPatient.id,
            departmentId: bookDeptId || undefined,
            doctorId: bookDoctorId || undefined,
            appointmentDate: bookSlotTime,
            priority: bookPriority,
            symptomsSummary: bookReason,
            notes: bookNotes,
            isWalkIn: isWalkIn,
          },
        });
        toast.success("Appointment successfully scheduled!");
        setIsBookModalOpen(false);
        setFoundPatient(null);
        setPatientSearchNin("");
        setBookReason("");
        setBookNotes("");
        setBookSlotTime("");
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to book appointment.");
      }
    });
  };

  // Check In handler
  const handleCheckIn = (appt: CalendarAppointmentItem) => {
    startTransition(async () => {
      try {
        const res = await checkInFn({
          data: {
            appointmentId: appt.id,
            hospitalId: activeHospitalId!,
          },
        });
        toast.success(
          res.alreadyOpen
            ? "Patient already has an active consultation visit open."
            : `Patient checked in! Queue #${res.queueNumber} issued & sent to Triage.`
        );
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Check-in failed.");
      }
    });
  };

  // Reschedule Submit handler
  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt || !rescheduleSlotTime) {
      toast.error("Please select a valid new date and time slot.");
      return;
    }

    startTransition(async () => {
      try {
        await rescheduleFn({
          data: {
            appointmentId: selectedAppt.id,
            hospitalId: activeHospitalId!,
            newAppointmentDate: rescheduleSlotTime,
            doctorId: rescheduleDoctorId || undefined,
            reason: rescheduleReason,
          },
        });
        toast.success("Appointment rescheduled successfully!");
        setIsRescheduleModalOpen(false);
        setSelectedAppt(null);
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to reschedule appointment.");
      }
    });
  };

  // Cancel Submit handler
  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt || !cancelReason.trim()) {
      toast.error("Please provide a cancellation reason.");
      return;
    }

    startTransition(async () => {
      try {
        await cancelFn({
          data: {
            appointmentId: selectedAppt.id,
            hospitalId: activeHospitalId!,
            reason: cancelReason,
          },
        });
        toast.success("Appointment cancelled.");
        setIsCancelModalOpen(false);
        setSelectedAppt(null);
        setCancelReason("");
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to cancel appointment.");
      }
    });
  };

  // Helper status badge styling
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "booked":
        return <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/10 text-[10px] font-bold">Booked</Badge>;
      case "checked_in":
        return <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold animate-pulse">Checked In</Badge>;
      case "in_consultation":
        return <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-[10px] font-bold">In Consultation</Badge>;
      case "completed":
        return <Badge variant="outline" className="border-teal-500/30 text-teal-600 bg-teal-500/10 text-[10px] font-bold">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px] font-bold">Cancelled</Badge>;
      case "no_show":
        return <Badge variant="outline" className="border-rose-500/30 text-rose-600 bg-rose-500/10 text-[10px] font-bold">No Show</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: AppointmentPriority) => {
    switch (priority) {
      case "emergency":
        return <span className="rounded bg-rose-600 text-white font-black text-[9px] px-1.5 py-0.5 uppercase tracking-wider">Emergency</span>;
      case "urgent":
        return <span className="rounded bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 uppercase tracking-wider">Urgent</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <SkeletonAppointmentCalendar />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-12 space-y-4">
          <AlertTriangle className="mx-auto size-12 text-destructive" />
          <h2 className="text-xl font-bold font-display text-foreground">Failed to Load Appointments Calendar</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {(error as any)?.message || "An error occurred while fetching the scheduling data. Please check your connection."}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Retry Query
          </Button>
        </div>
      </div>
    );
  }

  const { doctors, departments, stats } = calendarData || { doctors: [], departments: [], stats: {} as any };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
      {/* 1. Page Header & Primary Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Clinical Ops</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Outpatient Appointments</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-3">
            <CalendarDays className="size-7 text-primary" />
            Appointments & Doctor Scheduling
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Master outpatient clinic calendar, slot availability engine, and waiting room queue dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2 border-border/80 text-foreground bg-background shadow-xs hover:bg-muted"
          >
            <Link to="/appointments/queue">
              <Tv className="size-3.5 text-teal-600 dark:text-teal-400" />
              Live Waiting Queue Board
            </Link>
          </Button>

          <Button
            onClick={() => setIsBookModalOpen(true)}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Book New Appointment
          </Button>
        </div>
      </div>

      {/* 2. KPI Stat Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-muted-foreground">Total Scheduled</span>
          <p className="font-display text-2xl font-black text-foreground mt-0.5">{stats?.total || 0}</p>
        </div>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Booked (Upcoming)</span>
          <p className="font-display text-2xl font-black text-blue-700 dark:text-blue-300 mt-0.5">{stats?.booked || 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Checked In (Queue)</span>
          <p className="font-display text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{stats?.checkedIn || 0}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">In Consultation</span>
          <p className="font-display text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{stats?.inConsultation || 0}</p>
        </div>
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">Completed Visits</span>
          <p className="font-display text-2xl font-black text-teal-700 dark:text-teal-300 mt-0.5">{stats?.completed || 0}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Cancelled / No-Show</span>
          <p className="font-display text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5">
            {(stats?.cancelled || 0) + (stats?.noShow || 0)}
          </p>
        </div>
      </div>

      {/* 3. Interactive Controls & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          {/* Date Navigator */}
          <div className="flex items-center gap-2">
            <Button onClick={handleToday} variant="outline" size="sm" className="h-8 text-xs font-semibold">
              Today
            </Button>
            <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
              <Button onClick={handlePrevDate} variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="size-4" />
              </Button>
              <Button onClick={handleNextDate} variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <span className="font-display text-sm font-bold text-foreground ml-1.5">
              {viewMode === "day" && currentDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
              {viewMode === "week" && `Week of ${new Date(dateRange.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${new Date(dateRange.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
              {viewMode === "month" && currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-border bg-muted/30 p-1">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition-colors ${
                  viewMode === mode
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode} View
              </button>
            ))}
          </div>
        </div>

        {/* Filters & Patient Search */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient name, NIN, symptoms..."
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDoctorFilter} onValueChange={setSelectedDoctorFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Doctors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Clinicians</SelectItem>
              {doctors.map((doc) => (
                <SelectItem key={doc.id} value={doc.id} className="text-xs">{doc.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="booked" className="text-xs">Booked</SelectItem>
              <SelectItem value="checked_in" className="text-xs">Checked In</SelectItem>
              <SelectItem value="in_consultation" className="text-xs">In Consultation</SelectItem>
              <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
              <SelectItem value="no_show" className="text-xs">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Calendar Layout: Doctor Columns (Day Mode) or List Matrix */}
      {viewMode === "day" ? (
        <div className="space-y-4">
          {doctors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Users className="mx-auto size-10 text-muted-foreground/60" />
              <h3 className="mt-3 font-display text-base font-bold text-foreground">No Doctors Registered in Hospital</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Invite clinical doctors in the Staff Management directory to activate multi-column doctor scheduling.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
              {doctors.map((doc) => {
                const docAppointments = filteredAppointments.filter((a) => a.doctorId === doc.id);
                return (
                  <div
                    key={doc.id}
                    className="flex flex-col rounded-2xl border border-border bg-card shadow-soft overflow-hidden transition-all hover:border-primary/40"
                  >
                    {/* Doctor Column Header */}
                    <div className="border-b border-border/80 bg-muted/30 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
                          {doc.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground line-clamp-1">{doc.fullName}</h4>
                          <span className="text-[10px] text-muted-foreground">
                            {doc.departmentName || "General Clinic"}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-mono text-[10px] font-bold">
                        {docAppointments.length} Appt{docAppointments.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    {/* Appointments Stack */}
                    <div className="p-3 space-y-2.5 min-h-[220px] max-h-[500px] overflow-y-auto">
                      {docAppointments.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground/70">
                          <Clock className="mx-auto size-6 mb-1 opacity-50" />
                          No appointments booked for this doctor today.
                        </div>
                      ) : (
                        docAppointments.map((appt) => (
                          <div
                            key={appt.id}
                            className="rounded-xl border border-border/80 bg-background p-3 shadow-xs space-y-2 transition-all hover:shadow-soft"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 font-mono text-xs font-black text-foreground">
                                <Clock3 className="size-3 text-primary" />
                                {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                              <div className="flex items-center gap-1">
                                {getPriorityBadge(appt.priority)}
                                {getStatusBadge(appt.status)}
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground line-clamp-1">{appt.patientName}</span>
                                {appt.queueNumber && (
                                  <span className="rounded bg-teal-500/10 px-1.5 py-0.2 font-mono text-[10px] font-bold text-teal-700 dark:text-teal-400">
                                    Q#{appt.queueNumber}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                NIN: {appt.patientNin} • {appt.patientGender || "N/A"} ({appt.patientAge})
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 bg-muted/20 rounded p-1.5 border border-border/40">
                                {appt.symptomsSummary || "Outpatient clinic visit"}
                              </p>
                            </div>

                            {/* Actions bar */}
                            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1.5 text-xs">
                              {appt.status === "booked" ? (
                                <Button
                                  onClick={() => handleCheckIn(appt)}
                                  disabled={isPending}
                                  size="sm"
                                  className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex-1"
                                >
                                  {isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                                  Check In
                                </Button>
                              ) : appt.status === "checked_in" ? (
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="size-3" /> Waiting in Triage
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground capitalize font-medium">
                                  {appt.status.replace("_", " ")}
                                </span>
                              )}

                              <div className="flex items-center gap-1">
                                <Button
                                  onClick={() => {
                                    setSelectedAppt(appt);
                                    setRescheduleDate(new Date(appt.appointmentDate).toISOString().split("T")[0]);
                                    setRescheduleDoctorId(appt.doctorId || "");
                                    setIsRescheduleModalOpen(true);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px]"
                                >
                                  Reschedule
                                </Button>
                                {appt.status !== "cancelled" && appt.status !== "completed" && (
                                  <Button
                                    onClick={() => {
                                      setSelectedAppt(appt);
                                      setIsCancelModalOpen(true);
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Week / Month Table View */
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Patient Name & Identity</th>
                  <th className="py-3.5 px-4">Doctor & Department</th>
                  <th className="py-3.5 px-4">Reason / Symptoms</th>
                  <th className="py-3.5 px-4">Priority & Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No appointments found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {new Date(appt.appointmentDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} at{" "}
                        {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground">{appt.patientName}</div>
                        <div className="text-[11px] text-muted-foreground">NIN: {appt.patientNin}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground">{appt.doctorName || "Assigned at Triage"}</div>
                        <div className="text-[11px] text-muted-foreground">{appt.departmentName || "General Clinic"}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-1 text-muted-foreground">{appt.symptomsSummary || "Consultation"}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {getPriorityBadge(appt.priority)}
                          {getStatusBadge(appt.status)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {appt.status === "booked" && (
                            <Button
                              onClick={() => handleCheckIn(appt)}
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                              Check In
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              setSelectedAppt(appt);
                              setRescheduleDate(new Date(appt.appointmentDate).toISOString().split("T")[0]);
                              setRescheduleDoctorId(appt.doctorId || "");
                              setIsRescheduleModalOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                          >
                            Reschedule
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL: BOOK APPOINTMENT */}
      <Dialog open={isBookModalOpen} onOpenChange={setIsBookModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              Schedule Clinic Appointment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Search patient by 11-digit NIN identity, verify doctor shift availability, and book consultation slot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Step 1: Patient NIN Search */}
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
              <Label className="text-xs font-bold text-foreground">Step 1: Patient NIN Identity Verification *</Label>
              <form onSubmit={handleSearchPatient} className="flex gap-2">
                <Input
                  value={patientSearchNin}
                  onChange={(e) => setPatientSearchNin(e.target.value)}
                  placeholder="Enter 11-digit National Identity Number (NIN)..."
                  maxLength={11}
                  className="h-9 text-xs font-mono"
                />
                <Button type="submit" disabled={isSearchingPatient || !patientSearchNin.trim()} size="sm" className="gap-1 text-xs">
                  {isSearchingPatient ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                  Verify NIN
                </Button>
              </form>

              {foundPatient ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      {foundPatient.first_name} {foundPatient.last_name || ""}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      NIN: {foundPatient.nin} • {foundPatient.gender || "Gender"} • Phone: {foundPatient.phone || "N/A"}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-bold">
                    Verified
                  </Badge>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Patient not enrolled yet? Visit <Link to="/front-desk" className="underline font-bold text-primary">Front Desk NIN Enrolment</Link>.
                </p>
              )}
            </div>

            {/* Step 2: Department & Doctor Selection */}
            <form onSubmit={handleBookSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Clinical Department</Label>
                  <Select value={bookDeptId} onValueChange={setBookDeptId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose department..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Attending Doctor</Label>
                  <Select value={bookDoctorId} onValueChange={setBookDoctorId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose doctor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id} className="text-xs">{doc.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Step 3: Date & Real-Time Availability Slot Picker */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Appointment Date & Shift Slot *</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={bookDate}
                    onChange={(e) => {
                      setBookDate(e.target.value);
                      setBookSlotTime("");
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="h-9 text-xs max-w-xs"
                  />
                </div>

                {/* Slots Grid */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                    Available Time Slots for {bookDate}:
                  </span>
                  {isLoadingSlots ? (
                    <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin text-primary" /> Calculating doctor shift availability...
                    </div>
                  ) : !slotData?.availabilities || slotData.availabilities.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No doctor shifts scheduled for this date. Select another date or doctor.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto rounded-xl border border-border p-3 bg-muted/10">
                      {slotData.availabilities.map((docAvail) => (
                        <div key={docAvail.doctorId} className="space-y-1.5">
                          <span className="text-[11px] font-bold text-foreground">
                            {docAvail.doctorName} ({docAvail.shiftStart} - {docAvail.shiftEnd})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {docAvail.slots.map((slot) => (
                              <button
                                key={slot.isoDateTime}
                                type="button"
                                disabled={!slot.isAvailable}
                                onClick={() => {
                                  setBookSlotTime(slot.isoDateTime);
                                  setBookDoctorId(docAvail.doctorId);
                                }}
                                className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all ${
                                  bookSlotTime === slot.isoDateTime
                                    ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/40"
                                    : slot.isAvailable
                                    ? "bg-background border border-border hover:border-primary/50 text-foreground"
                                    : "bg-muted/60 text-muted-foreground/50 cursor-not-allowed line-through"
                                }`}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Priority & Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Triage Priority</Label>
                  <Select value={bookPriority} onValueChange={(val: any) => setBookPriority(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine" className="text-xs">Routine Consultation</SelectItem>
                      <SelectItem value="urgent" className="text-xs">Urgent (Priority Triage)</SelectItem>
                      <SelectItem value="emergency" className="text-xs">Emergency (Immediate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Walk-in or Pre-booked?</Label>
                  <Select value={isWalkIn ? "walk_in" : "pre_booked"} onValueChange={(val) => setIsWalkIn(val === "walk_in")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_booked" className="text-xs">Pre-booked Online / Phone</SelectItem>
                      <SelectItem value="walk_in" className="text-xs">Direct Walk-In Arrival</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Primary Reason / Symptoms Summary *</Label>
                <Textarea
                  value={bookReason}
                  onChange={(e) => setBookReason(e.target.value)}
                  placeholder="e.g., Persistent dry cough and intermittent low-grade fever for 5 days."
                  rows={2}
                  required
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-3 gap-2 sm:justify-between">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsBookModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !foundPatient || !bookSlotTime || !bookReason.trim()}
                  size="sm"
                  className="gap-1.5 bg-primary text-primary-foreground font-bold shadow-soft"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarIcon className="size-3.5" />}
                  Confirm Appointment Booking
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL: RESCHEDULE APPOINTMENT */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Reschedule Appointment</DialogTitle>
            <DialogDescription className="text-xs">
              Patient: {selectedAppt?.patientName} • Current: {selectedAppt && new Date(selectedAppt.appointmentDate).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRescheduleSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">New Appointment Date</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Doctor</Label>
              <Select value={rescheduleDoctorId} onValueChange={setRescheduleDoctorId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Keep current or switch doctor..." />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id} className="text-xs">{doc.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Time Slot (ISO / Time)</Label>
              <Input
                type="time"
                onChange={(e) => {
                  if (rescheduleDate && e.target.value) {
                    setRescheduleSlotTime(new Date(`${rescheduleDate}T${e.target.value}:00.000Z`).toISOString());
                  }
                }}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason for Rescheduling</Label>
              <Input
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g. Patient requested morning shift adjustment"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRescheduleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !rescheduleSlotTime}
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground font-bold"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
                Save Reschedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL: CANCEL APPOINTMENT */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-destructive">
              Cancel Appointment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Patient: {selectedAppt?.patientName} • Date: {selectedAppt && new Date(selectedAppt.appointmentDate).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancelSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cancellation Reason *</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Patient called to cancel due to travel conflict."
                required
                rows={3}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCancelModalOpen(false)}>
                Keep Appointment
              </Button>
              <Button
                type="submit"
                disabled={isPending || !cancelReason.trim()}
                variant="destructive"
                size="sm"
                className="gap-1.5 font-bold"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
