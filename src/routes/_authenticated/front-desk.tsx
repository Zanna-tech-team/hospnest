import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  IdCard,
  Search,
  UserPlus,
  ClipboardCheck,
  CalendarCheck,
  Calendar,
  Clock,
  UserCheck,
  Activity,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Mic,
} from "lucide-react";

import { VoiceCheckInModal } from "@/components/voicecare/VoiceCheckInModal";

import { supabase } from "@/integrations/supabase/client";
import {
  getFrontDeskContext,
  lookupPatientByNin,
  openEncounterForPatient,
  registerPatientByNin,
  getHospitalAppointments,
  checkInBookedAppointment,
} from "@/lib/frontdesk.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppShell } from "@/components/layout/AppShell";

const title = "Front Desk & Intake — HospNest";
const description =
  "Look up any patient by their 11-digit NIN, enrol walk-ins, and manage scheduled online appointments.";

export const Route = createFileRoute("/_authenticated/front-desk")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FrontDesk,
});

type FoundPatient = {
  id: string;
  nin: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  blood_group?: string | null;
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FrontDesk() {
  const queryClient = useQueryClient();
  const { activeHospitalId } = useAppShell();
  const contextFn = useServerFn(getFrontDeskContext);
  const lookupFn = useServerFn(lookupPatientByNin);
  const registerFn = useServerFn(registerPatientByNin);
  const openVisitFn = useServerFn(openEncounterForPatient);
  const getApptsFn = useServerFn(getHospitalAppointments);
  const checkInApptFn = useServerFn(checkInBookedAppointment);

  const { data: ctx, isLoading } = useQuery({
    queryKey: ["front-desk-context"],
    queryFn: () => contextFn({}),
  });

  const [tab, setTab] = useState<"walkin" | "scheduled">("walkin");
  const [hospitalId, setHospitalId] = useState<string>("");
  const activeHospital = hospitalId || activeHospitalId || ctx?.workplaces?.[0]?.hospitalId || "";

  const departments = useMemo(
    () => (ctx?.departments ?? []).filter((d: any) => d.hospital_id === activeHospital),
    [ctx, activeHospital],
  );

  // Walk-in NIN Intake State
  const [nin, setNin] = useState("");
  const [patient, setPatient] = useState<FoundPatient | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [visitsHere, setVisitsHere] = useState(0);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    bloodGroup: "",
  });

  const [departmentId, setDepartmentId] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [consent, setConsent] = useState(false);
  const [openedVisit, setOpenedVisit] = useState<{ id: string; queue: number | null } | null>(null);
  const [isVoiceCheckInOpen, setIsVoiceCheckInOpen] = useState(false);

  // Scheduled Appointments Query
  const {
    data: apptData,
    isLoading: apptsLoading,
    refetch: refetchAppts,
    isRefetching: apptsRefetching,
  } = useQuery({
    queryKey: ["hospital-appointments", activeHospital],
    queryFn: () => getApptsFn({ data: { hospitalId: activeHospital } }),
    enabled: Boolean(activeHospital),
  });

  const lookup = useMutation({
    mutationFn: () => lookupFn({ data: { nin, hospitalId: activeHospital } }),
    onSuccess: (res: any) => {
      setOpenedVisit(null);
      if (res.found) {
        setPatient(res.patient);
        setVisitsHere(res.visitsHere);
        setNotFound(false);
        setConsent(res.hasConsent);
      } else {
        setPatient(null);
        setNotFound(true);
        setConsent(false);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const register = useMutation({
    mutationFn: () =>
      registerFn({
        data: {
          nin,
          hospitalId: activeHospital,
          firstName: form.firstName,
          lastName: form.lastName,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          phone: form.phone,
          bloodGroup: form.bloodGroup,
        },
      }),
    onSuccess: (res: any) => {
      setPatient(res.patient);
      setNotFound(false);
      toast.success("Health record created for this NIN.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openVisit = useMutation({
    mutationFn: () =>
      openVisitFn({
        data: {
          patientId: patient!.id,
          hospitalId: activeHospital,
          ...(departmentId ? { departmentId } : {}),
          chiefComplaint,
          consentGiven: consent,
        },
      }),
    onSuccess: (res: any) => {
      setOpenedVisit({ id: res.encounterId, queue: res.queueNumber });
      toast.success(res.alreadyOpen ? "This patient already has an open visit." : "Visit opened for triage.");
      queryClient.invalidateQueries({ queryKey: ["hospital-appointments", activeHospital] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkInMutation = useMutation({
    mutationFn: (appointmentId: string) =>
      checkInApptFn({
        data: {
          appointmentId,
          hospitalId: activeHospital,
        },
      }),
    onSuccess: (res: any) => {
      toast.success(
        res.alreadyOpen
          ? "Patient checked in (existing open visit resumed)."
          : `Checked in! Assigned Queue #${res.queueNumber || 1} — Sent to Triage.`
      );
      refetchAppts();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resetSearch() {
    setPatient(null);
    setNotFound(false);
    setOpenedVisit(null);
    setChiefComplaint("");
    setConsent(false);
    setForm({ firstName: "", lastName: "", dateOfBirth: "", gender: "", phone: "", bloodGroup: "" });
  }

  const appointmentsList = apptData?.appointments || [];
  const bookedCount = appointmentsList.filter((a: any) => a.status === "booked").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Front Desk & Intake
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search national NIN identities, enrol walk-in patients, and check in portal-booked appointments.
          </p>
        </div>

        {(ctx?.workplaces?.length ?? 0) > 1 && (
          <div className="w-64 space-y-1">
            <Label className="text-xs text-muted-foreground">Workplace</Label>
            <Select
              value={activeHospital}
              onValueChange={(v) => {
                setHospitalId(v);
                resetSearch();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose hospital" />
              </SelectTrigger>
              <SelectContent>
                {ctx!.workplaces.map((w: any) => (
                  <SelectItem key={w.hospitalId} value={w.hospitalId}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading hospital context…</p>
      ) : (ctx?.workplaces?.length ?? 0) === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center max-w-lg mx-auto">
          <h2 className="font-display text-lg font-semibold text-foreground">
            You are not attached to a hospital yet
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Register your own hospital or ask an existing administrator to invite you.
          </p>
          <Button asChild className="mt-4 bg-teal-600 hover:bg-teal-700 text-white">
            <Link to="/hospital-setup">Register your hospital</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "walkin" | "scheduled")}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <TabsList className="bg-muted p-1 rounded-xl">
                <TabsTrigger value="walkin" className="rounded-lg text-xs sm:text-sm font-semibold">
                  <IdCard className="h-4 w-4 mr-1.5" />
                  NIN Intake & Walk-ins
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="rounded-lg text-xs sm:text-sm font-semibold relative">
                  <CalendarCheck className="h-4 w-4 mr-1.5" />
                  Scheduled Bookings
                  {bookedCount > 0 && (
                    <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-[10px] h-4">
                      {bookedCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsVoiceCheckInOpen(true)}
                className="gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold rounded-xl shadow-xs"
              >
                <Mic className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                Voice Check-In Assistant (Sahara)
              </Button>
            </div>

            {/* TAB 1: NIN INTAKE & WALK-INS */}
            <TabsContent value="walkin" className="mt-6 space-y-6">
              {/* Step 1 — NIN search */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <IdCard className="h-4 w-4 text-primary" /> Step 1 — Find the patient by NIN
                </div>
                <form
                  className="mt-4 flex flex-col gap-3 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    resetSearch();
                    lookup.mutate();
                  }}
                >
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]{11}"
                    maxLength={11}
                    placeholder="11-digit NIN"
                    aria-label="Patient NIN"
                    value={nin}
                    onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    className="sm:max-w-xs font-mono"
                    required
                  />
                  <Button type="submit" disabled={lookup.isPending || nin.length !== 11}>
                    <Search className="mr-2 h-4 w-4" />
                    {lookup.isPending ? "Searching…" : "Search"}
                  </Button>
                </form>
              </section>

              {/* Step 2a — enrol a first-timer */}
              {notFound && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <UserPlus className="h-4 w-4 text-primary" /> Step 2 — No record for {nin}. Enrol
                    this patient.
                  </div>
                  <form
                    className="mt-4 grid gap-4 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      register.mutate();
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        required
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Input
                        id="gender"
                        placeholder="female / male"
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="blood">Blood group</Label>
                      <Input
                        id="blood"
                        placeholder="O+"
                        value={form.bloodGroup}
                        onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={register.isPending}>
                        {register.isPending ? "Creating record…" : "Create health record"}
                      </Button>
                    </div>
                  </form>
                </section>
              )}

              {/* Step 2b — patient found */}
              {patient && (
                <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        {patient.first_name} {patient.last_name}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        NIN {patient.nin}
                        {patient.date_of_birth ? ` · born ${patient.date_of_birth}` : ""}
                        {patient.gender ? ` · ${patient.gender}` : ""}
                        {patient.blood_group ? ` · ${patient.blood_group}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                      {visitsHere > 0 ? `${visitsHere} previous visit(s) here` : "First visit here"}
                    </span>
                  </div>

                  <form
                    className="mt-6 space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      openVisit.mutate();
                    }}
                  >
                    {departments.length > 0 && (
                      <div className="max-w-sm space-y-2">
                        <Label>Department</Label>
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((d: any) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="complaint">Why are they here today?</Label>
                      <Textarea
                        id="complaint"
                        required
                        rows={3}
                        value={chiefComplaint}
                        onChange={(e) => setChiefComplaint(e.target.value)}
                        placeholder="Fever and headache for three days"
                      />
                    </div>

                    <label className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Checkbox
                        checked={consent}
                        onCheckedChange={(v) => setConsent(v === true)}
                        aria-label="Patient consent"
                      />
                      <span>
                        The patient consents to this hospital viewing and updating their national
                        health record.
                      </span>
                    </label>

                    <Button type="submit" disabled={openVisit.isPending || !consent}>
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      {openVisit.isPending ? "Checking in…" : "Check in and open visit"}
                    </Button>
                  </form>

                  {openedVisit && (
                    <div className="mt-6 rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Sent to triage{openedVisit.queue ? ` · queue number ${openedVisit.queue}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Visit reference {openedVisit.id}</p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="text-xs">
                        <Link to="/triage">Go to Triage Queue</Link>
                      </Button>
                    </div>
                  )}
                </section>
              )}
            </TabsContent>

            {/* TAB 2: SCHEDULED BOOKINGS (Prompt 18) */}
            <TabsContent value="scheduled" className="mt-6 space-y-4">
              <Card className="border-border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-teal-600" />
                      Scheduled Patient Appointments
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Appointments booked via the online patient portal. Check in arriving patients to generate their triage queue ticket.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchAppts()}
                    disabled={apptsRefetching}
                    className="text-xs"
                  >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${apptsRefetching ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {apptsLoading ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-teal-600 mb-2" />
                      Loading appointments list...
                    </div>
                  ) : appointmentsList.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                      <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p className="font-semibold text-foreground">No online appointments on record</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        When patients book clinic consultations through their portal, they will show up here.
                      </p>
                    </div>
                  ) : (
                    appointmentsList.map((appt: any) => {
                      const p = appt.patients;
                      const isBooked = appt.status === "booked";
                      const isCheckedIn = appt.status === "checked_in";

                      return (
                        <div
                          key={appt.id}
                          className="rounded-2xl border border-border bg-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs hover:border-teal-500/40 transition-colors"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-foreground">
                                {p?.first_name} {p?.last_name}
                              </span>
                              <Badge variant="outline" className="text-xs font-mono">
                                NIN: {p?.nin}
                              </Badge>
                              {appt.is_external_booking && (
                                <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] uppercase font-bold">
                                  🌐 Online booking
                                </Badge>
                              )}
                              {appt.booking_reference && (
                                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                                  Ref: {appt.booking_reference}
                                </Badge>
                              )}
                              {appt.departments?.name && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {appt.departments.name}
                                </Badge>
                              )}
                              <Badge
                                className={
                                  isCheckedIn
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                    : isBooked
                                    ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20"
                                    : "bg-muted text-muted-foreground"
                                }
                              >
                                {appt.status.replace("_", " ").toUpperCase()}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                Scheduled: <strong className="text-foreground">{formatDateTime(appt.appointment_date)}</strong>
                              </span>
                              {p?.phone && <span>Phone: {p.phone}</span>}
                              {p?.gender && <span>Gender: {p.gender}</span>}
                            </div>

                            {appt.symptoms_summary && (
                              <p className="text-xs text-muted-foreground italic bg-secondary/30 p-2 rounded-lg">
                                Symptoms / Reason: {appt.symptoms_summary}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {appt.queue_number && (
                              <div className="rounded-xl bg-teal-500/10 px-3 py-1.5 text-center border border-teal-500/20">
                                <span className="block text-[9px] uppercase font-bold text-teal-700 dark:text-teal-300">
                                  Queue #
                                </span>
                                <span className="font-display text-base font-black text-teal-800 dark:text-teal-200">
                                  {appt.queue_number}
                                </span>
                              </div>
                            )}

                            {isBooked ? (
                              <Button
                                size="sm"
                                onClick={() => checkInMutation.mutate(appt.id)}
                                disabled={checkInMutation.isPending}
                                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                              >
                                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                                {checkInMutation.isPending ? "Checking in..." : "Check In to Triage"}
                              </Button>
                            ) : isCheckedIn ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs py-1">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                In Triage Queue
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Voice-Assisted Check-In Assistant (Intron Sahara) */}
      <VoiceCheckInModal
        isOpen={isVoiceCheckInOpen}
        onClose={() => setIsVoiceCheckInOpen(false)}
        appointments={appointmentsList}
        onCheckIn={(appointmentId) => checkInMutation.mutate(appointmentId)}
      />
    </div>
  );
}

