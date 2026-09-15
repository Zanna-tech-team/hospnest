import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Bed,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Globe,
  Heart,
  Hospital,
  Layers,
  LayoutDashboard,
  Loader2,
  MapPin,
  Package,
  Pill,
  Plus,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { useAppShell } from "@/components/layout/AppShell";
import { createHospital, getMyHospitals } from "@/lib/hospital.functions";
import {
  getHospitalOnboardingProgress,
  saveHospitalOnboardingStep,
  finalizeHospitalOnboarding,
} from "@/lib/hospital-settings.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logo from "@/assets/hospnest-logo.png.asset.json";

const STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT — Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
];

const PRESET_DEPARTMENTS = [
  { name: "General Medicine & Outpatient (OPD)", code: "OPD", floor: "Ground Floor" },
  { name: "Pediatrics & Child Health", code: "PED", floor: "1st Floor East" },
  { name: "Obstetrics & Gynaecology (O&G)", code: "O&G", floor: "Maternity Wing" },
  { name: "General Surgery & Theater", code: "SURG", floor: "2nd Floor Theater Block" },
  { name: "Accident & Emergency (A&E)", code: "A&E", floor: "Ground Floor Trauma Wing" },
  { name: "Diagnostic Laboratory", code: "LAB", floor: "Ground Floor Block B" },
  { name: "Pharmacy & Dispensary", code: "PHARM", floor: "Main Reception" },
  { name: "Radiology & Diagnostic Imaging", code: "RAD", floor: "Basement Imaging Wing" },
  { name: "Ophthalmology / Eye Clinic", code: "EYE", floor: "1st Floor West" },
];

const PRESET_TARIFFS = [
  { name: "General Outpatient Consultation (GP)", code: "SRV-CONS-GP", category: "Consultation", price: 3000 },
  { name: "Specialist / Consultant Clinic Review", code: "SRV-CONS-SPEC", category: "Consultation", price: 7500 },
  { name: "Emergency Triage & Resuscitation", code: "SRV-EMERG-RESUS", category: "Emergency", price: 5000 },
  { name: "Inpatient Admission Deposit", code: "SRV-ADM-DEP", category: "Inpatient", price: 25000 },
  { name: "Daily Nursing Care & Vital Monitoring", code: "SRV-NURSE-DAILY", category: "Nursing", price: 4000 },
  { name: "Spontaneous Vaginal Delivery (Normal)", code: "SRV-MAT-DELIVERY", category: "Maternity", price: 45000 },
  { name: "Elective Caesarean Section (CS)", code: "SRV-MAT-CS", category: "Surgical", price: 250000 },
  { name: "Minor Surgical Wound Debridement & Suturing", code: "SRV-SURG-MINOR", category: "Surgical", price: 15000 },
];

const PRESET_LAB_TESTS = [
  { name: "Malaria Parasite (RDT & Microscopy)", code: "LAB-MP", price: 1500, sampleType: "Whole Blood" },
  { name: "Full Blood Count & Platelet Indices (FBC)", code: "LAB-FBC", price: 3500, sampleType: "EDTA Blood" },
  { name: "Urinalysis (10-Parameter Dipstick)", code: "LAB-URINE", price: 1200, sampleType: "Clean Catch Urine" },
  { name: "Widal Agglutination Reaction (Typhoid)", code: "LAB-WIDAL", price: 2000, sampleType: "Serum" },
  { name: "Haemoglobin Genotype (Electrophoresis)", code: "LAB-GENO", price: 3000, sampleType: "EDTA Blood" },
  { name: "ABO & Rhesus Blood Grouping", code: "LAB-BG", price: 1500, sampleType: "Whole Blood" },
  { name: "Fasting Blood Sugar (Glucose)", code: "LAB-FBS", price: 1200, sampleType: "Fluoride Plasma" },
  { name: "Lipid Profile (Cholesterol, HDL, LDL, Trig)", code: "LAB-LIPID", price: 6000, sampleType: "Serum" },
  { name: "Liver Function Test (LFT: ALT, AST, Bilirubin)", code: "LAB-LFT", price: 7000, sampleType: "Serum" },
  { name: "Electrolytes, Urea & Creatinine (E/U/Cr)", code: "LAB-EUCR", price: 6500, sampleType: "Serum" },
  { name: "Retroviral Screening (HIV 1 & 2)", code: "LAB-RVS", price: 1000, sampleType: "Serum" },
  { name: "Hepatitis B Surface Antigen (HBsAg)", code: "LAB-HBSAG", price: 1500, sampleType: "Serum" },
  { name: "Hepatitis C Virus Antibody (HCV)", code: "LAB-HCV", price: 2000, sampleType: "Serum" },
  { name: "Stool Microscopy (Ova & Parasites)", code: "LAB-STOOL", price: 1800, sampleType: "Fresh Stool" },
  { name: "Pregnancy Test (Serum / Urine hCG)", code: "LAB-PT", price: 1000, sampleType: "Urine / Serum" },
];

const PRESET_DRUGS = [
  { genericName: "Artemether-Lumefantrine", brandName: "Coartem / Lonart", dosageForm: "tablet", quantity: 100, reorderLevel: 20, unitPrice: 1800 },
  { genericName: "Paracetamol 500mg", brandName: "Panadol / Emzor", dosageForm: "tablet", quantity: 300, reorderLevel: 50, unitPrice: 300 },
  { genericName: "Amoxicillin-Clavulanic Acid 625mg", brandName: "Augmentin", dosageForm: "tablet", quantity: 80, reorderLevel: 15, unitPrice: 4500 },
  { genericName: "Ciprofloxacin 500mg", brandName: "Ciprotab", dosageForm: "tablet", quantity: 100, reorderLevel: 20, unitPrice: 1500 },
  { genericName: "Metronidazole 400mg", brandName: "Flagyl", dosageForm: "tablet", quantity: 150, reorderLevel: 30, unitPrice: 600 },
  { genericName: "Ibuprofen 400mg", brandName: "Brufen", dosageForm: "tablet", quantity: 120, reorderLevel: 25, unitPrice: 500 },
  { genericName: "Omeprazole 20mg", brandName: "Losec", dosageForm: "capsule", quantity: 80, reorderLevel: 15, unitPrice: 1200 },
  { genericName: "Amlodipine 5mg", brandName: "Norvasc", dosageForm: "tablet", quantity: 100, reorderLevel: 20, unitPrice: 1500 },
  { genericName: "Metformin 500mg", brandName: "Glucophage", dosageForm: "tablet", quantity: 120, reorderLevel: 25, unitPrice: 1200 },
  { genericName: "Oral Rehydration Salts (ORS)", brandName: "Hydrate", dosageForm: "sachet", quantity: 150, reorderLevel: 30, unitPrice: 350 },
  { genericName: "Normal Saline 0.9% 500ml IV", brandName: "Dana Saline", dosageForm: "infusion", quantity: 60, reorderLevel: 15, unitPrice: 1200 },
  { genericName: "Ceftriaxone 1g Injection", brandName: "Rocephin", dosageForm: "injection", quantity: 40, reorderLevel: 10, unitPrice: 3000 },
];

export const Route = createFileRoute("/_authenticated/hospital-setup")({
  head: () => ({
    meta: [
      { title: "Complete Hospital Onboarding Wizard — HospNest" },
      { name: "description", content: "10-step interactive setup wizard to configure hospital identity, departments, wards, tariffs, catalogue, formulary, staff, and public landing page." },
    ],
  }),
  component: HospitalSetupWizardPage,
});

function HospitalSetupWizardPage() {
  const navigate = useNavigate();
  const { activeHospitalId, setActiveHospitalId } = useAppShell();

  const getMyHospFn = useServerFn(getMyHospitals);
  const getProgressFn = useServerFn(getHospitalOnboardingProgress);
  const saveStepFn = useServerFn(saveHospitalOnboardingStep);
  const finalizeFn = useServerFn(finalizeHospitalOnboarding);
  const createHospFn = useServerFn(createHospital);

  const { data: myHospitalsData, refetch: refetchMyHospitals } = useQuery({
    queryKey: ["my-hospitals-setup"],
    queryFn: () => getMyHospFn({}),
  });

  const targetHospitalId = activeHospitalId || myHospitalsData?.hospitals?.[0]?.id || "";

  const {
    data: progressData,
    isLoading: isProgressLoading,
    refetch: refetchProgress,
  } = useQuery({
    queryKey: ["hospital-onboarding-progress", targetHospitalId],
    queryFn: () => (targetHospitalId ? getProgressFn({ data: { hospitalId: targetHospitalId } }) : null),
    enabled: Boolean(targetHospitalId),
  });

  // Current step state (1 to 10)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Identity State
  const [hospName, setHospName] = useState("");
  const [hospType, setHospType] = useState<string>("private");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [brandColor, setBrandColor] = useState("#0f766e");
  const [logoUrl, setLogoUrl] = useState("");

  // Step 2: Departments State
  const [selectedDepartments, setSelectedDepartments] = useState<Array<{ name: string; code: string; floor: string }>>([]);
  const [customDeptName, setCustomDeptName] = useState("");
  const [customDeptCode, setCustomDeptCode] = useState("");
  const [customDeptFloor, setCustomDeptFloor] = useState("Main Block");

  // Step 3: Wards & Beds State
  const [wardsList, setWardsList] = useState<Array<{ name: string; wardType: string; capacity: number; dailyRate: number }>>([
    { name: "Male Medical Ward", wardType: "general", capacity: 8, dailyRate: 5000 },
    { name: "Female Surgical Ward", wardType: "general", capacity: 8, dailyRate: 5000 },
    { name: "Maternity & Postnatal Ward", wardType: "maternity", capacity: 6, dailyRate: 6000 },
    { name: "Pediatric Ward", wardType: "pediatric", capacity: 6, dailyRate: 4500 },
  ]);
  const [newWardName, setNewWardName] = useState("");
  const [newWardType, setNewWardType] = useState("general");
  const [newWardCapacity, setNewWardCapacity] = useState("4");
  const [newWardRate, setNewWardRate] = useState("5000");

  // Step 4: Tariffs State
  const [tariffsList, setTariffsList] = useState(PRESET_TARIFFS);

  // Step 5: Lab Catalog State
  const [labTestsList, setLabTestsList] = useState(
    PRESET_LAB_TESTS.map((t) => ({ ...t, enabled: true }))
  );

  // Step 6: Pharmacy State
  const [medsList, setMedsList] = useState(
    PRESET_DRUGS.map((d) => ({ ...d, enabled: true }))
  );

  // Step 7: Team Invitations State
  const [invitationsList, setInvitationsList] = useState<Array<{ email: string; fullName: string; role: string; department: string }>>([
    { email: "", fullName: "", role: "doctor", department: "General Medicine" },
  ]);

  // Step 8: Shift Templates State
  const [shiftTemplates, setShiftTemplates] = useState([
    { shiftName: "Morning Shift", startTime: "08:00", endTime: "16:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    { shiftName: "Evening Shift", startTime: "16:00", endTime: "21:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    { shiftName: "Night Call Shift", startTime: "21:00", endTime: "08:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
    { shiftName: "Weekend Duty", startTime: "08:00", endTime: "20:00", days: ["Sat", "Sun"] },
  ]);

  // Step 9: Public Landing Page State
  const [publicBio, setPublicBio] = useState("Premier multidisciplinary hospital providing 24/7 compassionate and advanced clinical care to our community.");
  const [visitingHours, setVisitingHours] = useState("Morning: 06:00 - 07:30 | Evening: 17:00 - 19:00");
  const [emergencyHotline, setEmergencyHotline] = useState("+234 800 000 9999");
  const [isPublicListed, setIsPublicListed] = useState(true);

  // Initial load from progress data
  useEffect(() => {
    if (progressData?.hospital) {
      const h = progressData.hospital;
      setHospName(h.name || "");
      setHospType(h.hospital_type || "private");
      setLicenseNumber(h.license_number || "");
      setState(h.state || "");
      setLga(h.lga || "");
      setAddress(h.address || "");
      setContactEmail(h.contact_email || "");
      setContactPhone(h.contact_phone || "");
      setBrandColor(h.brand_primary_color || "#0f766e");
      setLogoUrl(h.logo_url || "");
      setIsPublicListed(Boolean(h.is_public_listed));

      if (progressData.onboardingStep) {
        setCurrentStep(Math.min(progressData.onboardingStep, 10));
      }

      const d = progressData.onboardingData;
      if (d?.publicBio) setPublicBio(d.publicBio);
      if (d?.visitingHours) setVisitingHours(d.visitingHours);
      if (d?.emergencyHotline) setEmergencyHotline(d.emergencyHotline);
    }
  }, [progressData?.hospital?.id]);

  // Initial preset selection for departments if empty
  useEffect(() => {
    if (selectedDepartments.length === 0) {
      setSelectedDepartments(PRESET_DEPARTMENTS.slice(0, 5));
    }
  }, []);

  // Save current step and advance
  async function handleNextStep() {
    if (!targetHospitalId) {
      toast.error("Please register your hospital first.");
      return;
    }

    setSaving(true);
    try {
      let stepData: any = {};

      if (currentStep === 1) {
        if (!hospName.trim() || !licenseNumber.trim() || !state) {
          toast.error("Please fill in hospital name, licence, and state.");
          setSaving(false);
          return;
        }
        stepData = {
          name: hospName.trim(),
          hospitalType: hospType,
          licenseNumber: licenseNumber.trim(),
          state,
          lga,
          address,
          contactEmail,
          contactPhone,
          brandColor,
          logoUrl,
        };
      } else if (currentStep === 2) {
        if (selectedDepartments.length === 0) {
          toast.error("Please select or add at least one department.");
          setSaving(false);
          return;
        }
        stepData = { departments: selectedDepartments };
      } else if (currentStep === 3) {
        stepData = { wards: wardsList };
      } else if (currentStep === 4) {
        stepData = { services: tariffsList };
      } else if (currentStep === 5) {
        const enabledTests = labTestsList.filter((t) => t.enabled);
        stepData = { labTests: enabledTests };
      } else if (currentStep === 6) {
        const enabledDrugs = medsList.filter((m) => m.enabled);
        stepData = { medications: enabledDrugs };
      } else if (currentStep === 7) {
        const validInvs = invitationsList.filter((i) => i.email && i.email.includes("@"));
        stepData = { invitations: validInvs };
      } else if (currentStep === 8) {
        stepData = { shifts: shiftTemplates };
      } else if (currentStep === 9) {
        stepData = {
          publicBio,
          visitingHours,
          emergencyHotline,
          isPublicListed,
        };
      }

      await saveStepFn({
        data: {
          hospitalId: targetHospitalId,
          step: currentStep,
          stepData,
        },
      });

      toast.success(`Step ${currentStep} configured and saved.`);
      refetchProgress();
      if (currentStep < 10) {
        setCurrentStep((s) => s + 1);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save step.");
    } finally {
      setSaving(false);
    }
  }

  // Go Live / Finalize Onboarding
  async function handleFinalize() {
    if (!targetHospitalId) return;
    setSaving(true);
    try {
      await finalizeFn({
        data: { hospitalId: targetHospitalId },
      });
      toast.success("Congratulations! Your hospital is now fully configured and LIVE on HospNest.");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to finalize hospital setup.");
    } finally {
      setSaving(false);
    }
  }

  // Add custom department
  function handleAddCustomDept() {
    if (!customDeptName.trim() || !customDeptCode.trim()) {
      toast.error("Enter department name and abbreviation code.");
      return;
    }
    setSelectedDepartments((prev) => [
      ...prev,
      {
        name: customDeptName.trim(),
        code: customDeptCode.trim().toUpperCase(),
        floor: customDeptFloor.trim() || "Main Wing",
      },
    ]);
    setCustomDeptName("");
    setCustomDeptCode("");
  }

  // Add custom ward
  function handleAddWard() {
    if (!newWardName.trim()) {
      toast.error("Enter ward name.");
      return;
    }
    setWardsList((prev) => [
      ...prev,
      {
        name: newWardName.trim(),
        wardType: newWardType,
        capacity: parseInt(newWardCapacity, 10) || 4,
        dailyRate: parseInt(newWardRate, 10) || 5000,
      },
    ]);
    setNewWardName("");
  }

  const stepsMeta = [
    { number: 1, title: "Identity & Info", icon: Building2 },
    { number: 2, title: "Departments", icon: Layers },
    { number: 3, title: "Wards & Beds", icon: Bed },
    { number: 4, title: "Tariffs & Pricing", icon: CreditCard },
    { number: 5, title: "Lab Catalogue", icon: FlaskConical },
    { number: 6, title: "Pharmacy Stock", icon: Pill },
    { number: 7, title: "Team Invitations", icon: UserPlus },
    { number: 8, title: "Shift Rosters", icon: Clock },
    { number: 9, title: "Public Directory", icon: Globe },
    { number: 10, title: "Review & Go-Live", icon: Rocket },
  ];

  return (
    <main className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30 shadow-xs backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <img src={logo.url} alt="HospNest" className="h-8 w-8 rounded-lg object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold text-foreground">
                  {hospName || "Hospital Setup Wizard"}
                </span>
                <Badge variant="outline" className="border-teal-500/40 text-teal-700 dark:text-teal-300 text-[10px] font-mono">
                  Step {currentStep} of 10
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Configure your complete hospital clinical operating system
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {progressData && (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-muted-foreground hidden md:inline">Readiness:</span>
                <div className="flex items-center gap-1.5 bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-full border border-teal-500/20">
                  <Sparkles className="size-3.5" />
                  <span>{progressData.readinessScore}% Ready</span>
                </div>
              </div>
            )}
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/dashboard">Skip to Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 10-Step Progress Steps Stepper Bar */}
      <div className="bg-card border-b border-border px-4 py-3 overflow-x-auto">
        <div className="mx-auto max-w-7xl flex items-center justify-between min-w-[800px] gap-2">
          {stepsMeta.map((s) => {
            const isDone = s.number < currentStep;
            const isCurrent = s.number === currentStep;
            const Icon = s.icon;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => setCurrentStep(s.number)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isCurrent
                    ? "bg-teal-600 text-white shadow-sm"
                    : isDone
                    ? "bg-teal-500/10 text-teal-800 dark:text-teal-300 hover:bg-teal-500/20"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <div className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCurrent ? "bg-white text-teal-700" : isDone ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="size-3" /> : s.number}
                </div>
                <span className="whitespace-nowrap">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Step Content Area */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        {/* STEP 1: IDENTITY & FACILITY INFO */}
        {currentStep === 1 && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
                <Building2 className="size-6 text-teal-600" />
                Step 1: Hospital Identity & Facility Profile
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Set up your facility name, government registration license, primary state, and official branding colors.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="hosp-name" className="text-xs font-semibold">Hospital / Healthcare Facility Name *</Label>
                <Input
                  id="hosp-name"
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  placeholder="e.g. Cedarcrest Specialist Hospital"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hosp-type" className="text-xs font-semibold">Ownership Type</Label>
                <Select value={hospType} onValueChange={setHospType}>
                  <SelectTrigger id="hosp-type" className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private Specialist Hospital</SelectItem>
                    <SelectItem value="government">Government / Public Tertiary Centre</SelectItem>
                    <SelectItem value="faith_based">Faith-Based / Mission Hospital</SelectItem>
                    <SelectItem value="clinic">Outpatient Diagnostic Clinic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="license-num" className="text-xs font-semibold">Facility Licence / CAC Number *</Label>
                <Input
                  id="license-num"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. FMOH/HEFAMAA/2026/089"
                  className="h-10 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs font-semibold">State *</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger id="state" className="h-10 text-xs">
                    <SelectValue placeholder="Choose Nigerian State" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lga" className="text-xs font-semibold">Local Government Area (LGA)</Label>
                <Input
                  id="lga"
                  value={lga}
                  onChange={(e) => setLga(e.target.value)}
                  placeholder="e.g. Ikeja, Abuja Municipal, Eti-Osa"
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address" className="text-xs font-semibold">Full Street Address</Label>
                <Textarea
                  id="address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 14 Hospital Road, Victoria Island, Lagos"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">Official Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="info@facility.ng"
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">Official Contact Phone</Label>
                <Input
                  id="phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="color" className="text-xs font-semibold">Brand Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="size-10 rounded-xl cursor-pointer border border-border"
                  />
                  <span className="text-xs font-mono font-bold text-foreground">{brandColor}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="logo" className="text-xs font-semibold">Logo Image URL</Label>
                <Input
                  id="logo"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://.../logo.png"
                  className="h-10 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DEPARTMENTS */}
        {currentStep === 2 && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
                <Layers className="size-6 text-teal-600" />
                Step 2: Clinical & Operational Departments
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select from standard presets or add custom clinical units to structure your hospital roster and routing.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Department Presets</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_DEPARTMENTS.map((dept) => {
                  const isSelected = selectedDepartments.some((d) => d.code === dept.code);
                  return (
                    <div
                      key={dept.code}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDepartments((prev) => prev.filter((d) => d.code !== dept.code));
                        } else {
                          setSelectedDepartments((prev) => [...prev, dept]);
                        }
                      }}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all flex items-start justify-between ${
                        isSelected
                          ? "border-teal-600 bg-teal-500/5 shadow-xs"
                          : "border-border bg-muted/20 hover:border-border/80"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{dept.name}</span>
                          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-bold">
                            {dept.code}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{dept.floor}</p>
                      </div>

                      <div className={`size-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected ? "bg-teal-600 border-teal-600 text-white" : "border-border bg-background"
                      }`}>
                        {isSelected && <Check className="size-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Department Adder */}
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Plus className="size-3.5 text-teal-600" />
                Add Custom Department / Specialist Unit
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Input
                  value={customDeptName}
                  onChange={(e) => setCustomDeptName(e.target.value)}
                  placeholder="e.g. Dental & Maxillofacial"
                  className="h-9 text-xs"
                />
                <Input
                  value={customDeptCode}
                  onChange={(e) => setCustomDeptCode(e.target.value)}
                  placeholder="Code (e.g. DENT)"
                  className="h-9 text-xs uppercase font-mono"
                />
                <Input
                  value={customDeptFloor}
                  onChange={(e) => setCustomDeptFloor(e.target.value)}
                  placeholder="Floor / Location (e.g. 2nd Floor)"
                  className="h-9 text-xs"
                />
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddCustomDept}
                className="h-8 text-xs font-semibold gap-1 border-teal-500/40 text-teal-700 dark:text-teal-300"
              >
                <Plus className="size-3.5" /> Add Department
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: WARDS & BEDS */}
        {currentStep === 3 && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
                <Bed className="size-6 text-teal-600" />
                Step 3: Inpatient Wards & Auto Bed Generation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Set up your inpatient wards, admission room categories, daily bed rates, and auto-generate bed numbers.
              </p>
            </div>

            <div className="space-y-3">
              {wardsList.map((ward, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-background p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{ward.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {ward.wardType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Capacity: <strong>{ward.capacity} Beds</strong> (Auto-numbered B-1 to B-{ward.capacity}) • Daily Rate: ₦{ward.dailyRate.toLocaleString()}/day
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setWardsList((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive self-end sm:self-center size-8 p-0"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Ward */}
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 space-y-3">
              <span className="text-xs font-bold text-foreground">Add New Inpatient Ward</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <Input
                  value={newWardName}
                  onChange={(e) => setNewWardName(e.target.value)}
                  placeholder="e.g. Intensive Care Unit (ICU)"
                  className="h-9 text-xs sm:col-span-2"
                />
                <Select value={newWardType} onValueChange={setNewWardType}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Ward</SelectItem>
                    <SelectItem value="maternity">Maternity</SelectItem>
                    <SelectItem value="pediatric">Pediatric</SelectItem>
                    <SelectItem value="icu">ICU / HDU</SelectItem>
                    <SelectItem value="vip">VIP / Private Suite</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={newWardCapacity}
                  onChange={(e) => setNewWardCapacity(e.target.value)}
                  placeholder="Bed count (e.g. 4)"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Daily Rate (₦):</Label>
                  <Input
                    type="number"
                    value={newWardRate}
                    onChange={(e) => setNewWardRate(e.target.value)}
                    className="h-8 w-28 text-xs font-mono"
                  />
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddWard}
                  className="h-8 text-xs font-semibold gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Plus className="size-3.5" /> Add Ward & Beds
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: TARIFFS & SERVICES */}
        {currentStep === 4 && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
                <CreditCard className="size-6 text-teal-600" />
                Step 4: Tariffs & Clinical Fee Schedule
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Set baseline Nigerian healthcare prices for standard consultations, triage, and procedures.
              </p>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {tariffsList.map((item, idx) => (
                <div
                  key={item.code}
                  className="rounded-xl border border-border bg-background p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{item.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1 rounded">
                        {item.code}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{item.category}</span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="font-bold text-muted-foreground">₦</span>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => {
                        const newPrice = parseInt(e.target.value, 10) || 0;
                        setTariffsList((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, price: newPrice } : t))
                        );
                      }}
                      className="h-8 w-28 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: LAB CATALOGUE */}
        {currentStep === 5 && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
                <FlaskConical className="size-6 text-teal-600" />
                Step 5: Diagnostic Laboratory Catalogue
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enable common Nigerian diagnostic lab tests and customize your hospital prices.
              </p>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {labTestsList.map((test, idx) => (
                <div
                  key={test.code}
                  className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                    test.enabled ? "border-border bg-background" : "border-border/50 bg-muted/20 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={test.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLabTestsList((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, enabled: checked } : t))
                        );
                      }}
                      className="mt-0.5 size-4 rounded accent-teal-600"
                    />
                    <div>
                      <span className="font-bold text-foreground block">{test.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Sample: {test.sampleType} • Code: {test.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="font-bold text-muted-foreground">₦</span>
                    <Input
                      type="number"
                      disabled={!test.enabled}
                      value={test.price}
                      onChange={(e) => {
                        const newPrice = parseInt(e.target.value, 10) || 0;
                        setLabTestsList((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, price: newPrice } : t))
                        );
                      }}
                      className="h-8 w-28 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: PHARMACY STARTER STOCK */}
        {currentStep === 6 && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
                <Pill className="size-6 text-teal-600" />
                Step 6: Essential Drug Formulary & Starter Stock
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Set initial opening inventory quantities, reorder thresholds, and unit selling prices.
              </p>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {medsList.map((drug, idx) => (
                <div
                  key={drug.genericName}
                  className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                    drug.enabled ? "border-border bg-background" : "border-border/50 bg-muted/20 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={drug.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setMedsList((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, enabled: checked } : m))
                        );
                      }}
                      className="mt-0.5 size-4 rounded accent-teal-600"
                    />
                    <div>
                      <span className="font-bold text-foreground block">
                        {drug.genericName} {drug.brandName ? `(${drug.brandName})` : ""}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        Form: {drug.dosageForm}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Qty:</span>
                      <Input
                        type="number"
                        disabled={!drug.enabled}
                        value={drug.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setMedsList((prev) =>
                            prev.map((m, i) => (i === idx ? { ...m, quantity: val } : m))
                          );
                        }}
                        className="h-8 w-16 text-xs font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">₦:</span>
                      <Input
                        type="number"
                        disabled={!drug.enabled}
                        value={drug.unitPrice}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setMedsList((prev) =>
                            prev.map((m, i) => (i === idx ? { ...m, unitPrice: val } : m))
                          );
                        }}
                        className="h-8 w-20 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: TEAM INVITATIONS */}
        {currentStep === 7 && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
                <UserPlus className="size-6 text-teal-600" />
                Step 7: Team Member Invitations
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Invite doctors, nurses, lab technicians, pharmacists, and front desk receptionists to your hospital.
              </p>
            </div>

            <div className="space-y-3">
              {invitationsList.map((inv, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-background p-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center"
                >
                  <Input
                    type="email"
                    value={inv.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInvitationsList((prev) =>
                        prev.map((i, idx2) => (idx2 === idx ? { ...i, email: val } : i))
                      );
                    }}
                    placeholder="doctor@hospital.ng"
                    className="h-9 text-xs"
                  />
                  <Input
                    value={inv.fullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInvitationsList((prev) =>
                        prev.map((i, idx2) => (idx2 === idx ? { ...i, fullName: val } : i))
                      );
                    }}
                    placeholder="Full Name"
                    className="h-9 text-xs"
                  />
                  <Select
                    value={inv.role}
                    onValueChange={(val) => {
                      setInvitationsList((prev) =>
                        prev.map((i, idx2) => (idx2 === idx ? { ...i, role: val } : i))
                      );
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctor">Doctor / Physician</SelectItem>
                      <SelectItem value="nurse">Nurse / Matron</SelectItem>
                      <SelectItem value="lab_tech">Lab Scientist</SelectItem>
                      <SelectItem value="pharmacist">Pharmacist</SelectItem>
                      <SelectItem value="front_desk">Front Desk / Receptionist</SelectItem>
                      <SelectItem value="hospital_admin">Hospital Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Input
                      value={inv.department}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInvitationsList((prev) =>
                          prev.map((i, idx2) => (idx2 === idx ? { ...i, department: val } : i))
                        );
                      }}
                      placeholder="Department"
                      className="h-9 text-xs flex-1"
                    />
                    {invitationsList.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInvitationsList((prev) => prev.filter((_, i) => i !== idx))}
                        className="size-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setInvitationsList((prev) => [
                    ...prev,
                    { email: "", fullName: "", role: "nurse", department: "Inpatient Ward" },
                  ])
                }
                className="text-xs font-semibold gap-1.5 border-teal-500/40 text-teal-700 dark:text-teal-300"
              >
                <Plus className="size-3.5" /> Add Another Staff Member
              </Button>
            </div>
          </div>
        )}

        {/* STEP 8: SHIFT TEMPLATES */}
        {currentStep === 8 && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
                <Clock className="size-6 text-teal-600" />
                Step 8: Standard Shift Templates & Rosters
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Define the recurring duty shifts for your doctors, nurses, and clinical staff.
              </p>
            </div>

            <div className="space-y-3">
              {shiftTemplates.map((shift, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-background p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-foreground block">{shift.shiftName}</span>
                    <span className="text-muted-foreground">
                      Hours: <strong className="font-mono text-foreground">{shift.startTime} — {shift.endTime}</strong>
                    </span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {shift.days.map((d) => (
                        <span key={d} className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-300 font-mono text-[10px]">
                    Active Template
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 9: PUBLIC DIRECTORY LANDING PAGE */}
        {currentStep === 9 && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
                <Globe className="size-6 text-teal-600" />
                Step 9: Public Landing Page & Online Booking Settings
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure what patients see in the HospNest public hospital directory and enable self-service bookings.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-teal-500/30 bg-teal-500/5">
                <div>
                  <span className="font-bold text-sm text-foreground block">List Hospital on Public Directory</span>
                  <p className="text-xs text-muted-foreground">
                    Allows self-registering patients to discover your facility and schedule appointments online.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublicListed}
                  onChange={(e) => setIsPublicListed(e.target.checked)}
                  className="size-5 rounded accent-teal-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-xs font-semibold">Hospital Bio / Mission Summary</Label>
                <Textarea
                  id="bio"
                  rows={3}
                  value={publicBio}
                  onChange={(e) => setPublicBio(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="visiting" className="text-xs font-semibold">Visiting Hours</Label>
                  <Input
                    id="visiting"
                    value={visitingHours}
                    onChange={(e) => setVisitingHours(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hotline" className="text-xs font-semibold">Emergency Ambulance Hotline</Label>
                  <Input
                    id="hotline"
                    value={emergencyHotline}
                    onChange={(e) => setEmergencyHotline(e.target.value)}
                    className="h-10 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 10: REVIEW & GO-LIVE READINESS CHECKLIST */}
        {currentStep === 10 && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
                <Rocket className="size-6 text-teal-600" />
                Step 10: Review & Go-Live Readiness Checklist
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Verify your hospital configuration before opening for clinical operations.
              </p>
            </div>

            {/* Readiness Meter */}
            <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-foreground">
                  Overall System Readiness Score
                </span>
                <span className="font-mono text-2xl font-black text-teal-700 dark:text-teal-300">
                  {progressData?.readinessScore ?? 100}%
                </span>
              </div>

              <div className="h-3 w-full rounded-full bg-teal-200/50 dark:bg-teal-950 overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressData?.readinessScore ?? 100}%` }}
                />
              </div>
            </div>

            {/* Checklist Grid */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-border bg-background p-3.5 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-foreground block">Facility Identity & Licence</span>
                  <span className="text-muted-foreground">{hospName} ({state})</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3.5 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-foreground block">Departments Configured</span>
                  <span className="text-muted-foreground">{selectedDepartments.length} Active Departments</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3.5 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-foreground block">Wards & Bed Capacity</span>
                  <span className="text-muted-foreground">
                    {wardsList.reduce((acc, w) => acc + w.capacity, 0)} Total Beds
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3.5 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-foreground block">Tariff Schedule & Billing</span>
                  <span className="text-muted-foreground">{tariffsList.length} Fee Items Configured</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3.5 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-foreground block">Diagnostic Lab Catalogue</span>
                  <span className="text-muted-foreground">{labTestsList.filter((t) => t.enabled).length} Tests Online</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3.5 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-foreground block">Pharmacy Formulary Stock</span>
                  <span className="text-muted-foreground">{medsList.filter((m) => m.enabled).length} Starter Drugs Stocked</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1 || saving}
            className="text-xs font-semibold gap-1.5"
          >
            <ArrowLeft className="size-3.5" /> Previous Step
          </Button>

          {currentStep < 10 ? (
            <Button
              size="sm"
              onClick={handleNextStep}
              disabled={saving}
              className="text-xs font-bold gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Save & Continue to Step {currentStep + 1} <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleFinalize}
              disabled={saving}
              className="text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md px-5"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-4" />}
              Launch Hospital & Enter Dashboard
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

