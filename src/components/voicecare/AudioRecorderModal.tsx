import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Mic,
  Square,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Globe2,
  Keyboard,
  ShieldCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { processVoiceCareSpeech, confirmVoiceCareAction } from "@/lib/voicecare/voicecare.functions";

interface AudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: "appointment_booking" | "complaint" | "clinical_note" | "triage" | "checkin" | "messaging";
  title?: string;
  description?: string;
  patientId?: string;
  hospitalId?: string;
  onProcessed: (result: {
    transcript: string;
    detectedLanguageLabel: string;
    appointmentIntent?: any;
    clinicalNote?: any;
    triageUrgency?: any;
    auditId?: string;
  }) => void;
}

export function AudioRecorderModal({
  isOpen,
  onClose,
  context,
  title,
  description,
  patientId,
  hospitalId,
  onProcessed,
}: AudioRecorderModalProps) {
  const processVoiceFn = useServerFn(processVoiceCareSpeech);

  const [state, setState] = useState<"idle" | "recording" | "processing" | "review">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [manualText, setManualText] = useState("");
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [liveSpokenTranscript, setLiveSpokenTranscript] = useState<string>("");
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>("auto");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const animFrameRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);

  // High-fidelity African Code-Switch Dialect Presets
  const samplePrompts = [
    {
      label: "Hausa + English Booking",
      text: "Ina son ganin likita next Tuesday at 10 in the morning. Ina fama da ciwon ciki da zazzabi since yesterday.",
      lang: "Hausa (ha-NG)",
      code: "ha",
    },
    {
      label: "Nigerian Pidgin Booking",
      text: "Abeg I want to see a doctor next Monday around 9am. My belle dey pain me for about three days now.",
      lang: "Pidgin (pcm-NG)",
      code: "pcm",
    },
    {
      label: "Yoruba + English Intake",
      text: "I need to book appointment on Friday around 2pm with doctor. Fifi ori ati inu rirun ni mo ni.",
      lang: "Yoruba (yo-NG)",
      code: "yo",
    },
    {
      label: "Igbo + English Intake",
      text: "Achorom ihu doctor on Wednesday around 11am. Isi owuwa na afo mgbu na-eme m since yesterday.",
      lang: "Igbo (ig-NG)",
      code: "ig",
    },
    {
      label: "Doctor Clinical SOAP Note",
      text: "Patient presented today with acute abdominal pain and fever for 3 days. Vitals recorded at triage: BP 120/80, pulse 78 bpm. No known drug allergies reported. Prescribed analgesics, antipyretics, and review in 3 days.",
      lang: "Clinical English",
      code: "en",
    },
  ];

  useEffect(() => {
    if (!isOpen) {
      stopRecordingCleanup();
      setState("idle");
      setRecordingSeconds(0);
      setManualText("");
      setLiveSpokenTranscript("");
      setIsTypingMode(false);
    }
  }, [isOpen]);

  function stopRecordingCleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setLiveSpokenTranscript("");

      // 1. Setup real Web Speech Recognition if supported
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          if (selectedLanguageCode === "ha") {
            recognition.lang = "ha-NG";
          } else if (selectedLanguageCode === "yo") {
            recognition.lang = "yo-NG";
          } else if (selectedLanguageCode === "ig") {
            recognition.lang = "ig-NG";
          } else {
            recognition.lang = "en-NG";
          }

          recognition.onresult = (event: any) => {
            let currentTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript + " ";
            }
            if (currentTranscript.trim()) {
              setLiveSpokenTranscript(currentTranscript.trim());
            }
          };

          recognition.onerror = (e: any) => {
            console.warn("Speech recognition notice:", e?.error);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (recErr) {
          console.warn("Live Web Speech API not started:", recErr);
        }
      }

      // 2. Setup audio analyzer for waveform animation
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateLevel);
          }
        };
        updateLevel();
      } catch (err) {
        console.warn("Web Audio API visualization not available:", err);
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleAudioProcessing(audioBlob);
      };

      recorder.start();
      setState("recording");
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access permission error:", err);
      toast.info("Microphone not detected. You can speak with sample African phrases or type instead.");
      setIsTypingMode(true);
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setState("processing");
    }
  }

  async function handleAudioProcessing(blob?: Blob) {
    setState("processing");
    try {
      let base64Audio: string | undefined = undefined;
      if (blob) {
        const reader = new FileReader();
        base64Audio = await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.readAsDataURL(blob);
        });
      }

      const result = await processVoiceFn({
        data: {
          audioBase64: base64Audio,
          rawText: liveSpokenTranscript.trim() || undefined,
          context,
          patientId,
          hospitalId,
          languageHint: selectedLanguageCode !== "auto" ? selectedLanguageCode : undefined,
        },
      });

      if (result.success) {
        toast.success(`Voice processed via Intron Sahara (${result.detectedLanguageLabel})`);
        onProcessed(result);
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Voice processing failed. Please try typing or speak again.");
      setState("idle");
    }
  }

  async function handleDirectPhraseSubmit(textToSubmit: string) {
    setState("processing");
    try {
      const result = await processVoiceFn({
        data: {
          rawText: textToSubmit.trim(),
          context,
          patientId,
          hospitalId,
        },
      });
      if (result.success) {
        toast.success(`Understood: ${result.detectedLanguageLabel}`);
        onProcessed(result);
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Speech processing failed.");
      setState("idle");
    }
  }

  async function handleManualSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!manualText.trim()) {
      toast.error("Please enter your speech or symptoms text.");
      return;
    }
    await handleDirectPhraseSubmit(manualText);
  }

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:w-full max-w-xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl">
        <DialogHeader className="space-y-1.5 sm:space-y-2 text-center items-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-emerald-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Intron Sahara CodeSwitch AI</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
            {title || "HospNest VoiceCare"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground max-w-md px-1">
            {description || "Speak naturally in Hausa, Yoruba, Igbo, Nigerian Pidgin, or English. HospNest understands your intent and takes real hospital action."}
          </DialogDescription>
        </DialogHeader>

        {/* Dialect Selector Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">Dialect:</span>
          {[
            { code: "auto", label: "Auto-Detect" },
            { code: "ha", label: "Hausa" },
            { code: "pcm", label: "Pidgin" },
            { code: "yo", label: "Yoruba" },
            { code: "ig", label: "Igbo" },
            { code: "en", label: "English" },
          ].map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelectedLanguageCode(lang.code)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                selectedLanguageCode === lang.code
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Main Interactive Mic Interface */}
        {!isTypingMode ? (
          <div className="flex flex-col items-center justify-center py-3 sm:py-5 space-y-4 sm:space-y-5">
            {state === "idle" && (
              <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                <button
                  type="button"
                  onClick={startRecording}
                  className="group relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 touch-manipulation"
                >
                  <span className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-md group-hover:bg-emerald-500/30 transition-all" />
                  <Mic className="h-10 w-10 sm:h-12 sm:w-12 transition-transform group-hover:scale-110" />
                </button>
                <div className="text-center space-y-0.5 sm:space-y-1">
                  <p className="font-semibold text-foreground text-sm sm:text-base">Tap to speak naturally</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">Speak in your mother dialect or Nigerian English</p>
                </div>
              </div>
            )}

            {state === "recording" && (
              <div className="flex flex-col items-center space-y-3 sm:space-y-4 w-full">
                <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center">
                  <span
                    className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"
                    style={{ animationDuration: "1.5s" }}
                  />
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-rose-600 text-white shadow-xl shadow-rose-500/30 hover:bg-rose-700 transition-all focus:outline-none touch-manipulation"
                  >
                    <Square className="h-6 w-6 sm:h-8 sm:w-8 fill-current" />
                  </button>
                </div>

                {/* Live Waveform Indicator */}
                <div className="flex items-center gap-1 h-8">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-emerald-500 rounded-full transition-all duration-75"
                      style={{
                        height: `${Math.max(4, (audioLevel * Math.sin(i * 0.4 + recordingSeconds)) % 32)}px`,
                      }}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <Badge variant="outline" className="text-rose-600 border-rose-300 dark:border-rose-800 animate-pulse font-mono font-medium">
                    Listening • {formatTimer(recordingSeconds)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Tap red square when finished speaking</p>
                </div>

                {/* Live Transcript Stream */}
                {liveSpokenTranscript && (
                  <div className="w-full p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-left animate-in fade-in">
                    <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 mb-1">Live Transcribed Speech:</p>
                    <p className="text-foreground italic">"{liveSpokenTranscript}"</p>
                  </div>
                )}
              </div>
            )}

            {state === "processing" && (
              <div className="flex flex-col items-center py-6 space-y-4">
                <RefreshCw className="h-12 w-12 text-emerald-600 animate-spin" />
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Extracting real hospital actions...</p>
                  <p className="text-xs text-muted-foreground">Parsing dialect keywords, appointments, and clinical symptoms</p>
                </div>
              </div>
            )}

            {/* Quick Dialect Test Prompts */}
            <div className="w-full border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
                Or tap a natural dialect speech sample:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDirectPhraseSubmit(p.text)}
                    className="text-left p-2.5 rounded-xl border border-border bg-card/60 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-xs group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground group-hover:text-emerald-600">{p.label}</span>
                      <span className="text-[10px] text-muted-foreground">{p.lang}</span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 italic">"{p.text}"</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsTypingMode(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Keyboard className="h-3.5 w-3.5 mr-1.5" />
              Type message instead
            </Button>
          </div>
        ) : (
          /* Manual Typing Mode Fallback */
          <form onSubmit={handleManualSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Your natural language message or complaint:</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTypingMode(false)}
                  className="h-7 text-xs text-emerald-600"
                >
                  <Mic className="h-3.5 w-3.5 mr-1" />
                  Switch to Voice
                </Button>
              </div>
              <Textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="e.g. Ina son ganin likita ranar Talata karfe goma na safe, ina fama da ciwon ciki da zazzabi..."
                className="min-h-[120px] rounded-2xl"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={state === "processing"} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                {state === "processing" ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Understand & Extract
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
