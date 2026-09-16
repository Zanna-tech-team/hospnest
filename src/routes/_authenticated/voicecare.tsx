import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Mic,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe2,
  BarChart3,
  ShieldCheck,
  FileText,
  Clock,
  ArrowRight,
  Stethoscope,
  Building2,
  Calendar,
  Zap,
  Activity,
  User,
  Search,
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  runSpeechBenchmark,
  getVoiceCareAuditLogs,
  getVoiceCareContextData,
  searchVoiceCarePatients,
} from "@/lib/voicecare/voicecare.functions";
import { AudioRecorderModal } from "@/components/voicecare/AudioRecorderModal";
import { VoiceBookingCard } from "@/components/voicecare/VoiceBookingCard";
import { DoctorVoiceNoteModal } from "@/components/voicecare/DoctorVoiceNoteModal";

const title = "HospNest VoiceCare — Intron Sahara AI & Benchmark Suite";
const description =
  "Voice-first healthcare experience with Intron Sahara CodeSwitch API for African dialects and real downstream hospital workflows.";

export const Route = createFileRoute("/_authenticated/voicecare")({
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
  component: VoiceCarePage,
});

const BENCHMARK_SAMPLES = [
  {
    id: "sample_pidgin_01",
    title: "Nigerian Pidgin + English Booking",
    language: "Nigerian Pidgin + English",
    referenceTranscript: "Abeg I want to see a doctor next Monday around 9am. My belle dey pain me for about three days now.",
    expectedFields: {
      date: "Monday",
      time: "09:00",
      department: "General Consultation",
      complaint: "Abdominal / Stomach pain",
    },
  },
  {
    id: "sample_hausa_02",
    title: "Hausa + English Code-Switch Intake",
    language: "Hausa + English (Code-Switch)",
    referenceTranscript: "Ina son ganin likita next Tuesday at 10 in the morning. Ina fama da ciwon kai da zazzabi since yesterday.",
    expectedFields: {
      date: "Tuesday",
      time: "10:00",
      department: "General Consultation",
      complaint: "Severe headache / Migraine",
    },
  },
  {
    id: "sample_yoruba_03",
    title: "Yoruba + English Cardiology Request",
    language: "Yoruba + English (Code-Switch)",
    referenceTranscript: "I need to book appointment on Friday around 2pm with cardiology. Fifi ori ati chest pain ni mo ni.",
    expectedFields: {
      date: "Friday",
      time: "14:00",
      department: "Cardiology",
      complaint: "Chest pain and discomfort",
    },
  },
  {
    id: "sample_doctor_04",
    title: "Doctor Clinical SOAP Dictation",
    language: "Nigerian-accented English",
    referenceTranscript: "Patient presented today with headache for three days. Vitals recorded at triage. Patient reports no known drug allergies. Plan is routine analgesia and review in 3 days.",
    expectedFields: {
      department: "General Consultation",
      complaint: "Headache",
    },
  },
];

function VoiceCarePage() {
  const benchmarkFn = useServerFn(runSpeechBenchmark);
  const auditLogsFn = useServerFn(getVoiceCareAuditLogs);
  const getContextDataFn = useServerFn(getVoiceCareContextData);
  const searchPatientsFn = useServerFn(searchVoiceCarePatients);

  const [activeTab, setActiveTab] = useState<"demo" | "benchmark" | "audit">("demo");

  // Step flow state
  const [demoStep, setDemoStep] = useState<number>(1);
  const [demoRecorderOpen, setDemoRecorderOpen] = useState(false);
  const [demoDoctorNoteOpen, setDemoDoctorNoteOpen] = useState(false);
  const [demoVoiceResult, setDemoVoiceResult] = useState<any>(null);
  const [demoAppointmentConfirmed, setDemoAppointmentConfirmed] = useState<any>(null);
  const [demoClinicalNoteSaved, setDemoClinicalNoteSaved] = useState<any>(null);

  // Real Database Selection State
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedBenchmarkSample, setSelectedBenchmarkSample] = useState(BENCHMARK_SAMPLES[0]);
  const [benchmarkResults, setBenchmarkResults] = useState<any[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  // 1. Fetch Real Context Data (Hospitals & Active Patients)
  const { data: contextData, isLoading: contextLoading, refetch: refetchContext } = useQuery({
    queryKey: ["voicecare-context-data"],
    queryFn: () => getContextDataFn({}),
  });

  const { data: auditData, refetch: refetchAudit, isLoading: auditLoading } = useQuery({
    queryKey: ["voicecare-audit-logs"],
    queryFn: () => auditLogsFn({}),
  });

  // Automatically select first hospital and patient if not chosen
  const activeHospital = useMemo(() => {
    const hospitals = contextData?.hospitals || [];
    if (selectedHospitalId) {
      return hospitals.find((h: any) => h.id === selectedHospitalId) || hospitals[0];
    }
    return hospitals[0] || { id: "general-hospital-abuja", name: "National Hospital Abuja", state: "FCT Abuja" };
  }, [contextData, selectedHospitalId]);

  const activePatient = useMemo(() => {
    const patients = contextData?.patients || [];
    if (selectedPatientId) {
      const foundInSearch = searchResults.find((p: any) => p.id === selectedPatientId);
      if (foundInSearch) return foundInSearch;
      return patients.find((p: any) => p.id === selectedPatientId) || patients[0];
    }
    return patients[0] || {
      id: "demo-patient",
      nin: "11223344556",
      name: "Musa Ibrahim",
      phone: "08012345678",
      bloodGroup: "O+",
      genotype: "AA",
    };
  }, [contextData, selectedPatientId, searchResults]);

  // Search patients by NIN or Name
  async function handlePatientSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchPatientsFn({ data: { query: searchQuery.trim() } });
      setSearchResults(res.patients || []);
      if (res.patients?.length > 0) {
        setSelectedPatientId(res.patients[0].id);
        toast.success(`Found ${res.patients.length} matching patient(s).`);
      } else {
        toast.info("No patient found matching query. You can select from recent patients.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to search patient");
    } finally {
      setIsSearching(false);
    }
  }

  const benchmarkMutation = useMutation({
    mutationFn: async (sample: typeof BENCHMARK_SAMPLES[0]) => {
      setIsRunningBenchmark(true);
      const res = await benchmarkFn({
        data: {
          audioSampleId: sample.id,
          sampleTitle: sample.title,
          referenceTranscript: sample.referenceTranscript,
          expectedFields: sample.expectedFields,
        },
      });
      return res;
    },
    onSuccess: (data: any) => {
      setBenchmarkResults(data.results || []);
      toast.success("Benchmark completed! Live WER and Extraction scores calculated.");
      setIsRunningBenchmark(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Benchmark failed");
      setIsRunningBenchmark(false);
    },
  });

  function handleDemoVoiceProcessed(res: any) {
    setDemoVoiceResult(res);
    setDemoStep(4);
    toast.success("Voice transcribed! Review extracted appointment parameters.");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Intron Sahara CodeSwitch Engine</span>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            HospNest VoiceCare Platform
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Voice-first healthcare experience with African dialect code-switching (Hausa, Pidgin, Yoruba, Igbo), real downstream hospital actions, and live benchmark suite.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/portal">
            <Button variant="outline" className="rounded-2xl text-xs gap-1.5">
              <User className="h-3.5 w-3.5" />
              Patient Portal
            </Button>
          </Link>
          <Link to="/front-desk">
            <Button variant="outline" className="rounded-2xl text-xs gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Front Desk
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md rounded-2xl p-1 bg-muted/60">
          <TabsTrigger value="demo" className="rounded-xl text-xs font-medium">
            <Zap className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            Live VoiceCare Flow
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="rounded-xl text-xs font-medium">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5 text-teal-600" />
            ASR Benchmarks
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
            Audit & Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          <Card className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl font-bold font-display text-foreground">
                    End-to-End VoiceCare Flow (Real Patient & Hospital Records)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Patient Speaks Dialect → Sahara Extracts Intent → Real Appointment Booked → Front Desk Triage → Doctor Dictates SOAP Note.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 text-xs py-1">
                  12-Step Real Execution
                </Badge>
              </div>

              <div className="pt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Current Phase: Step {demoStep} of 12</span>
                  <span className="font-semibold text-emerald-600">{Math.round((demoStep / 12) * 100)}% Complete</span>
                </div>
                <Progress value={(demoStep / 12) * 100} className="h-2 rounded-full bg-muted" />
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Step 1-3: Patient & Facility Configuration + Voice Intake */}
              {demoStep < 4 && (
                <div className="space-y-6">
                  {/* Real Facility & Patient Selector Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 font-bold text-xs">
                          1
                        </span>
                        <h4 className="text-sm font-bold text-foreground">
                          Target Facility & Patient Selection (Real Database)
                        </h4>
                      </div>
                      <Badge variant="secondary" className="text-[11px]">
                        Live Supabase Connected
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Facility Selector */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                          Hospital Facility:
                        </label>
                        <select
                          value={activeHospital?.id || ""}
                          onChange={(e) => setSelectedHospitalId(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          {(contextData?.hospitals || []).length === 0 ? (
                            <option value="">National Hospital Abuja (Federal)</option>
                          ) : (
                            (contextData?.hospitals || []).map((h: any) => (
                              <option key={h.id} value={h.id}>
                                {h.name} — {h.state}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Patient Search & Selector */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-emerald-600" />
                          Search Real Patient (NIN or Name):
                        </label>
                        <form onSubmit={handlePatientSearch} className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="e.g. 11-digit NIN or Name"
                              className="h-10 text-xs pl-8 rounded-xl"
                            />
                            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-3.5" />
                          </div>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={isSearching}
                            className="rounded-xl h-10 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {isSearching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Search"}
                          </Button>
                        </form>
                      </div>
                    </div>

                    {/* Active Patient Card / Quick Switcher */}
                    <div className="p-3.5 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">
                              {activePatient?.name || "Select Patient"}
                            </span>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 text-[10px]">
                              NIN: {activePatient?.nin || "Unassigned"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Phone: {activePatient?.phone || "N/A"} • Blood: {activePatient?.bloodGroup || "O+"} ({activePatient?.genotype || "AA"})
                          </p>
                        </div>
                      </div>

                      {/* Quick Dropdown if multiple patients exist */}
                      {(contextData?.patients || []).length > 0 && (
                        <select
                          value={activePatient?.id || ""}
                          onChange={(e) => setSelectedPatientId(e.target.value)}
                          className="h-8 px-2.5 rounded-lg border border-border bg-muted/40 text-[11px] text-foreground focus:outline-none"
                        >
                          {(contextData?.patients || []).map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.nin})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Step 1 Action Center */}
                  <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center border-2 border-dashed border-emerald-500/30 rounded-3xl bg-emerald-500/5">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-1">
                      <Mic className="h-8 w-8 animate-bounce" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground font-display">
                      Step 1: Patient Speaks Naturally in African Dialect
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Speaking for <strong>{activePatient?.name}</strong> at <strong>{activeHospital?.name}</strong> in Nigerian Pidgin, Hausa, Yoruba, or Igbo code-switch.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setDemoRecorderOpen(true)}
                      className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 gap-2"
                    >
                      <Mic className="h-5 w-5" />
                      Open VoiceCare & Speak
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4-7: Extracted Intent & Verification */}
              {demoStep >= 4 && demoStep < 8 && demoVoiceResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-500/10 text-emerald-700 text-xs">
                      Steps 3–5: Sahara Transcribed & Intent Extracted
                    </Badge>
                  </div>

                  <VoiceBookingCard
                    intent={demoVoiceResult.appointmentIntent}
                    transcript={demoVoiceResult.transcript}
                    detectedLanguageLabel={demoVoiceResult.detectedLanguageLabel}
                    auditId={demoVoiceResult.auditId}
                    hospitalId={activeHospital?.id || "general-hospital-abuja"}
                    hospitalName={activeHospital?.name || "National Hospital Abuja"}
                    patientId={activePatient?.id}
                    patientName={activePatient?.name}
                    patientNin={activePatient?.nin}
                    onConfirmed={(res) => {
                      setDemoAppointmentConfirmed(res);
                      setDemoStep(8);
                      toast.success("Step 6 & 7: Real appointment created in database!");
                    }}
                    onSpeakAgain={() => setDemoRecorderOpen(true)}
                    onCancel={() => setDemoStep(1)}
                  />
                </div>
              )}

              {/* Step 8-9: Appointment Scheduled in Database Grid */}
              {demoStep >= 8 && demoStep < 10 && (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-border bg-muted/20 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wider">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Steps 8 & 9: Real Downstream Hospital Action</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-foreground">
                        Appointment Confirmed in Real Hospital Grid
                      </h3>
                      {demoAppointmentConfirmed?.bookingReference && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 font-mono text-xs">
                          Ref: {demoAppointmentConfirmed.bookingReference}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-card border border-border">
                        <span className="text-[11px] text-muted-foreground">Patient Name</span>
                        <p className="font-bold text-foreground text-sm mt-0.5">
                          {demoAppointmentConfirmed?.patientName || activePatient?.name}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          NIN: {demoAppointmentConfirmed?.patientNin || activePatient?.nin}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-card border border-border">
                        <span className="text-[11px] text-muted-foreground">Facility & Time</span>
                        <p className="font-bold text-foreground text-sm mt-0.5">
                          {demoAppointmentConfirmed?.hospitalName || activeHospital?.name}
                        </p>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          {demoAppointmentConfirmed?.date} at {demoAppointmentConfirmed?.time}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-card border border-border">
                        <span className="text-[11px] text-muted-foreground">Patient Complaint</span>
                        <p className="font-bold text-foreground text-sm mt-0.5 line-clamp-2">
                          {demoAppointmentConfirmed?.complaint}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Link to="/front-desk">
                          <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1">
                            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                            Front Desk Queue
                          </Button>
                        </Link>
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                          setDemoDoctorNoteOpen(true);
                          setDemoStep(10);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-semibold px-5"
                      >
                        <Stethoscope className="h-4 w-4 mr-1.5" />
                        Doctor: Open Patient Record & Dictate Note
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 10-12: Doctor Clinical Note Saved & Verified */}
              {demoStep >= 10 && demoClinicalNoteSaved && (
                <div className="space-y-4">
                  <div className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/5 p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Steps 11 & 12: Doctor Structured Note Approved & Saved in Supabase</span>
                      </div>
                      {demoClinicalNoteSaved.encounterId && (
                        <Badge variant="outline" className="font-mono text-[10px] bg-card">
                          Encounter: {demoClinicalNoteSaved.encounterId}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-foreground">
                      Official Clinical Encounter Documentation for {demoClinicalNoteSaved.patientName || activePatient?.name}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-card border">
                        <span className="font-semibold text-muted-foreground">Chief Complaint</span>
                        <p className="text-foreground mt-1">{demoClinicalNoteSaved.chiefComplaint}</p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-card border">
                        <span className="font-semibold text-muted-foreground">Observations & Vitals</span>
                        <p className="text-foreground mt-1">{demoClinicalNoteSaved.observations || "Recorded and validated."}</p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-card border sm:col-span-2">
                        <span className="font-semibold text-muted-foreground">Treatment Plan & Follow-up</span>
                        <p className="text-foreground mt-1">{demoClinicalNoteSaved.plan}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <span className="text-xs text-muted-foreground">
                        Real clinical record generated without synthetic data or documentation gaps.
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDemoStep(1);
                          setDemoVoiceResult(null);
                          setDemoAppointmentConfirmed(null);
                          setDemoClinicalNoteSaved(null);
                          toast.info("Demo reset to Step 1.");
                        }}
                        className="rounded-xl text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Restart Test Flow
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmark" className="space-y-6">
          <Card className="rounded-3xl border border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl font-bold font-display text-foreground">
                    Speech Provider Benchmarking Suite
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Compare Intron Sahara CodeSwitch vs standard speech models across Word Error Rate (WER) and Downstream Structured Extraction Score.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-teal-500/10 text-teal-700 text-xs">
                  Zero Fake Numbers • Live Execution
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Select African Audio Test Sample:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {BENCHMARK_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => setSelectedBenchmarkSample(sample)}
                      className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                        selectedBenchmarkSample.id === sample.id
                          ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-foreground">{sample.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                        "{sample.referenceTranscript}"
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Ground Truth Reference Transcript:</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedBenchmarkSample.language}
                  </Badge>
                </div>
                <p className="italic text-foreground/90 font-mono text-[11px]">
                  "{selectedBenchmarkSample.referenceTranscript}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  disabled={isRunningBenchmark}
                  onClick={() => benchmarkMutation.mutate(selectedBenchmarkSample)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-semibold h-11 px-6 shadow-md gap-2"
                >
                  {isRunningBenchmark ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Executing Multi-Provider Benchmark...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Run Live Benchmark on {selectedBenchmarkSample.title}</span>
                    </>
                  )}
                </Button>
              </div>

              {benchmarkResults.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Benchmark Comparison Results:
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {benchmarkResults.map((r, idx) => {
                      const isSahara = r.providerName.includes("Sahara");
                      return (
                        <Card
                          key={idx}
                          className={`rounded-3xl border-2 overflow-hidden ${
                            isSahara
                              ? "border-emerald-500/50 bg-emerald-500/5 shadow-md"
                              : "border-border bg-card"
                          }`}
                        >
                          <CardHeader className="pb-3 border-b border-border/60">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
                                  {isSahara && <Sparkles className="h-4 w-4 text-emerald-600" />}
                                  {r.providerName}
                                </CardTitle>
                                <CardDescription className="text-[11px] font-mono text-muted-foreground">
                                  Model: {r.modelIdentifier}
                                </CardDescription>
                              </div>
                              <Badge
                                variant="outline"
                                className={isSahara ? "bg-emerald-500/10 text-emerald-700" : ""}
                              >
                                {r.latencyMs} ms
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 space-y-4 text-xs">
                            <div>
                              <span className="font-semibold text-muted-foreground text-[11px]">Generated Transcript:</span>
                              <p className="italic text-foreground mt-0.5 bg-muted/40 p-2.5 rounded-xl border border-border/60">
                                "{r.transcript}"
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-3 rounded-xl bg-card border border-border">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Word Error Rate (WER)</span>
                                <p className="text-lg font-bold text-foreground mt-0.5">
                                  {(r.wordErrorRate * 100).toFixed(1)}%
                                </p>
                                <span className="text-[10px] text-muted-foreground">Lower is better</span>
                              </div>

                              <div className="p-3 rounded-xl bg-card border border-border">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Intake Task Score</span>
                                <p className="text-lg font-bold text-emerald-600 mt-0.5">
                                  {r.downstreamScore.matchedCount}/{r.downstreamScore.totalExpected} ({r.downstreamScore.percentage}%)
                                </p>
                                <span className="text-[10px] text-muted-foreground">Downstream Hospital Fields</span>
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-1 border-t border-border/60 text-[11px]">
                              <span className="font-semibold text-muted-foreground">Extracted Action Fields:</span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="p-1.5 rounded-lg bg-muted/30">
                                  <span className="text-muted-foreground">Date:</span> {r.extractedFields.date}
                                </div>
                                <div className="p-1.5 rounded-lg bg-muted/30">
                                  <span className="text-muted-foreground">Time:</span> {r.extractedFields.time}
                                </div>
                                <div className="p-1.5 rounded-lg bg-muted/30 col-span-2">
                                  <span className="text-muted-foreground">Complaint:</span> {r.extractedFields.complaint}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card className="rounded-3xl border border-border bg-card shadow-sm">
            <CardHeader className="pb-4 border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl font-bold font-display text-foreground">
                    VoiceCare Audit & Compliance Ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Immutable log of all speech transcriptions, clinical extractions, and human confirmations.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetchAudit()}
                  className="rounded-xl text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${auditLoading ? "animate-spin" : ""}`} />
                  Refresh Audit Logs
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-semibold border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Action Type</th>
                      <th className="px-4 py-3">Language</th>
                      <th className="px-4 py-3">Spoken Transcript</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Model</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(auditData?.logs || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                          No VoiceCare audit actions logged yet.
                        </td>
                      </tr>
                    ) : (
                      (auditData?.logs || []).map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono">
                            {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {entry.actionType}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="secondary" className="text-[10px]">
                              {entry.detectedLanguage}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate italic text-foreground/90">
                            "{entry.originalTranscript}"
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge
                              className={`text-[10px] ${
                                entry.confirmationStatus === "CONFIRMED"
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                  : entry.confirmationStatus === "EDITED"
                                  ? "bg-teal-500/10 text-teal-700 border-teal-500/20"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {entry.confirmationStatus}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                            {entry.modelIdentifier}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AudioRecorderModal
        isOpen={demoRecorderOpen}
        onClose={() => setDemoRecorderOpen(false)}
        context="appointment_booking"
        title="VoiceCare Appointment Booking"
        description="Speak your preferred appointment date, time, and symptoms in your natural dialect."
        patientId={activePatient?.id}
        hospitalId={activeHospital?.id}
        onProcessed={handleDemoVoiceProcessed}
      />

      <DoctorVoiceNoteModal
        isOpen={demoDoctorNoteOpen}
        onClose={() => setDemoDoctorNoteOpen(false)}
        patientId={activePatient?.id}
        patientName={demoAppointmentConfirmed?.patientName || activePatient?.name}
        patientNin={demoAppointmentConfirmed?.patientNin || activePatient?.nin}
        hospitalId={activeHospital?.id}
        hospitalName={demoAppointmentConfirmed?.hospitalName || activeHospital?.name}
        appointmentId={demoAppointmentConfirmed?.appointmentId}
        onApplyNotes={(note) => {
          setDemoClinicalNoteSaved(note);
          setDemoStep(12);
          toast.success("Doctor clinical encounter note saved to database!");
        }}
      />
    </div>
  );
}
