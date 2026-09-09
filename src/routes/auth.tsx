import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { claimStaffInvitation } from "@/lib/team.functions";
import {
  verifyAndRegisterPatientAccount,
  getAuthUserRoleRedirect,
} from "@/lib/patient-portal.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, UserCheck, Stethoscope, HeartPulse, Sparkles, Building2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/hospnest-logo.png.asset.json";

const title = "Sign in & Patient Portal — HospNest";
const description =
  "Access national unified hospital management and patient self-service portal.";

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
  const registerPatientFn = useServerFn(verifyAndRegisterPatientAccount);
  const getRoleRedirectFn = useServerFn(getAuthUserRoleRedirect);

  const [authRoleTab, setAuthRoleTab] = useState<"staff" | "patient">(
    search.tab === "patient" ? "patient" : "staff"
  );
  const [staffMode, setStaffMode] = useState<"signin" | "signup">(
    inviteToken ? "signup" : "signin"
  );
  const [patientMode, setPatientMode] = useState<"signin" | "register">("signin");

  // Staff form fields
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");

  // Patient registration fields
  const [patientNin, setPatientNin] = useState("");
  const [patientFirstName, setPatientFirstName] = useState("");
  const [patientLastName, setPatientLastName] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPassword, setPatientPassword] = useState("");

  const [busy, setBusy] = useState(false);

  const resolveRedirect = async () => {
    if (customNext) {
      navigate({ to: customNext });
      return;
    }
    try {
      const { redirectPath } = await getRoleRedirectFn();
      navigate({ to: redirectPath || "/front-desk" });
    } catch {
      navigate({ to: "/front-desk" });
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

  async function handleStaffSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (staffMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Check your inbox if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (inviteToken) {
          try {
            await claimFn({ data: { token: inviteToken } });
            toast.success("Staff invitation activated! Welcome to the team.");
          } catch (err: any) {
            console.warn("Invitation claim:", err.message);
          }
        }
        await resolveRedirect();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handlePatientSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (patientMode === "register") {
        // Prompt 16: Verify NIN, First/Last Name, DOB, link auth user, assign patient role
        const result = await registerPatientFn({
          data: {
            nin: patientNin.trim(),
            firstName: patientFirstName.trim(),
            lastName: patientLastName.trim(),
            dateOfBirth: patientDob,
            email: patientEmail.trim(),
            password: patientPassword,
          },
        });

        if (!result?.success) {
          toast.error(result?.error || "We could not verify your details. Please try again.");
          return;
        }
        {

          toast.success("Identity verified! Signing into your patient portal...");
          // Sign in with the newly registered credentials
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: patientEmail.trim(),
            password: patientPassword,
          });
          if (signInErr) throw signInErr;
          navigate({ to: "/portal" });
        }
      } else {
        // Patient sign in
        const { error } = await supabase.auth.signInWithPassword({
          email: patientEmail,
          password: patientPassword,
        });
        if (error) throw error;
        navigate({ to: "/portal" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification or sign-in failed");
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
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-slate-100 to-teal-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/20 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl backdrop-blur">
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

        {/* Role Segment Tabs */}
        <div className="mt-6">
          <Tabs
            value={authRoleTab}
            onValueChange={(val) => setAuthRoleTab(val as "staff" | "patient")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/70 rounded-xl">
              <TabsTrigger
                value="staff"
                className="flex items-center justify-center gap-2 rounded-lg font-medium text-xs sm:text-sm py-2"
              >
                <Building2 className="h-4 w-4" />
                <span>Hospital Staff</span>
              </TabsTrigger>
              <TabsTrigger
                value="patient"
                className="flex items-center justify-center gap-2 rounded-lg font-medium text-xs sm:text-sm py-2 text-teal-700 dark:text-teal-300 data-[state=active]:bg-teal-600 data-[state=active]:text-white"
              >
                <HeartPulse className="h-4 w-4" />
                <span>Patient Portal</span>
              </TabsTrigger>
            </TabsList>

            {/* STAFF TAB CONTENT */}
            <TabsContent value="staff" className="mt-5 space-y-4">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  {inviteToken
                    ? "Accept Your Staff Invitation"
                    : staffMode === "signin"
                    ? "Staff Workstation Sign In"
                    : "Create Staff Account"}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  {inviteToken
                    ? "Set up your credentials to join your hospital clinical workspace."
                    : "Front desk, triage, consulting rooms, lab, pharmacy & billing."}
                </p>
              </div>

              <form onSubmit={handleStaffSubmit} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="staff-email">Work Email</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    autoComplete="email"
                    placeholder="doctor@hospital.gov.ng"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staff-password">Password</Label>
                  <Input
                    id="staff-password"
                    type="password"
                    autoComplete={staffMode === "signin" ? "current-password" : "new-password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950" disabled={busy}>
                  {inviteToken
                    ? "Activate Account & Join Hospital"
                    : staffMode === "signin"
                    ? "Sign In to Workstation"
                    : "Create Staff Account"}
                </Button>
              </form>

              <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
                Continue with Google
              </Button>

              <button
                type="button"
                className="mt-4 w-full text-xs text-muted-foreground underline-offset-4 hover:underline text-center"
                onClick={() => setStaffMode(staffMode === "signin" ? "signup" : "signin")}
              >
                {staffMode === "signin"
                  ? "Need to register staff credentials? Create account"
                  : "Already have clinical staff credentials? Sign in"}
              </button>
            </TabsContent>

            {/* PATIENT TAB CONTENT */}
            <TabsContent value="patient" className="mt-5 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                    {patientMode === "register" ? "Verify NIN & Create Account" : "Patient Portal Sign In"}
                  </h1>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  {patientMode === "register"
                    ? "Enter your 11-digit NIN and legal name as registered at the hospital."
                    : "Access your visit records, lab results, prescriptions, and online appointments."}
                </p>
              </div>

              <form onSubmit={handlePatientSubmit} className="mt-4 space-y-3.5">
                {patientMode === "register" && (
                  <>
                    <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 text-xs text-teal-800 dark:text-teal-200 flex items-start gap-2">
                      <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
                      <span>
                        Self-service registration instantly links your verified medical identity across participating national hospitals.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="patient-nin">National Identity Number (NIN)</Label>
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
                        <Label htmlFor="patient-first-name">First Name</Label>
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
                        <Label htmlFor="patient-last-name">Last Name</Label>
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

                    <div className="space-y-1.5">
                      <Label htmlFor="patient-dob">Date of Birth</Label>
                      <Input
                        id="patient-dob"
                        type="date"
                        required
                        value={patientDob}
                        onChange={(e) => setPatientDob(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="patient-email">Email Address</Label>
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
                  <Label htmlFor="patient-password">Password</Label>
                  <Input
                    id="patient-password"
                    type="password"
                    autoComplete={patientMode === "signin" ? "current-password" : "new-password"}
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
                  {patientMode === "register" ? (
                    <span className="flex items-center justify-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Verify Identity & Create Account
                    </span>
                  ) : (
                    "Sign In to Patient Portal"
                  )}
                </Button>
              </form>

              <button
                type="button"
                className="mt-4 w-full text-xs text-teal-700 dark:text-teal-400 font-medium underline-offset-4 hover:underline text-center"
                onClick={() => setPatientMode(patientMode === "signin" ? "register" : "signin")}
              >
                {patientMode === "signin"
                  ? "First time here? Verify your NIN to activate account"
                  : "Already activated your account? Sign in"}
              </button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}

