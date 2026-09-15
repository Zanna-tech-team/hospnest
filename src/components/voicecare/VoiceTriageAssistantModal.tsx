import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle2, Globe2, Mic, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AudioRecorderModal } from "./AudioRecorderModal";

interface VoiceTriageAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTriage: (data: { complaint: string; isUrgent: boolean; transcript: string }) => void;
}

export function VoiceTriageAssistantModal({
  isOpen,
  onClose,
  onApplyTriage,
}: VoiceTriageAssistantModalProps) {
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [complaint, setComplaint] = useState("");
  const [duration, setDuration] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [urgencyWarning, setUrgencyWarning] = useState<string | undefined>(undefined);

  function handleProcessed(res: any) {
    setTranscript(res.transcript || "");
    setDetectedLang(res.detectedLanguageLabel || "Nigerian-accented English");
    if (res.appointmentIntent) {
      setComplaint(res.appointmentIntent.chiefComplaint || "");
      setDuration(res.appointmentIntent.symptomDuration || "");
      setIsUrgent(res.appointmentIntent.urgencyLevel !== "routine");
      setUrgencyWarning(res.appointmentIntent.urgencyWarning);
    }
    setHasProcessed(true);
  }

  function handleApply() {
    const fullSummary = `${complaint} ${duration ? `(${duration})` : ""}`.trim();
    onApplyTriage({
      complaint: fullSummary,
      isUrgent,
      transcript,
    });
    toast.success("Voice triage information applied to intake!");
    onClose();
  }

  return (
    <>
      <Dialog open={isOpen && !isRecorderOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xl p-6 sm:p-8 rounded-3xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>Intron Sahara Voice Triage</span>
            </div>
            <DialogTitle className="text-2xl font-bold font-display text-foreground">
              Voice Triage Assistant
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Listen to patient symptom presentation in local dialect and organize for intake triage.
            </DialogDescription>
          </DialogHeader>

          {/* Safety & Non-autonomous Diagnosis Banner */}
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 p-3.5 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Patient-reported information — verify with patient.</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Does not provide an autonomous diagnosis or prescribe medications. Assists human clinical staff in structuring incoming complaints.
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
                Listen to Patient Symptoms
              </Button>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Supports natural Hausa, Yoruba, Igbo, Pidgin, and Nigerian-accented English.
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
                  Record Again
                </Button>
              </div>

              {/* Raw Transcript */}
              <div className="rounded-2xl bg-muted/40 p-3 text-xs border border-border/60">
                <p className="font-semibold text-muted-foreground mb-1">Spoken Patient Statement:</p>
                <p className="italic text-foreground/90">"{transcript}"</p>
              </div>

              {/* Urgency Flag */}
              {isUrgent && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-rose-500/10 p-3.5 border border-rose-500/30 text-xs text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Potential Urgent Symptom Detected — Clinician Review Required</p>
                    <p className="text-muted-foreground mt-0.5">{urgencyWarning || "High-priority symptom flagged."}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-2xl border bg-card">
                  <span className="text-[11px] font-medium text-muted-foreground">Extracted Chief Complaint</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{complaint || "General evaluation"}</p>
                </div>
                <div className="p-3 rounded-2xl border bg-card">
                  <span className="text-[11px] font-medium text-muted-foreground">Reported Duration</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{duration || "Not specified"}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl text-xs">
              Cancel
            </Button>
            {hasProcessed && (
              <Button
                type="button"
                onClick={handleApply}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Populate Triage Complaint
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AudioRecorderModal
        isOpen={isRecorderOpen}
        onClose={() => setIsRecorderOpen(false)}
        context="triage"
        title="Voice Triage Dictation"
        description="Patient or nurse can describe symptoms naturally. Sahara extracts structured complaint and flags urgent indicators."
        onProcessed={handleProcessed}
      />
    </>
  );
}
