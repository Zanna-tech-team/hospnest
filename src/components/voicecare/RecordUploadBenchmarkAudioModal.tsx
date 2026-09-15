import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  MicOff,
  Upload,
  Play,
  Pause,
  StopCircle,
  Volume2,
  FileAudio,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { BenchmarkSample } from "@/lib/voicecare/benchmark-lab.functions";

interface RecordUploadBenchmarkAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSample: (sampleData: Omit<BenchmarkSample, "id" | "createdAt" | "isSynthetic">) => Promise<any>;
}

export function RecordUploadBenchmarkAudioModal({
  isOpen,
  onClose,
  onSaveSample,
}: RecordUploadBenchmarkAudioModalProps) {
  const [sourceType, setSourceType] = useState<"record" | "upload">("record");

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [audioFileName, setAudioFileName] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [languagePair, setLanguagePair] = useState("Pidgin + English");
  const [accent, setAccent] = useState("Lagos / South-West Urban");
  const [domain, setDomain] = useState<BenchmarkSample["domain"]>("Appointment Booking");
  const [deviceType, setDeviceType] = useState<BenchmarkSample["deviceType"]>("Android phone");
  const [noiseCondition, setNoiseCondition] = useState<BenchmarkSample["noiseCondition"]>("Quiet room");
  const [speakerType, setSpeakerType] = useState<BenchmarkSample["speakerType"]>("Patient");
  const [consentStatus, setConsentStatus] = useState<string>("Fully Synthetic Case (No PHI)");
  const [groundTruthTranscript, setGroundTruthTranscript] = useState("");
  const [expectedIntent, setExpectedIntent] = useState("Book Appointment");
  const [department, setDepartment] = useState("General Consultation");
  const [targetDate, setTargetDate] = useState("Monday");
  const [targetTime, setTargetTime] = useState("09:00");
  const [complaint, setComplaint] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setGroundTruthTranscript("");
      setAudioBase64(null);
      setAudioDuration(0);
      setRecordingSeconds(0);
      setIsRecording(false);
      setIsPlayingPreview(false);
      setAudioFileName("");
      setConsentStatus("Fully Synthetic Case (No PHI)");
    }
  }, [isOpen]);

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Audio Playback Listener
  useEffect(() => {
    const player = audioPlayerRef.current;
    if (!player) return;
    const handleEnded = () => setIsPlayingPreview(false);
    player.addEventListener("ended", handleEnded);
    return () => player.removeEventListener("ended", handleEnded);
  }, [audioBase64]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioBase64(base64data);
        };
        reader.readAsDataURL(audioBlob);

        // Calculate duration via temporary audio element
        const url = URL.createObjectURL(audioBlob);
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          const dur = Math.round(tempAudio.duration * 10) / 10;
          setAudioDuration(dur || recordingSeconds || 5.0);
        };

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      toast.info("Microphone active. Speak native dialect or code-switched case...");
    } catch (err) {
      toast.error("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Benchmark audio recorded successfully!");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/") && !file.name.match(/\.(wav|mp3|m4a|ogg|webm|aac)$/i)) {
      toast.error("Please upload a valid audio file (WAV, MP3, M4A, WEBM, OGG).");
      return;
    }

    setAudioFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAudioBase64(base64);

      // Extract duration
      const tempAudio = new Audio(base64);
      tempAudio.onloadedmetadata = () => {
        const dur = Math.round(tempAudio.duration * 10) / 10;
        setAudioDuration(dur || 5.0);
      };
      toast.success(`Loaded audio file: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const togglePlayPreview = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingPreview) {
      audioPlayerRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please provide a descriptive title for this benchmark sample.");
      return;
    }
    if (!groundTruthTranscript.trim()) {
      toast.error("Please enter the human-verified ground-truth spoken transcript.");
      return;
    }

    try {
      setIsSaving(true);
      await onSaveSample({
        title,
        audioBase64: audioBase64 || undefined,
        audioDurationSeconds: audioDuration || 6.0,
        languagePair,
        country: "Nigeria",
        accent,
        domain,
        deviceType,
        noiseCondition,
        speakerType,
        consentStatus,
        deIdentificationStatus: "De-identified / Zero PHI",
        groundTruthTranscript,
        expectedIntent,
        expectedStructuredData: {
          intent: expectedIntent,
          department,
          date: targetDate,
          time: targetTime,
          complaint: complaint || title,
        },
      });

      toast.success("Benchmark audio sample saved to dataset!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save benchmark sample.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-[10px]">
              Sahara CodeSwitch Africa
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Hugging Face Ready
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Volume2 className="h-5 w-5 text-teal-600" />
            Record / Upload Benchmark Audio Sample
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add human-verified African multi-lingual speech recordings and ground-truth metadata for benchmark evaluation.
          </DialogDescription>
        </DialogHeader>

        {/* Zero-PHI Ethical Safeguard Banner */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Ethical Safeguard & Zero-PHI Protocol:</span>
            <span>
              Do not record or upload real patient identifying data (PII/PHI). Use simulated clinical actors or fully synthetic dialogue for benchmark datasets.
            </span>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Audio Acquisition Source Tabs */}
          <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-3">
            <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as any)}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-foreground text-xs uppercase tracking-wide">
                  Step 1: Capture or Upload Audio
                </span>
                <TabsList className="h-7 bg-muted">
                  <TabsTrigger value="record" className="text-xs px-2.5 h-6">
                    <Mic className="h-3 w-3 mr-1" />
                    Record Mic
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="text-xs px-2.5 h-6">
                    <Upload className="h-3 w-3 mr-1" />
                    Upload File
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Record Tab */}
              <TabsContent value="record" className="mt-2 space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-background rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={
                        isRecording
                          ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                          : "bg-teal-600 hover:bg-teal-700 text-white"
                      }
                    >
                      {isRecording ? (
                        <>
                          <StopCircle className="h-4 w-4 mr-1.5" />
                          Stop Recording ({recordingSeconds}s)
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-1.5" />
                          Start Recording
                        </>
                      )}
                    </Button>

                    {isRecording && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-500 font-bold">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                        Live Recording Active...
                      </div>
                    )}
                  </div>

                  {audioBase64 && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={togglePlayPreview}
                        className="text-xs h-8 text-teal-600 border-teal-500/40"
                      >
                        {isPlayingPreview ? (
                          <>
                            <Pause className="h-3.5 w-3.5 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1" />
                            Play Preview ({audioDuration}s)
                          </>
                        )}
                      </Button>
                      <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                        Audio Ready
                      </Badge>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Upload Tab */}
              <TabsContent value="upload" className="mt-2 space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-border hover:border-teal-500 rounded-xl bg-background text-center cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <FileAudio className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                  <p className="font-semibold text-foreground text-xs">
                    {audioFileName ? audioFileName : "Click or drag audio file here"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Supports WAV, MP3, M4A, OGG, WEBM (16kHz / 44.1kHz mono/stereo)
                  </p>
                </div>

                {audioBase64 && (
                  <div className="flex items-center justify-between p-2 bg-background rounded-lg border border-border">
                    <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                      {audioFileName || "Uploaded audio"} ({audioDuration}s)
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={togglePlayPreview}
                      className="text-xs h-7 text-teal-600"
                    >
                      {isPlayingPreview ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      Preview
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Hidden Audio Tag for playback */}
            {audioBase64 && <audio ref={audioPlayerRef} src={audioBase64} className="hidden" />}
          </div>

          {/* Step 2: Metadata Form */}
          <div className="space-y-3">
            <span className="font-bold text-foreground text-xs uppercase tracking-wide block">
              Step 2: Language, Domain & Acoustic Metadata
            </span>

            <div>
              <Label className="text-xs font-semibold">Sample Title *</Label>
              <Input
                placeholder="e.g. Pidgin-English Abdominal Pain Booking"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Language / Dialect Pair *</Label>
                <Select value={languagePair} onValueChange={setLanguagePair}>
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pidgin + English">Nigerian Pidgin + English (pcm-NG)</SelectItem>
                    <SelectItem value="Hausa + English">Hausa + English (hau-NG)</SelectItem>
                    <SelectItem value="Yoruba + English">Yoruba + English (yor-NG)</SelectItem>
                    <SelectItem value="Igbo + English">Igbo + English (ibo-NG)</SelectItem>
                    <SelectItem value="English (Nigeria)">Nigerian Clinician English (eng-NG)</SelectItem>
                    <SelectItem value="Swahili + English">Swahili + English (swa-KE)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Regional Accent / Locality</Label>
                <Input
                  placeholder="e.g. Lagos Urban, Kano Northern, Ibadan South-West"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-[11px] font-semibold">Domain</Label>
                <Select value={domain} onValueChange={(v: any) => setDomain(v)}>
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Appointment Booking">Appointment Booking</SelectItem>
                    <SelectItem value="Patient Intake">Patient Intake</SelectItem>
                    <SelectItem value="Patient Complaint">Patient Complaint</SelectItem>
                    <SelectItem value="Clinical Documentation">SOAP Dictation</SelectItem>
                    <SelectItem value="Doctor-Patient Communication">Doctor-Patient</SelectItem>
                    <SelectItem value="Triage & Vitals">Triage & Vitals</SelectItem>
                    <SelectItem value="Pharmacy Query">Pharmacy Query</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold">Device Type</Label>
                <Select value={deviceType} onValueChange={(v: any) => setDeviceType(v)}>
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Android phone">Android phone</SelectItem>
                    <SelectItem value="iPhone">iPhone</SelectItem>
                    <SelectItem value="Laptop">Laptop microphone</SelectItem>
                    <SelectItem value="Desktop microphone">Desktop USB Mic</SelectItem>
                    <SelectItem value="Feature phone/IVR">Feature phone / IVR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold">Noise Level</Label>
                <Select value={noiseCondition} onValueChange={(v: any) => setNoiseCondition(v)}>
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quiet room">Quiet room (&lt;30dB)</SelectItem>
                    <SelectItem value="Moderate clinic ambient">Moderate clinic (30-55dB)</SelectItem>
                    <SelectItem value="Noisy ward/outdoor">Noisy ward (&gt;55dB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold">Speaker Role</Label>
                <Select value={speakerType} onValueChange={(v: any) => setSpeakerType(v)}>
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Patient">Patient</SelectItem>
                    <SelectItem value="Doctor">Doctor</SelectItem>
                    <SelectItem value="Nurse">Nurse</SelectItem>
                    <SelectItem value="Desk Officer">Desk Officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Consent & De-identification Status *</Label>
              <Select value={consentStatus} onValueChange={setConsentStatus}>
                <SelectTrigger className="text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fully Synthetic Case (No PHI)">
                    Fully Synthetic Case (No PHI) — Recommended for Public Challenge
                  </SelectItem>
                  <SelectItem value="Simulated Patient Actor">
                    Simulated Patient Actor (Consenting Contributor)
                  </SelectItem>
                  <SelectItem value="De-identified Standard Protocol (Cleaned PHI)">
                    De-identified Standard Protocol (Safe Harbor Zero-PHI)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Verbatim Ground Truth & Expected Slots */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Verbatim Ground Truth Spoken Transcript *</Label>
                <span className="text-[10px] text-muted-foreground">Exact dialect tokens</span>
              </div>
              <Textarea
                rows={3}
                placeholder="Abeg I want to see a doctor next Monday around 9am. My belle dey pain me for about three days now."
                value={groundTruthTranscript}
                onChange={(e) => setGroundTruthTranscript(e.target.value)}
                className="text-xs mt-1 font-serif"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-[11px] font-semibold">Expected Intent</Label>
                <Input
                  value={expectedIntent}
                  onChange={(e) => setExpectedIntent(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold">Department</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold">Target Date / Time</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    placeholder="Day"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Time"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-semibold">Chief Complaint</Label>
                <Input
                  placeholder="e.g. Stomach pain"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
          >
            {isSaving ? "Saving Sample..." : "Save to Benchmark Dataset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
