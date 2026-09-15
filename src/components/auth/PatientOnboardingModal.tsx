import React, { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getVerifiedHospitalsDirectory,
  savePatientHospitalConsents,
  getHospitalBookingSlots,
  bookDirectOnlineAppointment,
} from "@/lib/patient-portal.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Printer,
  Search,
  Sparkles,
  Stethoscope,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const NIGERIAN_STATES = [
  "All States", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

interface PatientOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientEmail: string;
  onFinished: () => void;
}

export function PatientOnboardingModal({
  isOpen,
  onClose,
  patientName,
  patientEmail,
  onFinished,
}: PatientOnboardingModalProps) {
  const getHospitalsFn = useServerFn(getVerifiedHospitalsDirectory);
  const saveConsentsFn = useServerFn(savePatientHospitalConsents);
  const getSlotsFn = useServerFn(getHospitalBookingSlots);
  const bookApptFn = useServerFn(bookDirectOnlineAppointment);

  const [step, setStep] = useState<"hospitals" | "book" | "confirmation">("hospitals");
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<string[]>([]);

  // Booking Form State
  const [bookingHospitalId, setBookingHospitalId] = useState<string>("");
  const [bookingDepartmentId, setBookingDepartmentId] = useState<string>("");
  const [bookingDoctorId, setBookingDoctorId] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string>("");

  // Confirmation State
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadHospitals();
    }
  }, [isOpen, selectedState]);

  async function loadHospitals() {
    setLoading(true);
    try {
      const data = await getHospitalsFn({
        data: {
          state: selectedState === "All States" ? undefined : selectedState,
          search: searchQuery.trim() || undefined,
        },
      });
      setHospitals(data || []);
      if (data && data.length > 0 && selectedHospitalIds.length === 0) {
        setSelectedHospitalIds([data[0].id]);
        setBookingHospitalId(data[0].id);
      }
    } catch (e: any) {
      console.error("Error loading hospitals:", e);
    } finally {
      setLoading(false);
    }
  }

  // Load slots when hospital, doctor, or date changes
  useEffect(() => {
    if (bookingHospitalId && bookingDate) {
      getSlotsFn({
        data: {
          hospitalId: bookingHospitalId,
          doctorId: bookingDoctorId || undefined,
          date: bookingDate,
        },
      })
        .then((res) => {
          setAvailableSlots(res.slots || []);
          if (res.slots && res.slots.length > 0) {
            setSelectedSlot(res.slots[0]);
          }
        })
        .catch(() => {
          setAvailableSlots(["09:00", "10:00", "11:30", "14:00", "15:30"]);
          setSelectedSlot("09:00");
        });
    }
  }, [bookingHospitalId, bookingDoctorId, bookingDate]);

  function toggleHospitalSelection(id: string) {
    if (selectedHospitalIds.includes(id)) {
      setSelectedHospitalIds(selectedHospitalIds.filter((item) => item !== id));
    } else {
      setSelectedHospitalIds([...selectedHospitalIds, id]);
    }
  }

  async function handleSaveHospitalsAndProceed(proceedToBook: boolean) {
    if (selectedHospitalIds.length === 0) {
      toast.error("Please select at least one hospital to connect with.");
      return;
    }
    setLoading(true);
    try {
      await saveConsentsFn({
        data: {
          hospitalIds: selectedHospitalIds,
          scopeType: "full",
          isGlobalShare: false,
        },
      });
      toast.success("Hospitals registered successfully!");
      if (proceedToBook) {
        setBookingHospitalId(selectedHospitalIds[0]);
        setStep("book");
      } else {
        onFinished();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to register hospitals");
    } finally {
      setLoading(false);
    }
  }

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingHospitalId) {
      toast.error("Please select a hospital.");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select an appointment time slot.");
      return;
    }
    if (!symptoms.trim() || symptoms.trim().length < 3) {
      toast.error("Please describe your symptoms or visit reason.");
      return;
    }

    setLoading(true);
    try {
      const res = await bookApptFn({
        data: {
          hospitalId: bookingHospitalId,
          departmentId: bookingDepartmentId || undefined,
          doctorId: bookingDoctorId || undefined,
          date: bookingDate,
          timeSlot: selectedSlot,
          symptomsSummary: symptoms.trim(),
        },
      });

      if (res?.success) {
        setConfirmationData(res);
        setStep("confirmation");
        toast.success("Appointment confirmed! Online booking registered.");
      }
    } catch (err: any) {
      toast.error(err.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const activeHospital = hospitals.find((h) => h.id === bookingHospitalId) || hospitals[0];
  const activeDepartments = activeHospital?.departments || [];
  const activeDoctors = activeHospital?.doctors || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Welcome to HospNest</span>
          </div>
          <DialogTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
            {step === "hospitals" && "Select Your Primary Hospital Network"}
            {step === "book" && "Book an Immediate Appointment"}
            {step === "confirmation" && "Appointment Confirmed & Printable Voucher"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {step === "hospitals" &&
              `Hi ${patientName || "there"}, connect with verified hospitals across the national grid to manage visits, test results, and direct bookings.`}
            {step === "book" &&
              "Pick a department, preferred doctor, and time slot. Your appointment will appear directly in the hospital's front desk online queue."}
            {step === "confirmation" &&
              "Your appointment is reserved. Show this voucher or reference number on arrival at the front desk."}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: HOSPITAL SELECTION */}
        {step === "hospitals" && (
          <div className="mt-4 space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by hospital name or LGA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadHospitals()}
                  className="pl-9"
                />
              </div>
              <Select value={selectedState} onValueChange={(val) => setSelectedState(val)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by State" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {NIGERIAN_STATES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hospital Directory List */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                  Loading active verified hospitals...
                </div>
              ) : hospitals.length === 0 ? (
                <div className="py-10 text-center rounded-2xl border border-dashed p-6">
                  <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">No matching hospitals found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try selecting "All States" or searching for another facility.
                  </p>
                </div>
              ) : (
                hospitals.map((h) => {
                  const isSelected = selectedHospitalIds.includes(h.id);
                  return (
                    <div
                      key={h.id}
                      onClick={() => toggleHospitalSelection(h.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 flex items-start justify-between gap-4 ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/50 dark:bg-teal-950/20 shadow-xs ring-1 ring-teal-600/30"
                          : "border-border hover:border-teal-500/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm text-foreground">{h.name}</h4>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold py-0">
                            {h.type}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0 bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                            Verified
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-teal-600" />
                            {h.lga ? `${h.lga}, ` : ""}{h.state}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-teal-600" />
                            {h.phone}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/80 line-clamp-1">{h.address}</p>
                      </div>

                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                          isSelected
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-muted-foreground/30 text-transparent"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSaveHospitalsAndProceed(false)}
                disabled={loading || selectedHospitalIds.length === 0}
                className="w-full sm:w-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Skip Booking & Go to Portal
              </Button>
              <Button
                onClick={() => handleSaveHospitalsAndProceed(true)}
                disabled={loading || selectedHospitalIds.length === 0}
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-medium flex items-center gap-2"
              >
                <span>Connect & Book Appointment</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: APPOINTMENT BOOKING */}
        {step === "book" && (
          <form onSubmit={handleBookingSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="book-hospital">Hospital</Label>
              <Select value={bookingHospitalId} onValueChange={(val) => setBookingHospitalId(val)}>
                <SelectTrigger id="book-hospital">
                  <SelectValue placeholder="Choose Hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals
                    .filter((h) => selectedHospitalIds.includes(h.id))
                    .map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name} ({h.state})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="book-dept">Department</Label>
                <Select
                  value={bookingDepartmentId}
                  onValueChange={(val) => setBookingDepartmentId(val)}
                >
                  <SelectTrigger id="book-dept">
                    <SelectValue placeholder="General Outpatient (GOPD)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gopd-default">General Outpatient (GOPD)</SelectItem>
                    {activeDepartments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="book-doctor">Preferred Doctor (Optional)</Label>
                <Select
                  value={bookingDoctorId}
                  onValueChange={(val) => setBookingDoctorId(val)}
                >
                  <SelectTrigger id="book-doctor">
                    <SelectValue placeholder="Any Available Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-duty-doctor">Any Available Duty Doctor</SelectItem>
                    {activeDoctors.map((doc: any) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.fullName} — {doc.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="book-date">Appointment Date</Label>
                <Input
                  id="book-date"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="book-slot">Available Time Slot</Label>
                <Select value={selectedSlot} onValueChange={(val) => setSelectedSlot(val)}>
                  <SelectTrigger id="book-slot">
                    <SelectValue placeholder="Select Time Slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="book-symptoms">Symptoms / Reason for Visit</Label>
              <Textarea
                id="book-symptoms"
                rows={3}
                placeholder="e.g. Mild headache and fever since yesterday, routine medical checkup..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                required
              />
            </div>

            <div className="pt-4 border-t flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("hospitals")}
                disabled={loading}
              >
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onFinished}
                  disabled={loading}
                  className="text-xs text-muted-foreground"
                >
                  Skip
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? "Confirming Booking..." : "Confirm & Generate Voucher"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: PRINTABLE CONFIRMATION */}
        {step === "confirmation" && confirmationData && (
          <div className="mt-4 space-y-6">
            <div
              ref={printRef}
              className="rounded-3xl border border-teal-500/30 bg-gradient-to-br from-teal-50/40 via-background to-teal-50/20 dark:from-teal-950/20 dark:to-background p-6 space-y-4 shadow-sm print:border-black print:bg-white print:p-8"
            >
              <div className="flex items-start justify-between border-b border-border/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-lg text-teal-800 dark:text-teal-300">
                      HospNest Online Booking Voucher
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">CONFIRMED</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Show this slip at the hospital front desk check-in queue.
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground">
                    Booking Reference
                  </span>
                  <span className="font-mono font-bold text-sm text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border">
                    {confirmationData.bookingReference}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Hospital Facility</span>
                  <p className="font-semibold text-sm text-foreground">{confirmationData.hospitalName}</p>
                  <p className="text-muted-foreground">{confirmationData.hospitalAddress}</p>
                  <p className="text-muted-foreground">Tel: {confirmationData.hospitalPhone}</p>
                </div>

                <div className="space-y-1 sm:text-right">
                  <span className="text-muted-foreground">Patient Details</span>
                  <p className="font-semibold text-sm text-foreground">{confirmationData.patientName}</p>
                  <p className="text-muted-foreground">{patientEmail}</p>
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Self-Registration
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-card border border-border p-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Appointment Date</span>
                  <p className="font-semibold text-sm text-foreground flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-teal-600" />
                    {new Date(confirmationData.appointmentDate).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time Slot</span>
                  <p className="font-semibold text-sm text-foreground flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-teal-600" />
                    {confirmationData.timeSlot}
                  </p>
                </div>
              </div>

              {confirmationData.symptomsSummary && (
                <div className="text-xs bg-muted/40 p-3 rounded-xl">
                  <span className="font-medium text-foreground">Clinical Notes / Symptoms:</span>
                  <p className="text-muted-foreground mt-0.5">{confirmationData.symptomsSummary}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="w-full sm:w-auto flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                <span>Print Appointment Voucher</span>
              </Button>

              <Button
                onClick={onFinished}
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-medium flex items-center gap-2"
              >
                <span>Proceed to Patient Portal</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
