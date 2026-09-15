import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Copy,
  Check,
  Download,
  FileCode,
  FileSpreadsheet,
  Globe,
  Layers,
  ShieldCheck,
  Sparkles,
  Database,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import type { BenchmarkSample } from "@/lib/voicecare/benchmark-lab.functions";

interface BenchmarkDatasetMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: BenchmarkSample[];
  readmeCard: string;
  jsonlLines: string;
  hfMetadata: any[];
}

export function BenchmarkDatasetMetadataModal({
  isOpen,
  onClose,
  samples,
  readmeCard,
  jsonlLines,
  hfMetadata,
}: BenchmarkDatasetMetadataModalProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  // Dialect statistics
  const pidginCount = samples.filter((s) => s.languagePair.toLowerCase().includes("pidgin")).length;
  const hausaCount = samples.filter((s) => s.languagePair.toLowerCase().includes("hausa")).length;
  const yorubaCount = samples.filter((s) => s.languagePair.toLowerCase().includes("yoruba")).length;
  const igboCount = samples.filter((s) => s.languagePair.toLowerCase().includes("igbo")).length;
  const englishCount = samples.filter((s) => s.languagePair.toLowerCase().includes("english") && !s.languagePair.includes("+")).length;

  const pythonSnippet = `from datasets import load_dataset

# 1. Load HospNest VoiceCare Benchmark Dataset via Hugging Face
dataset = load_dataset(
    "json",
    data_files="https://hospnest.health/api/voicecare/benchmark-dataset/metadata.jsonl"
)

# 2. Inspect first African code-switch speech sample
sample = dataset["train"][0]
print(f"Sample: {sample['file_name']}")
print(f"Language: {sample['language']} ({sample['language_pair']})")
print(f"Transcript: {sample['transcription']}")
print(f"Target Slots: {sample['expected_entities']}")
`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-full max-w-3xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
              Hugging Face Datasets
            </Badge>
            <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-[10px]">
              CC-BY-4.0 Open Benchmark
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Database className="h-5 w-5 text-purple-600" />
            HospNest VoiceCare Benchmark Dataset Metadata & Data Card
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Standardized Hugging Face documentation, acoustic specifications, dialect distribution, and Zero-PHI ethical protocol.
          </DialogDescription>
        </DialogHeader>

        {/* Dialect Distribution KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Pidgin-English</span>
            <span className="text-sm font-bold text-teal-600">{pidginCount} samples</span>
            <span className="text-[9px] text-muted-foreground block font-mono">pcm-NG</span>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Hausa-English</span>
            <span className="text-sm font-bold text-emerald-600">{hausaCount} samples</span>
            <span className="text-[9px] text-muted-foreground block font-mono">hau-NG</span>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Yoruba-English</span>
            <span className="text-sm font-bold text-amber-600">{yorubaCount} samples</span>
            <span className="text-[9px] text-muted-foreground block font-mono">yor-NG</span>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Igbo-English</span>
            <span className="text-sm font-bold text-purple-600">{igboCount} samples</span>
            <span className="text-[9px] text-muted-foreground block font-mono">ibo-NG</span>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Nigerian English</span>
            <span className="text-sm font-bold text-sky-600">{englishCount} samples</span>
            <span className="text-[9px] text-muted-foreground block font-mono">eng-NG</span>
          </div>
        </div>

        <Tabs defaultValue="datacard" className="space-y-4 pt-2">
          <TabsList className="bg-muted/80 p-1 rounded-xl w-full grid grid-cols-3">
            <TabsTrigger value="datacard" className="text-xs">
              <BookOpen className="h-3.5 w-3.5 mr-1 text-purple-500" />
              README.md Data Card
            </TabsTrigger>
            <TabsTrigger value="schema" className="text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-teal-500" />
              Schema & Feature Types
            </TabsTrigger>
            <TabsTrigger value="python" className="text-xs">
              <Terminal className="h-3.5 w-3.5 mr-1 text-sky-500" />
              Hugging Face Python API
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: README.md Data Card */}
          <TabsContent value="datacard" className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Hugging Face Dataset Card (Markdown)</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(readmeCard, "README.md")}
                  className="text-xs h-7"
                >
                  {copiedSection === "README.md" ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy Markdown
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadFile(readmeCard, "README.md", "text/markdown")}
                  className="text-xs h-7"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download README.md
                </Button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-[11px] max-h-[320px] overflow-y-auto leading-relaxed border border-slate-800">
              <pre className="whitespace-pre-wrap">{readmeCard}</pre>
            </div>
          </TabsContent>

          {/* Tab 2: Schema & Feature Types */}
          <TabsContent value="schema" className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-2.5">Field Name</th>
                    <th className="p-2.5">Hugging Face Type</th>
                    <th className="p-2.5">Description & Standard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-sans">
                  <tr>
                    <td className="p-2.5 font-mono text-teal-600 font-bold">file_name</td>
                    <td className="p-2.5 font-mono text-muted-foreground">string</td>
                    <td className="p-2.5 text-foreground">Reference audio file identifier (e.g. sample_pcm_001.wav)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-teal-600 font-bold">transcription</td>
                    <td className="p-2.5 font-mono text-muted-foreground">string</td>
                    <td className="p-2.5 text-foreground">Human-verified ground-truth verbatim spoken transcript</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-teal-600 font-bold">language</td>
                    <td className="p-2.5 font-mono text-muted-foreground">ClassLabel / string</td>
                    <td className="p-2.5 text-foreground">BCP-47 dialect tag (pcm-NG, hau-NG, yor-NG, ibo-NG, eng-NG)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-teal-600 font-bold">domain</td>
                    <td className="p-2.5 font-mono text-muted-foreground">string</td>
                    <td className="p-2.5 text-foreground">Clinical interaction domain (Appointment Booking, SOAP Notes)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-teal-600 font-bold">device</td>
                    <td className="p-2.5 font-mono text-muted-foreground">string</td>
                    <td className="p-2.5 text-foreground">Acoustic device profile (Android phone, Laptop, iPhone)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-teal-600 font-bold">noise_condition</td>
                    <td className="p-2.5 font-mono text-muted-foreground">string</td>
                    <td className="p-2.5 text-foreground">Ambient noise categorization (Quiet, Moderate, Noisy)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-teal-600 font-bold">consent_status</td>
                    <td className="p-2.5 font-mono text-muted-foreground">string</td>
                    <td className="p-2.5 text-foreground">Ethical clearance: Fully Synthetic Case (No PHI) / Simulated Actor</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-teal-600 font-bold">expected_entities</td>
                    <td className="p-2.5 font-mono text-muted-foreground">dict / json</td>
                    <td className="p-2.5 text-foreground">Downstream action slots (intent, department, date, time, complaint)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Tab 3: Python API */}
          <TabsContent value="python" className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Python Loading Code (Hugging Face datasets library)</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(pythonSnippet, "Python Code")}
                className="text-xs h-7"
              >
                {copiedSection === "Python Code" ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                Copy Code
              </Button>
            </div>

            <div className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-xs leading-relaxed border border-slate-800">
              <pre className="whitespace-pre-wrap">{pythonSnippet}</pre>
            </div>
          </TabsContent>
        </Tabs>

        {/* Zero-PHI Ethical Compliance Notice */}
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Ethical AI & Public Hosting Clearance:</span>
            <span>
              This benchmark dataset is cleared for public sharing and academic benchmarking under Creative Commons Attribution 4.0 (CC-BY-4.0). No actual hospital patient encounters or confidential medical records were processed.
            </span>
          </div>
        </div>

        <DialogFooter className="mt-2 flex-wrap sm:justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile(jsonlLines, "metadata.jsonl", "application/x-jsonlines")}
              className="text-xs h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download metadata.jsonl
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile(JSON.stringify(hfMetadata, null, 2), "hospnest_benchmark_dataset.json", "application/json")}
              className="text-xs h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download Full JSON
            </Button>
          </div>

          <Button size="sm" onClick={onClose} className="text-xs bg-slate-800 hover:bg-slate-700 text-white">
            Close Metadata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
