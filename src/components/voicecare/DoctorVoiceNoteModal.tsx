import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileText,
  Stethoscope,
  Globe2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AudioRecorderModal } from "./AudioRecorderModal";

interface DoctorVoiceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  onApplyNotes: (notes: {
    chiefComplaint: string;
    history: string;
    observations: string;
    plan: string;
    rawTranscript: string;
  }) => void;
}

export function DoctorVoiceNoteModal({
  isOpen,
  onClose,
  patientName,
  onApplyNotes,
}: DoctorVoiceNoteModalProps) {
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [rawTranscript, setRawTranscript] = useState("");
  const [detectedLang, setDetectedLang] = useState("");

  // Extracted SOAP Fields
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [history, setHistory] = useState("");
  const [relevantInfo, setRelevantInfo] = useState("");
  const [observations, setObservations] = useState("");
  const [plan, setPlan] = useState("");

  function handleSpeechProcessed(res: any) {
    setRawTranscript(res.transcript || "");
    setDetectedLang(res.detectedLanguageLabel || "Nigerian-accented English");
    if (res.clinicalNote) {
      setChiefComplaint(res.clinicalNote.chiefComplaint || "");
      setHistory(res.clinicalNote.historyOfPresentIllness || "");
      setRelevantInfo(res.clinicalNote.relevantInformation || "");
      setObservations(res.clinicalNote.observations || "");
      setPlan(res.clinicalNote.planAndFollowUp || "");
    }
    setHasProcessed(true);
  }

  function handleSave() {
    onApplyNotes({
      chiefComplaint,
      history: `${history} ${relevantInfo ? `\n\n[Medical History / Allergies]: ${relevantInfo}` : ""}`.trim(),
      observations,
      plan,
      rawTranscript,
    });
    toast.success("Voice clinical documentation applied to encounter notes!");
    onClose();
  }

  return (
    <>
      <Dialog open={isOpen && !isRecordingModalOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl sm:max-w-3xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl">
          <DialogHeader className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Intron Sahara Clinical Documentation</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold font-display text-foreground">
              Doctor Voice Clinical Note
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Dictate your examination findings, patient history, and plan. HospNest organizes speech into structured clinical SOAP notes.
            </DialogDescription>
          </DialogHeader>

          {/* Mandatory Safety Banner */}
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 p-3.5 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">AI-generated draft — clinician review required.</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Verify all statements before saving to official medical record. No unmentioned medical facts have been invented.
              </p>
            </div>
          </div>

          {!hasProcessed ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 border-2 border-dashed border-border rounded-3xl bg-muted/20">
              <Button
                type="button"
                onClick={() => setIsRecordingModalOpen(true)}
                className="h-16 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/20 gap-3"
              >
                <Mic className="h-6 w-6 animate-pulse" />
                Start Voice Dictation
              </Button>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Example: "Patient presented today with headache for three days. Vitals normal. No known drug allergies. Prescribed routine analgesics."
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
                  onClick={() => setIsRecordingModalOpen(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 h-8"
                >
                  <Mic className="h-3.5 w-3.5 mr-1" />
                  Dictate Again
                </Button>
              </div>

              {/* Raw Transcript */}
              <div className="rounded-2xl bg-muted/40 p-3 text-xs border border-border/60">
                <p className="font-semibold text-muted-foreground mb-1">Dictation Transcript:</p>
                <p className="italic text-foreground/90">"{rawTranscript}"</p>
              </div>

              {/* Structured Note Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Chief Complaint / Reason for Encounter</label>
                  <Input
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="rounded-xl text-xs h-9 mt-1"
                    placeholder="e.g. Headache for 3 days"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">History of Present Illness / Patient Report</label>
                  <Textarea
                    value={history}
                    onChange={(e) => setHistory(e.target.value)}
                    className="rounded-xl text-xs mt-1 min-h-[70px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Observations / Examination</label>
                    <Textarea
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="rounded-xl text-xs mt-1 min-h-[70px]"
                      placeholder="e.g. Vitals normal, alert and oriented"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground">Treatment Plan & Follow-up</label>
                    <Textarea
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="rounded-xl text-xs mt-1 min-h-[70px]"
                      placeholder="e.g. Analgesics prescribed, follow up in 3 days"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl text-xs">
              Cancel
            </Button>
            {hasProcessed && (
              <Button
                type="button"
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Apply to Clinical Notes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded Audio Recorder Modal */}
      <AudioRecorderModal
        isOpen={isRecordingModalOpen}
        onClose={() => setIsRecordingModalOpen(false)}
        context="clinical_note"
        title="Doctor Clinical Dictation"
        description="Speak your clinical notes naturally. Intron Sahara will transcribe and parse SOAP fields."
        onProcessed={handleSpeechProcessed}
      />
    </>
  );
}
