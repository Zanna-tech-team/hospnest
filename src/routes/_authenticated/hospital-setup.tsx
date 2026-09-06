import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, ShieldCheck, Users } from "lucide-react";

import { createHospital, getMyHospitals } from "@/lib/hospital.functions";
import { Button } from "@/components/ui/button";
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

const title = "Register your hospital — HospNest";
const description =
  "Create your hospital on HospNest, become its administrator and unlock front desk intake, triage, lab, pharmacy and billing.";

const STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT — Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
];

export const Route = createFileRoute("/_authenticated/hospital-setup")({
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
  component: HospitalSetup,
});

function HospitalSetup() {
  const navigate = useNavigate();
  const myHospitalsFn = useServerFn(getMyHospitals);
  const createFn = useServerFn(createHospital);

  const { data, isLoading } = useQuery({
    queryKey: ["my-hospitals"],
    queryFn: () => myHospitalsFn({}),
  });

  const [name, setName] = useState("");
  const [hospitalType, setHospitalType] = useState<"private" | "government">("private");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [adminFullName, setAdminFullName] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name,
          hospitalType,
          licenseNumber,
          state,
          lga,
          address,
          contactEmail,
          contactPhone,
          adminFullName,
        },
      }),
    onSuccess: (result) => {
      toast.success(`${result.name} is live on HospNest.`);
      navigate({ to: "/front-desk" });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not register the hospital."),
  });

  const existing = data?.hospitals ?? [];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-4">
          <img src={logo.url} alt="HospNest" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-display text-base font-bold text-foreground">HospNest</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-foreground">Register your hospital</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          This creates your facility on HospNest and makes you its administrator, so you can start
          admitting patients and inviting your team right away.
        </p>

        {!isLoading && existing.length > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-foreground">
              You already work at{" "}
              <span className="font-semibold">{existing.map((h) => h.name).join(", ")}</span>.
            </p>
            <Button asChild variant="outline" className="mt-3">
              <Link to="/front-desk">Go to front desk</Link>
            </Button>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Building2, label: "Your facility profile and departments" },
            { icon: Users, label: "Admin access to invite your team" },
            { icon: ShieldCheck, label: "Audited, consent-based patient records" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <form
          className="mt-10 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Hospital name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="St. Mary's Specialist Hospital"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Ownership</Label>
              <Select
                value={hospitalType}
                onValueChange={(v) => setHospitalType(v as "private" | "government")}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="licence">Facility licence number</Label>
              <Input
                id="licence"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Choose state" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lga">Local government area</Label>
              <Input id="lga" value={lga} onChange={(e) => setLga(e.target.value)} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Street address</Label>
              <Textarea
                id="address"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="adminFullName">Your full name (hospital administrator)</Label>
              <Input
                id="adminFullName"
                required
                value={adminFullName}
                onChange={(e) => setAdminFullName(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            New hospitals start unverified. You can use every module immediately; verification only
            affects your public listing.
          </p>

          <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending}>
            {create.isPending ? "Registering…" : "Register hospital"}
          </Button>
        </form>
      </div>
    </main>
  );
}
