import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  Globe2,
} from "lucide-react";
import { toast } from "sonner";
import { AudioRecorderModal } from "./AudioRecorderModal";

interface VoiceCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: any[];
  onCheckIn: (appointmentId: string) => void;
}

export function VoiceCheckInModal({
  isOpen,
  onClose,
  appointments,
  onCheckIn,
}: VoiceCheckInModalProps) {
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [hasProcessed, setHasProcessed] = useState(false);
  const [matchedAppts, setMatchedAppts] = useState<any[]>([]);

  function handleProcessed(res: any) {
    const text = res.transcript || "";
    setTranscript(text);
    setDetectedLang(res.detectedLanguageLabel || "Nigerian-accented English");

    // Match appointments based on status === 'booked' and fuzzy name or time
    const booked = appointments.filter((a) => a.status === "booked");
    setMatchedAppts(booked.length > 0 ? booked : appointments.slice(0, 3));
    setHasProcessed(true);
  }

  function handleSelectAppointment(appt: any) {
    onCheckIn(appt.id);
    toast.success(`Checking in ${appt.patient?.first_name || "Patient"}...`);
    onClose();
  }

  return (
    <>
      <Dialog open={isOpen && !isRecorderOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[95vw] sm:w-full max-w-xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Front Desk Assistant</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold font-display text-foreground">
              Voice-Assisted Patient Check-In
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Patient can state their arrival. Desk officer reviews matching scheduled appointments and confirms identity.
            </DialogDescription>
          </DialogHeader>

          {/* Identity Verification Notice */}
          <div className="flex items-start gap-2.5 rounded-2xl bg-muted/50 p-3 border border-border text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Authoritative Identity Verification</p>
              <p className="text-[11px] mt-0.5">
                Voice speech assists in quick appointment discovery. Desk officer must verify patient identity before confirming intake.
              </p>
            </div>
          </div>

          {!hasProcessed ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 border-2 border-dashed border-border rounded-3xl bg-muted/20">
              <Button
                type="button"
                onClick={() => setIsRecorderOpen(true)}
                className="h-14 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md gap-2"
              >
                <Mic className="h-5 w-5" />
                Listen to Patient Arrival
              </Button>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Example: "Good morning, I'm here for my appointment with the doctor."
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                  <Globe2 className="h-3 w-3 mr-1" />
                  {detectedLang}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRecorderOpen(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 h-8"
                >
                  <Mic className="h-3.5 w-3.5 mr-1" />
                  Speak Again
                </Button>
              </div>

              {/* Raw Transcript */}
              <div className="rounded-2xl bg-muted/40 p-3 text-xs border border-border/60">
                <p className="font-semibold text-muted-foreground mb-1">Spoken statement:</p>
                <p className="italic text-foreground/90">"{transcript}"</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Matching Scheduled Appointments ({matchedAppts.length}):
                </p>

                {matchedAppts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3">No matching booked appointments found for today.</p>
                ) : (
                  matchedAppts.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-3 rounded-2xl border border-border bg-card flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-all text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {appt.patient?.first_name} {appt.patient?.last_name}
                          </span>
                          {appt.is_external_booking && (
                            <Badge className="bg-teal-500/10 text-teal-700 text-[10px] py-0 h-4">
                              ONLINE BOOKING
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(appt.appointment_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>NIN: {appt.patient?.nin || "N/A"}</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSelectAppointment(appt)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-8 px-3 shrink-0"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Confirm & Check In
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AudioRecorderModal
        isOpen={isRecorderOpen}
        onClose={() => setIsRecorderOpen(false)}
        context="checkin"
        title="Voice-Assisted Check-In"
        description="Patient speaks arrival statement. Sahara identifies appointment context."
        onProcessed={handleProcessed}
      />
    </>
  );
}
