import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bed,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Heart,
  History,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Stethoscope,
  User,
  Users,
  AlertTriangle,
  Activity,
  Pill,
  Droplets,
  Flame,
  ChevronRight,
  ArrowRight,
  Sparkles,
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
  getInpatientsDashboardData,
  getInpatientClinicalDetail,
  recordWardRoundNote,
  recordNursingCareObservation,
  finalizeInpatientDischargeLifecycle,
  type InpatientCardItem,
  type AdmissionType,
  type DischargeCondition,
} from "@/lib/admissions.functions";
import { DischargeSummaryDocument } from "@/components/clinical-docs/DischargeSummaryDocument";
import { PrintableDocumentModal } from "@/components/clinical-docs/PrintableDocumentModal";
import { News2ScoreBadge } from "@/components/clinical-safety/News2ScoreBadge";
import { calculateNews2Score } from "@/lib/clinical-safety";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admissions")({
  head: () => ({
    meta: [
      { title: "Inpatient Admissions & Ward Rounds — HospNest" },
      { name: "description", content: "Active inpatient tracking, SOAP ward rounds notes, nursing care plans, and discharge summaries." },
    ],
  }),
  component: InpatientsAdmissionsPage,
});

function InpatientsAdmissionsPage() {
  const { activeHospitalId, shellData } = useAppShell();
  const currentHospital = shellData?.hospitals?.find((h) => h.id === activeHospitalId);
  const queryClient = useQueryClient();

  const getDashboardFn = useServerFn(getInpatientsDashboardData);
  const getDetailFn = useServerFn(getInpatientClinicalDetail);
  const addRoundNoteFn = useServerFn(recordWardRoundNote);
  const addNursingObsFn = useServerFn(recordNursingCareObservation);
  const finalizeDischargeFn = useServerFn(finalizeInpatientDischargeLifecycle);

  const [wardFilter, setWardFilter] = useState("all");
  const [admissionTypeFilter, setAdmissionTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawers
  const [selectedAdmission, setSelectedAdmission] = useState<InpatientCardItem | null>(null);
  const [isRoundNoteModalOpen, setIsRoundNoteModalOpen] = useState(false);
  const [isNursingObsModalOpen, setIsNursingObsModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Round Note Form State
  const [soapSubjective, setSoapSubjective] = useState("");
  const [soapObjective, setSoapObjective] = useState("");
  const [soapAssessment, setSoapAssessment] = useState("");
  const [soapPlan, setSoapPlan] = useState("");

  // Nursing Care Form State
  const [obsType, setObsType] = useState<"vitals" | "mar" | "fluid_balance" | "wound_care">("vitals");
  const [obsNotes, setObsNotes] = useState("");
  const [marDrugName, setMarDrugName] = useState("");
  const [marStatus, setMarStatus] = useState<"administered" | "refused" | "held">("administered");
  const [marRefusalReason, setMarRefusalReason] = useState("");
  const [fluidInputMl, setFluidInputMl] = useState<number>(0);
  const [fluidOutputMl, setFluidOutputMl] = useState<number>(0);
  const [vitalTemp, setVitalTemp] = useState("");
  const [vitalSystolic, setVitalSystolic] = useState("");
  const [vitalDiastolic, setVitalDiastolic] = useState("");
  const [vitalPulse, setVitalPulse] = useState("");
  const [vitalResp, setVitalResp] = useState("");
  const [vitalSpo2, setVitalSpo2] = useState("");

  // Discharge Form State
  const [dischargeCondition, setDischargeCondition] = useState<DischargeCondition>("improved");
  const [dischargeSummaryText, setDischargeSummaryText] = useState("");
  const [dischargeInstructionsText, setDischargeInstructionsText] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const [isPending, startTransition] = useTransition();

  // Query Inpatient Dashboard
  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["inpatient-dashboard", activeHospitalId, wardFilter, admissionTypeFilter],
    queryFn: () =>
      getDashboardFn({
        data: {
          hospitalId: activeHospitalId || undefined,
          wardFilter: wardFilter,
          admissionTypeFilter: admissionTypeFilter,
        },
      }),
    enabled: Boolean(activeHospitalId),
  });

  // Query Selected Inpatient Clinical Detail
  const { data: clinicalDetail, refetch: refetchDetail } = useQuery({
    queryKey: ["inpatient-detail", selectedAdmission?.id, activeHospitalId],
    queryFn: () =>
      getDetailFn({
        data: {
          admissionId: selectedAdmission!.id,
          hospitalId: activeHospitalId || undefined,
        },
      }),
    enabled: Boolean(selectedAdmission?.id),
  });

  // Filter admissions locally by search query
  const filteredAdmissions = useMemo(() => {
    if (!dashboardData?.admissions) return [];
    if (!searchQuery.trim()) return dashboardData.admissions;
    const q = searchQuery.toLowerCase();
    return dashboardData.admissions.filter(
      (a) =>
        a.patientName.toLowerCase().includes(q) ||
        a.patientNin.toLowerCase().includes(q) ||
        a.bedNumber.toLowerCase().includes(q) ||
        a.wardName.toLowerCase().includes(q) ||
        a.provisionalDiagnosis.toLowerCase().includes(q)
    );
  }, [dashboardData?.admissions, searchQuery]);

  // Round Note Submit
  const handleRoundNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission || !soapPlan.trim()) {
      toast.error("Please provide the clinical management plan.");
      return;
    }

    startTransition(async () => {
      try {
        await addRoundNoteFn({
          data: {
            admissionId: selectedAdmission.id,
            hospitalId: activeHospitalId!,
            subjective: soapSubjective,
            objective: soapObjective,
            assessment: soapAssessment,
            plan: soapPlan,
          },
        });
        toast.success("Ward round SOAP note recorded!");
        setIsRoundNoteModalOpen(false);
        setSoapSubjective("");
        setSoapObjective("");
        setSoapAssessment("");
        setSoapPlan("");
        refetchDetail();
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to record round note.");
      }
    });
  };

  // Nursing Obs Submit
  const handleNursingObsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;

    let detailsPayload: any = {};
    if (obsType === "mar") {
      if (!marDrugName.trim()) {
        toast.error("Please specify medication name.");
        return;
      }
      detailsPayload = {
        drugName: marDrugName,
        status: marStatus,
        refusalReason: marStatus !== "administered" ? marRefusalReason : undefined,
        administeredAt: new Date().toISOString(),
      };
    } else if (obsType === "fluid_balance") {
      detailsPayload = {
        inputMl: Number(fluidInputMl || 0),
        outputMl: Number(fluidOutputMl || 0),
        balanceMl: Number(fluidInputMl || 0) - Number(fluidOutputMl || 0),
        recordedAt: new Date().toISOString(),
      };
    } else if (obsType === "vitals") {
      const vObj = {
        systolicBp: vitalSystolic ? parseFloat(vitalSystolic) : undefined,
        diastolicBp: vitalDiastolic ? parseFloat(vitalDiastolic) : undefined,
        pulseRate: vitalPulse ? parseInt(vitalPulse, 10) : undefined,
        bodyTemperature: vitalTemp ? parseFloat(vitalTemp) : undefined,
        respiratoryRate: vitalResp ? parseInt(vitalResp, 10) : undefined,
        spo2: vitalSpo2 ? parseFloat(vitalSpo2) : undefined,
      };
      const news2 = calculateNews2Score(vObj);
      detailsPayload = {
        ...vObj,
        news2Score: news2.totalScore,
        news2RiskLevel: news2.riskLevel,
        recordedAt: new Date().toISOString(),
      };
    }

    startTransition(async () => {
      try {
        await addNursingObsFn({
          data: {
            admissionId: selectedAdmission.id,
            hospitalId: activeHospitalId!,
            observationType: obsType,
            details: detailsPayload,
            notes: obsNotes,
          },
        });
        toast.success(`Nursing observation (${obsType}) recorded!`);
        setIsNursingObsModalOpen(false);
        setObsNotes("");
        setMarDrugName("");
        setFluidInputMl(0);
        setFluidOutputMl(0);
        setVitalTemp("");
        setVitalSystolic("");
        setVitalDiastolic("");
        setVitalPulse("");
        setVitalResp("");
        setVitalSpo2("");
        refetchDetail();
      } catch (err: any) {
        toast.error(err.message || "Failed to save nursing observation.");
      }
    });
  };

  // Discharge Submit
  const handleDischargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission || !dischargeSummaryText.trim()) {
      toast.error("Please provide a clinical discharge summary.");
      return;
    }

    startTransition(async () => {
      try {
        await finalizeDischargeFn({
          data: {
            admissionId: selectedAdmission.id,
            hospitalId: activeHospitalId!,
            dischargeCondition: dischargeCondition,
            dischargeSummary: dischargeSummaryText,
            dischargeInstructions: dischargeInstructionsText,
            followUpDate: followUpDate || undefined,
          },
        });
        toast.success("Inpatient discharged! Bed freed for cleaning.");
        setIsDischargeModalOpen(false);
        setIsPrintModalOpen(true);
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Discharge failed.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
        <div className="h-8 w-64 bg-muted/60 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { wards, metrics } = dashboardData || { wards: [], metrics: {} as any };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Clinical Ops</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Inpatient Admissions</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-3">
            <Bed className="size-7 text-teal-600 dark:text-teal-400" />
            Inpatient Admissions & Ward Rounds
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Visual bed board, clinical SOAP ward rounds, nursing care observation charts, and discharge workflow.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link to="/wards">
              <Building2 className="size-3.5" />
              Manage Wards & Beds
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Metrics Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-muted-foreground">Active Inpatients</span>
          <p className="font-display text-2xl font-black text-foreground mt-0.5">{metrics?.totalAdmitted || 0}</p>
        </div>
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">Bed Occupancy Rate</span>
          <p className="font-display text-2xl font-black text-teal-700 dark:text-teal-300 mt-0.5">
            {metrics?.overallOccupancyRate || 0}%
          </p>
        </div>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Avg Length of Stay</span>
          <p className="font-display text-2xl font-black text-blue-700 dark:text-blue-300 mt-0.5">
            {metrics?.averageLengthOfStayDays || 0} days
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Emergency Admissions</span>
          <p className="font-display text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
            {metrics?.emergencyCount || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3.5 shadow-soft col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">Elective / Maternity</span>
          <p className="font-display text-2xl font-black text-purple-700 dark:text-purple-300 mt-0.5">
            {(metrics?.electiveCount || 0) + (metrics?.maternityCount || 0)}
          </p>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-soft">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inpatient name, NIN, bed, diagnosis..."
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={wardFilter} onValueChange={setWardFilter}>
            <SelectTrigger className="h-9 text-xs w-44">
              <SelectValue placeholder="All Wards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Hospital Wards</SelectItem>
              {wards.map((w) => (
                <SelectItem key={w.id} value={w.id} className="text-xs">
                  {w.name} ({w.occupiedBeds}/{w.totalBeds})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={admissionTypeFilter} onValueChange={setAdmissionTypeFilter}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Types</SelectItem>
              <SelectItem value="emergency" className="text-xs">Emergency</SelectItem>
              <SelectItem value="elective" className="text-xs">Elective</SelectItem>
              <SelectItem value="maternity" className="text-xs">Maternity</SelectItem>
              <SelectItem value="day_case" className="text-xs">Day Case</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Active Inpatients Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAdmissions.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Bed className="mx-auto size-10 text-muted-foreground/60" />
            <h3 className="mt-3 font-display text-base font-bold text-foreground">No Inpatients Found</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Admissions created from doctor consultations or ER triage will appear here with bed allocations.
            </p>
          </div>
        ) : (
          filteredAdmissions.map((adm) => (
            <div
              key={adm.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-3.5 transition-all hover:border-teal-500/40 hover:shadow-md flex flex-col justify-between"
            >
              {/* Top Row: Ward, Bed, Stay */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 font-bold text-xs">
                    {adm.bedNumber}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-foreground line-clamp-1">{adm.wardName}</h4>
                    <span className="text-[10px] text-muted-foreground">
                      Admitted {new Date(adm.admissionDate).toLocaleDateString()} ({adm.lengthOfStayDays}d stay)
                    </span>
                  </div>
                </div>

                <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300 bg-teal-500/10 text-[10px] font-bold capitalize">
                  {adm.admissionType}
                </Badge>
              </div>

              {/* Patient Identity & Diagnosis */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">{adm.patientName}</h3>
                  <span className="text-[11px] text-muted-foreground font-mono">NIN: {adm.patientNin}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {adm.patientGender || "N/A"} ({adm.patientAge}) • Condition:{" "}
                  <strong className="text-foreground">{adm.initialCondition}</strong>
                </p>
                <div className="rounded-lg bg-muted/20 border border-border/50 p-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground block text-[11px]">Provisional Diagnosis:</span>
                  <p className="line-clamp-2 text-[11px] mt-0.5">{adm.provisionalDiagnosis}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                <Button
                  onClick={() => setSelectedAdmission(adm)}
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs font-semibold gap-1 flex-1"
                >
                  <FileText className="size-3.5" />
                  Clinical Rounds & MAR
                </Button>

                <Button
                  onClick={() => {
                    setSelectedAdmission(adm);
                    setIsDischargeModalOpen(true);
                  }}
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <FileCheck className="size-3.5" />
                  Discharge
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. INPATIENT CLINICAL DETAIL DRAWER / DIALOG */}
      <Dialog open={Boolean(selectedAdmission && !isDischargeModalOpen && !isPrintModalOpen)} onOpenChange={(open) => !open && setSelectedAdmission(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold flex items-center justify-between">
              <span>Inpatient Clinical Chart: {selectedAdmission?.patientName}</span>
              <Badge variant="outline" className="text-xs">
                {selectedAdmission?.wardName} • {selectedAdmission?.bedNumber}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              NIN: {selectedAdmission?.patientNin} • Admitted {selectedAdmission && new Date(selectedAdmission.admissionDate).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          {clinicalDetail && (
            <div className="space-y-6 pt-2 text-xs">
              {/* Clinical Identity Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-muted/20 p-3 border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Blood Group:</span>
                  <strong className="text-foreground">{clinicalDetail.admission?.patient?.blood_group || "Not recorded"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Genotype:</span>
                  <strong className="text-foreground">{clinicalDetail.admission?.patient?.genotype || "Not recorded"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Allergies:</span>
                  <strong className="text-rose-600">{clinicalDetail.admission?.patient?.allergies?.join(", ") || "None recorded"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">HMO / Insurance:</span>
                  <strong className="text-foreground">{clinicalDetail.admission?.patient?.insurance_provider || "Private Self-Pay"}</strong>
                </div>
              </div>

              {/* Section 1: Ward Rounds SOAP Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <Stethoscope className="size-4 text-primary" />
                    Doctor Ward Round Notes (SOAP Format)
                  </h3>
                  <Button
                    onClick={() => setIsRoundNoteModalOpen(true)}
                    size="sm"
                    className="h-7 text-xs gap-1 bg-primary text-primary-foreground font-semibold"
                  >
                    <Plus className="size-3" />
                    Add Round Note
                  </Button>
                </div>

                {clinicalDetail.roundNotes.length === 0 ? (
                  <p className="text-muted-foreground italic py-3 text-center">No ward round notes logged yet.</p>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto">
                    {clinicalDetail.roundNotes.map((note) => (
                      <div key={note.id} className="rounded-xl border border-border bg-card p-3 space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between text-[11px] border-b border-border/40 pb-1">
                          <strong className="text-foreground">{note.doctorName}</strong>
                          <span className="text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        {note.subjective && <p className="text-muted-foreground"><strong className="text-foreground">S:</strong> {note.subjective}</p>}
                        {note.objective && <p className="text-muted-foreground"><strong className="text-foreground">O:</strong> {note.objective}</p>}
                        {note.assessment && <p className="text-muted-foreground"><strong className="text-foreground">A:</strong> {note.assessment}</p>}
                        <p className="text-foreground"><strong className="text-teal-600 dark:text-teal-400">Plan:</strong> {note.plan}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Nursing Care Observations & MAR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <Activity className="size-4 text-emerald-600" />
                    Nursing Observations & Medication Administration (MAR)
                  </h3>
                  <Button
                    onClick={() => setIsNursingObsModalOpen(true)}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 font-semibold"
                  >
                    <Plus className="size-3" />
                    Log Observation / MAR
                  </Button>
                </div>

                {clinicalDetail.nursingObservations.length === 0 ? (
                  <p className="text-muted-foreground italic py-3 text-center">No nursing observations logged yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
                    {clinicalDetail.nursingObservations.map((obs) => (
                      <div key={obs.id} className="rounded-xl border border-border/80 bg-muted/10 p-3 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <Badge variant="secondary" className="uppercase text-[9px] font-bold">
                            {obs.observationType.replace("_", " ")}
                          </Badge>
                          <span className="text-muted-foreground">{new Date(obs.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-[11px] font-semibold text-foreground">By {obs.nurseName}</p>
                        {obs.observationType === "vitals" && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              {obs.details?.bodyTemperature && (
                                <span className="rounded bg-muted px-1.5 py-0.5">
                                  Temp: <strong>{obs.details.bodyTemperature}°C</strong>
                                </span>
                              )}
                              {obs.details?.systolicBp && (
                                <span className="rounded bg-muted px-1.5 py-0.5">
                                  BP: <strong>{obs.details.systolicBp}/{obs.details.diastolicBp || "—"}</strong>
                                </span>
                              )}
                              {obs.details?.pulseRate && (
                                <span className="rounded bg-muted px-1.5 py-0.5">
                                  Pulse: <strong>{obs.details.pulseRate} bpm</strong>
                                </span>
                              )}
                              {obs.details?.spo2 && (
                                <span className="rounded bg-muted px-1.5 py-0.5">
                                  SpO2: <strong>{obs.details.spo2}%</strong>
                                </span>
                              )}
                            </div>
                            <News2ScoreBadge vitals={obs.details} showDetails />
                          </div>
                        )}
                        {obs.observationType === "mar" && (
                          <div className="text-[11px] text-muted-foreground">
                            <span>Drug: <strong className="text-foreground">{obs.details?.drugName}</strong></span> • Status:{" "}
                            <span className={obs.details?.status === "administered" ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                              {obs.details?.status}
                            </span>
                            {obs.details?.refusalReason && <p className="text-rose-600 text-[10px]">Reason: {obs.details.refusalReason}</p>}
                          </div>
                        )}
                        {obs.observationType === "fluid_balance" && (
                          <div className="text-[11px] text-muted-foreground">
                            In: {obs.details?.inputMl}mL • Out: {obs.details?.outputMl}mL • Net: <strong className="text-foreground">{obs.details?.balanceMl}mL</strong>
                          </div>
                        )}
                        {obs.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5">{obs.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedAdmission(null)}>
              Close Chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL: ADD WARD ROUND SOAP NOTE */}
      <Dialog open={isRoundNoteModalOpen} onOpenChange={setIsRoundNoteModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Log Ward Round Note (SOAP)</DialogTitle>
            <DialogDescription className="text-xs">
              Patient: {selectedAdmission?.patientName} • Ward: {selectedAdmission?.wardName} ({selectedAdmission?.bedNumber})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRoundNoteSubmit} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subjective (Patient Symptoms / Complaints)</Label>
              <Textarea
                value={soapSubjective}
                onChange={(e) => setSoapSubjective(e.target.value)}
                placeholder="e.g. Patient reports resolved nausea, mild abdominal discomfort on palpation."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Objective (Physical Exam / Vitals / Labs)</Label>
              <Textarea
                value={soapObjective}
                onChange={(e) => setSoapObjective(e.target.value)}
                placeholder="e.g. Temp 36.8°C, BP 120/80, chest clear bilaterally, surgical site clean and intact."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Assessment (Clinical Impression)</Label>
              <Input
                value={soapAssessment}
                onChange={(e) => setSoapAssessment(e.target.value)}
                placeholder="e.g. Post-op Day 2 recovery progressing favorably without infection."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Plan & Orders *</Label>
              <Textarea
                value={soapPlan}
                onChange={(e) => setSoapPlan(e.target.value)}
                placeholder="e.g. Step down IV analgesics to oral paracetamol. Encourage early ambulation. Discharge tomorrow if stable."
                required
                rows={2}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRoundNoteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !soapPlan.trim()} size="sm" className="bg-primary text-primary-foreground font-bold">
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Save Ward Round Note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL: LOG NURSING OBSERVATION / MAR */}
      <Dialog open={isNursingObsModalOpen} onOpenChange={setIsNursingObsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Log Nursing Observation / MAR</DialogTitle>
            <DialogDescription className="text-xs">
              Record medication administration, fluid balance, or routine nursing care.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleNursingObsSubmit} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Observation Type</Label>
              <Select value={obsType} onValueChange={(v: any) => setObsType(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vitals" className="text-xs">Routine Vitals Check</SelectItem>
                  <SelectItem value="mar" className="text-xs">Medication Administration Record (MAR)</SelectItem>
                  <SelectItem value="fluid_balance" className="text-xs">Fluid Intake / Output Chart</SelectItem>
                  <SelectItem value="wound_care" className="text-xs">Wound / Dressing Care</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {obsType === "vitals" && (
              <div className="space-y-3 rounded-xl bg-muted/20 p-3 border border-border">
                <div className="flex items-center justify-between pb-1 border-b border-border/70">
                  <span className="text-xs font-bold text-foreground">Ward Vital Signs & NEWS2 Risk</span>
                  <News2ScoreBadge
                    vitals={{
                      systolicBp: vitalSystolic ? parseFloat(vitalSystolic) : undefined,
                      pulseRate: vitalPulse ? parseInt(vitalPulse, 10) : undefined,
                      bodyTemperature: vitalTemp ? parseFloat(vitalTemp) : undefined,
                      respiratoryRate: vitalResp ? parseInt(vitalResp, 10) : undefined,
                      spo2: vitalSpo2 ? parseFloat(vitalSpo2) : undefined,
                    }}
                    showDetails
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Temp (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="36.8"
                      value={vitalTemp}
                      onChange={(e) => setVitalTemp(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Systolic BP (mmHg)</Label>
                    <Input
                      type="number"
                      placeholder="120"
                      value={vitalSystolic}
                      onChange={(e) => setVitalSystolic(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Diastolic BP (mmHg)</Label>
                    <Input
                      type="number"
                      placeholder="80"
                      value={vitalDiastolic}
                      onChange={(e) => setVitalDiastolic(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Pulse Rate (bpm)</Label>
                    <Input
                      type="number"
                      placeholder="72"
                      value={vitalPulse}
                      onChange={(e) => setVitalPulse(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Resp Rate (bpm)</Label>
                    <Input
                      type="number"
                      placeholder="16"
                      value={vitalResp}
                      onChange={(e) => setVitalResp(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">SpO2 (%)</Label>
                    <Input
                      type="number"
                      placeholder="98"
                      value={vitalSpo2}
                      onChange={(e) => setVitalSpo2(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {obsType === "mar" && (
              <div className="space-y-2 rounded-xl bg-muted/20 p-3 border border-border">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Medication Name *</Label>
                  <Input
                    value={marDrugName}
                    onChange={(e) => setMarDrugName(e.target.value)}
                    placeholder="e.g. IV Ceftriaxone 1g"
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Administration Status</Label>
                  <Select value={marStatus} onValueChange={(v: any) => setMarStatus(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administered" className="text-xs">Administered Successfully</SelectItem>
                      <SelectItem value="refused" className="text-xs">Refused by Patient</SelectItem>
                      <SelectItem value="held" className="text-xs">Held on Clinical Grounds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {marStatus !== "administered" && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-rose-600">Refusal / Hold Reason *</Label>
                    <Input
                      value={marRefusalReason}
                      onChange={(e) => setMarRefusalReason(e.target.value)}
                      placeholder="e.g. Patient felt nauseous, requested 30min delay"
                      required
                      className="h-9 text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {obsType === "fluid_balance" && (
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/20 p-3 border border-border">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Intake (mL)</Label>
                  <Input
                    type="number"
                    value={fluidInputMl}
                    onChange={(e) => setFluidInputMl(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Output (mL)</Label>
                  <Input
                    type="number"
                    value={fluidOutputMl}
                    onChange={(e) => setFluidOutputMl(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nurse Observations / Notes</Label>
              <Textarea
                value={obsNotes}
                onChange={(e) => setObsNotes(e.target.value)}
                placeholder="e.g. Patient resting comfortably in bed, IV line patent without phlebitis."
                rows={2}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNursingObsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} size="sm" className="bg-primary text-primary-foreground font-bold">
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Record Observation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 8. MODAL: DISCHARGE INPATIENT */}
      <Dialog open={isDischargeModalOpen} onOpenChange={setIsDischargeModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Finalize Inpatient Discharge</DialogTitle>
            <DialogDescription className="text-xs">
              Patient: {selectedAdmission?.patientName} • Ward: {selectedAdmission?.wardName} ({selectedAdmission?.bedNumber})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDischargeSubmit} className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Discharge Condition *</Label>
              <Select value={dischargeCondition} onValueChange={(v: any) => setDischargeCondition(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recovered" className="text-xs">Recovered Fully</SelectItem>
                  <SelectItem value="improved" className="text-xs">Improved (Stable for Home)</SelectItem>
                  <SelectItem value="stable" className="text-xs">Stable (Chronic Care Plan)</SelectItem>
                  <SelectItem value="transferred" className="text-xs">Transferred to External Hospital</SelectItem>
                  <SelectItem value="against_medical_advice" className="text-xs">Discharged Against Medical Advice (DAMA)</SelectItem>
                  <SelectItem value="deceased" className="text-xs">Deceased</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Clinical Discharge Summary *</Label>
              <Textarea
                value={dischargeSummaryText}
                onChange={(e) => setDischargeSummaryText(e.target.value)}
                placeholder="Comprehensive summary of admission course, treatments administered, investigations performed, and discharge state."
                required
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Home Care Instructions</Label>
              <Textarea
                value={dischargeInstructionsText}
                onChange={(e) => setDischargeInstructionsText(e.target.value)}
                placeholder="Instructions for patient: medication schedule, wound care, diet, and red-flag symptoms."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Follow-Up Outpatient Clinic Date (Auto-book slot)</Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="h-9 text-xs max-w-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDischargeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !dischargeSummaryText.trim()}
                size="sm"
                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FileCheck className="size-3.5" />}
                Confirm Discharge & Free Bed
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 9. PRINTABLE DISCHARGE SUMMARY MODAL */}
      {selectedAdmission && (
        <PrintableDocumentModal
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
          title={`Discharge Summary — ${selectedAdmission.patientName}`}
        >
          <DischargeSummaryDocument
            hospital={{
              name: currentHospital?.name || "HospNest Medical Center",
              state: "Nigeria",
              contactPhone: "+234 800 HOSPNEST",
              licenseNumber: "FMOH/HOSP/2026/09",
            }}
            patient={{
              fullName: selectedAdmission.patientName,
              nin: selectedAdmission.patientNin,
              age: selectedAdmission.patientAge,
              gender: selectedAdmission.patientGender,
            }}
            discharge={{
              summaryNumber: `DS-${selectedAdmission.id.slice(0, 8).toUpperCase()}`,
              admissionDate: selectedAdmission.admissionDate,
              dischargeDate: new Date().toISOString(),
              wardName: selectedAdmission.wardName,
              bedNumber: selectedAdmission.bedNumber,
              attendingPhysician: selectedAdmission.admittingDoctorName || "Attending Consultant",
              physicianRank: "Consultant Inpatient Physician",
              admissionReason: selectedAdmission.provisionalDiagnosis,
              primaryDiagnosis: selectedAdmission.provisionalDiagnosis,
              hospitalCourseSummary: dischargeSummaryText || "Patient completed inpatient course with favorable clinical progress.",
              dischargeCondition: dischargeCondition === "deceased" ? "stable" : dischargeCondition,
              dischargeMedications: [],
              followUpInstructions: dischargeInstructionsText || "Report to outpatient clinic in 14 days or immediately to ER if red flags occur.",
              nextAppointmentDate: followUpDate || undefined,
            }}
          />
        </PrintableDocumentModal>
      )}
    </div>
  );
}
