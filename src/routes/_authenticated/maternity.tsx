import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Baby,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Droplets,
  ExternalLink,
  Flame,
  Heart,
  HeartPulse,
  History,
  Info,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Syringe,
  TrendingUp,
  User,
  Users,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getMaternityDashboardData,
  enrollAntenatalPatient,
  recordAntenatalVisit,
  recordLaborAndDelivery,
  recordChildImmunization,
  calculateEddFromLmp,
  calculateGestationalAgeWeeks,
  type AntenatalEnrollmentItem,
  type LaborDeliveryItem,
  type ImmunizationRecordItem,
} from "@/lib/maternity.functions";
import { SkeletonPageHeader, SkeletonStatCards, SkeletonTable } from "@/components/ui/skeleton-loaders";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/maternity")({
  head: () => ({
    meta: [
      { title: "Maternity, ANC & Child Immunization — HospNest" },
      { name: "description", content: "Antenatal care register, labor partograph, postnatal delivery records and NPI child immunization schedules." },
    ],
  }),
  component: MaternityDepartmentPage,
});

const NPI_VACCINES = [
  { name: "BCG (Bacillus Calmette–Guérin)", targetWeeks: 0, dose: 1 },
  { name: "OPV 0 (Oral Polio Vaccine)", targetWeeks: 0, dose: 0 },
  { name: "Hepatitis B 0", targetWeeks: 0, dose: 0 },
  { name: "Pentavalent 1 (DTP-HepB-Hib)", targetWeeks: 6, dose: 1 },
  { name: "OPV 1 (Oral Polio)", targetWeeks: 6, dose: 1 },
  { name: "PCV 1 (Pneumococcal Conjugate)", targetWeeks: 6, dose: 1 },
  { name: "Rotavirus 1", targetWeeks: 6, dose: 1 },
  { name: "Pentavalent 2", targetWeeks: 10, dose: 2 },
  { name: "OPV 2", targetWeeks: 10, dose: 2 },
  { name: "PCV 2", targetWeeks: 10, dose: 2 },
  { name: "Rotavirus 2", targetWeeks: 10, dose: 2 },
  { name: "Pentavalent 3", targetWeeks: 14, dose: 3 },
  { name: "OPV 3 / IPV", targetWeeks: 14, dose: 3 },
  { name: "PCV 3", targetWeeks: 14, dose: 3 },
  { name: "Vitamin A (100,000 IU)", targetWeeks: 26, dose: 1 },
  { name: "Measles 1st Dose", targetWeeks: 39, dose: 1 },
  { name: "Yellow Fever", targetWeeks: 39, dose: 1 },
  { name: "Meningitis (Men-A)", targetWeeks: 39, dose: 1 },
  { name: "Measles 2nd Dose", targetWeeks: 65, dose: 2 },
];

function MaternityDepartmentPage() {
  const { activeHospitalId, shellData } = useAppShell();
  const queryClient = useQueryClient();

  const getDashboardFn = useServerFn(getMaternityDashboardData);
  const enrollPatientFn = useServerFn(enrollAntenatalPatient);
  const addAncVisitFn = useServerFn(recordAntenatalVisit);
  const logLaborFn = useServerFn(recordLaborAndDelivery);
  const logVaccineFn = useServerFn(recordChildImmunization);

  const [activeTab, setActiveTab] = useState("anc");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [isVaccineModalOpen, setIsVaccineModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<AntenatalEnrollmentItem | null>(null);

  // ANC Enrollment Form State
  const [enrollPatientId, setEnrollPatientId] = useState("");
  const [enrollLmp, setEnrollLmp] = useState("");
  const [enrollGravida, setEnrollGravida] = useState("1");
  const [enrollPara, setEnrollPara] = useState("0");
  const [enrollAlive, setEnrollAlive] = useState("0");
  const [enrollMiscarriages, setEnrollMiscarriages] = useState("0");
  const [enrollBloodGroup, setEnrollBloodGroup] = useState("O+");
  const [enrollGenotype, setEnrollGenotype] = useState("AA");
  const [enrollHivStatus, setEnrollHivStatus] = useState("non-reactive");
  const [enrollRiskFactors, setEnrollRiskFactors] = useState("");

  // ANC Visit Form State
  const [visitFundalHeight, setVisitFundalHeight] = useState("");
  const [visitFhr, setVisitFhr] = useState("140");
  const [visitPresentation, setVisitPresentation] = useState("cephalic");
  const [visitLie, setVisitLie] = useState("longitudinal");
  const [visitSystolic, setVisitSystolic] = useState("110");
  const [visitDiastolic, setVisitDiastolic] = useState("70");
  const [visitWeight, setVisitWeight] = useState("");
  const [visitProtein, setVisitProtein] = useState("nil");
  const [visitGlucose, setVisitGlucose] = useState("nil");
  const [visitNotes, setVisitNotes] = useState("");
  const [visitNextDate, setVisitNextDate] = useState("");

  // Labor & Delivery Form State
  const [laborPatientId, setLaborPatientId] = useState("");
  const [laborDeliveryMode, setLaborDeliveryMode] = useState("spontaneous_vaginal");
  const [laborCervicalDilation, setLaborCervicalDilation] = useState("4");
  const [laborContractions, setLaborContractions] = useState("3");
  const [laborMembranes, setLaborMembranes] = useState("intact");
  const [isDelivered, setIsDelivered] = useState(false);
  const [babyGender, setBabyGender] = useState("female");
  const [birthWeight, setBirthWeight] = useState("3.2");
  const [apgar1, setApgar1] = useState("8");
  const [apgar5, setApgar5] = useState("10");
  const [bloodLoss, setBloodLoss] = useState("200");
  const [laborNotes, setLaborNotes] = useState("");

  // Child Immunization Form State
  const [vaccineChildName, setVaccineChildName] = useState("");
  const [vaccineDob, setVaccineDob] = useState("");
  const [vaccineGender, setVaccineGender] = useState("female");
  const [vaccineName, setVaccineName] = useState(NPI_VACCINES[0]?.name || "BCG");
  const [vaccineBatch, setVaccineBatch] = useState("");
  const [vaccineNurse, setVaccineNurse] = useState("");

  // Fetch Maternity Data
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["maternity-data", activeHospitalId],
    queryFn: () => getDashboardFn({ data: { hospitalId: activeHospitalId } }),
    enabled: Boolean(activeHospitalId),
  });

  const enrollments = data?.enrollments || [];
  const activeLabors = data?.activeLabors || [];
  const immunizations = data?.immunizations || [];
  const patientsList = data?.patientsList || [];
  const metrics = data?.metrics || {
    totalAncActive: 0,
    dueThisMonth: 0,
    deliveriesThisMonth: 0,
    immunizationsGiven: 0,
  };

  // Auto-calculated EDD in Enrollment Modal
  const computedEdd = useMemo(() => {
    return enrollLmp ? calculateEddFromLmp(enrollLmp) : "";
  }, [enrollLmp]);

  const computedGaWeeks = useMemo(() => {
    return enrollLmp ? calculateGestationalAgeWeeks(enrollLmp) : 0;
  }, [enrollLmp]);

  // Handle Submit ANC Enrollment
  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollPatientId || !enrollLmp || !activeHospitalId) {
      toast.error("Please select a patient and enter LMP.");
      return;
    }

    startTransition(async () => {
      try {
        await enrollPatientFn({
          data: {
            hospitalId: activeHospitalId,
            patientId: enrollPatientId,
            lmp: enrollLmp,
            gravida: parseInt(enrollGravida, 10) || 1,
            para: parseInt(enrollPara, 10) || 0,
            alive: parseInt(enrollAlive, 10) || 0,
            miscarriages: parseInt(enrollMiscarriages, 10) || 0,
            bloodGroup: enrollBloodGroup,
            genotype: enrollGenotype,
            hivStatus: enrollHivStatus,
            riskFactors: enrollRiskFactors ? enrollRiskFactors.split(",").map((r) => r.trim()) : [],
          },
        });
        toast.success("Patient successfully enrolled in Antenatal Care!");
        setIsEnrollModalOpen(false);
        setEnrollPatientId("");
        setEnrollLmp("");
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to enroll patient.");
      }
    });
  };

  // Handle Submit ANC Visit
  const handleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment || !activeHospitalId) return;

    startTransition(async () => {
      try {
        await addAncVisitFn({
          data: {
            enrollmentId: selectedEnrollment.id,
            hospitalId: activeHospitalId,
            gestationalAgeWeeks: selectedEnrollment.gestationalAgeWeeks,
            fundalHeightCm: visitFundalHeight ? parseFloat(visitFundalHeight) : undefined,
            fetalHeartRateBpm: visitFhr ? parseInt(visitFhr, 10) : undefined,
            fetalPresentation: visitPresentation,
            fetalLie: visitLie,
            maternalBpSystolic: visitSystolic ? parseInt(visitSystolic, 10) : undefined,
            maternalBpDiastolic: visitDiastolic ? parseInt(visitDiastolic, 10) : undefined,
            maternalWeightKg: visitWeight ? parseFloat(visitWeight) : undefined,
            urinalysisProtein: visitProtein,
            urinalysisGlucose: visitGlucose,
            clinicalNotes: visitNotes || undefined,
            nextVisitDate: visitNextDate || undefined,
            practitionerName: shellData?.user?.fullName || "Attending Midwife",
          },
        });
        toast.success("Antenatal visit recorded successfully!");
        setIsVisitModalOpen(false);
        setVisitNotes("");
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to save ANC visit.");
      }
    });
  };

  // Handle Submit Labor & Delivery
  const handleLaborSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!laborPatientId || !activeHospitalId) {
      toast.error("Please select a patient.");
      return;
    }

    startTransition(async () => {
      try {
        await logLaborFn({
          data: {
            hospitalId: activeHospitalId,
            patientId: laborPatientId,
            laborStartTime: new Date().toISOString(),
            deliveryTime: isDelivered ? new Date().toISOString() : undefined,
            deliveryMode: laborDeliveryMode,
            cervicalDilationCm: parseFloat(laborCervicalDilation) || 4.0,
            contractionsPer10min: parseInt(laborContractions, 10) || 3,
            membranesStatus: laborMembranes,
            babyGender: isDelivered ? babyGender : undefined,
            birthWeightKg: isDelivered ? parseFloat(birthWeight) : undefined,
            apgar1min: isDelivered ? parseInt(apgar1, 10) : undefined,
            apgar5min: isDelivered ? parseInt(apgar5, 10) : undefined,
            estimatedBloodLossMl: isDelivered ? parseInt(bloodLoss, 10) : undefined,
            attendingMidwife: shellData?.user?.fullName || "Labor Ward Clinician",
            notes: laborNotes || undefined,
          },
        });
        toast.success(isDelivered ? "Delivery recorded successfully! 🎉" : "Labor partograph entry recorded.");
        setIsLaborModalOpen(false);
        setLaborPatientId("");
        setLaborNotes("");
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to log labor record.");
      }
    });
  };

  // Handle Submit Immunization
  const handleVaccineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccineChildName.trim() || !vaccineDob || !activeHospitalId) {
      toast.error("Please provide infant name and date of birth.");
      return;
    }

    startTransition(async () => {
      try {
        await logVaccineFn({
          data: {
            hospitalId: activeHospitalId,
            childName: vaccineChildName.trim(),
            dateOfBirth: vaccineDob,
            gender: vaccineGender,
            vaccineName: vaccineName,
            batchNumber: vaccineBatch || undefined,
            nurseName: vaccineNurse || shellData?.user?.fullName || "Immunization Officer",
            status: "given",
          },
        });
        toast.success(`Immunization (${vaccineName}) logged successfully!`);
        setIsVaccineModalOpen(false);
        setVaccineChildName("");
        setVaccineBatch("");
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to log immunization.");
      }
    });
  };

  const filteredEnrollments = enrollments.filter((e) =>
    e.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.ancNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.patientNin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Baby className="size-4" />
            <span>Maternal & Child Health Division</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Maternity, ANC & Child Immunization
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comprehensive antenatal care register, labor partograph tracking, neonatal outcomes, and NPI immunization schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={() => setIsEnrollModalOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 shadow-sm"
          >
            <Plus className="size-3.5" />
            Enroll New ANC Mother
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active ANC Mothers</span>
            <Baby className="size-4 text-teal-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {metrics.totalAncActive}
          </p>
          <span className="text-[10px] text-muted-foreground">Registered in Antenatal Clinic</span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Due This Month (EDD)</span>
            <Calendar className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-amber-600">
            {metrics.dueThisMonth}
          </p>
          <span className="text-[10px] text-muted-foreground">Expected delivery within 30 days</span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Deliveries Logged</span>
            <Heart className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {metrics.deliveriesThisMonth}
          </p>
          <span className="text-[10px] text-muted-foreground">This calendar month</span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Vaccines Administered</span>
            <Syringe className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-600">
            {metrics.immunizationsGiven}
          </p>
          <span className="text-[10px] text-muted-foreground">NPI child immunization doses</span>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="anc" className="text-xs font-semibold gap-1.5">
              <Baby className="size-3.5" />
              Antenatal Care (ANC) Register ({enrollments.length})
            </TabsTrigger>
            <TabsTrigger value="labor" className="text-xs font-semibold gap-1.5">
              <Activity className="size-3.5" />
              Labor & Partograph ({activeLabors.length})
            </TabsTrigger>
            <TabsTrigger value="immunization" className="text-xs font-semibold gap-1.5">
              <Syringe className="size-3.5" />
              Child Immunization ({immunizations.length})
            </TabsTrigger>
          </TabsList>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mother / NIN / ANC No..."
              className="h-8 pl-8 text-xs bg-card"
            />
          </div>
        </div>

        {/* 1. ANTENATAL CARE (ANC) TAB */}
        <TabsContent value="anc" className="space-y-4">
          {isLoading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : filteredEnrollments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center space-y-3">
              <Baby className="size-10 text-teal-600/60 mx-auto" />
              <h3 className="font-bold text-sm text-foreground">No Antenatal Registrations Found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Enroll expectant mothers into the Antenatal Care register to track gestational age, ultrasound scans, routine visits, and high-risk flags.
              </p>
              <Button
                onClick={() => setIsEnrollModalOpen(true)}
                size="sm"
                className="bg-primary text-primary-foreground font-bold text-xs gap-1.5"
              >
                <Plus className="size-3.5" /> Enroll First ANC Mother
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEnrollments.map((item) => {
                const ga = item.gestationalAgeWeeks;
                const gaProgress = Math.min(100, Math.round((ga / 40) * 100));
                const isHighRisk = item.riskFactors.length > 0 || (item.patientAge >= 35) || (item.patientAge < 18);

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-primary uppercase">
                          {item.ancNumber}
                        </span>
                        <h3 className="font-bold text-sm text-foreground mt-0.5">
                          {item.patientName}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Age: {item.patientAge} • NIN: {item.patientNin}
                        </p>
                      </div>

                      {isHighRisk ? (
                        <Badge variant="destructive" className="text-[10px] font-bold uppercase gap-1">
                          <AlertTriangle className="size-3" /> High Risk
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                          Routine
                        </Badge>
                      )}
                    </div>

                    {/* Gestational Age Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          {ga} weeks ({Math.floor(ga / 4)} months)
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          EDD: {item.edd}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-teal-500 to-emerald-500 transition-all"
                          style={{ width: `${gaProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Obstetric History Strip */}
                    <div className="grid grid-cols-4 gap-1 text-center bg-muted/30 rounded-xl p-2 text-xs border border-border/60">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Gravida</span>
                        <strong className="text-foreground">G{item.gravida}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Para</span>
                        <strong className="text-foreground">P{item.para}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Alive</span>
                        <strong className="text-emerald-600">+{item.alive}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Blood Grp</span>
                        <strong className="text-foreground">{item.bloodGroup || "—"}</strong>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/70">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        LMP: {item.lmp}
                      </span>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setSelectedEnrollment(item);
                          setIsVisitModalOpen(true);
                        }}
                        className="h-7 text-xs font-semibold gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <Plus className="size-3" />
                        Log Clinic Visit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 2. LABOR & PARTOGRAPH TAB */}
        <TabsContent value="labor" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Real-time intrapartum labor progress, cervical dilation curve, and delivery outcome documentation.
            </p>
            <Button
              onClick={() => setIsLaborModalOpen(true)}
              size="sm"
              className="bg-primary text-primary-foreground font-bold text-xs gap-1.5"
            >
              <Plus className="size-3.5" />
              Admit Mother to Labor Ward
            </Button>
          </div>

          {activeLabors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center space-y-3">
              <Activity className="size-10 text-rose-500/60 mx-auto" />
              <h3 className="font-bold text-sm text-foreground">No Active Labor Records</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No patients currently admitted in labor ward. Use the button above to start partograph tracking for an admitting mother.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLabors.map((labor) => (
                <div
                  key={labor.id}
                  className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{labor.patientName}</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Admitted: {new Date(labor.laborStartTime).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={labor.deliveryTime ? "default" : "destructive"} className="text-[10px] font-bold uppercase">
                      {labor.deliveryTime ? "Delivered 🎉" : "Active Labor"}
                    </Badge>
                  </div>

                  {/* Partograph Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-muted/20 p-2.5 rounded-xl border border-border text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Cervical Dilation</span>
                      <strong className="text-rose-600 font-mono text-sm">{labor.cervicalDilationCm} cm</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Contractions / 10m</span>
                      <strong className="text-foreground font-mono text-sm">{labor.contractionsPer10min}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Membranes</span>
                      <strong className="text-foreground capitalize text-xs">{labor.membranesStatus.replace("_", " ")}</strong>
                    </div>
                  </div>

                  {labor.deliveryTime && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                        <span>Delivery Mode: {labor.deliveryMode.replace("_", " ").toUpperCase()}</span>
                        <span>Baby: {labor.babyGender?.toUpperCase()} ({labor.birthWeightKg} kg)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Apgar Score: <strong>{labor.apgar1min}/10 (1 min)</strong> • <strong>{labor.apgar5min}/10 (5 min)</strong> • Blood Loss: <strong>{labor.estimatedBloodLossMl} mL</strong>
                      </p>
                      {labor.attendingMidwife && (
                        <p className="text-[10px] text-muted-foreground">
                          Attending: {labor.attendingMidwife}
                        </p>
                      )}
                    </div>
                  )}

                  {labor.notes && (
                    <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-2 rounded-lg">
                      {labor.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. CHILD IMMUNIZATION (NPI) TAB */}
        <TabsContent value="immunization" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              National Programme on Immunization (NPI) schedule tracker for infants and children (0 – 18 months).
            </p>
            <Button
              onClick={() => setIsVaccineModalOpen(true)}
              size="sm"
              className="bg-primary text-primary-foreground font-bold text-xs gap-1.5"
            >
              <Plus className="size-3.5" />
              Log Administered Vaccine
            </Button>
          </div>

          {immunizations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center space-y-3">
              <Syringe className="size-10 text-emerald-500/60 mx-auto" />
              <h3 className="font-bold text-sm text-foreground">No Immunization Records Found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Record infant vaccines (BCG, OPV, Pentavalent, PCV, Yellow Fever, Measles) and track batch numbers.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left">Child Name</th>
                      <th className="p-3 text-left">Date of Birth</th>
                      <th className="p-3 text-left">Vaccine Administered</th>
                      <th className="p-3 text-left">Target Age</th>
                      <th className="p-3 text-left">Batch No</th>
                      <th className="p-3 text-left">Administering Nurse</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {immunizations.map((vac) => (
                      <tr key={vac.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-bold text-foreground">{vac.childName}</td>
                        <td className="p-3 text-muted-foreground font-mono">{vac.dateOfBirth}</td>
                        <td className="p-3 font-semibold text-primary">{vac.vaccineName}</td>
                        <td className="p-3 text-muted-foreground">
                          {vac.targetAgeWeeks === 0 ? "At Birth" : `${vac.targetAgeWeeks} weeks`}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{vac.batchNumber || "—"}</td>
                        <td className="p-3 text-muted-foreground">{vac.nurseName || "Vaccine Nurse"}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                            Given
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ========================================================= */}
      {/* MODAL 1: ENROLL NEW PATIENT IN ANTENATAL CARE (ANC) */}
      {/* ========================================================= */}
      <Dialog open={isEnrollModalOpen} onOpenChange={setIsEnrollModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
              <Baby className="size-4 text-primary" />
              Enroll Patient in Antenatal Care (ANC)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Calculate Expected Date of Delivery (EDD) and register baseline obstetric history.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnrollSubmit} className="space-y-4 pt-2 text-xs">
            {/* Patient Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Patient *</Label>
              <Select value={enrollPatientId} onValueChange={setEnrollPatientId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose expectant mother..." />
                </SelectTrigger>
                <SelectContent>
                  {patientsList.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.fullName} (NIN: {p.nin}, Age: {p.age})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* LMP Date & Auto-Computed EDD */}
            <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-xl border border-border">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Menstrual Period (LMP) *</Label>
                <Input
                  type="date"
                  value={enrollLmp}
                  onChange={(e) => setEnrollLmp(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Computed EDD (Naegele's Rule)</Label>
                <div className="flex h-9 items-center justify-center rounded-md border border-border bg-muted/40 font-mono text-xs font-bold text-primary">
                  {computedEdd || "Select LMP"}
                </div>
              </div>
            </div>

            {/* Obstetric Parity Matrix */}
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Gravida (Total)</Label>
                <Input
                  type="number"
                  min="1"
                  value={enrollGravida}
                  onChange={(e) => setEnrollGravida(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Para (Births)</Label>
                <Input
                  type="number"
                  min="0"
                  value={enrollPara}
                  onChange={(e) => setEnrollPara(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Alive Children</Label>
                <Input
                  type="number"
                  min="0"
                  value={enrollAlive}
                  onChange={(e) => setEnrollAlive(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Miscarriages</Label>
                <Input
                  type="number"
                  min="0"
                  value={enrollMiscarriages}
                  onChange={(e) => setEnrollMiscarriages(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Serology & Blood Markers */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Blood Group</Label>
                <Select value={enrollBloodGroup} onValueChange={setEnrollBloodGroup}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="O+">O Rh(D) Positive</SelectItem>
                    <SelectItem value="O-">O Rh(D) Negative</SelectItem>
                    <SelectItem value="A+">A Rh(D) Positive</SelectItem>
                    <SelectItem value="A-">A Rh(D) Negative</SelectItem>
                    <SelectItem value="B+">B Rh(D) Positive</SelectItem>
                    <SelectItem value="B-">B Rh(D) Negative</SelectItem>
                    <SelectItem value="AB+">AB Rh(D) Positive</SelectItem>
                    <SelectItem value="AB-">AB Rh(D) Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Genotype</Label>
                <Select value={enrollGenotype} onValueChange={setEnrollGenotype}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AA">AA (Normal)</SelectItem>
                    <SelectItem value="AS">AS (Sickle Trait)</SelectItem>
                    <SelectItem value="SS">SS (Sickle Cell)</SelectItem>
                    <SelectItem value="AC">AC (C Trait)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">HIV Screening</Label>
                <Select value={enrollHivStatus} onValueChange={setEnrollHivStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non-reactive">Non-Reactive</SelectItem>
                    <SelectItem value="reactive">Reactive (PMTCT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* High-Risk Flags */}
            <div className="space-y-1">
              <Label className="text-xs">Clinical Risk Factors (comma separated)</Label>
              <Input
                value={enrollRiskFactors}
                onChange={(e) => setEnrollRiskFactors(e.target.value)}
                placeholder="e.g. Previous Caesarean Section, Chronic Hypertension, Gestational Diabetes"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEnrollModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !enrollPatientId || !enrollLmp} size="sm" className="bg-primary text-primary-foreground font-bold">
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Enroll in ANC Register
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 2: LOG ANTENATAL CLINIC VISIT */}
      {/* ========================================================= */}
      <Dialog open={isVisitModalOpen} onOpenChange={setIsVisitModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
              <Stethoscope className="size-4 text-teal-600" />
              Log Antenatal Clinic Visit
            </DialogTitle>
            <DialogDescription className="text-xs">
              Patient: <strong>{selectedEnrollment?.patientName}</strong> ({selectedEnrollment?.ancNumber}) • Gestational Age: <strong>{selectedEnrollment?.gestationalAgeWeeks} weeks</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVisitSubmit} className="space-y-4 pt-2 text-xs">
            {/* Obstetric Exam */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Fundal Ht (cm)</Label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="32"
                  value={visitFundalHeight}
                  onChange={(e) => setVisitFundalHeight(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Fetal HR (bpm)</Label>
                <Input
                  type="number"
                  placeholder="140"
                  value={visitFhr}
                  onChange={(e) => setVisitFhr(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Presentation</Label>
                <Select value={visitPresentation} onValueChange={setVisitPresentation}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cephalic">Cephalic (Vertex)</SelectItem>
                    <SelectItem value="breech">Breech</SelectItem>
                    <SelectItem value="transverse">Transverse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Fetal Lie</Label>
                <Select value={visitLie} onValueChange={setVisitLie}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="longitudinal">Longitudinal</SelectItem>
                    <SelectItem value="oblique">Oblique</SelectItem>
                    <SelectItem value="transverse">Transverse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Maternal Vitals & Urinalysis */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/20 p-2.5 rounded-xl border border-border">
              <div className="space-y-1">
                <Label className="text-[11px]">Systolic BP</Label>
                <Input
                  type="number"
                  placeholder="110"
                  value={visitSystolic}
                  onChange={(e) => setVisitSystolic(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Diastolic BP</Label>
                <Input
                  type="number"
                  placeholder="70"
                  value={visitDiastolic}
                  onChange={(e) => setVisitDiastolic(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Urine Protein</Label>
                <Select value={visitProtein} onValueChange={setVisitProtein}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nil">Nil (Negative)</SelectItem>
                    <SelectItem value="trace">Trace</SelectItem>
                    <SelectItem value="1+">1+ (30 mg/dL)</SelectItem>
                    <SelectItem value="2+">2+ (100 mg/dL)</SelectItem>
                    <SelectItem value="3+">3+ (300 mg/dL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Urine Glucose</Label>
                <Select value={visitGlucose} onValueChange={setVisitGlucose}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nil">Nil</SelectItem>
                    <SelectItem value="1+">1+</SelectItem>
                    <SelectItem value="2+">2+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Clinical Notes & Treatment Prescribed</Label>
              <Textarea
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="e.g. Prescribed routine Iron & Folic Acid, Tetanus toxoid given, advised on nutrition and warning signs."
                rows={2}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsVisitModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Save ANC Clinic Visit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 3: LABOR & DELIVERY PARTOGRAPH */}
      {/* ========================================================= */}
      <Dialog open={isLaborModalOpen} onOpenChange={setIsLaborModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
              <Activity className="size-4 text-rose-500" />
              Labor & Delivery Partograph Entry
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record labor progression milestones, partograph observations, or final delivery outcome.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLaborSubmit} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Patient in Labor *</Label>
              <Select value={laborPatientId} onValueChange={setLaborPatientId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patientsList.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.fullName} (NIN: {p.nin})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Cervical Dilation (cm)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={laborCervicalDilation}
                  onChange={(e) => setLaborCervicalDilation(e.target.value)}
                  className="h-8 text-xs font-mono font-bold text-rose-600"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Contractions / 10m</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  value={laborContractions}
                  onChange={(e) => setLaborContractions(e.target.value)}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Membranes</Label>
                <Select value={laborMembranes} onValueChange={setLaborMembranes}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intact">Intact</SelectItem>
                    <SelectItem value="ruptured_clear">Ruptured (Clear)</SelectItem>
                    <SelectItem value="ruptured_meconium">Ruptured (Meconium)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Delivery Completed Checkbox */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <input
                type="checkbox"
                id="delivery-complete"
                checked={isDelivered}
                onChange={(e) => setIsDelivered(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="delivery-complete" className="text-xs font-bold text-foreground cursor-pointer">
                🎉 Delivery Completed (Log Neonatal Outcome & Apgar)
              </Label>
            </div>

            {isDelivered && (
              <div className="space-y-3 rounded-xl bg-emerald-500/5 p-3 border border-emerald-500/30 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Delivery Mode</Label>
                    <Select value={laborDeliveryMode} onValueChange={setLaborDeliveryMode}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spontaneous_vaginal">Spontaneous Vaginal Delivery (SVD)</SelectItem>
                        <SelectItem value="assisted_vacuum">Assisted Vacuum</SelectItem>
                        <SelectItem value="cesarean_emergency">Emergency Caesarean Section</SelectItem>
                        <SelectItem value="cesarean_elective">Elective Caesarean Section</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Baby Gender</Label>
                    <Select value={babyGender} onValueChange={setBabyGender}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={birthWeight}
                      onChange={(e) => setBirthWeight(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Apgar (1m)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={apgar1}
                      onChange={(e) => setApgar1(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Apgar (5m)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={apgar5}
                      onChange={(e) => setApgar5(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Blood Loss (mL)</Label>
                    <Input
                      type="number"
                      value={bloodLoss}
                      onChange={(e) => setBloodLoss(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Labor Notes / Complications</Label>
              <Textarea
                value={laborNotes}
                onChange={(e) => setLaborNotes(e.target.value)}
                placeholder="Intrapartum clinical notes..."
                rows={2}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsLaborModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !laborPatientId} size="sm" className="bg-primary text-primary-foreground font-bold">
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Save Partograph Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 4: LOG CHILD IMMUNIZATION */}
      {/* ========================================================= */}
      <Dialog open={isVaccineModalOpen} onOpenChange={setIsVaccineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
              <Syringe className="size-4 text-emerald-500" />
              Log Child Immunization (NPI)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record administered national infant immunization dose and batch control.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVaccineSubmit} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Child Full Name *</Label>
              <Input
                value={vaccineChildName}
                onChange={(e) => setVaccineChildName(e.target.value)}
                placeholder="e.g. Baby Chukwu"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Date of Birth *</Label>
                <Input
                  type="date"
                  value={vaccineDob}
                  onChange={(e) => setVaccineDob(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Gender</Label>
                <Select value={vaccineGender} onValueChange={setVaccineGender}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Vaccine *</Label>
              <Select value={vaccineName} onValueChange={setVaccineName}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NPI_VACCINES.map((v) => (
                    <SelectItem key={v.name} value={v.name} className="text-xs">
                      {v.name} ({v.targetWeeks === 0 ? "Birth" : `${v.targetWeeks} wks`})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Vaccine Batch No</Label>
                <Input
                  value={vaccineBatch}
                  onChange={(e) => setVaccineBatch(e.target.value)}
                  placeholder="e.g. NPI-2026-X99"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nurse / Vaccinator</Label>
                <Input
                  value={vaccineNurse}
                  onChange={(e) => setVaccineNurse(e.target.value)}
                  placeholder="e.g. Nurse Fatima"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsVaccineModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !vaccineChildName.trim() || !vaccineDob} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Log Immunization
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
