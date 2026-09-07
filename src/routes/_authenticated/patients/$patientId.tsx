import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  AlertTriangle,
  Heart,
  Activity,
  FileText,
  FlaskConical,
  Pill,
  Receipt,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Phone,
  Mail,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Info,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAppShell } from "@/components/layout/AppShell";
import { useServerFn } from "@tanstack/react-start";
import {
  getPatientProfile,
  updatePatientDemographics,
  togglePatientConsent,
  requestBreakGlassAccess,
  type PatientProfileData,
} from "@/lib/patient-profile.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  component: PatientProfilePage,
});

type TabType = "visits" | "vitals" | "labs" | "prescriptions" | "invoices" | "notes";

function PatientProfilePage() {
  const { patientId } = Route.useParams();
  const { activeHospitalId } = useAppShell();
  const getProfileFn = useServerFn(getPatientProfile);
  const updateDemographicsFn = useServerFn(updatePatientDemographics);
  const toggleConsentFn = useServerFn(togglePatientConsent);
  const requestBreakGlassFn = useServerFn(requestBreakGlassAccess);
  const [activeTab, setActiveTab] = useState<TabType>("visits");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBreakGlassOpen, setIsBreakGlassOpen] = useState(false);
  const [breakGlassJustification, setBreakGlassJustification] = useState("");
  const [isPending, startTransition] = useTransition();

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["patient-profile", patientId, activeHospitalId],
    queryFn: () => getProfileFn({ data: { patientId, hospitalId: activeHospitalId || undefined } }),
    enabled: Boolean(patientId),
  });

  // Edit Demographics form state
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editGenotype, setEditGenotype] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editChronicConditions, setEditChronicConditions] = useState("");
  const [editInsuranceProvider, setEditInsuranceProvider] = useState("");
  const [editInsurancePolicyNumber, setEditInsurancePolicyNumber] = useState("");
  const [editInsurancePlanType, setEditInsurancePlanType] = useState("");
  const [editInsuranceExpiryDate, setEditInsuranceExpiryDate] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyRel, setEditEmergencyRel] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");

  const openEditModal = (p: PatientProfileData["patient"]) => {
    setEditPhone(p.phone || "");
    setEditEmail(p.email || "");
    setEditBloodGroup(p.bloodGroup || "");
    setEditGenotype(p.genotype || "");
    setEditAllergies(p.allergies.join(", "));
    setEditChronicConditions(p.chronicConditions.join(", "));
    setEditInsuranceProvider(p.insuranceProvider || "");
    setEditInsurancePolicyNumber(p.insurancePolicyNumber || "");
    setEditInsurancePlanType(p.insurancePlanType || "");
    setEditInsuranceExpiryDate(p.insuranceExpiryDate || "");
    setEditEmergencyName(p.emergencyContact?.name || "");
    setEditEmergencyRel(p.emergencyContact?.relationship || "");
    setEditEmergencyPhone(p.emergencyContact?.phone || "");
    setIsEditOpen(true);
  };

  const handleSaveDemographics = () => {
    startTransition(async () => {
      try {
        const allergiesArr = editAllergies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const chronicArr = editChronicConditions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const res = await updateDemographicsFn({
          data: {
            patientId,
            hospitalId: profile?.activeHospitalId,
            phone: editPhone || undefined,
            email: editEmail || undefined,
            bloodGroup: editBloodGroup || undefined,
            genotype: editGenotype || undefined,
            allergies: allergiesArr,
            chronicConditions: chronicArr,
            insuranceProvider: editInsuranceProvider || undefined,
            insurancePolicyNumber: editInsurancePolicyNumber || undefined,
            insurancePlanType: editInsurancePlanType || undefined,
            insuranceExpiryDate: editInsuranceExpiryDate || undefined,
            emergencyContact:
              editEmergencyName || editEmergencyPhone
                ? {
                    name: editEmergencyName || undefined,
                    relationship: editEmergencyRel || undefined,
                    phone: editEmergencyPhone || undefined,
                  }
                : undefined,
          },
        });

        if (res.success) {
          toast.success("Patient demographics updated successfully");
          setIsEditOpen(false);
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to update demographics");
      }
    });
  };

  const handleToggleConsent = (newChecked: boolean) => {
    startTransition(async () => {
      try {
        const res = await toggleConsentFn({
          data: {
            patientId,
            hospitalId: profile?.activeHospitalId,
            isActive: newChecked,
          },
        });
        if (res.success) {
          toast.success(
            newChecked
              ? "Consent granted for this hospital"
              : "Consent revoked for this hospital",
          );
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to update consent");
      }
    });
  };

  const handleBreakGlassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = breakGlassJustification.trim();
    if (trimmed.length < 6) {
      toast.error("Please provide an emergency justification of at least 6 characters.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await requestBreakGlassFn({
          data: {
            patientId,
            hospitalId: profile?.activeHospitalId || activeHospitalId || undefined,
            justification: trimmed,
          },
        });

        if (res.success) {
          toast.success(res.message || "Emergency break-glass access granted (4 hours).");
          setIsBreakGlassOpen(false);
          setBreakGlassJustification("");
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to execute emergency break-glass override.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading patient profile...</p>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Button asChild size="sm" variant="ghost" className="mb-4">
          <Link to="/patients">
            <ArrowLeft className="mr-1.5 size-4" /> Back to Directory
          </Link>
        </Button>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center space-y-4">
          <AlertTriangle className="mx-auto size-12 text-rose-600" />
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Access Restricted / Encounter Required
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-lg mx-auto">
              {(error as any)?.message ||
                "Patient medical record access requires active consent or an active shift/encounter."}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => setIsBreakGlassOpen(true)}
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-semibold shadow-md"
            >
              <ShieldAlert className="size-4" />
              Emergency Access (Break-Glass Override)
            </Button>
            <Button asChild variant="outline">
              <Link to="/patients">Back to Directory</Link>
            </Button>
          </div>
        </div>

        {/* Break-Glass Modal for error boundary */}
        <Dialog open={isBreakGlassOpen} onOpenChange={setIsBreakGlassOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-rose-600 flex items-center gap-2">
                <ShieldAlert className="size-5" />
                Emergency Medical Record Override (Break-Glass)
              </DialogTitle>
              <DialogDescription>
                Break-glass unlocks immediate 4-hour clinical access for acute medical emergencies.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleBreakGlassSubmit} className="space-y-4 pt-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-600" />
                  Statutory Compliance & Audit Notice
                </p>
                <p>
                  Initiating emergency override will record an immutable <strong>BREAK_GLASS_OVERRIDE</strong> event with your user ID, role, timestamp, and justification into the hospital's cryptographic audit ledger. Hospital administrators will be notified immediately.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="error-bg-justification" className="text-xs font-semibold">
                  Clinical Emergency Justification (min 6 characters) *
                </Label>
                <Textarea
                  id="error-bg-justification"
                  required
                  minLength={6}
                  rows={3}
                  value={breakGlassJustification}
                  onChange={(e) => setBreakGlassJustification(e.target.value)}
                  placeholder="e.g., Patient unconscious in ER triage with severe trauma; immediate access needed to check blood group and allergies."
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  {breakGlassJustification.trim().length} / 6 characters minimum
                </p>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBreakGlassOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || breakGlassJustification.trim().length < 6}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldAlert className="size-3.5" />}
                  Authorize Emergency Access
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const { patient, consent, encounters, vitals, labOrders, prescriptions, invoices, isClinical, callerRole } =
    profile;

  const canEdit = ["front_desk", "hospital_admin", "super_admin", "doctor"].includes(callerRole);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild size="sm" variant="ghost" className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/patients">
            <ArrowLeft className="mr-1.5 size-4" /> Back to Patient Directory
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {isClinical && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsBreakGlassOpen(true)}
              className="gap-1.5 border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 font-medium"
            >
              <ShieldAlert className="size-3.5 text-rose-600" /> Emergency Break-Glass
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditModal(patient)}
              className="gap-1.5 border-border"
            >
              <Edit className="size-3.5" /> Edit Demographics
            </Button>
          )}
          <Button asChild size="sm" className="gap-1.5 shadow-sm">
            <Link to="/front-desk">
              <Stethoscope className="size-3.5" /> Start Encounter
            </Link>
          </Button>
        </div>
      </div>

      {/* Emergency Break-Glass Active Banner */}
      {consent.isBreakGlass && (
        <div className="rounded-2xl border-2 border-rose-500 bg-rose-500/10 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 animate-pulse">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  🚨 Emergency Break-Glass Override Active
                </h3>
                <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider font-mono">
                  4-Hour Emergency Access
                </span>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 max-w-3xl">
                Full clinical record view has been unlocked for immediate medical emergency intervention.
                {consent.expiresAt &&
                  ` Access expires at ${new Date(consent.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`}{" "}
                Every view and query is cryptographically logged under <strong>BREAK_GLASS_OVERRIDE</strong> in the immutable audit trail.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Demographic Header Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-display text-2xl font-bold">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {patient.fullName}
                </h1>
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {patient.age} • {patient.gender || "Unknown"}
                </span>
                {patient.isNinMasked ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                    <Lock className="size-3" /> NIN: {patient.nin}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-xs font-medium text-primary">
                    NIN: {patient.nin}
                  </span>
                )}
              </div>

              {/* Contact and Emergency Meta */}
              <div className="mt-3 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-muted-foreground">
                {patient.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-primary/70" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-primary/70" />
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.dateOfBirth && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary/70" />
                    <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {patient.emergencyContact?.name && (
                <div className="mt-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-semibold text-foreground">Emergency Contact: </span>
                  <span className="text-foreground">{patient.emergencyContact.name}</span>
                  {patient.emergencyContact.relationship && (
                    <span className="text-muted-foreground"> ({patient.emergencyContact.relationship})</span>
                  )}
                  {patient.emergencyContact.phone && (
                    <span className="ml-2 font-mono text-primary font-medium">{patient.emergencyContact.phone}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Consent Status Panel */}
          <div className="rounded-xl border border-border/80 bg-background p-4 min-w-[260px] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {consent.isActive ? (
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ShieldAlert className="size-4 text-amber-500" />
                )}
                <span className="text-xs font-bold text-foreground">Hospital Consent</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  consent.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {consent.isActive ? "Active" : "Inactive / Revoked"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {consent.isActive
                ? "This hospital is authorized to access and write medical records for this patient."
                : "Record sharing is currently revoked or not granted for this hospital."}
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="text-xs font-medium text-foreground">Consent Switch</span>
              <Switch
                checked={consent.isActive}
                onCheckedChange={handleToggleConsent}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* Clinical Alert Badges Banner */}
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Blood & Genotype */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-950 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-700 dark:text-red-400">
              <Heart className="size-3.5 fill-red-500 text-red-500" />
              <span>Blood Group: {patient.bloodGroup || "Not recorded"}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <Activity className="size-3.5" />
              <span>Genotype: {patient.genotype || "Not recorded"}</span>
            </div>

            {/* Allergies Highlight */}
            {patient.allergies.length > 0 ? (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400" />
                <span>Allergies: {patient.allergies.join(", ")}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>No known allergies</span>
              </div>
            )}

            {/* Chronic Conditions */}
            {patient.chronicConditions.length > 0 ? (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Info className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span>Chronic: {patient.chronicConditions.join(", ")}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>No chronic conditions</span>
              </div>
            )}

            {/* HMO / Insurance Coverage */}
            {patient.insuranceProvider ? (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 dark:border-blue-900 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                <ShieldCheck className="size-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  HMO: {patient.insuranceProvider} ({patient.insurancePlanType || "Plan"}) • ID:{" "}
                  {patient.insurancePolicyNumber || "N/A"}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                <ShieldAlert className="size-3.5 text-muted-foreground" />
                <span>Private / Self-Pay (No HMO)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-2 md:space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
          {[
            { id: "visits", label: "Visits & Encounters", icon: Calendar, count: encounters.length },
            { id: "vitals", label: "Vitals History", icon: Activity, count: vitals.length },
            { id: "labs", label: "Lab Results", icon: FlaskConical, count: labOrders.length },
            { id: "prescriptions", label: "Prescriptions", icon: Pill, count: prescriptions.length },
            { id: "invoices", label: "Invoices & Billing", icon: Receipt, count: invoices.length },
            { id: "notes", label: "Clinical Notes", icon: FileText, count: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-mono text-[11px] ${
                      isCurrent
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Panels */}
      <div className="mt-4">
        {/* Tab: Visits & Encounters */}
        {activeTab === "visits" && (
          <div className="space-y-4">
            {encounters.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <Calendar className="mx-auto size-10 text-muted-foreground/60" />
                <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                  No encounters recorded yet
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  Visits created through front-desk check-in or doctor triage will appear here.
                </p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/front-desk">Create First Encounter</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {encounters.map((enc) => (
                  <div
                    key={enc.id}
                    className="rounded-xl border border-border bg-card p-5 shadow-soft transition-all hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            enc.status === "in_consultation"
                              ? "bg-primary/15 text-primary"
                              : enc.status === "triage"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : enc.status === "admitted"
                              ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {enc.status.replace("_", " ")}
                        </span>
                        {enc.isBreakGlass && (
                          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">
                            BREAK-GLASS
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(enc.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">ID: {enc.id.slice(0, 8)}</div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Chief Complaint:</span>
                        <p className="text-sm font-medium text-foreground">
                          {enc.chiefComplaint || "Routine check-up / Not specified"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Diagnosis:</span>
                        <p className={`text-sm ${isClinical ? "font-medium text-foreground" : "italic text-muted-foreground"}`}>
                          {enc.diagnosis || "Pending clinical review"}
                        </p>
                      </div>
                    </div>

                    {(enc.practitionerName || enc.departmentName) && (
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-2.5">
                        {enc.practitionerName && (
                          <span className="flex items-center gap-1">
                            <Stethoscope className="size-3.5 text-primary" /> Dr. {enc.practitionerName}
                          </span>
                        )}
                        {enc.departmentName && (
                          <span>Dept: {enc.departmentName}</span>
                        )}
                        {enc.wardName && (
                          <span>Ward: {enc.wardName}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Vitals */}
        {activeTab === "vitals" && (
          <div className="space-y-4">
            {vitals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <Activity className="mx-auto size-10 text-muted-foreground/60" />
                <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                  No vitals recorded yet
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  Vitals recorded by nurses during triage (Prompt 6) will display here in real-time.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {vitals.map((v) => (
                  <div key={v.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/60 pb-2">
                      <span>{new Date(v.recordedAt).toLocaleString()}</span>
                      {v.recordedByName && <span>By {v.recordedByName}</span>}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/40 p-2">
                        <span className="text-muted-foreground">Blood Pressure</span>
                        <p className="font-mono text-base font-bold text-foreground">
                          {v.systolicBp && v.diastolicBp ? `${v.systolicBp}/${v.diastolicBp}` : "—"} <span className="text-[10px] font-normal text-muted-foreground">mmHg</span>
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <span className="text-muted-foreground">Pulse Rate</span>
                        <p className="font-mono text-base font-bold text-foreground">
                          {v.pulseRate || "—"} <span className="text-[10px] font-normal text-muted-foreground">bpm</span>
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <span className="text-muted-foreground">Temperature</span>
                        <p className="font-mono text-base font-bold text-foreground">
                          {v.bodyTemperature || "—"} <span className="text-[10px] font-normal text-muted-foreground">°C</span>
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <span className="text-muted-foreground">SpO2 Oxygen</span>
                        <p className="font-mono text-base font-bold text-foreground">
                          {v.spo2 || "—"} <span className="text-[10px] font-normal text-muted-foreground">%</span>
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <span className="text-muted-foreground">Weight & Height</span>
                        <p className="font-mono text-xs font-semibold text-foreground">
                          {v.weightKg ? `${v.weightKg} kg` : "—"} • {v.heightCm ? `${v.heightCm} cm` : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <span className="text-muted-foreground">Pain Score</span>
                        <p className="font-mono text-xs font-semibold text-foreground">
                          {v.painScore !== null ? `${v.painScore} / 10` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Lab Results */}
        {activeTab === "labs" && (
          <div className="space-y-4">
            {labOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <FlaskConical className="mx-auto size-10 text-muted-foreground/60" />
                <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                  No laboratory investigations found
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  Diagnostic lab orders created in Phase 4 (Prompt 11–13) will be logged here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {labOrders.map((lab) => (
                  <div key={lab.id} className="rounded-xl border border-border bg-card p-4 shadow-soft flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{lab.testName}</h4>
                        {lab.isCritical && (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600">
                            CRITICAL VALUE
                          </span>
                        )}
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground uppercase">
                          {lab.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Sample: {lab.sampleType || "Blood/Serum"} • Ordered by {lab.orderedByName || "Physician"} on {new Date(lab.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {isClinical ? (
                        <div className="font-mono text-sm font-bold text-foreground">
                          {lab.resultValue || "Awaiting results"}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">Restricted view</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Prescriptions */}
        {activeTab === "prescriptions" && (
          <div className="space-y-4">
            {prescriptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <Pill className="mx-auto size-10 text-muted-foreground/60" />
                <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                  No medication orders recorded
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  Prescriptions ordered during doctor consultations and dispensed by pharmacy will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-xl border border-border bg-card p-4 shadow-soft space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 text-xs">
                      <div>
                        <span className="font-bold text-foreground">Prescribed by Dr. {rx.doctorName || "Staff"}</span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(rx.createdAt).toLocaleDateString()} at{" "}
                          {new Date(rx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            rx.status === "dispensed"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : rx.status === "partially_dispensed"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {rx.status.replace("_", " ")}
                        </span>
                        {rx.status !== "dispensed" && isClinical && (
                          <Button asChild size="sm" variant="outline" className="h-6 text-[11px] px-2">
                            <Link to="/pharmacy">Go to Dispensing</Link>
                          </Button>
                        )}
                      </div>
                    </div>

                    {rx.notes && (
                      <p className="text-xs text-muted-foreground italic bg-muted/20 rounded-md p-2">
                        Instructions: {rx.notes}
                      </p>
                    )}

                    <div className="space-y-2">
                      {rx.items.map((item) => {
                        const isDispensed = item.quantityDispensed >= item.quantityPrescribed;
                        const isPartial = item.quantityDispensed > 0 && !isDispensed;

                        return (
                          <div
                            key={item.id}
                            className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between text-xs rounded-lg border border-border/40 bg-muted/20 p-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm">{item.drugName}</span>
                                {isDispensed ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3" /> Dispensed
                                  </span>
                                ) : isPartial ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                                    Partial ({item.quantityDispensed}/{item.quantityPrescribed})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                    Pending Dispense
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-muted-foreground">
                                {item.dosage || ""} {item.frequency ? `• ${item.frequency}` : ""}{" "}
                                {item.duration ? `(${item.duration})` : ""}
                              </p>
                              {item.dispenseNotes && (
                                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 italic mt-0.5">
                                  Dispense Note: {item.dispenseNotes}
                                </p>
                              )}
                            </div>

                            <div className="text-right space-y-0.5">
                              <div className="font-mono text-xs font-semibold text-foreground">
                                Qty: {item.quantityPrescribed} (Dispensed: {item.quantityDispensed})
                              </div>
                              {item.dispensedAt && (
                                <div className="text-[10px] text-muted-foreground">
                                  Dispensed {new Date(item.dispensedAt).toLocaleDateString()}
                                  {item.dispensedByName && ` by ${item.dispensedByName}`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Invoices & Billing */}
        {activeTab === "invoices" && (
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <Receipt className="mx-auto size-10 text-muted-foreground/60" />
                <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                  No invoices or billing records
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  Invoices generated by consultations, laboratory, and pharmacy dispensing will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {invoices.map((inv) => (
                  <div key={inv.id} className="rounded-xl border border-border bg-card p-4 shadow-soft space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">{inv.invoiceNumber}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                            inv.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : inv.status === "partially_paid"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {inv.status.replace("_", " ")}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          Issued on {new Date(inv.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline" className="h-6 text-[11px] px-2">
                          <Link to="/billing">Go to Billing & Payments</Link>
                        </Button>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg bg-muted/20 p-3 text-xs">
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold">Total Amount</span>
                        <div className="font-mono font-bold text-foreground text-sm">
                          ₦{inv.totalAmount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold">HMO Coverage</span>
                        <div className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-sm">
                          ₦{inv.insuranceCoverageAmount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold">Paid to Date</span>
                        <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                          ₦{inv.amountPaid.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold">Balance Due</span>
                        <div className={`font-mono font-bold text-sm ${inv.balanceDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}`}>
                          ₦{inv.balanceDue.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Itemized Lines */}
                    {inv.lineItems.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Billed Service Items
                        </span>
                        <div className="divide-y divide-border/40 rounded-lg border border-border/40 bg-card">
                          {inv.lineItems.map((line) => (
                            <div key={line.id} className="flex items-center justify-between px-3 py-2 text-xs">
                              <div>
                                <span className="font-medium text-foreground">{line.description || "Medical Service"}</span>
                                <span className="text-muted-foreground ml-2 uppercase text-[10px]">({line.serviceType})</span>
                              </div>
                              <div className="font-mono text-muted-foreground">
                                {line.quantity} × ₦{line.unitPrice.toLocaleString()} = <span className="font-bold text-foreground">₦{line.totalPrice.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Clinical Notes */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            {!isClinical ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <Lock className="mx-auto size-10 text-muted-foreground/60" />
                <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                  Restricted Access
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                  Clinical and psychiatric consultation notes are restricted to verified clinical roles (Doctors, Nurses, Admins).
                </p>
              </div>
            ) : encounters.filter((e) => e.clinicalNotes || e.psychiatricNotes).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <FileText className="mx-auto size-10 text-muted-foreground/60" />
                <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                  No clinical notes recorded
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  SOAP clinical progress notes and psychiatric notes from consultations (Prompt 8–10) will populate this section.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {encounters
                  .filter((e) => e.clinicalNotes || e.psychiatricNotes)
                  .map((e) => (
                    <div key={e.id} className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-3">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2 text-xs">
                        <span className="font-bold text-foreground">
                          Encounter with Dr. {e.practitionerName || "Attending"}
                        </span>
                        <span className="text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                      </div>
                      {e.clinicalNotes && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">Clinical SOAP Notes:</span>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                            {e.clinicalNotes}
                          </p>
                        </div>
                      )}
                      {e.psychiatricNotes && (
                        <div>
                          <span className="text-xs font-semibold text-destructive">Confidential Psychiatric Notes:</span>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground bg-destructive/5 p-3 rounded-lg border border-destructive/20">
                            {e.psychiatricNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Demographics Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">
              Edit Patient Demographics
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update contact info, emergency contacts, blood group, allergies, and chronic conditions. All edits are logged in the audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-phone" className="text-xs">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="08012345678"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-email" className="text-xs">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-blood" className="text-xs">Blood Group</Label>
                <Select value={editBloodGroup} onValueChange={setEditBloodGroup}>
                  <SelectTrigger id="edit-blood" className="h-9 text-xs">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <SelectItem key={bg} value={bg} className="text-xs">
                        {bg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-genotype" className="text-xs">Genotype</Label>
                <Select value={editGenotype} onValueChange={setEditGenotype}>
                  <SelectTrigger id="edit-genotype" className="h-9 text-xs">
                    <SelectValue placeholder="Select genotype" />
                  </SelectTrigger>
                  <SelectContent>
                    {["AA", "AS", "SS", "AC", "SC"].map((gt) => (
                      <SelectItem key={gt} value={gt} className="text-xs">
                        {gt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-allergies" className="text-xs">
                Allergies <span className="text-muted-foreground">(comma separated)</span>
              </Label>
              <Input
                id="edit-allergies"
                value={editAllergies}
                onChange={(e) => setEditAllergies(e.target.value)}
                placeholder="Penicillin, Peanuts, Sulfa drugs"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-chronic" className="text-xs">
                Chronic Conditions <span className="text-muted-foreground">(comma separated)</span>
              </Label>
              <Input
                id="edit-chronic"
                value={editChronicConditions}
                onChange={(e) => setEditChronicConditions(e.target.value)}
                placeholder="Hypertension, Type 2 Diabetes, Asthma"
                className="h-9 text-xs"
              />
            </div>

            <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-500/5 p-3 space-y-2">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" /> Insurance / HMO Coverage Details
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">HMO Provider</Label>
                  <Input
                    value={editInsuranceProvider}
                    onChange={(e) => setEditInsuranceProvider(e.target.value)}
                    placeholder="e.g. Reliance HMO, AXA Mansard, NHIS"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Enrollee / Policy ID</Label>
                  <Input
                    value={editInsurancePolicyNumber}
                    onChange={(e) => setEditInsurancePolicyNumber(e.target.value)}
                    placeholder="e.g. REL-849201"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Plan Type</Label>
                  <Input
                    value={editInsurancePlanType}
                    onChange={(e) => setEditInsurancePlanType(e.target.value)}
                    placeholder="e.g. Gold, Platinum, Corporate"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Expiry Date</Label>
                  <Input
                    type="date"
                    value={editInsuranceExpiryDate}
                    onChange={(e) => setEditInsuranceExpiryDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <span className="text-xs font-bold text-foreground">Emergency Contact</span>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={editEmergencyName}
                  onChange={(e) => setEditEmergencyName(e.target.value)}
                  placeholder="Full name"
                  className="h-8 text-xs col-span-1"
                />
                <Input
                  value={editEmergencyRel}
                  onChange={(e) => setEditEmergencyRel(e.target.value)}
                  placeholder="Relationship (e.g. Spouse)"
                  className="h-8 text-xs col-span-1"
                />
                <Input
                  value={editEmergencyPhone}
                  onChange={(e) => setEditEmergencyPhone(e.target.value)}
                  placeholder="Phone number"
                  className="h-8 text-xs col-span-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDemographics}
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Break-Glass Emergency Override Modal */}
      <Dialog open={isBreakGlassOpen} onOpenChange={setIsBreakGlassOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <ShieldAlert className="size-5" />
              Emergency Medical Record Override (Break-Glass)
            </DialogTitle>
            <DialogDescription>
              Break-glass unlocks immediate 4-hour clinical access for acute medical emergencies.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBreakGlassSubmit} className="space-y-4 pt-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-amber-600" />
                Statutory Compliance & Audit Notice
              </p>
              <p>
                Initiating emergency override will record an immutable <strong>BREAK_GLASS_OVERRIDE</strong> event with your user ID, role, timestamp, and justification into the hospital's cryptographic audit ledger. Hospital administrators will be notified immediately.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="main-bg-justification" className="text-xs font-semibold">
                Clinical Emergency Justification (min 6 characters) *
              </Label>
              <Textarea
                id="main-bg-justification"
                required
                minLength={6}
                rows={3}
                value={breakGlassJustification}
                onChange={(e) => setBreakGlassJustification(e.target.value)}
                placeholder="e.g., Acute emergency in ICU; patient incapacitated and urgent access required to review past medications and allergy profile."
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                {breakGlassJustification.trim().length} / 6 characters minimum
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBreakGlassOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || breakGlassJustification.trim().length < 6}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldAlert className="size-3.5" />}
                Authorize Emergency Access
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
