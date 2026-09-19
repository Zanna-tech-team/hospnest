import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPatientPortalDashboardData,
  bookPatientAppointment,
  updatePatientSelfProfile,
  getPatientPrivacySettings,
  updateGlobalSharingConsent,
  savePatientHospitalConsents,
  type PatientPortalDashboardResponse,
  type PatientPortalAppointment,
  type PatientPortalEncounter,
  type PatientPortalLabResult,
  type PatientPortalPrescription,
  type PatientPortalInvoice,
} from "@/lib/patient-portal.functions";
import { Switch } from "@/components/ui/switch";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Droplet,
  FileCheck2,
  FileText,
  FlaskConical,
  HeartPulse,
  Hospital,
  Info,
  Layers,
  Lock,
  Pill,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Tag,
  User,
  UserCheck,
  Pencil,
  Mic,
  Volume2,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AudioRecorderModal } from "@/components/voicecare/AudioRecorderModal";
import { VoiceBookingCard } from "@/components/voicecare/VoiceBookingCard";
import { VoiceCommunicationWidget } from "@/components/voicecare/VoiceCommunicationWidget";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PatientPortalPage,
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

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

export function PatientPortalPage() {
  const queryClient = useQueryClient();
  const getDashboardFn = useServerFn(getPatientPortalDashboardData);
  const bookApptFn = useServerFn(bookPatientAppointment);
  const updateProfileFn = useServerFn(updatePatientSelfProfile);
  const getPrivacyFn = useServerFn(getPatientPrivacySettings);
  const updateGlobalSharingFn = useServerFn(updateGlobalSharingConsent);
  const saveHospitalConsentsFn = useServerFn(savePatientHospitalConsents);

  const [activeTab, setActiveTab] = useState<
    "overview" | "visits" | "labs" | "prescriptions" | "invoices" | "profile" | "privacy" | "voicecare"
  >("overview");

  // VoiceCare Modal & Booking States
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [voiceExtractedBooking, setVoiceExtractedBooking] = useState<any | null>(null);
  const [bookingMode, setBookingMode] = useState<"standard" | "voice">("standard");

  // Booking Modal State
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookHospitalId, setBookHospitalId] = useState("");
  const [bookDeptId, setBookDeptId] = useState<string>("");
  const [bookDoctorId, setBookDoctorId] = useState<string>("");
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("09:00");
  const [bookSymptoms, setBookSymptoms] = useState("");

  // Edit Profile Modal State
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileEmergName, setProfileEmergName] = useState("");
  const [profileEmergRel, setProfileEmergRel] = useState("");
  const [profileEmergPhone, setProfileEmergPhone] = useState("");

  // Print Invoice / Receipt View State
  const [viewingInvoice, setViewingInvoice] = useState<PatientPortalInvoice | null>(null);

  // Per-hospital privacy settings state
  const [hospitalConsentState, setHospitalConsentState] = useState<
    Record<
      string,
      {
        isSharingActive: boolean;
        allowLabs: boolean;
        allowPrescriptions: boolean;
        allowImaging: boolean;
        allowClinicalNotes: boolean;
        allowMaternity: boolean;
        allowSurgeries: boolean;
        allowPsychiatricNotes: boolean;
        allowSexualHealthNotes: boolean;
      }
    >
  >({});

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<PatientPortalDashboardResponse>({
    queryKey: ["patient-portal-dashboard"],
    queryFn: () => getDashboardFn(),
  });

  const {
    data: privacyData,
    isLoading: isPrivacyLoading,
    refetch: refetchPrivacy,
  } = useQuery({
    queryKey: ["patient-privacy-settings"],
    queryFn: () => getPrivacyFn(),
  });

  const updateGlobalMutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      return updateGlobalSharingFn({ data: { isGlobalShare: newValue } });
    },
    onSuccess: () => {
      toast.success("Global health record sharing preference updated.");
      queryClient.invalidateQueries({ queryKey: ["patient-privacy-settings"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update global record sharing preference");
    },
  });

  const saveHospitalConsentMutation = useMutation({
    mutationFn: async (payload: {
      hospitalId: string;
      isSharingActive: boolean;
      allowLabs: boolean;
      allowPrescriptions: boolean;
      allowImaging: boolean;
      allowClinicalNotes: boolean;
      allowMaternity?: boolean;
      allowSurgeries?: boolean;
      allowPsychiatricNotes?: boolean;
      allowSexualHealthNotes?: boolean;
    }) => {
      return saveHospitalConsentsFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Hospital privacy permissions saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["patient-privacy-settings"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save hospital privacy permissions");
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const fullDateTime = `${bookDate}T${bookTime}:00`;
      return bookApptFn({
        data: {
          hospitalId: bookHospitalId,
          departmentId: bookDeptId || undefined,
          doctorId: bookDoctorId || undefined,
          appointmentDate: new Date(fullDateTime).toISOString(),
          symptomsSummary: bookSymptoms,
        },
      });
    },
    onSuccess: () => {
      toast.success("Appointment booked successfully! Our clinic team has been notified.");
      setBookingOpen(false);
      setBookSymptoms("");
      queryClient.invalidateQueries({ queryKey: ["patient-portal-dashboard"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to book appointment");
    },
  });

  const profileMutation = useMutation({
    mutationFn: async () => {
      return updateProfileFn({
        data: {
          phone: profilePhone,
          email: profileEmail,
          emergencyContact: {
            name: profileEmergName,
            relationship: profileEmergRel,
            phone: profileEmergPhone,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Profile contact details updated successfully.");
      setEditProfileOpen(false);
      queryClient.invalidateQueries({ queryKey: ["patient-portal-dashboard"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const handleOpenEditProfile = () => {
    if (data?.patient) {
      setProfilePhone(data.patient.phone || "");
      setProfileEmail(data.patient.email || "");
      setProfileEmergName(data.patient.emergencyContact?.name || "");
      setProfileEmergRel(data.patient.emergencyContact?.relationship || "");
      setProfileEmergPhone(data.patient.emergencyContact?.phone || "");
      setEditProfileOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading your verified medical portal and health records...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          Unable to Load Patient Portal
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "You may need to link your NIN identity with the hospital first."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
          <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
            <a href="/auth?tab=patient">Verify NIN Record</a>
          </Button>
        </div>
      </div>
    );
  }

  const {
    patient,
    upcomingAppointments,
    recentEncounters,
    recentLabResults,
    activePrescriptions,
    invoices,
    availableHospitals,
    counts,
  } = data;

  const selectedHospital = availableHospitals.find((h) => h.id === bookHospitalId);
  const selectedHospitalDepts = selectedHospital?.departments || [];
  const selectedHospitalDoctors = selectedHospital?.doctors || [];

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/40 pb-16">
      {/* Top Banner with Patient Demographics summary */}
      <div className="border-b border-border bg-card px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md font-display text-xl font-bold">
              {patient.firstName.charAt(0)}
              {patient.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {patient.fullName}
                </h1>
                <Badge variant="outline" className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 font-mono text-xs">
                  NIN: {patient.nin.slice(0, 3)}••••{patient.nin.slice(-3)}
                </Badge>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Verified Identity
                </Badge>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>DOB: {formatDate(patient.dateOfBirth)}</span>
                <span>•</span>
                <span>Gender: {patient.gender || "Not specified"}</span>
                {patient.bloodGroup && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      Blood: {patient.bloodGroup}
                    </span>
                  </>
                )}
                {patient.genotype && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      Genotype: {patient.genotype}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-xs"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEditProfile}
              className="text-xs"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit Contact Info
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (availableHospitals.length > 0 && !bookHospitalId) {
                  setBookHospitalId(availableHospitals[0]!.id);
                }
                setBookingOpen(true);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm text-xs font-semibold"
            >
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              Book Appointment
            </Button>
          </div>
        </div>

        {/* Clinical alerts ribbon if allergies or chronic conditions exist */}
        {(patient.allergies.length > 0 || patient.chronicConditions.length > 0) && (
          <div className="mx-auto max-w-7xl mt-4 pt-4 border-t border-border flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-2">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              Medical Alerts:
            </span>
            {patient.allergies.map((allergy, i) => (
              <Badge key={i} variant="destructive" className="text-[11px] font-medium">
                Allergy: {allergy}
              </Badge>
            ))}
            {patient.chronicConditions.map((cond, i) => (
              <Badge
                key={i}
                variant="outline"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-medium"
              >
                Condition: {cond}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Main Portal Body */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6">
          <Card className="shadow-xs border-border/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Bookings</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">{counts.appointments}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Closed Visits</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">{counts.visits}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Stethoscope className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Lab Results</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">{counts.labs}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <FlaskConical className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Prescriptions</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">{counts.prescriptions}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Pill className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className={`shadow-xs col-span-2 sm:col-span-1 border-border/80 ${counts.totalUnpaidAmount > 0 ? "bg-amber-500/5 border-amber-500/30" : ""}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Balance Due</p>
                <p className={`font-display text-xl font-bold mt-0.5 ${counts.totalUnpaidAmount > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-600"}`}>
                  {formatCurrency(counts.totalUnpaidAmount)}
                </p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Receipt className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portal Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="space-y-6"
        >
          <TabsList className="bg-muted/80 p-1 rounded-2xl flex flex-wrap h-auto gap-1">
            <TabsTrigger
              value="overview"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <HeartPulse className="h-4 w-4 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="visits"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <Stethoscope className="h-4 w-4 mr-1.5" />
              Visits & History ({counts.visits})
            </TabsTrigger>
            <TabsTrigger
              value="labs"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <FlaskConical className="h-4 w-4 mr-1.5" />
              Lab Reports ({counts.labs})
            </TabsTrigger>
            <TabsTrigger
              value="prescriptions"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <Pill className="h-4 w-4 mr-1.5" />
              Medications ({counts.prescriptions})
            </TabsTrigger>
            <TabsTrigger
              value="invoices"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <Receipt className="h-4 w-4 mr-1.5" />
              Billing & Receipts ({invoices.length})
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <User className="h-4 w-4 mr-1.5" />
              My Profile
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5 text-teal-600" />
              Privacy & Sharing
            </TabsTrigger>
            <TabsTrigger
              value="voicecare"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4 text-emerald-700 dark:text-emerald-300 font-bold"
            >
              <Mic className="h-4 w-4 mr-1.5 text-emerald-600 animate-pulse" />
              VoiceCare AI
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            {/* VoiceCare Entry Banner */}
            <Card className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-card p-6 shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>HospNest VoiceCare • African Code-Switching AI</span>
                  </div>
                  <h2 className="text-2xl font-bold font-display text-foreground">
                    Speak Naturally to Book or Ask
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    No need to navigate complex forms. Speak in Hausa, Nigerian Pidgin, Yoruba, Igbo, or English. HospNest understands your dates, times, and medical complaints to book real appointments.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="outline" className="text-[10px] bg-background/80">Hausa + English</Badge>
                    <Badge variant="outline" className="text-[10px] bg-background/80">Pidgin + English</Badge>
                    <Badge variant="outline" className="text-[10px] bg-background/80">Yoruba + English</Badge>
                    <Badge variant="outline" className="text-[10px] bg-background/80">Igbo + English</Badge>
                  </div>
                </div>

                <div className="flex flex-col items-center sm:items-end gap-2.5 shrink-0">
                  <Button
                    type="button"
                    onClick={() => setIsVoiceRecorderOpen(true)}
                    className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 gap-3 group"
                  >
                    <Mic className="h-5 w-5 transition-transform group-hover:scale-125 animate-pulse" />
                    <span>Speak Naturally</span>
                  </Button>
                  <span className="text-[11px] text-muted-foreground">Tap mic to speak your booking or symptoms</span>
                </div>
              </div>
            </Card>

            {/* Extracted Voice Booking Review Card if active */}
            {voiceExtractedBooking && (
              <VoiceBookingCard
                intent={voiceExtractedBooking.appointmentIntent}
                transcript={voiceExtractedBooking.transcript}
                detectedLanguageLabel={voiceExtractedBooking.detectedLanguageLabel}
                auditId={voiceExtractedBooking.auditId}
                hospitalId={bookHospitalId || availableHospitals[0]?.id || ""}
                hospitalName={availableHospitals.find((h) => h.id === bookHospitalId)?.name || availableHospitals[0]?.name}
                onConfirmed={() => {
                  setVoiceExtractedBooking(null);
                  refetch();
                }}
                onSpeakAgain={() => setIsVoiceRecorderOpen(true)}
                onCancel={() => setVoiceExtractedBooking(null)}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Upcoming visits & active prescriptions */}
              <div className="lg:col-span-2 space-y-6">
                {/* Upcoming / Booked Appointments */}
                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Upcoming & Scheduled Visits
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Booked clinic consultations and queue status
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBookingOpen(true)}
                      className="text-xs"
                    >
                      <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Book New
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcomingAppointments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                        <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm font-medium text-foreground">No upcoming visits booked</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Need to consult a doctor? Book a hospital visit online.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setBookingOpen(true)}
                          className="mt-3 bg-teal-600 hover:bg-teal-700 text-white text-xs"
                        >
                          Book Appointment
                        </Button>
                      </div>
                    ) : (
                      upcomingAppointments.map((appt) => (
                        <div
                          key={appt.id}
                          className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {appt.hospitalName}
                              </span>
                              {appt.departmentName && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {appt.departmentName}
                                </Badge>
                              )}
                              <Badge
                                className={
                                  appt.status === "checked_in"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                    : appt.status === "booked"
                                    ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20"
                                    : "bg-muted text-muted-foreground"
                                }
                              >
                                {appt.status.replace("_", " ").toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Date: <strong className="text-foreground">{formatDateTime(appt.appointmentDate)}</strong>
                              {appt.doctorName && <span> • Doctor: {appt.doctorName}</span>}
                            </p>
                            {appt.symptomsSummary && (
                              <p className="text-xs text-muted-foreground italic">
                                Note: {appt.symptomsSummary}
                              </p>
                            )}
                          </div>

                          {appt.queueNumber && (
                            <div className="rounded-xl bg-teal-500/10 px-3 py-2 text-center shrink-0 border border-teal-500/20">
                              <span className="block text-[10px] uppercase font-bold text-teal-700 dark:text-teal-300">
                                Queue #
                              </span>
                              <span className="font-display text-lg font-black text-teal-800 dark:text-teal-200">
                                {appt.queueNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Recent Completed Lab Results Preview */}
                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Recent Lab Results
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Diagnostic investigations completed for you
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveTab("labs")}
                      className="text-xs text-teal-600 hover:text-teal-700"
                    >
                      View All ({counts.labs})
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {recentLabResults.slice(0, 3).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">
                        No completed laboratory investigations on file.
                      </p>
                    ) : (
                      recentLabResults.slice(0, 3).map((lab) => (
                        <div
                          key={lab.id}
                          className="rounded-xl border border-border p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-foreground">{lab.testName}</p>
                            <p className="text-muted-foreground text-[11px]">
                              {lab.hospitalName} • {formatDate(lab.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-foreground text-xs">
                              {lab.resultValue || "Completed"}
                            </span>
                            {lab.isCritical && (
                              <Badge variant="destructive" className="ml-2 text-[10px]">
                                Critical
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Col: Insurance Info & Unpaid Invoices */}
              <div className="space-y-6">
                {/* Insurance / HMO Card */}
                <Card className="border-border bg-gradient-to-br from-card to-secondary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-teal-600" />
                        Insurance & HMO Cover
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-700 border-teal-500/20">
                        {patient.insuranceProvider ? "Active" : "Self-Pay"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {patient.insuranceProvider ? (
                      <>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">HMO Provider:</span>
                          <span className="font-semibold text-foreground">{patient.insuranceProvider}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Policy Number:</span>
                          <span className="font-mono font-semibold text-foreground">{patient.insurancePolicyNumber || "N/A"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Plan Type:</span>
                          <span className="font-medium text-foreground">{patient.insurancePlanType || "Standard"}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Expiry:</span>
                          <span className="text-foreground">{formatDate(patient.insuranceExpiryDate)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic py-2">
                        No HMO policy linked. You are currently billed as Self-Pay. You can present your HMO card at the hospital front desk to update.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Open Bills Card */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-amber-500" />
                      Hospital Billing Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-xl bg-secondary/50 p-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Open Invoices:</span>
                        <span className="font-bold text-foreground">{counts.unpaidBills}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Outstanding Balance:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(counts.totalUnpaidAmount)}
                        </span>
                      </div>
                    </div>

                    {counts.totalUnpaidAmount > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-800 dark:text-amber-200">
                        <p className="font-semibold flex items-center gap-1">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          Pay-at-Desk Info
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                          Present your Invoice Number at the hospital cashier to pay via Cash, POS/Card, or Bank Transfer.
                        </p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("invoices")}
                      className="w-full text-xs"
                    >
                      View Billing Breakdown & Receipts
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: VISITS HISTORY (Prompt 17: Closed Encounters with Diagnoses) */}
          <TabsContent value="visits" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">
                  Clinical Visit History
                </CardTitle>
                <CardDescription className="text-xs">
                  Per privacy policy, consultation notes & diagnoses appear here once the encounter is closed by the hospital.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentEncounters.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                    <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="font-semibold text-foreground">No completed medical encounters yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Once a doctor closes a consultation, your verified visit summaries and diagnosis records will appear here.
                    </p>
                  </div>
                ) : (
                  recentEncounters.map((enc) => (
                    <div
                      key={enc.id}
                      className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs hover:border-teal-500/40 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2">
                          <Hospital className="h-4 w-4 text-teal-600" />
                          <span className="font-bold text-sm text-foreground">{enc.hospitalName}</span>
                          <Badge variant="outline" className="text-[10px] bg-muted capitalize">
                            {enc.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Visit Date: <strong className="text-foreground">{formatDate(enc.createdAt)}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground font-medium block mb-1">
                            Chief Complaint / Reason for Visit:
                          </span>
                          <p className="text-foreground bg-secondary/30 p-2.5 rounded-xl">
                            {enc.chiefComplaint || "Routine consultation"}
                          </p>
                        </div>

                        <div>
                          <span className="text-muted-foreground font-medium block mb-1">
                            Verified Diagnosis (ICD-10 / Clinical):
                          </span>
                          <p className="text-foreground font-semibold bg-teal-500/5 border border-teal-500/20 p-2.5 rounded-xl">
                            {enc.diagnosis || "No primary diagnosis recorded"}
                          </p>
                        </div>
                      </div>

                      {/* AI Consultation Summary & Home Care Guide */}
                      {(enc.aiPatientSummary || enc.aiSummary || enc.aiKeyFindings?.length || enc.aiNextSteps?.length) && (
                        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
                              <Sparkles className="h-4 w-4 text-purple-600" />
                              <span>AI Visit Summary & Home Care Instructions</span>
                            </div>
                            <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                              AI Gateway
                            </Badge>
                          </div>

                          {enc.aiPatientSummary ? (
                            <p className="rounded-lg bg-background/80 p-2.5 text-muted-foreground whitespace-pre-line border border-border/60 text-[11px]">
                              {enc.aiPatientSummary}
                            </p>
                          ) : enc.aiSummary ? (
                            <p className="rounded-lg bg-background/80 p-2.5 text-muted-foreground whitespace-pre-line border border-border/60 text-[11px]">
                              {enc.aiSummary}
                            </p>
                          ) : null}

                          {(enc.aiKeyFindings?.length || enc.aiNextSteps?.length) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-purple-500/20 text-[11px]">
                              {enc.aiKeyFindings && enc.aiKeyFindings.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Key Findings:
                                  </span>
                                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                                    {enc.aiKeyFindings.map((f, i) => (
                                      <li key={i}>{f}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {enc.aiNextSteps && enc.aiNextSteps.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                    <ArrowRight className="h-3 w-3" /> Suggested Next Steps:
                                  </span>
                                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                                    {enc.aiNextSteps.map((s, i) => (
                                      <li key={i}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}

                      {enc.doctorName && (
                        <div className="text-[11px] text-muted-foreground pt-1 flex items-center justify-between">
                          <span>Attending Practitioner: <strong>Dr. {enc.doctorName}</strong></span>
                          {enc.closedAt && <span>Closed: {formatDateTime(enc.closedAt)}</span>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: LAB REPORTS */}
          <TabsContent value="labs" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">
                  Diagnostic Laboratory Results
                </CardTitle>
                <CardDescription className="text-xs">
                  Verified pathology and diagnostic lab investigations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentLabResults.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                    <FlaskConical className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="font-semibold text-foreground">No laboratory records found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed blood tests, urinalysis, and specimen results will appear here automatically.
                    </p>
                  </div>
                ) : (
                  recentLabResults.map((lab) => (
                    <div
                      key={lab.id}
                      className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{lab.testName}</span>
                          {lab.testCode && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {lab.testCode}
                            </Badge>
                          )}
                          <Badge
                            className={
                              lab.isCritical
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            }
                          >
                            {lab.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {lab.hospitalName} • Sample: <strong>{lab.sampleType || "General"}</strong> • Date: {formatDate(lab.createdAt)}
                        </p>
                        {lab.orderedByName && (
                          <p className="text-[11px] text-muted-foreground">
                            Ordered by: Dr. {lab.orderedByName} {lab.technicianName && `• Verified by: ${lab.technicianName}`}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl bg-secondary/60 px-4 py-2.5 text-right shrink-0">
                        <span className="block text-[10px] font-medium text-muted-foreground uppercase">
                          Result Value
                        </span>
                        <span className="font-mono text-sm font-bold text-foreground">
                          {lab.resultValue || "Verified Normal"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: PRESCRIPTIONS & MEDICATIONS */}
          <TabsContent value="prescriptions" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">
                  Prescription History & Pharmacy Dispensing
                </CardTitle>
                <CardDescription className="text-xs">
                  Track prescribed drugs, dosage instructions, and dispensing status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activePrescriptions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                    <Pill className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="font-semibold text-foreground">No prescription records found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Prescriptions written by attending physicians will show dosage instructions and dispensing status here.
                    </p>
                  </div>
                ) : (
                  activePrescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4 text-rose-500" />
                          <span className="font-bold text-sm text-foreground">{rx.hospitalName}</span>
                          <Badge
                            className={
                              rx.status === "dispensed"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                : rx.status === "partially_dispensed"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                            }
                          >
                            {rx.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Prescribed: {formatDate(rx.createdAt)} {rx.doctorName && `by Dr. ${rx.doctorName}`}
                        </span>
                      </div>

                      {/* Prescribed Items Table */}
                      <div className="space-y-2">
                        {rx.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-border/60 bg-secondary/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <p className="font-bold text-foreground text-sm">{item.drugName}</p>
                              <p className="text-muted-foreground text-xs">
                                Dosage: <strong>{item.dosage || "As directed"}</strong> • Frequency: {item.frequency || "Daily"} • Duration: {item.duration || "7 days"}
                              </p>
                              {item.dispenseNotes && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 italic mt-0.5">
                                  Note: {item.dispenseNotes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="block text-[10px] text-muted-foreground">Dispensed / Prescribed</span>
                                <span className="font-semibold font-mono text-foreground">
                                  {item.quantityDispensed} / {item.quantityPrescribed} units
                                </span>
                              </div>
                              {item.quantityDispensed >= item.quantityPrescribed ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              ) : item.quantityDispensed > 0 ? (
                                <Clock className="h-5 w-5 text-amber-500" />
                              ) : (
                                <Badge variant="outline" className="text-[10px]">Pending</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: BILLING, INVOICES & RECEIPTS */}
          <TabsContent value="invoices" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">
                  Invoices, Billing & Payment Receipts
                </CardTitle>
                <CardDescription className="text-xs">
                  Review itemized hospital service charges, insurance coverage, and view official printable receipts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                    <Receipt className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="font-semibold text-foreground">No invoices generated</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hospital billing summaries and payment receipts will appear here once generated by the cashier.
                    </p>
                  </div>
                ) : (
                  invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm font-mono text-foreground">
                              {inv.invoiceNumber}
                            </span>
                            <Badge
                              className={
                                inv.status === "paid"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                  : inv.status === "partially_paid"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                              }
                            >
                              {inv.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {inv.hospitalName} • Issued: {formatDate(inv.createdAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="block text-[10px] text-muted-foreground">Balance Due</span>
                            <span className={`font-display text-base font-bold ${inv.balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                              {formatCurrency(inv.balanceDue)}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingInvoice(inv)}
                            className="text-xs"
                          >
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            View Receipt
                          </Button>
                        </div>
                      </div>

                      {/* Line items brief */}
                      <div className="rounded-xl bg-secondary/30 p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between font-semibold text-muted-foreground pb-1 border-b border-border/40 text-[11px]">
                          <span>Service / Item</span>
                          <span>Amount</span>
                        </div>
                        {inv.lineItems.map((line) => (
                          <div key={line.id} className="flex justify-between text-muted-foreground">
                            <span>
                              {line.description || line.serviceType} {line.quantity > 1 ? `(x${line.quantity})` : ""}
                            </span>
                            <span className="font-mono text-foreground">{formatCurrency(line.totalPrice)}</span>
                          </div>
                        ))}

                        <div className="pt-2 border-t border-border/50 flex flex-col gap-1 text-[11px]">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Gross Total:</span>
                            <span className="font-mono">{formatCurrency(inv.totalAmount)}</span>
                          </div>
                          {inv.insuranceCoverageAmount > 0 && (
                            <div className="flex justify-between text-emerald-600 font-medium">
                              <span>HMO / Insurance Cover:</span>
                              <span className="font-mono">- {formatCurrency(inv.insuranceCoverageAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/40">
                            <span>Patient Payable:</span>
                            <span className="font-mono">{formatCurrency(inv.patientPayableAmount)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Amount Paid:</span>
                            <span className="font-mono">{formatCurrency(inv.amountPaid)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: PROFILE DEMOGRAPHICS */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Verified Identity (Read-only per prompt 17) */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-teal-600" />
                    Verified Medical Identity (Read-Only)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Legal national demographics registered via hospital intake
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Full Legal Name:</span>
                    <span className="font-semibold text-foreground">{patient.fullName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">National Identity Number (NIN):</span>
                    <span className="font-mono font-bold text-foreground">{patient.nin}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Date of Birth:</span>
                    <span className="font-medium text-foreground">{formatDate(patient.dateOfBirth)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="font-medium text-foreground capitalize">{patient.gender || "Not specified"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Blood Group:</span>
                    <span className="font-bold text-rose-600">{patient.bloodGroup || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Genotype:</span>
                    <span className="font-bold text-purple-600">{patient.genotype || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Editable Contact Info (Prompt 17) */}
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Contact & Emergency Details
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Editable phone, email, and next of kin contact
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={handleOpenEditProfile} className="text-xs">
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Phone Number:</span>
                    <span className="font-medium text-foreground">{patient.phone || "Not provided"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Email Address:</span>
                    <span className="font-medium text-foreground">{patient.email || "Not provided"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Emergency Contact Name:</span>
                    <span className="font-medium text-foreground">{patient.emergencyContact?.name || "None specified"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Relationship:</span>
                    <span className="font-medium text-foreground">{patient.emergencyContact?.relationship || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Emergency Phone:</span>
                    <span className="font-medium text-foreground">{patient.emergencyContact?.phone || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 7: PRIVACY & RECORD SHARING (Prompt 43) */}
          <TabsContent value="privacy" className="space-y-4 sm:space-y-6">
            {/* Global Master Consent Switch */}
            <Card className="border-border overflow-hidden shadow-soft">
              <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent p-4 sm:p-6 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 sm:p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                        <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                        Global Health Record Sharing
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground max-w-2xl">
                      Control whether verified healthcare providers across the HospNest network can access your longitudinal clinical records, allergies, and test history.
                    </CardDescription>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 bg-background/90 backdrop-blur-xs border border-border p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xs shrink-0 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold text-foreground">
                        {privacyData?.isGlobalShare ? "Sharing Enabled" : "Sharing Disabled"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {privacyData?.isGlobalShare ? "Interoperable network-wide" : "Siloed to issuing hospital"}
                      </p>
                    </div>
                    <Switch
                      checked={privacyData?.isGlobalShare ?? true}
                      disabled={updateGlobalMutation.isPending || isPrivacyLoading}
                      onCheckedChange={(val) => updateGlobalMutation.mutate(val)}
                    />
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Shield className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                    NDPR 2019 & Medical Confidentiality Compliant
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span>Cryptographically protected & never monetized</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Emergency trauma access governed by audited overrides</span>
                </div>
              </div>
            </Card>

            {/* Hospital-by-Hospital Granular Sharing Permissions */}
            <Card className="border-border shadow-soft">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                      Hospital-by-Hospital Sharing Permissions
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Customize exactly what clinical records each hospital facility and doctor can view
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchPrivacy()}
                    disabled={isPrivacyLoading}
                    className="text-xs h-8 w-fit"
                  >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isPrivacyLoading ? "animate-spin" : ""}`} />
                    Refresh Permissions
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                {(!privacyData?.hospitals || privacyData.hospitals.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 sm:p-8 text-center">
                    <Hospital className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium text-foreground">No hospitals connected yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Once you visit or book with a verified hospital, its privacy controls will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {privacyData.hospitals.map((h) => {
                      const localState = hospitalConsentState[h.hospitalId] ?? {
                        isSharingActive: h.isSharingActive,
                        allowLabs: h.allowLabs,
                        allowPrescriptions: h.allowPrescriptions,
                        allowImaging: h.allowImaging,
                        allowClinicalNotes: h.allowClinicalNotes,
                        allowMaternity: h.allowMaternity,
                        allowSurgeries: h.allowSurgeries,
                        allowPsychiatricNotes: h.allowPsychiatricNotes,
                        allowSexualHealthNotes: h.allowSexualHealthNotes,
                      };

                      const updateLocalState = (field: string, val: boolean) => {
                        setHospitalConsentState((prev) => ({
                          ...prev,
                          [h.hospitalId]: {
                            ...localState,
                            [field]: val,
                          },
                        }));
                      };

                      return (
                        <div
                          key={h.hospitalId}
                          className={`rounded-2xl border transition-all p-3.5 sm:p-5 ${
                            localState.isSharingActive
                              ? "border-border bg-card shadow-xs"
                              : "border-border/60 bg-muted/20 opacity-85"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-border/60">
                            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
                              <div className="size-9 sm:size-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                <Hospital className="size-4 sm:size-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  <h4 className="font-bold text-xs sm:text-sm text-foreground">{h.hospitalName}</h4>
                                  <Badge variant="outline" className="text-[9px] sm:text-[10px]">
                                    {h.state}
                                  </Badge>
                                </div>
                                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                                  {localState.isSharingActive
                                    ? "Access permitted according to selected categories below"
                                    : "Access revoked — records hidden from this hospital"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2.5 bg-muted/40 sm:bg-transparent p-2 sm:p-0 rounded-xl">
                              <span className="text-xs font-semibold text-muted-foreground">
                                {localState.isSharingActive ? "Sharing Active" : "Access Blocked"}
                              </span>
                              <Switch
                                checked={localState.isSharingActive}
                                onCheckedChange={(val) => updateLocalState("isSharingActive", val)}
                              />
                            </div>
                          </div>

                          {localState.isSharingActive && (
                            <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                              <div>
                                <p className="text-xs font-bold text-foreground mb-2">
                                  Allowed Record Categories:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  <label className="flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-2.5 rounded-xl border border-border/70 bg-background text-xs font-medium cursor-pointer hover:bg-muted/40 transition-colors">
                                    <span className="truncate">Consultations & Notes</span>
                                    <Switch
                                      className="scale-75 shrink-0"
                                      checked={localState.allowClinicalNotes}
                                      onCheckedChange={(val) => updateLocalState("allowClinicalNotes", val)}
                                    />
                                  </label>

                                  <label className="flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-2.5 rounded-xl border border-border/70 bg-background text-xs font-medium cursor-pointer hover:bg-muted/40 transition-colors">
                                    <span className="truncate">Lab Test Results</span>
                                    <Switch
                                      className="scale-75 shrink-0"
                                      checked={localState.allowLabs}
                                      onCheckedChange={(val) => updateLocalState("allowLabs", val)}
                                    />
                                  </label>

                                  <label className="flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-2.5 rounded-xl border border-border/70 bg-background text-xs font-medium cursor-pointer hover:bg-muted/40 transition-colors">
                                    <span className="truncate">Imaging & Radiology</span>
                                    <Switch
                                      className="scale-75 shrink-0"
                                      checked={localState.allowImaging}
                                      onCheckedChange={(val) => updateLocalState("allowImaging", val)}
                                    />
                                  </label>

                                  <label className="flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-2.5 rounded-xl border border-border/70 bg-background text-xs font-medium cursor-pointer hover:bg-muted/40 transition-colors">
                                    <span className="truncate">Medications & Prescriptions</span>
                                    <Switch
                                      className="scale-75 shrink-0"
                                      checked={localState.allowPrescriptions}
                                      onCheckedChange={(val) => updateLocalState("allowPrescriptions", val)}
                                    />
                                  </label>

                                  <label className="flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-2.5 rounded-xl border border-border/70 bg-background text-xs font-medium cursor-pointer hover:bg-muted/40 transition-colors">
                                    <span className="truncate">Maternity & Antenatal</span>
                                    <Switch
                                      className="scale-75 shrink-0"
                                      checked={localState.allowMaternity}
                                      onCheckedChange={(val) => updateLocalState("allowMaternity", val)}
                                    />
                                  </label>

                                  <label className="flex items-center justify-between sm:justify-start gap-2.5 p-2 sm:p-2.5 rounded-xl border border-border/70 bg-background text-xs font-medium cursor-pointer hover:bg-muted/40 transition-colors">
                                    <span className="truncate">Surgeries & Procedures</span>
                                    <Switch
                                      className="scale-75 shrink-0"
                                      checked={localState.allowSurgeries}
                                      onCheckedChange={(val) => updateLocalState("allowSurgeries", val)}
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Sensitive Categories Section */}
                              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-3.5 space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                                  <div>
                                    <p className="text-xs font-bold text-foreground">
                                      Sensitive Health Records (Explicit Opt-In Required)
                                    </p>
                                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                                      Psychiatric and sexual health records remain confidential unless unlocked.
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                  <label className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg border border-amber-500/20 bg-background text-xs font-medium cursor-pointer">
                                    <span className="text-foreground truncate">Psychiatric & Mental Health</span>
                                    <Switch
                                      className="scale-75 shrink-0"
                                      checked={localState.allowPsychiatricNotes}
                                      onCheckedChange={(val) => updateLocalState("allowPsychiatricNotes", val)}
                                    />
                                  </label>

                                  <label className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg border border-amber-500/20 bg-background text-xs font-medium cursor-pointer">
                                    <span className="text-foreground truncate">Sexual & Reproductive Health</span>
                                    <Switch
                                      className="scale-75 shrink-0"
                                      checked={localState.allowSexualHealthNotes}
                                      onCheckedChange={(val) => updateLocalState("allowSexualHealthNotes", val)}
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="flex justify-end pt-1">
                                <Button
                                  size="sm"
                                  disabled={saveHospitalConsentMutation.isPending}
                                  onClick={() => {
                                    saveHospitalConsentMutation.mutate({
                                      hospitalId: h.hospitalId,
                                      ...localState,
                                    });
                                  }}
                                  className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs h-8"
                                >
                                  {saveHospitalConsentMutation.isPending ? "Saving..." : "Save Hospital Permissions"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Access Transparency & Audit Trail */}
            <Card className="border-border shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-teal-600" />
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Access Transparency & Audit Trail
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Real-time audit log of all clinical staff accesses, record reviews, and emergency break-glass overrides
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(!privacyData?.accessLogs || privacyData.accessLogs.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <FileCheck2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium text-foreground">No access logs recorded yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Every time a practitioner views your records, an immutable log entry will be displayed here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {privacyData.accessLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className={`rounded-xl border p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          log.isBreakGlass
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-200"
                            : "border-border bg-card/60"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {log.isBreakGlass ? (
                              <Badge className="bg-rose-600 text-white font-bold flex items-center gap-1 text-[10px]">
                                <AlertTriangle className="h-3 w-3" />
                                EMERGENCY BREAK-GLASS OVERRIDE
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                                {log.action || "READ"}
                              </Badge>
                            )}

                            <span className="font-bold text-foreground">{log.hospitalName}</span>
                            <span className="text-muted-foreground">• Role: <span className="font-medium text-foreground uppercase">{log.role}</span></span>
                          </div>

                          <p className="text-xs text-muted-foreground mt-0.5">
                            Justification: <span className="italic text-foreground">{log.justification}</span>
                          </p>
                        </div>

                        <div className="shrink-0 text-[11px] font-mono text-muted-foreground sm:text-right">
                          {formatDateTime(log.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 8: VOICECARE AI & CLINICIAN VOICE MESSAGING */}
          <TabsContent value="voicecare" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="rounded-3xl border border-emerald-500/30 bg-card shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>Intron Sahara Voice Assistant</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground font-display">
                    Voice-First Medical Assistance
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Speak in your preferred Nigerian dialect (Hausa, Pidgin, Yoruba, Igbo) or English. You can book an appointment, describe symptoms, or ask health questions.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setIsVoiceRecorderOpen(true)}
                    className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2"
                  >
                    <Mic className="h-4 w-4" />
                    Speak Naturally to VoiceCare
                  </Button>
                </Card>

                {/* Patient ↔ Clinician Voice Messaging */}
                <VoiceCommunicationWidget
                  patientId={patient.id}
                  patientName={patient.fullName}
                  currentUserRole="patient"
                  currentUserName={patient.fullName}
                  hospitalId={bookHospitalId || availableHospitals[0]?.id}
                />
              </div>

              <div className="space-y-6">
                <Card className="rounded-3xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                    <Globe2 className="h-4 w-4 text-emerald-600" />
                    Supported Dialects
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Hausa + English</Badge>
                      <span>Ina son ganin likita...</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Pidgin + English</Badge>
                      <span>Abeg I want see doctor...</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Yoruba + English</Badge>
                      <span>Mo fe ri dokita...</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Igbo + English</Badge>
                      <span>Achoro m ihu dokinta...</span>
                    </li>
                  </ul>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL: Book Online Appointment (Prompt 18 & Prompt 39 & VoiceCare) */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-teal-600" />
              Book Hospital Appointment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose standard booking form or speak naturally with VoiceCare.
            </DialogDescription>
          </DialogHeader>

          {/* Dual Choice: Standard vs Voice Booking */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-2xl">
            <button
              type="button"
              onClick={() => setBookingMode("standard")}
              className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                bookingMode === "standard"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Standard Booking
            </button>
            <button
              type="button"
              onClick={() => {
                setBookingOpen(false);
                setIsVoiceRecorderOpen(true);
              }}
              className="py-2 text-xs font-semibold rounded-xl text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 flex items-center justify-center gap-1"
            >
              <Mic className="h-3.5 w-3.5 text-emerald-600" />
              Voice Booking
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              bookMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="book-hospital">Select Hospital</Label>
              <Select value={bookHospitalId} onValueChange={setBookHospitalId} required>
                <SelectTrigger id="book-hospital">
                  <SelectValue placeholder="Choose a hospital" />
                </SelectTrigger>
                <SelectContent>
                  {availableHospitals.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedHospitalDepts.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="book-dept">Department / Clinic (Optional)</Label>
                <Select value={bookDeptId} onValueChange={setBookDeptId}>
                  <SelectTrigger id="book-dept">
                    <SelectValue placeholder="General Outpatient (Default)" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedHospitalDepts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedHospitalDoctors.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="book-doc">Preferred Doctor (Optional)</Label>
                <Select value={bookDoctorId} onValueChange={setBookDoctorId}>
                  <SelectTrigger id="book-doc">
                    <SelectValue placeholder="Any Available Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedHospitalDoctors.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        Dr. {doc.fullName} {doc.specialization ? `(${doc.specialization})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="book-date">Preferred Date</Label>
                <Input
                  id="book-date"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={bookDate}
                  onChange={(e) => setBookDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-time">Preferred Time Slot</Label>
                <Select value={bookTime} onValueChange={setBookTime}>
                  <SelectTrigger id="book-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="08:30">08:30 AM (Morning)</SelectItem>
                    <SelectItem value="09:30">09:30 AM (Morning)</SelectItem>
                    <SelectItem value="11:00">11:00 AM (Late Morning)</SelectItem>
                    <SelectItem value="14:00">02:00 PM (Afternoon)</SelectItem>
                    <SelectItem value="16:00">04:00 PM (Evening)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="book-symptoms">Reason for Visit / Symptoms</Label>
              <Textarea
                id="book-symptoms"
                placeholder="Briefly describe what you would like to consult the doctor for..."
                rows={3}
                required
                value={bookSymptoms}
                onChange={(e) => setBookSymptoms(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBookingOpen(false)}
                disabled={bookMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={bookMutation.isPending || !bookHospitalId || !bookDate || !bookSymptoms}
              >
                {bookMutation.isPending ? "Booking..." : "Confirm Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Edit Profile Info */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-teal-600" />
              Update Contact Information
            </DialogTitle>
            <DialogDescription className="text-xs">
              Keep your contact details up-to-date for appointment SMS and notifications.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              profileMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="e.g. 08012345678"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="name@example.com"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
              />
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">Emergency Contact (Next of Kin)</p>

              <div className="space-y-1.5">
                <Label htmlFor="emerg-name">Full Name</Label>
                <Input
                  id="emerg-name"
                  placeholder="e.g. Jane Doe"
                  value={profileEmergName}
                  onChange={(e) => setProfileEmergName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emerg-rel">Relationship</Label>
                  <Input
                    id="emerg-rel"
                    placeholder="e.g. Spouse / Sibling"
                    value={profileEmergRel}
                    onChange={(e) => setProfileEmergRel(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emerg-phone">Emergency Phone</Label>
                  <Input
                    id="emerg-phone"
                    type="tel"
                    placeholder="e.g. 08087654321"
                    value={profileEmergPhone}
                    onChange={(e) => setProfileEmergPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditProfileOpen(false)}
                disabled={profileMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Printable Receipt View */}
      <Dialog open={Boolean(viewingInvoice)} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="sm:max-w-lg">
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="border-b border-border pb-4 text-center">
                <span className="font-display text-lg font-bold text-foreground">
                  {viewingInvoice.hospitalName}
                </span>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Official Patient Receipt & Invoice
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {viewingInvoice.invoiceNumber}
                  </Badge>
                  <Badge
                    className={
                      viewingInvoice.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                    }
                  >
                    {viewingInvoice.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="text-xs space-y-1 text-muted-foreground">
                <p>Patient: <strong className="text-foreground">{patient.fullName}</strong></p>
                <p>NIN: <span className="font-mono">{patient.nin}</span></p>
                <p>Date: {formatDateTime(viewingInvoice.createdAt)}</p>
              </div>

              {/* Line Items */}
              <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-foreground pb-1 border-b border-border/50">
                  <span>Item / Description</span>
                  <span>Total</span>
                </div>
                {viewingInvoice.lineItems.map((line) => (
                  <div key={line.id} className="flex justify-between text-muted-foreground">
                    <span>
                      {line.description || line.serviceType} (x{line.quantity})
                    </span>
                    <span className="font-mono text-foreground">{formatCurrency(line.totalPrice)}</span>
                  </div>
                ))}

                <div className="pt-2 border-t border-border/60 space-y-1 text-[11px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gross Total:</span>
                    <span className="font-mono">{formatCurrency(viewingInvoice.totalAmount)}</span>
                  </div>
                  {viewingInvoice.insuranceCoverageAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>HMO Coverage:</span>
                      <span className="font-mono">- {formatCurrency(viewingInvoice.insuranceCoverageAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/40">
                    <span>Patient Payable:</span>
                    <span className="font-mono">{formatCurrency(viewingInvoice.patientPayableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-semibold">
                    <span>Total Paid:</span>
                    <span className="font-mono">{formatCurrency(viewingInvoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-600">
                    <span>Balance Due:</span>
                    <span className="font-mono">{formatCurrency(viewingInvoice.balanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Payments History */}
              {viewingInvoice.payments.length > 0 && (
                <div className="rounded-xl border border-border p-3 text-xs space-y-1.5">
                  <p className="font-bold text-foreground text-[11px] uppercase tracking-wide">
                    Recorded Payment Transactions
                  </p>
                  {viewingInvoice.payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-muted-foreground text-[11px]">
                      <span>
                        {p.paymentMethod.toUpperCase()} {p.transactionReference ? `(${p.transactionReference})` : ""} - {formatDate(p.paidAt)}
                      </span>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatCurrency(p.amountPaid)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter className="pt-2 flex sm:justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Receipt
                </Button>
                <Button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* VoiceCare Interactive Audio Recorder Modal */}
      <AudioRecorderModal
        isOpen={isVoiceRecorderOpen}
        onClose={() => setIsVoiceRecorderOpen(false)}
        context="appointment_booking"
        title="VoiceCare Appointment Booking"
        description="Speak your preferred appointment date, time, hospital, or symptoms naturally in your local dialect."
        patientId={patient.id}
        hospitalId={bookHospitalId || availableHospitals[0]?.id}
        onProcessed={(res) => {
          setVoiceExtractedBooking(res);
          setActiveTab("overview");
          toast.success("Speech processed! Review your booking details below.");
        }}
      />
    </div>
  );
}
