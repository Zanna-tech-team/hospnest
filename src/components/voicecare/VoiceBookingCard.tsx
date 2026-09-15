import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  Sparkles,
  CheckCircle2,
  Edit3,
  Mic,
  AlertTriangle,
  Globe2,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { confirmVoiceCareAction } from "@/lib/voicecare/voicecare.functions";
import { bookDirectOnlineAppointment } from "@/lib/patient-portal.functions";

interface VoiceBookingCardProps {
  intent: {
    preferredDate: string;
    preferredDateFormatted: string;
    preferredTime: string;
    preferredTimeFormatted: string;
    departmentName: string;
    doctorName?: string;
    chiefComplaint: string;
    symptomDuration?: string;
    urgencyLevel: "routine" | "urgent" | "emergency";
    urgencyWarning?: string;
  };
  transcript: string;
  detectedLanguageLabel: string;
  auditId?: string;
  hospitalId: string;
  hospitalName?: string;
  onConfirmed: (appointmentData: any) => void;
  onSpeakAgain: () => void;
  onCancel: () => void;
}

export function VoiceBookingCard({
  intent,
  transcript,
  detectedLanguageLabel,
  auditId,
  hospitalId,
  hospitalName,
  onConfirmed,
  onSpeakAgain,
  onCancel,
}: VoiceBookingCardProps) {
  const confirmVoiceFn = useServerFn(confirmVoiceCareAction);
  const bookDirectApptFn = useServerFn(bookDirectOnlineAppointment);

  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Editable state
  const [editedDate, setEditedDate] = useState(intent.preferredDate);
  const [editedTime, setEditedTime] = useState(intent.preferredTime);
  const [editedDept, setEditedDept] = useState(intent.departmentName);
  const [editedComplaint, setEditedComplaint] = useState(intent.chiefComplaint);
  const [editedDuration, setEditedDuration] = useState(intent.symptomDuration || "");

  async function handleConfirmBooking() {
    if (!hospitalId) {
      toast.error("Please select a hospital first.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create appointment in database
      const reasonSummary = `${editedComplaint} ${editedDuration ? `(${editedDuration})` : ""}`.trim();
      const res = await bookDirectApptFn({
        data: {
          hospitalId,
          date: editedDate,
          timeSlot: editedTime,
          symptomsSummary: `[VoiceCare Booking] ${reasonSummary}. Spoken: "${transcript}"`,
        },
      });

      // 2. Audit confirmation
      if (auditId) {
        await confirmVoiceFn({
          data: {
            auditId,
            status: isEditing ? "EDITED" : "CONFIRMED",
            finalData: {
              date: editedDate,
              time: editedTime,
              department: editedDept,
              complaint: reasonSummary,
              appointmentId: res.appointmentId,
            },
          },
        });
      }

      toast.success("Appointment successfully confirmed and scheduled!");
      onConfirmed({
        ...res,
        date: editedDate,
        time: editedTime,
        department: editedDept,
        complaint: reasonSummary,
        hospitalName: hospitalName || "Selected Hospital",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment. Please check availability.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-2 border-emerald-500/30 bg-gradient-to-b from-card to-emerald-500/5 shadow-xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-xl font-bold font-display text-foreground">
                Here's what I understood
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Review the extracted booking details before finalizing
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs">
            <Globe2 className="h-3 w-3 mr-1" />
            {detectedLanguageLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Original Spoken Transcript */}
        <div className="rounded-2xl bg-muted/60 p-3.5 text-xs text-muted-foreground border border-border/60">
          <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5 text-emerald-600" />
            What you said:
          </p>
          <p className="italic text-foreground/90">"{transcript}"</p>
        </div>

        {/* Urgency Alert if Detected */}
        {intent.urgencyWarning && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 p-3.5 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Urgency Indicator Detected</p>
              <p className="text-muted-foreground mt-0.5">{intent.urgencyWarning}</p>
            </div>
          </div>
        )}

        {/* Structured Booking Data */}
        {!isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-2xl border border-border bg-card p-3 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                Appointment Date
              </span>
              <p className="font-semibold text-foreground text-sm">{intent.preferredDateFormatted || intent.preferredDate}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                Preferred Time
              </span>
              <p className="font-semibold text-foreground text-sm">{intent.preferredTimeFormatted || intent.preferredTime}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                Department
              </span>
              <p className="font-semibold text-foreground text-sm">{intent.departmentName}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                Reason for Visit
              </span>
              <p className="font-semibold text-foreground text-sm">
                {intent.chiefComplaint} {intent.symptomDuration ? `(${intent.symptomDuration})` : ""}
              </p>
            </div>
          </div>
        ) : (
          /* Inline Edit Form */
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  className="rounded-xl text-xs h-9 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Time Slot</label>
                <Input
                  type="time"
                  value={editedTime}
                  onChange={(e) => setEditedTime(e.target.value)}
                  className="rounded-xl text-xs h-9 mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Department</label>
              <Input
                value={editedDept}
                onChange={(e) => setEditedDept(e.target.value)}
                className="rounded-xl text-xs h-9 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Chief Complaint / Symptoms</label>
              <Textarea
                value={editedComplaint}
                onChange={(e) => setEditedComplaint(e.target.value)}
                className="rounded-xl text-xs mt-1"
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 bg-muted/20 pt-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSpeakAgain}
            className="rounded-xl text-xs"
          >
            <Mic className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            Speak Again
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="rounded-xl text-xs"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" />
            {isEditing ? "Done Editing" : "Edit Fields"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="rounded-xl text-xs text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={handleConfirmBooking}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            {submitting ? "Confirming..." : "Confirm Appointment"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
