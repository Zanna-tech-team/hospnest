import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { claimStaffInvitation, submitStaffJoinRequest, type StaffRole } from "@/lib/team.functions";
import {
  selfRegisterHospitalAdmin,
  getPublicHospitalDirectory,
} from "@/lib/hospital.functions";
import {
  selfRegisterNewPatientAccount,
  verifyAndRegisterPatientAccount,
  getAuthUserRoleRedirect,
} from "@/lib/patient-portal.functions";
import { PatientOnboardingModal } from "@/components/auth/PatientOnboardingModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Building2,
  HeartPulse,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  UserPlus,
  Stethoscope,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  LogIn,
  Hospital,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/hospnest-logo.png.asset.json";

const title = "Sign In & Facility Onboarding — HospNest";
const description =
  "Access national unified hospital management, clinical staff workstation, facility onboarding, and patient portal.";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const CLINICAL_ROLES: { value: StaffRole; label: string; description: string }[] = [
  { value: "doctor", label: "Medical Doctor / Consultant", description: "Consulting rooms, clinical notes, prescriptions, and lab orders" },
  { value: "nurse", label: "Registered Nurse / Matron", description: "Triage vitals, ward admissions, medication administration, and care plans" },
  { value: "pharmacist", label: "Pharmacist", description: "Medication dispensing, stock inventory, and prescription fulfillment" },
  { value: "lab_tech", label: "Laboratory Scientist", description: "Sample accessioning, diagnostic tests, and verified lab results" },
  { value: "hospital_admin", label: "Hospital Operations / Records Admin", description: "Billing, appointments, patient registry, and front desk" },
];

function safePath(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "";
}

export const Route = createFileRoute("/auth")({
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
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search["next"] === "string" ? (search["next"] as string) : undefined,
    invite: typeof search["invite"] === "string" ? (search["invite"] as string) : undefined,
    email: typeof search["email"] === "string" ? (search["email"] as string) : undefined,
    tab: typeof search["tab"] === "string" ? (search["tab"] as string) : undefined,
    status: typeof search["status"] === "string" ? (search["status"] as string) : undefined,
    mode: typeof search["mode"] === "string" ? (search["mode"] as string) : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const customNext = safePath(search.next);
  const inviteToken = search.invite;
  const initialEmail = search.email || "";

  const claimFn = useServerFn(claimStaffInvitation);
  const selfRegisterPatientFn = useServerFn(selfRegisterNewPatientAccount);
  const verifyPatientFn = useServerFn(verifyAndRegisterPatientAccount);
  const getRoleRedirectFn = useServerFn(getAuthUserRoleRedirect);
  const selfRegisterAdminFn = useServerFn(selfRegisterHospitalAdmin);
  const getHospitalsDirectoryFn = useServerFn(getPublicHospitalDirectory);
  const submitStaffJoinFn = useServerFn(submitStaffJoinRequest);

  // Top level auth mode: "signin" vs "register"
  const [authMode, setAuthMode] = useState<"signin" | "register">(
    inviteToken || search.mode === "register" ? "register" : "signin"
  );

  // Registration sub-tab: "hospital_admin" | "staff" | "patient"
  const [registerTab, setRegisterTab] = useState<"hospital_admin" | "staff" | "patient">(
    search.tab === "patient" ? "patient" : search.tab === "staff" ? "staff" : "hospital_admin"
  );

  // Sign in form state
  const [signInEmail, setSignInEmail] = useState(initialEmail);
  const [signInPassword, setSignInPassword] = useState("");

  // Hospital Admin Registration Form
  const [adminHospitalName, setAdminHospitalName] = useState("");
  const [adminHospitalType, setAdminHospitalType] = useState<"government" | "private">("private");
  const [adminState, setAdminState] = useState("FCT Abuja");
  const [adminLicenseNumber, setAdminLicenseNumber] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Staff Join Request Form
  const [hospitalDirectory, setHospitalDirectory] = useState<
    Array<{ id: string; name: string; state: string | null; hospitalType: string | null; slug: string | null }>
  >([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const [staffHospitalId, setStaffHospitalId] = useState("");
  const [staffFullName, setStaffFullName] = useState("");
  const [staffEmail, setStaffEmail] = useState(initialEmail);
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("doctor");
  const [staffLicense, setStaffLicense] = useState("");
  const [staffSpecialization, setStaffSpecialization] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [pendingSuccessData, setPendingSuccessData] = useState<{
    hospitalName: string;
    role: string;
    fullName: string;
  } | null>(null);

  // Patient Registration Form
  const [patientRegType, setPatientRegType] = useState<"new_patient" | "existing_record">("new_patient");
  const [patientNin, setPatientNin] = useState("");
  const [patientFirstName, setPatientFirstName] = useState("");
  const [patientLastName, setPatientLastName] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientGender, setPatientGender] = useState("other");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPassword, setPatientPassword] = useState("");

  // Optional Medical Profile
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [bloodGroup, setBloodGroup] = useState("");
  const [genotype, setGenotype] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [chronicConditionsText, setChronicConditionsText] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Onboarding Wizard Modal for Patients
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [registeredPatientName, setRegisteredPatientName] = useState("");
  const [registeredPatientEmail, setRegisteredPatientEmail] = useState("");

  // Load public hospital directory on mount for staff dropdown
  useEffect(() => {
    let mounted = true;
    setIsLoadingHospitals(true);
    getHospitalsDirectoryFn()
      .then((res) => {
        if (mounted && res?.hospitals) {
          setHospitalDirectory(res.hospitals);
          if (res.hospitals.length > 0 && !staffHospitalId) {
            setStaffHospitalId(res.hospitals[0].id);
          }
        }
      })
      .catch((e) => {
        console.warn("Could not load hospital directory:", e);
      })
      .finally(() => {
        if (mounted) setIsLoadingHospitals(false);
      });
    return () => {
      mounted = false;
    };
  }, [getHospitalsDirectoryFn]);

  const resolveRedirect = async () => {
    if (customNext) {
      navigate({ to: customNext });
      return;
    }
    try {
      const redirectData = await getRoleRedirectFn();
      if (redirectData.redirectPath === "/auth?status=pending_approval") {
        setPendingSuccessData({
          hospitalName: redirectData.hospitalName || "your selected hospital",
          role: redirectData.requestedRole || "staff",
          fullName: "Staff Applicant",
        });
        return;
      }
      navigate({ to: redirectData.redirectPath || "/dashboard" });
    } catch {
      navigate({ to: "/dashboard" });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        if (inviteToken) {
          try {
            await claimFn({ data: { token: inviteToken } });
            toast.success("Staff invitation activated! Welcome to the team.");
          } catch (e: any) {
            console.warn("Auto-claim invitation note:", e.message);
          }
        }
        await resolveRedirect();
      }
    });
  }, [navigate, customNext, inviteToken, claimFn]);

  // Handle Standard Sign In
  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      });
      if (error) throw error;

      if (inviteToken) {
        try {
          await claimFn({ data: { token: inviteToken } });
          toast.success("Staff invitation activated! Welcome to the team.");
        } catch (err: any) {
          console.warn("Invitation claim:", err.message);
        }
      }

      await resolveRedirect();
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Sign in failed";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  // Handle Hospital Admin Registration
  async function handleHospitalAdminRegister(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);

    try {
      const result = await selfRegisterAdminFn({
        data: {
          hospitalName: adminHospitalName.trim(),
          hospitalType: adminHospitalType,
          state: adminState,
          licenseNumber: adminLicenseNumber.trim(),
          fullName: adminFullName.trim(),
          email: adminEmail.trim(),
          phone: adminPhone.trim() || undefined,
          password: adminPassword,
        },
      });

      if (!result?.success) {
        throw new Error(result?.message || "Hospital onboarding failed.");
      }

      toast.success(`Hospital created! Welcome to ${result.name}.`);

      // Sign in with the created credentials
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });

      if (signInErr) {
        toast.info("Registration successful. Please sign in with your password.");
        setAuthMode("signin");
        setSignInEmail(adminEmail.trim());
        return;
      }

      // Navigate directly to Hospital Setup wizard
      navigate({ to: "/hospital-setup" });
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Registration failed";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  // Handle Staff Affiliation Join Request
  async function handleStaffJoinRegister(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);

    if (!staffHospitalId) {
      setFormError("Please select the hospital you wish to join.");
      setBusy(false);
      return;
    }

    try {
      const result = await submitStaffJoinFn({
        data: {
          hospitalId: staffHospitalId,
          fullName: staffFullName.trim(),
          email: staffEmail.trim(),
          password: staffPassword,
          phone: staffPhone.trim() || undefined,
          requestedRole: staffRole,
          medicalLicenseNumber: staffLicense.trim() || undefined,
          specialization: staffSpecialization.trim() || undefined,
        },
      });

      if (!result?.success) {
        throw new Error(result?.message || "Could not submit join request.");
      }

      // Sign in user so session is active
      await supabase.auth.signInWithPassword({
        email: staffEmail.trim(),
        password: staffPassword,
      });

      setPendingSuccessData({
        hospitalName: result.hospitalName,
        role: staffRole,
        fullName: staffFullName.trim(),
      });
      toast.success("Affiliation request submitted successfully!");
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Staff registration failed";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  // Handle Patient Registration
  async function handlePatientSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);

    try {
      const cleanNin = patientNin.trim().replace(/\D/g, "");
      if (cleanNin.length !== 11) {
        throw new Error("Please enter a valid 11-digit NIN.");
      }

      if (patientRegType === "new_patient") {
        const allergiesArr = allergiesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const chronicArr = chronicConditionsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const result = await selfRegisterPatientFn({
          data: {
            nin: cleanNin,
            firstName: patientFirstName.trim(),
            lastName: patientLastName.trim(),
            dateOfBirth: patientDob,
            gender: patientGender,
            phone: patientPhone.trim(),
            email: patientEmail.trim(),
            password: patientPassword,
            bloodGroup: bloodGroup || undefined,
            genotype: genotype || undefined,
            allergies: allergiesArr,
            chronicConditions: chronicArr,
            emergencyContactName: emergencyName.trim() || undefined,
            emergencyContactPhone: emergencyPhone.trim() || undefined,
            emergencyContactRelation: emergencyRelation.trim() || undefined,
          },
        });

        if (!result?.success) {
          setFormError(result?.error || "Registration failed. Please check your information.");
          toast.error(result?.error || "Registration failed.");
          return;
        }

        toast.success("Account created successfully!");

        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: patientEmail.trim(),
          password: patientPassword,
        });

        if (signInErr) {
          toast.info("Account registered. Please sign in with your password.");
          setAuthMode("signin");
          setSignInEmail(patientEmail.trim());
          return;
        }

        setRegisteredPatientName(`${patientFirstName} ${patientLastName}`);
        setRegisteredPatientEmail(patientEmail.trim());
        setIsOnboardingModalOpen(true);
      } else {
        const result = await verifyPatientFn({
          data: {
            nin: cleanNin,
            firstName: patientFirstName.trim(),
            lastName: patientLastName.trim(),
            dateOfBirth: patientDob,
            email: patientEmail.trim(),
            password: patientPassword,
          },
        });

        if (!result?.success) {
          setFormError(result?.error || "We could not verify your hospital record. You can choose 'I am a new patient' to register directly.");
          toast.error(result?.error || "Verification failed.");
          return;
        }

        toast.success("Identity verified! Signing into your patient portal...");
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: patientEmail.trim(),
          password: patientPassword,
        });
        if (signInErr) throw signInErr;
        navigate({ to: "/portal" });
      }
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Verification or sign-in failed";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in is unavailable right now.");
      return;
    }
    if (result.redirected) return;
    if (inviteToken) {
      try {
        await claimFn({ data: { token: inviteToken } });
      } catch (err: any) {
        console.warn("Invitation claim:", err.message);
      }
    }
    await resolveRedirect();
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-slate-100 to-teal-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/20 px-4 py-8 sm:py-12">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl backdrop-blur">
        {/* Header Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo.url} alt="HospNest" className="h-10 w-10 rounded-xl object-contain shadow-sm" />
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-foreground">HospNest</span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-teal-600 dark:text-teal-400">
                National Healthcare Grid
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Encrypted & Audited</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Pending Approval Screen State */}
        {(pendingSuccessData || search.status === "pending_approval") ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-6 text-center space-y-4 animate-in fade-in">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Staff Join Request Under Review
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                {pendingSuccessData?.fullName ? `Hello ${pendingSuccessData.fullName}. ` : ""}
                Your application to join{" "}
                <span className="font-semibold text-foreground">
                  {pendingSuccessData?.hospitalName || "the hospital"}
                </span>{" "}
                as a{" "}
                <span className="font-semibold text-foreground capitalize">
                  {pendingSuccessData?.role ? pendingSuccessData.role.replace("_", " ") : "clinical staff member"}
                </span>{" "}
                is awaiting verification by the Hospital Administrator.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-white/70 dark:bg-amber-900/30 p-3.5 text-left text-xs space-y-1.5 text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Account Created & Securely Stored</span>
              </div>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span>Medical License & Credentials Sent to Admin</span>
              </div>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Full clinical access activates immediately upon admin approval</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setPendingSuccessData(null);
                  setAuthMode("signin");
                }}
              >
                Sign In with Different Account
              </Button>
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs"
                onClick={async () => {
                  setBusy(true);
                  await resolveRedirect();
                  setBusy(false);
                }}
                disabled={busy}
              >
                Check Approval Status
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Switcher: Sign In vs Create Account */}
            <div className="mt-6 flex border-b border-border/80 pb-3">
              <div className="grid w-full grid-cols-2 gap-2 bg-muted/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signin");
                    setFormError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs sm:text-sm font-medium transition-all ${
                    authMode === "signin"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setFormError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs sm:text-sm font-medium transition-all ${
                    authMode === "register"
                      ? "bg-teal-600 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>
            </div>

            {/* -------------------- SIGN IN VIEW -------------------- */}
            {authMode === "signin" && (
              <div className="mt-5 space-y-4 animate-in fade-in">
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    {inviteToken ? "Accept Staff Invitation" : "Welcome Back"}
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    Sign in to your hospital workstation, administrative portal, or patient record.
                  </p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email">Email Address</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      placeholder="doctor@hospital.gov.ng or patient@example.com"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 font-medium"
                    disabled={busy}
                  >
                    {busy ? "Signing in..." : "Sign In to HospNest"}
                  </Button>
                </form>

                <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                </div>

                <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
                  Continue with Google
                </Button>

                <div className="mt-4 pt-3 border-t text-center text-xs text-muted-foreground">
                  New to HospNest?{" "}
                  <button
                    type="button"
                    className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                    onClick={() => {
                      setAuthMode("register");
                      setFormError(null);
                    }}
                  >
                    Create a new account or register your hospital
                  </button>
                </div>
              </div>
            )}

            {/* -------------------- REGISTRATION VIEW (3 PATHWAYS) -------------------- */}
            {authMode === "register" && (
              <div className="mt-5 space-y-4 animate-in fade-in">
                <Tabs
                  value={registerTab}
                  onValueChange={(val) => {
                    setRegisterTab(val as "hospital_admin" | "staff" | "patient");
                    setFormError(null);
                  }}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/70 rounded-xl h-auto gap-1">
                    <TabsTrigger
                      value="hospital_admin"
                      className="flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-lg font-medium text-[11px] sm:text-xs py-2 px-1 text-center data-[state=active]:bg-card data-[state=active]:shadow-xs"
                    >
                      <Hospital className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span>Hospital Admin</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="staff"
                      className="flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-lg font-medium text-[11px] sm:text-xs py-2 px-1 text-center data-[state=active]:bg-card data-[state=active]:shadow-xs"
                    >
                      <Stethoscope className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <span>Clinical Staff</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="patient"
                      className="flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-lg font-medium text-[11px] sm:text-xs py-2 px-1 text-center data-[state=active]:bg-card data-[state=active]:shadow-xs"
                    >
                      <HeartPulse className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                      <span>Patient</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* 1. HOSPITAL ADMIN / ONBOARD FACILITY */}
                  <TabsContent value="hospital_admin" className="mt-4 space-y-4">
                    <div className="rounded-xl border border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20 p-3">
                      <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-semibold text-xs">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Onboard a New Hospital or Clinic</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Create an enterprise workspace for your healthcare facility. You will be set as Medical Director / Chief Administrator.
                      </p>
                    </div>

                    <form onSubmit={handleHospitalAdminRegister} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="admin-hosp-name" className="text-xs">Hospital / Health Facility Name</Label>
                        <Input
                          id="admin-hosp-name"
                          placeholder="e.g. Cedarcrest Specialist Hospital"
                          required
                          value={adminHospitalName}
                          onChange={(e) => setAdminHospitalName(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="admin-hosp-type" className="text-xs">Facility Type</Label>
                          <Select
                            value={adminHospitalType}
                            onValueChange={(v) => setAdminHospitalType(v as "government" | "private")}
                          >
                            <SelectTrigger id="admin-hosp-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">Private Hospital / Clinic</SelectItem>
                              <SelectItem value="government">Government / Public FMC</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="admin-state" className="text-xs">State</Label>
                          <Select value={adminState} onValueChange={(v) => setAdminState(v)}>
                            <SelectTrigger id="admin-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {NIGERIAN_STATES.map((st) => (
                                <SelectItem key={st} value={st}>{st}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="admin-license" className="text-xs">MOH / Facility Registration License Number</Label>
                        <Input
                          id="admin-license"
                          placeholder="e.g. MOH/FCT/2026/049"
                          required
                          value={adminLicenseNumber}
                          onChange={(e) => setAdminLicenseNumber(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t">
                        <div className="space-y-1.5">
                          <Label htmlFor="admin-fullname" className="text-xs">Administrator Full Name</Label>
                          <Input
                            id="admin-fullname"
                            placeholder="Dr. / Chief Admin Name"
                            required
                            value={adminFullName}
                            onChange={(e) => setAdminFullName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="admin-phone" className="text-xs">Official Phone</Label>
                          <Input
                            id="admin-phone"
                            type="tel"
                            placeholder="08012345678"
                            value={adminPhone}
                            onChange={(e) => setAdminPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="admin-email" className="text-xs">Admin Work Email</Label>
                          <Input
                            id="admin-email"
                            type="email"
                            placeholder="cmd@hospital.gov.ng"
                            required
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="admin-pw" className="text-xs">Secure Password</Label>
                          <Input
                            id="admin-pw"
                            type="password"
                            placeholder="Min. 8 characters"
                            required
                            minLength={8}
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 mt-2"
                        disabled={busy}
                      >
                        {busy ? "Registering & Provisioning Facility..." : "Register Hospital & Open Onboarding Wizard"}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* 2. CLINICAL & OPERATIONAL STAFF JOIN REQUEST */}
                  <TabsContent value="staff" className="mt-4 space-y-4">
                    <div className="rounded-xl border border-teal-500/20 bg-teal-50/40 dark:bg-teal-950/20 p-3">
                      <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-semibold text-xs">
                        <Stethoscope className="w-4 h-4 text-teal-600" />
                        <span>Join an Existing Hospital Team</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Select your hospital, enter your professional credentials, and request staff affiliation. The Hospital Admin will verify and activate your workstation.
                      </p>
                    </div>

                    <form onSubmit={handleStaffJoinRegister} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="staff-hosp-select" className="text-xs">Select Your Hospital / Clinic</Label>
                        <Select
                          value={staffHospitalId}
                          onValueChange={(val) => setStaffHospitalId(val)}
                        >
                          <SelectTrigger id="staff-hosp-select">
                            <SelectValue placeholder={isLoadingHospitals ? "Loading directory..." : "Choose Hospital"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {hospitalDirectory.map((h) => (
                              <SelectItem key={h.id} value={h.id}>
                                {h.name} {h.state ? `(${h.state})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="staff-role-select" className="text-xs">Requested Clinical / Operational Role</Label>
                        <Select
                          value={staffRole}
                          onValueChange={(val) => setStaffRole(val as StaffRole)}
                        >
                          <SelectTrigger id="staff-role-select">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {CLINICAL_ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                <div>
                                  <div className="font-medium text-xs">{r.label}</div>
                                  <div className="text-[10px] text-muted-foreground">{r.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="staff-name" className="text-xs">Full Name & Title</Label>
                          <Input
                            id="staff-name"
                            placeholder="e.g. Dr. Amina Bello"
                            required
                            value={staffFullName}
                            onChange={(e) => setStaffFullName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="staff-phone" className="text-xs">Phone Number</Label>
                          <Input
                            id="staff-phone"
                            type="tel"
                            placeholder="08012345678"
                            value={staffPhone}
                            onChange={(e) => setStaffPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="staff-license" className="text-xs">Medical / Council License No.</Label>
                          <Input
                            id="staff-license"
                            placeholder="e.g. MDCN/12345, NMCN/6789"
                            value={staffLicense}
                            onChange={(e) => setStaffLicense(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="staff-spec" className="text-xs">Specialization / Department</Label>
                          <Input
                            id="staff-spec"
                            placeholder="e.g. Paediatrics, ICU Nurse"
                            value={staffSpecialization}
                            onChange={(e) => setStaffSpecialization(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t">
                        <div className="space-y-1.5">
                          <Label htmlFor="staff-reg-email" className="text-xs">Work / Personal Email</Label>
                          <Input
                            id="staff-reg-email"
                            type="email"
                            placeholder="amina.bello@hospital.ng"
                            required
                            value={staffEmail}
                            onChange={(e) => setStaffEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="staff-reg-pw" className="text-xs">Account Password</Label>
                          <Input
                            id="staff-reg-pw"
                            type="password"
                            placeholder="Min. 8 characters"
                            required
                            minLength={8}
                            value={staffPassword}
                            onChange={(e) => setStaffPassword(e.target.value)}
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 mt-2"
                        disabled={busy}
                      >
                        {busy ? "Submitting Request..." : "Submit Join Request to Hospital Admin"}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* 3. PATIENT SELF-SERVICE REGISTRATION */}
                  <TabsContent value="patient" className="mt-4 space-y-3.5">
                    <div className="rounded-2xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 p-3.5 space-y-2">
                      <Label className="text-xs font-semibold text-teal-900 dark:text-teal-200">
                        Registration Path
                      </Label>
                      <RadioGroup
                        value={patientRegType}
                        onValueChange={(val) => {
                          setPatientRegType(val as "new_patient" | "existing_record");
                          setFormError(null);
                        }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                      >
                        <div
                          className={`flex items-center space-x-2 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                            patientRegType === "new_patient"
                              ? "border-teal-600 bg-white dark:bg-teal-900/40 shadow-xs"
                              : "border-border/60 bg-transparent hover:bg-white/40"
                          }`}
                          onClick={() => setPatientRegType("new_patient")}
                        >
                          <RadioGroupItem value="new_patient" id="opt-new" />
                          <Label htmlFor="opt-new" className="text-xs font-medium cursor-pointer">
                            I'm a new patient
                          </Label>
                        </div>
                        <div
                          className={`flex items-center space-x-2 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                            patientRegType === "existing_record"
                              ? "border-teal-600 bg-white dark:bg-teal-900/40 shadow-xs"
                              : "border-border/60 bg-transparent hover:bg-white/40"
                          }`}
                          onClick={() => setPatientRegType("existing_record")}
                        >
                          <RadioGroupItem value="existing_record" id="opt-existing" />
                          <Label htmlFor="opt-existing" className="text-xs font-medium cursor-pointer">
                            I have hospital records
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <form onSubmit={handlePatientSubmit} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="patient-nin" className="text-xs">National Identity Number (NIN)</Label>
                        <Input
                          id="patient-nin"
                          type="text"
                          maxLength={11}
                          placeholder="11-digit NIN (e.g. 12345678901)"
                          required
                          value={patientNin}
                          onChange={(e) => setPatientNin(e.target.value.replace(/\D/g, ""))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="patient-first-name" className="text-xs">First Name</Label>
                          <Input
                            id="patient-first-name"
                            type="text"
                            placeholder="First Name"
                            required
                            value={patientFirstName}
                            onChange={(e) => setPatientFirstName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="patient-last-name" className="text-xs">Last Name</Label>
                          <Input
                            id="patient-last-name"
                            type="text"
                            placeholder="Last Name"
                            required
                            value={patientLastName}
                            onChange={(e) => setPatientLastName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="patient-dob" className="text-xs">Date of Birth</Label>
                          <Input
                            id="patient-dob"
                            type="date"
                            required
                            value={patientDob}
                            onChange={(e) => setPatientDob(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="patient-gender" className="text-xs">Gender</Label>
                          <Select value={patientGender} onValueChange={(val) => setPatientGender(val)}>
                            <SelectTrigger id="patient-gender">
                              <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {patientRegType === "new_patient" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="patient-phone" className="text-xs">Phone Number</Label>
                          <Input
                            id="patient-phone"
                            type="tel"
                            placeholder="08012345678"
                            value={patientPhone}
                            onChange={(e) => setPatientPhone(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Optional Health Profile */}
                      {patientRegType === "new_patient" && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setShowOptionalFields(!showOptionalFields)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                          >
                            {showOptionalFields ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            <span>Optional Health & Emergency Contact Info</span>
                          </button>

                          {showOptionalFields && (
                            <div className="mt-2.5 rounded-2xl border border-border/80 bg-muted/30 p-3.5 space-y-3 animate-in fade-in">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label htmlFor="blood-group" className="text-xs">Blood Group</Label>
                                  <Select value={bloodGroup} onValueChange={(val) => setBloodGroup(val)}>
                                    <SelectTrigger id="blood-group" className="h-8 text-xs">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor="genotype" className="text-xs">Genotype</Label>
                                  <Select value={genotype} onValueChange={(val) => setGenotype(val)}>
                                    <SelectTrigger id="genotype" className="h-8 text-xs">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {["AA", "AS", "SS", "AC", "SC"].map((gt) => (
                                        <SelectItem key={gt} value={gt}>{gt}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor="allergies" className="text-xs">Known Allergies</Label>
                                <Input
                                  id="allergies"
                                  placeholder="e.g. Penicillin, Peanuts (comma separated)"
                                  className="h-8 text-xs"
                                  value={allergiesText}
                                  onChange={(e) => setAllergiesText(e.target.value)}
                                />
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor="chronic" className="text-xs">Chronic Conditions</Label>
                                <Input
                                  id="chronic"
                                  placeholder="e.g. Hypertension, Asthma (comma separated)"
                                  className="h-8 text-xs"
                                  value={chronicConditionsText}
                                  onChange={(e) => setChronicConditionsText(e.target.value)}
                                />
                              </div>

                              <div className="pt-2 border-t space-y-2">
                                <Label className="text-xs font-semibold text-foreground">Emergency Contact</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    placeholder="Full Name"
                                    className="h-8 text-xs"
                                    value={emergencyName}
                                    onChange={(e) => setEmergencyName(e.target.value)}
                                  />
                                  <Input
                                    placeholder="Phone Number"
                                    className="h-8 text-xs"
                                    value={emergencyPhone}
                                    onChange={(e) => setEmergencyPhone(e.target.value)}
                                  />
                                </div>
                                <Input
                                  placeholder="Relationship (e.g. Spouse, Sibling)"
                                  className="h-8 text-xs"
                                  value={emergencyRelation}
                                  onChange={(e) => setEmergencyRelation(e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="patient-email" className="text-xs">Email Address</Label>
                        <Input
                          id="patient-email"
                          type="email"
                          autoComplete="email"
                          placeholder="name@example.com"
                          required
                          value={patientEmail}
                          onChange={(e) => setPatientEmail(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="patient-password" className="text-xs">Password</Label>
                        <Input
                          id="patient-password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Minimum 6 characters"
                          required
                          minLength={6}
                          value={patientPassword}
                          onChange={(e) => setPatientPassword(e.target.value)}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 mt-2"
                        disabled={busy}
                      >
                        {patientRegType === "new_patient" ? "Create Patient Account & Choose Hospital" : "Verify NIN & Link Hospital Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </>
        )}
      </div>

      {/* Patient Onboarding Modal */}
      <PatientOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => {
          setIsOnboardingModalOpen(false);
          navigate({ to: "/portal" });
        }}
        patientName={registeredPatientName}
        patientEmail={registeredPatientEmail}
        onFinished={() => {
          setIsOnboardingModalOpen(false);
          navigate({ to: "/portal" });
        }}
      />
    </main>
  );
}

