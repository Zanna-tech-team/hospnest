import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bed,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Hospital,
  IdCard,
  Info,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Pill,
  Plus,
  ShieldCheck,
  Stethoscope,
  User,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  getPublicHospitalLandingPage,
  type PublicHospitalLandingPageData,
} from "@/lib/public-hospital.functions";
import { bookPatientAppointment } from "@/lib/patient-portal.functions";
import logo from "@/assets/hospnest-logo.png.asset.json";
import { toast } from "sonner";

export const Route = createFileRoute("/hospitals/$hospitalSlug")({
  head: () => ({
    meta: [
      { title: "Hospital Medical Portal — HospNest" },
      { name: "description", content: "Official hospital landing page, clinical services, medical team, appointment booking, and patient registration." },
    ],
  }),
  component: HospitalLandingPage,
});

function HospitalLandingPage() {
  const { hospitalSlug } = useParams({ from: "/hospitals/$hospitalSlug" });
  const getLandingFn = useServerFn(getPublicHospitalLandingPage);
  const bookApptFn = useServerFn(bookPatientAppointment);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [patientNin, setPatientNin] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [apptDate, setApptDate] = useState(new Date().toISOString().slice(0, 10));
  const [apptTime, setApptTime] = useState("09:00");
  const [apptReason, setApptReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const { data, isLoading, isError, error } = useQuery<PublicHospitalLandingPageData>({
    queryKey: ["public-hospital-landing", hospitalSlug],
    queryFn: () => getLandingFn({ data: { slug: hospitalSlug } }),
  });

  const handleBookAppointment = () => {
    if (!data?.hospital?.id || !apptReason.trim()) {
      toast.error("Please enter appointment reason.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await bookApptFn({
          data: {
            hospitalId: data.hospital.id,
            departmentId: selectedDeptId || undefined,
            doctorId: selectedDoctorId || undefined,
            appointmentDate: apptTime ? `${apptDate}T${apptTime}` : apptDate,
            symptomsSummary: apptReason,
          },
        });

        if (res.success) {
          toast.success("Appointment booked successfully. You can track this in your Patient Portal.");
          setIsBookingModalOpen(false);
          setApptReason("");
        }
      } catch (err: any) {
        toast.error(err?.message || "Please sign in to your Patient account to confirm this appointment booking.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="size-8 animate-spin text-teal-600" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading hospital clinical profile...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <Hospital className="size-16 text-muted-foreground/50" />
        <h2 className="font-display text-2xl font-bold text-foreground">Hospital Not Found</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The requested medical facility could not be located on the HospNest national network.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Back to HospNest Directory</Link>
        </Button>
      </div>
    );
  }

  const { hospital, landingPage, departments, availableServices, labTests, doctors, totalBeds } = data;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-teal-500 selection:text-white">
      {/* Top Brand Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <img src={logo.url} alt="HospNest" className="size-8 rounded-lg object-contain" />
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground hidden sm:inline">
                HospNest Network /
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-foreground sm:text-lg">
                {hospital.name}
              </span>
              {hospital.isVerified && (
                <span className="rounded-full bg-teal-500/10 p-0.5 text-teal-600 dark:text-teal-400" title="Verified Medical Facility">
                  <ShieldCheck className="size-4" />
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex border-border text-xs"
            >
              <Link to="/auth" search={{ next: undefined, invite: undefined, email: undefined, tab: undefined }}>Staff Portal</Link>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsBookingModalOpen(true)}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm"
            >
              <Calendar className="size-3.5" /> Book Appointment
            </Button>
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="gap-1 text-xs font-semibold"
            >
              <Link to="/portal">
                <HeartPulse className="size-3.5 text-teal-600" /> Patient Portal
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-500/10 via-background to-background py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="space-y-6 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                <Hospital className="size-3.5" /> Licensed {hospital.hospitalType === "government" ? "Government / Public" : "Private"} Healthcare Facility
              </div>

              <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl leading-tight">
                {landingPage.heroHeadline}
              </h1>

              <p className="text-base text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
                {landingPage.heroSubheadline}
              </p>

              {/* Location & Contact Badges */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1.5 font-medium shadow-xs">
                  <MapPin className="size-3.5 text-teal-600" /> {hospital.address || `${hospital.lga ? hospital.lga + ", " : ""}${hospital.state}, Nigeria`}
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1.5 font-medium shadow-xs">
                  <Clock className="size-3.5 text-teal-600" /> {landingPage.publicContact.openingHours}
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1.5 font-medium shadow-xs">
                  <Bed className="size-3.5 text-teal-600" /> {totalBeds} Inpatient Beds
                </span>
              </div>

              {/* Call to Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Button
                  size="lg"
                  onClick={() => setIsBookingModalOpen(true)}
                  className="gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-md font-bold text-sm"
                >
                  <Calendar className="size-4" /> Book a Consultation
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="gap-2 border-border text-sm font-semibold"
                >
                  <Link to="/auth" search={{ next: undefined, invite: undefined, email: undefined, tab: undefined }}>
                    <UserPlus className="size-4" /> Create Patient Account
                  </Link>
                </Button>
                {hospital.contactPhone && (
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="gap-2 text-sm text-teal-700 dark:text-teal-400"
                  >
                    <a href={`tel:${hospital.contactPhone}`}>
                      <PhoneCall className="size-4" /> {hospital.contactPhone}
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Right Card: Quick Patient Intake & Appointment Booking */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-lift space-y-6">
                <div className="border-b border-border pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Patient Self-Service
                  </span>
                  <h3 className="mt-1 font-display text-xl font-bold text-foreground">
                    Instant Appointment Booking
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Skip waiting queues. Schedule clinical consultations or diagnostic lab investigations online.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Department / Specialty</Label>
                    <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="General Outpatient (GOPD)" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="text-xs">
                            {d.name} ({d.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Preferred Date</Label>
                      <Input
                        type="date"
                        value={apptDate}
                        onChange={(e) => setApptDate(e.target.value)}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Time</Label>
                      <Select value={apptTime} onValueChange={setApptTime}>
                        <SelectTrigger className="h-9 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="08:30" className="text-xs">08:30 AM</SelectItem>
                          <SelectItem value="10:00" className="text-xs">10:00 AM</SelectItem>
                          <SelectItem value="12:00" className="text-xs">12:00 PM</SelectItem>
                          <SelectItem value="14:30" className="text-xs">02:30 PM</SelectItem>
                          <SelectItem value="16:00" className="text-xs">04:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Reason for Visit / Symptoms</Label>
                    <Input
                      value={apptReason}
                      onChange={(e) => setApptReason(e.target.value)}
                      placeholder="e.g. Fever, routine health check, cardiology review"
                      className="h-9 text-xs bg-background"
                    />
                  </div>

                  <Button
                    size="default"
                    onClick={handleBookAppointment}
                    disabled={isPending || !apptReason.trim()}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-10 shadow-sm"
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
                    Confirm Appointment Booking
                  </Button>

                  <p className="text-center text-[11px] text-muted-foreground">
                    Already registered? <Link to="/portal" className="text-teal-600 dark:text-teal-400 font-bold underline">Access Your Health Records</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical Services Section */}
      <section className="py-16 sm:py-24 bg-card/40 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Comprehensive Care
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Clinical Services & Departmental Specialties
            </h2>
            <p className="text-sm text-muted-foreground">
              Modern medical infrastructure equipped with electronic health records, diagnostic laboratories, and licensed clinical specialties.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {landingPage.services.map((s, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:border-teal-500/40 transition-all space-y-3"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
                  {idx === 0 ? <Stethoscope className="size-5" /> : idx === 1 ? <Activity className="size-5" /> : idx === 2 ? <FlaskConical className="size-5" /> : idx === 3 ? <Pill className="size-5" /> : idx === 4 ? <Bed className="size-5" /> : <Heart className="size-5" />}
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  {s.name}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>

          {/* Pricing & Tariffs Transparency */}
          {availableServices.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Published Service Rates & Diagnostics
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Standard statutory consultation fees and diagnostic lab investigations.
                  </p>
                </div>
                <Badge variant="outline" className="border-border text-xs">
                  Transparent Pricing
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                {availableServices.slice(0, 8).map((srv) => (
                  <div key={srv.id} className="rounded-xl border border-border/80 bg-muted/20 p-3 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-foreground">{srv.serviceName}</span>
                      <span className="block text-[11px] text-muted-foreground capitalize">{srv.category}</span>
                    </div>
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                      ₦{srv.price.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Medical Specialists Showcase */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Expert Practitioners
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Meet Our Attending Physicians & Specialists
            </h2>
            <p className="text-sm text-muted-foreground">
              Qualified medical doctors, licensed surgeons, and certified clinical practitioners dedicated to patient wellbeing.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {landingPage.doctorsShowcase.map((doc, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft flex items-center gap-4"
              >
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 font-display text-lg font-bold text-teal-600 dark:text-teal-400">
                  {doc.name.split(" ")[1]?.[0] || doc.name[0]}
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-foreground">
                    {doc.name}
                  </h4>
                  <p className="text-xs font-medium text-teal-600 dark:text-teal-400">
                    {doc.specialty}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {doc.qualifications || "MBBS, FWACS"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hospital Registration Banner for Medical Owners */}
      <section className="border-t border-border bg-gradient-to-r from-teal-500/10 via-background to-primary/10 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Hospital Administration & Network
            </span>
            <h3 className="font-display text-xl font-bold text-foreground sm:text-2xl mt-0.5">
              Are you a hospital director, clinic owner, or healthcare administrator?
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Register your hospital or healthcare clinic on the HospNest multi-tenant national platform to unlock electronic medical records, triage vitals, laboratory workbench, drug dispensary, and federated patient transfer.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              asChild
              size="default"
              className="gap-2 bg-navy-deep hover:bg-navy text-white font-bold text-xs shadow-md"
            >
              <Link to="/hospital-setup">
                <Building2 className="size-4" /> Register Your Medical Facility
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-10 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-foreground">{hospital.name}</p>
            <p className="mt-0.5">License: {hospital.licenseNumber} • Powered by HospNest Health Network</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-foreground">HospNest Home</Link>
            <Link to="/portal" className="hover:text-foreground">Patient Portal</Link>
            <Link to="/auth" search={{ next: undefined, invite: undefined, email: undefined, tab: undefined }} className="hover:text-foreground">Staff Login</Link>
            <Link to="/hospital-setup" className="hover:text-foreground">Register Facility</Link>
          </div>
        </div>
      </footer>

      {/* Appointment Booking Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">
              Book Appointment at {hospital.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select your preferred department and consultation schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Specialty Department</Label>
              <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="General Outpatient (GOPD)" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Appointment Date</Label>
                <Input
                  type="date"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Time Slot</Label>
                <Select value={apptTime} onValueChange={setApptTime}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="08:30" className="text-xs">08:30 AM</SelectItem>
                    <SelectItem value="10:00" className="text-xs">10:00 AM</SelectItem>
                    <SelectItem value="12:00" className="text-xs">12:00 PM</SelectItem>
                    <SelectItem value="14:30" className="text-xs">02:30 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason for Appointment</Label>
              <Input
                value={apptReason}
                onChange={(e) => setApptReason(e.target.value)}
                placeholder="e.g. Medical checkup, pediatric fever, post-op review"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsBookingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBookAppointment}
              disabled={isPending || !apptReason.trim()}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Calendar className="size-3.5" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
