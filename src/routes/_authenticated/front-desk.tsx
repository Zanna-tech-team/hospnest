import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { IdCard, Search, UserPlus, ClipboardCheck, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  getFrontDeskContext,
  lookupPatientByNin,
  openEncounterForPatient,
  registerPatientByNin,
} from "@/lib/frontdesk.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logo from "@/assets/hospnest-logo.png.asset.json";

const title = "Front desk intake — HospNest";
const description =
  "Look up any patient by their 11-digit NIN, enrol first-time walk-ins and open a triage visit in seconds.";

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

function FrontDesk() {
  const contextFn = useServerFn(getFrontDeskContext);
  const lookupFn = useServerFn(lookupPatientByNin);
  const registerFn = useServerFn(registerPatientByNin);
  const openVisitFn = useServerFn(openEncounterForPatient);

  const { data: ctx, isLoading } = useQuery({
    queryKey: ["front-desk-context"],
    queryFn: () => contextFn({}),
  });

  const [hospitalId, setHospitalId] = useState<string>("");
  const activeHospital = hospitalId || ctx?.workplaces?.[0]?.hospitalId || "";

  const departments = useMemo(
    () => (ctx?.departments ?? []).filter((d: any) => d.hospital_id === activeHospital),
    [ctx, activeHospital],
  );

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo.url} alt="HospNest" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display text-base font-bold text-foreground">HospNest</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-foreground">Front desk intake</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every patient in the country has one record, found by their 11-digit NIN. Search it, enrol
          a first-timer, then send them through to triage.
        </p>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading your hospital…</p>
        ) : (ctx?.workplaces?.length ?? 0) === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold text-foreground">
              You are not attached to a hospital yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Register your own hospital to become its administrator, or ask an existing
              administrator to add you to their team — this page unlocks as soon as they do.
            </p>
            <Button asChild className="mt-4">
              <Link to="/hospital-setup">Register your hospital</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {(ctx?.workplaces?.length ?? 0) > 1 && (
              <div className="max-w-sm space-y-2">
                <Label>Hospital</Label>
                <Select value={activeHospital} onValueChange={(v) => { setHospitalId(v); resetSearch(); }}>
                  <SelectTrigger><SelectValue placeholder="Choose hospital" /></SelectTrigger>
                  <SelectContent>
                    {ctx!.workplaces.map((w: any) => (
                      <SelectItem key={w.hospitalId} value={w.hospitalId}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 1 — NIN search */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
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
                  className="sm:max-w-xs"
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
              <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
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
                    <Input id="firstName" required value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" required value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input id="dob" type="date" value={form.dateOfBirth}
                      onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Input id="gender" placeholder="female / male" value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blood">Blood group</Label>
                    <Input id="blood" placeholder="O+" value={form.bloodGroup}
                      onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
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
              <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
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
                        <SelectTrigger><SelectValue placeholder="Choose department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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
                  <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Sent to triage{openedVisit.queue ? ` · queue number ${openedVisit.queue}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Visit reference {openedVisit.id}</p>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
