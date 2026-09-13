import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Heart,
  HeartPulse,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Thermometer,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  getTriageQueue,
  recordTriageVitals,
  VITAL_THRESHOLDS,
  type TriageQueueItem,
} from "@/lib/triage.functions";
import { News2ScoreBadge } from "@/components/clinical-safety/News2ScoreBadge";
import { calculateNews2Score } from "@/lib/clinical-safety";
import { useOfflineVitalsSync } from "@/hooks/useOfflineVitalsSync";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/triage")({
  head: () => ({
    meta: [
      { title: "Triage & Vitals Queue — HospNest" },
      { name: "description", content: "Live clinical triage queue and vital sign capture for nurses and clinicians." },
    ],
  }),
  component: TriageQueuePage,
});

function TriageQueuePage() {
  const { activeHospitalId } = useAppShell();
  const getQueueFn = useServerFn(getTriageQueue);
  const recordVitalsFn = useServerFn(recordTriageVitals);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<TriageQueueItem | null>(null);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form states for recording vitals
  const [temp, setTemp] = useState<string>("");
  const [systolic, setSystolic] = useState<string>("");
  const [diastolic, setDiastolic] = useState<string>("");
  const [pulse, setPulse] = useState<string>("");
  const [respRate, setRespRate] = useState<string>("");
  const [spo2, setSpo2] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [painScore, setPainScore] = useState<string>("0");
  const [priority, setPriority] = useState<"emergency" | "urgent" | "normal">("normal");
  const [triageNotes, setTriageNotes] = useState<string>("");

  const {
    data: triageData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["triage-queue", activeHospitalId],
    queryFn: () => getQueueFn({ data: { hospitalId: activeHospitalId || undefined } }),
    refetchInterval: 10000, // Poll live queue every 10 seconds
  });

  // Offline Vitals Sync Hook
  const { isOnline, queueCount, enqueueVital, syncQueue, isSyncing } = useOfflineVitalsSync(
    async (item) => {
      const res = await recordVitalsFn({
        data: {
          encounterId: item.id,
          patientId: item.patientId,
          hospitalId: item.hospitalId,
          bodyTemperature: item.temp ? parseFloat(item.temp) : undefined,
          systolicBp: item.systolic ? parseInt(item.systolic, 10) : undefined,
          diastolicBp: item.diastolic ? parseInt(item.diastolic, 10) : undefined,
          pulseRate: item.pulse ? parseInt(item.pulse, 10) : undefined,
          respiratoryRate: item.respRate ? parseInt(item.respRate, 10) : undefined,
          spo2: item.spo2 ? parseInt(item.spo2, 10) : undefined,
          weightKg: item.weight ? parseFloat(item.weight) : undefined,
          heightCm: item.height ? parseFloat(item.height) : undefined,
          painScore: item.painScore ? parseInt(item.painScore, 10) : undefined,
          priority: item.priority || "normal",
          notes: item.triageNotes,
        },
      });
      return res.success;
    }
  );

  // Calculate BMI in real-time
  const computedBmi = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || h <= 0) return null;
    const heightInMeters = h / 100;
    const bmiVal = w / (heightInMeters * heightInMeters);
    return isNaN(bmiVal) ? null : bmiVal.toFixed(1);
  }, [weight, height]);

  // Open modal and pre-fill if any vitals existed
  const handleOpenVitalsModal = (item: TriageQueueItem) => {
    setSelectedItem(item);
    if (item.existingVitals) {
      setTemp(item.existingVitals.bodyTemperature?.toString() || "");
      setSystolic(item.existingVitals.systolicBp?.toString() || "");
      setDiastolic(item.existingVitals.diastolicBp?.toString() || "");
      setPulse(item.existingVitals.pulseRate?.toString() || "");
      setRespRate(item.existingVitals.respiratoryRate?.toString() || "");
      setSpo2(item.existingVitals.spo2?.toString() || "");
      setWeight(item.existingVitals.weightKg?.toString() || "");
      setHeight(item.existingVitals.heightCm?.toString() || "");
      setPainScore(item.existingVitals.painScore?.toString() || "0");
    } else {
      setTemp("");
      setSystolic("");
      setDiastolic("");
      setPulse("");
      setRespRate("");
      setSpo2("");
      setWeight("");
      setHeight("");
      setPainScore("0");
    }
    setPriority("normal");
    setTriageNotes("");
    setIsRecordOpen(true);
  };

  const handleSaveVitals = () => {
    if (!selectedItem) return;

    if (!isOnline) {
      enqueueVital({
        patientId: selectedItem.patientId,
        patientName: selectedItem.patient.fullName,
        hospitalId: activeHospitalId || "",
        temp,
        systolic,
        diastolic,
        pulse,
        respRate,
        spo2,
        weight,
        height,
        painScore,
        priority,
        triageNotes,
      });
      setIsRecordOpen(false);
      return;
    }

    startTransition(async () => {
      try {
        const res = await recordVitalsFn({
          data: {
            encounterId: selectedItem.encounterId,
            patientId: selectedItem.patientId,
            hospitalId: activeHospitalId || undefined,
            bodyTemperature: temp ? parseFloat(temp) : undefined,
            systolicBp: systolic ? parseInt(systolic, 10) : undefined,
            diastolicBp: diastolic ? parseInt(diastolic, 10) : undefined,
            pulseRate: pulse ? parseInt(pulse, 10) : undefined,
            respiratoryRate: respRate ? parseInt(respRate, 10) : undefined,
            spo2: spo2 ? parseInt(spo2, 10) : undefined,
            weightKg: weight ? parseFloat(weight) : undefined,
            heightCm: height ? parseFloat(height) : undefined,
            painScore: painScore ? parseInt(painScore, 10) : undefined,
            priority,
            notes: triageNotes || undefined,
          },
        });

        if (res.success) {
          toast.success(
            `Vitals saved for ${selectedItem.patient.fullName}. Encounter moved to Awaiting Doctor.`,
          );
          setIsRecordOpen(false);
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to record vitals; queued offline locally.");
        enqueueVital({
          patientId: selectedItem.patientId,
          patientName: selectedItem.patient.fullName,
          hospitalId: activeHospitalId || "",
          temp,
          systolic,
          diastolic,
          pulse,
          respRate,
          spo2,
          weight,
          height,
          painScore,
          priority,
          triageNotes,
        });
        setIsRecordOpen(false);
      }
    });
  };

  // Helper check for abnormal threshold
  const isTempAbnormal = temp && (parseFloat(temp) < VITAL_THRESHOLDS.temperature.low || parseFloat(temp) > VITAL_THRESHOLDS.temperature.high);
  const isBpAbnormal = (systolic && (parseInt(systolic, 10) < VITAL_THRESHOLDS.systolicBp.low || parseInt(systolic, 10) > VITAL_THRESHOLDS.systolicBp.high)) ||
    (diastolic && (parseInt(diastolic, 10) < VITAL_THRESHOLDS.diastolicBp.low || parseInt(diastolic, 10) > VITAL_THRESHOLDS.diastolicBp.high));
  const isPulseAbnormal = pulse && (parseInt(pulse, 10) < VITAL_THRESHOLDS.pulseRate.low || parseInt(pulse, 10) > VITAL_THRESHOLDS.pulseRate.high);
  const isSpo2Abnormal = spo2 && parseInt(spo2, 10) < VITAL_THRESHOLDS.spo2.low;
  const isRespAbnormal = respRate && (parseInt(respRate, 10) < VITAL_THRESHOLDS.respiratoryRate.low || parseInt(respRate, 10) > VITAL_THRESHOLDS.respiratoryRate.high);

  const filteredQueue = useMemo(() => {
    if (!triageData?.queue) return [];
    if (!searchQuery.trim()) return triageData.queue;
    const q = searchQuery.toLowerCase();
    return triageData.queue.filter(
      (item) =>
        item.patient.fullName.toLowerCase().includes(q) ||
        item.patient.nin.toLowerCase().includes(q) ||
        (item.queueNumber && item.queueNumber.toString().includes(q)) ||
        (item.chiefComplaint && item.chiefComplaint.toLowerCase().includes(q)),
    );
  }, [triageData?.queue, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HeartPulse className="size-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Triage & Vitals Capture
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Live queue of checked-in patients waiting for nurse vital signs recording and clinical prioritization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Offline Sync Status Badge */}
          {!isOnline ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
              <span>Offline Mode ({queueCount} queued)</span>
            </div>
          ) : queueCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={syncQueue}
              disabled={isSyncing}
              className="gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20 font-bold text-xs h-8"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              Sync Offline Queue ({queueCount})
            </Button>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Realtime Sync Online</span>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 border-border text-xs"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
          <Button asChild size="sm" className="gap-1.5 shadow-sm text-xs">
            <Link to="/front-desk">
              <User className="size-3.5" /> Front Desk Check-In
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Waiting in Triage
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
              {triageData?.totalWaitingCount ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">patients</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Triaged Today
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {triageData?.completedTodayCount ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">in consultations</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Hospital
          </span>
          <div className="mt-2 truncate font-display text-sm font-bold text-foreground">
            {triageData?.hospitalName || "Selected Hospital"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Your Clinical Role
          </span>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary capitalize">
              {triageData?.callerRole?.replace("_", " ") || "Staff"}
            </span>
          </div>
        </div>
      </div>

      {/* Queue Search & Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by queue #, name, NIN, or symptoms..."
              className="h-9 pl-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-refreshing live queue</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading live triage queue...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-destructive">
            <AlertTriangle className="mx-auto size-8" />
            <p className="mt-2 text-sm">{(error as any)?.message || "Failed to load triage queue"}</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500/80" />
            <h3 className="mt-3 font-display text-base font-bold text-foreground">
              Triage Queue is Clear
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              All checked-in patients have either been triaged or there are no new arrivals waiting right now.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredQueue.map((item) => (
              <div
                key={item.encounterId}
                className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3.5">
                  {/* Queue Number Badge */}
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20">
                    <span className="text-[10px] font-medium uppercase leading-none">Queue</span>
                    <span className="font-display text-base font-bold">
                      {item.queueNumber !== null ? `#${item.queueNumber}` : "—"}
                    </span>
                  </div>

                  {/* Patient Details */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/patients/$patientId"
                        params={{ patientId: item.patientId }}
                        className="font-display text-sm font-bold text-foreground hover:text-primary transition-colors"
                      >
                        {item.patient.fullName}
                      </Link>
                      <span className="rounded-full bg-secondary px-2 py-0.2 font-sans text-[11px] font-semibold text-secondary-foreground">
                        {item.patient.age} • {item.patient.gender}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        NIN: {item.patient.nin}
                      </span>
                    </div>

                    {/* Chief Complaint */}
                    <p className="mt-1 text-xs text-foreground/90 font-medium">
                      <span className="text-muted-foreground font-normal">Complaint: </span>
                      {item.chiefComplaint || "Routine consultation"}
                    </p>

                    {/* Alerts (Allergies & Chronic) */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {item.patient.bloodGroup && (
                        <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 font-bold text-red-700 dark:text-red-400">
                          <Heart className="size-2.5 fill-current" /> {item.patient.bloodGroup}
                        </span>
                      )}
                      {item.patient.allergies.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 font-bold text-rose-700 dark:text-rose-300">
                          <AlertTriangle className="size-2.5" /> Allergy: {item.patient.allergies.join(", ")}
                        </span>
                      )}
                      {item.patient.chronicConditions.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-800 dark:text-amber-300">
                          <Info className="size-2.5" /> {item.patient.chronicConditions.join(", ")}
                        </span>
                      )}
                      {item.departmentName && (
                        <span className="text-muted-foreground">Dept: {item.departmentName}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions & Timers */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span>{new Date(item.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleOpenVitalsModal(item)}
                    className="gap-1.5 shadow-sm font-semibold"
                  >
                    <Activity className="size-3.5" />
                    Record Vitals
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Vitals Dialog Modal */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HeartPulse className="size-4" />
              </div>
              <DialogTitle className="font-display text-lg font-bold">
                Capture Vitals & Triage Assessment
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Patient: <span className="font-bold text-foreground">{selectedItem?.patient.fullName}</span> (NIN: {selectedItem?.patient.nin}, Age: {selectedItem?.patient.age})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Priority Selector */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <Label className="text-xs font-bold text-foreground">Triage Priority Level</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority("normal")}
                  className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition-all ${
                    priority === "normal"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  🟢 Normal (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("urgent")}
                  className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition-all ${
                    priority === "urgent"
                      ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  🟡 Urgent (Priority)
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("emergency")}
                  className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition-all ${
                    priority === "emergency"
                      ? "border-red-500 bg-red-500/20 text-red-700 dark:text-red-300 shadow-sm animate-pulse"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  🔴 Emergency (Immediate)
                </button>
              </div>
            </div>

            {/* Live NEWS2 Clinical Safety Score */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <HeartPulse className="size-3.5 text-primary" />
                  Live NEWS2 Deterioration Score
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Automated Royal College of Physicians Clinical Deterioration Assessment
                </p>
              </div>
              <News2ScoreBadge
                vitals={{
                  systolicBp: systolic ? parseFloat(systolic) : undefined,
                  pulseRate: pulse ? parseInt(pulse, 10) : undefined,
                  bodyTemperature: temp ? parseFloat(temp) : undefined,
                  respiratoryRate: respRate ? parseInt(respRate, 10) : undefined,
                  spo2: spo2 ? parseFloat(spo2) : undefined,
                }}
                showDetails
              />
            </div>

            {/* Vitals Form Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {/* Temperature */}
              <div className="space-y-1">
                <Label htmlFor="vital-temp" className="text-xs flex items-center justify-between">
                  <span>Temperature (°C)</span>
                  {isTempAbnormal && <span className="text-[10px] text-red-500 font-bold">Abnormal</span>}
                </Label>
                <Input
                  id="vital-temp"
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className={`h-9 text-xs font-mono ${isTempAbnormal ? "border-red-500 bg-red-500/5 text-red-600 font-bold" : ""}`}
                />
                <span className="text-[10px] text-muted-foreground">Normal: 35.5 – 37.5 °C</span>
              </div>

              {/* Systolic BP */}
              <div className="space-y-1">
                <Label htmlFor="vital-systolic" className="text-xs flex items-center justify-between">
                  <span>Systolic BP (mmHg)</span>
                  {isBpAbnormal && <span className="text-[10px] text-red-500 font-bold">Alert</span>}
                </Label>
                <Input
                  id="vital-systolic"
                  type="number"
                  placeholder="120"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className={`h-9 text-xs font-mono ${isBpAbnormal ? "border-red-500 bg-red-500/5 text-red-600 font-bold" : ""}`}
                />
                <span className="text-[10px] text-muted-foreground">Normal: 90 – 139 mmHg</span>
              </div>

              {/* Diastolic BP */}
              <div className="space-y-1">
                <Label htmlFor="vital-diastolic" className="text-xs flex items-center justify-between">
                  <span>Diastolic BP (mmHg)</span>
                </Label>
                <Input
                  id="vital-diastolic"
                  type="number"
                  placeholder="80"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className={`h-9 text-xs font-mono ${isBpAbnormal ? "border-red-500 bg-red-500/5 text-red-600 font-bold" : ""}`}
                />
                <span className="text-[10px] text-muted-foreground">Normal: 60 – 89 mmHg</span>
              </div>

              {/* Pulse Rate */}
              <div className="space-y-1">
                <Label htmlFor="vital-pulse" className="text-xs flex items-center justify-between">
                  <span>Pulse Rate (bpm)</span>
                  {isPulseAbnormal && <span className="text-[10px] text-red-500 font-bold">Abnormal</span>}
                </Label>
                <Input
                  id="vital-pulse"
                  type="number"
                  placeholder="72"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className={`h-9 text-xs font-mono ${isPulseAbnormal ? "border-red-500 bg-red-500/5 text-red-600 font-bold" : ""}`}
                />
                <span className="text-[10px] text-muted-foreground">Normal: 60 – 100 bpm</span>
              </div>

              {/* Respiratory Rate */}
              <div className="space-y-1">
                <Label htmlFor="vital-resp" className="text-xs flex items-center justify-between">
                  <span>Resp Rate (bpm)</span>
                  {isRespAbnormal && <span className="text-[10px] text-red-500 font-bold">Abnormal</span>}
                </Label>
                <Input
                  id="vital-resp"
                  type="number"
                  placeholder="16"
                  value={respRate}
                  onChange={(e) => setRespRate(e.target.value)}
                  className={`h-9 text-xs font-mono ${isRespAbnormal ? "border-red-500 bg-red-500/5 text-red-600 font-bold" : ""}`}
                />
                <span className="text-[10px] text-muted-foreground">Normal: 12 – 20 bpm</span>
              </div>

              {/* SpO2 Oxygen */}
              <div className="space-y-1">
                <Label htmlFor="vital-spo2" className="text-xs flex items-center justify-between">
                  <span>SpO2 Oxygen (%)</span>
                  {isSpo2Abnormal && <span className="text-[10px] text-red-500 font-bold">Low SpO2</span>}
                </Label>
                <Input
                  id="vital-spo2"
                  type="number"
                  placeholder="98"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  className={`h-9 text-xs font-mono ${isSpo2Abnormal ? "border-red-500 bg-red-500/5 text-red-600 font-bold" : ""}`}
                />
                <span className="text-[10px] text-muted-foreground">Normal: ≥ 95%</span>
              </div>
            </div>

            {/* Weight, Height, Auto-BMI, and Pain Score */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2 border-t border-border/70">
              <div className="space-y-1">
                <Label htmlFor="vital-weight" className="text-xs">Weight (kg)</Label>
                <Input
                  id="vital-weight"
                  type="number"
                  step="0.1"
                  placeholder="70.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="vital-height" className="text-xs">Height (cm)</Label>
                <Input
                  id="vital-height"
                  type="number"
                  step="1"
                  placeholder="175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Auto BMI */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Computed BMI</Label>
                <div className="flex h-9 items-center justify-center rounded-md border border-border bg-muted/40 font-mono text-xs font-bold text-foreground">
                  {computedBmi ? `${computedBmi} kg/m²` : "Auto-computed"}
                </div>
              </div>

              {/* Pain Score */}
              <div className="space-y-1">
                <Label htmlFor="vital-pain" className="text-xs">Pain Score (0–10)</Label>
                <Select value={painScore} onValueChange={setPainScore}>
                  <SelectTrigger id="vital-pain" className="h-9 text-xs">
                    <SelectValue placeholder="Pain (0-10)" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()} className="text-xs">
                        {num === 0 ? "0 - No pain" : num <= 3 ? `${num} - Mild pain` : num <= 6 ? `${num} - Moderate pain` : `${num} - Severe pain`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Triage Nurse Notes */}
            <div className="space-y-1">
              <Label htmlFor="triage-notes" className="text-xs">
                Clinical Assessment Notes <span className="text-muted-foreground">(optional observations)</span>
              </Label>
              <Textarea
                id="triage-notes"
                value={triageNotes}
                onChange={(e) => setTriageNotes(e.target.value)}
                placeholder="Patient appears alert, mild distress, reports headache for 2 days..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecordOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveVitals}
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Zap className="size-3.5" />
              )}
              Save Vitals & Send to Doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
