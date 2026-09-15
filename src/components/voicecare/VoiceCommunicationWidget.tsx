import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mic,
  Play,
  Pause,
  Send,
  Volume2,
  Sparkles,
  Stethoscope,
  User,
  Clock,
  Globe2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  sendPatientClinicianVoiceMessage,
  getPatientClinicianVoiceMessages,
} from "@/lib/voicecare/voicecare.functions";
import { AudioRecorderModal } from "./AudioRecorderModal";

interface VoiceCommunicationWidgetProps {
  patientId: string;
  patientName?: string;
  currentUserRole: "doctor" | "patient" | "admin" | "nurse";
  currentUserName: string;
  hospitalId?: string;
}

export function VoiceCommunicationWidget({
  patientId,
  patientName,
  currentUserRole,
  currentUserName,
  hospitalId,
}: VoiceCommunicationWidgetProps) {
  const sendMsgFn = useServerFn(sendPatientClinicianVoiceMessage);
  const getMsgsFn = useServerFn(getPatientClinicianVoiceMessages);

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      loadMessages();
    }
  }, [patientId]);

  async function loadMessages() {
    setLoading(true);
    try {
      const res = await getMsgsFn({ data: { patientId } });
      setMessages(res.messages || []);
    } catch (e) {
      console.warn("Messages load:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendVoice(result: any) {
    try {
      const res = await sendMsgFn({
        data: {
          patientId,
          hospitalId,
          senderRole: currentUserRole === "doctor" ? "doctor" : "patient",
          senderName: currentUserName || (currentUserRole === "doctor" ? "Attending Physician" : "Patient"),
          transcript: result.transcript,
          language: result.detectedLanguageLabel,
        },
      });
      if (res?.success) {
        toast.success("Voice instruction sent!");
        loadMessages();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    }
  }

  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim()) return;

    try {
      const res = await sendMsgFn({
        data: {
          patientId,
          hospitalId,
          senderRole: currentUserRole === "doctor" ? "doctor" : "patient",
          senderName: currentUserName || (currentUserRole === "doctor" ? "Attending Physician" : "Patient"),
          transcript: textInput.trim(),
          language: "Nigerian-accented English",
        },
      });
      if (res?.success) {
        setTextInput("");
        toast.success("Message sent!");
        loadMessages();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    }
  }

  // Simulated audio playback using browser speech synthesis for interactive voice listening
  function playAudioMessage(id: string, text: string) {
    if (playingId === id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);
    setPlayingId(id);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <Card className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600">
              <Volume2 className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Patient ↔ Clinician VoiceCare Messages
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Controlled African-language voice notes and instructions
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadMessages}
            disabled={loading}
            className="h-7 w-7 p-0 rounded-full"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3 max-h-[340px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground space-y-2">
            <Sparkles className="h-6 w-6 text-emerald-600/40 mx-auto" />
            <p>No voice messages yet. Record a natural voice instruction below.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isDoctor = m.senderRole === "doctor";
            return (
              <div
                key={m.id}
                className={`p-3 rounded-2xl border text-xs space-y-2 ${
                  isDoctor
                    ? "bg-emerald-500/5 border-emerald-500/20 mr-4"
                    : "bg-muted/40 border-border ml-4"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    {isDoctor ? (
                      <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-teal-600" />
                    )}
                    <span>{m.senderName}</span>
                    <Badge variant="outline" className="text-[10px] py-0 h-4 ml-1">
                      {isDoctor ? "Doctor Instruction" : "Patient Response"}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <p className="text-foreground/90 italic pl-1">"{m.transcript}"</p>

                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                  <Badge variant="secondary" className="text-[10px] h-4 bg-muted text-muted-foreground">
                    <Globe2 className="h-2.5 w-2.5 mr-1" />
                    {m.language}
                  </Badge>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => playAudioMessage(m.id, m.transcript)}
                    className="h-6 text-xs text-emerald-600 hover:text-emerald-700 gap-1 px-2"
                  >
                    {playingId === m.id ? (
                      <>
                        <Pause className="h-3 w-3 fill-current" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 fill-current" />
                        <span>Play Voice</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <CardFooter className="p-3 border-t border-border/60 bg-muted/10 flex items-center gap-2">
        <Button
          type="button"
          onClick={() => setIsRecorderOpen(true)}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-3 gap-1.5 shrink-0 shadow-sm"
        >
          <Mic className="h-3.5 w-3.5" />
          <span>Record Voice</span>
        </Button>

        <form onSubmit={handleSendText} className="flex-1 flex items-center gap-1.5">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type message or instruction..."
            className="rounded-xl h-9 text-xs"
          />
          <Button type="submit" size="sm" variant="secondary" className="rounded-xl h-9 px-3">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </CardFooter>

      <AudioRecorderModal
        isOpen={isRecorderOpen}
        onClose={() => setIsRecorderOpen(false)}
        context="messaging"
        title="Record Voice Message"
        description="Speak your clinical instruction or message. Sahara will transcribe and generate the voice note."
        patientId={patientId}
        hospitalId={hospitalId}
        onProcessed={handleSendVoice}
      />
    </Card>
  );
}
