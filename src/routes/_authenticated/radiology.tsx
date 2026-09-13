import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Scan,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Upload,
  User,
  AlertTriangle,
  ZoomIn,
  Sliders,
  ChevronRight,
  Printer,
} from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";
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
  getRadiologyDepartmentWorklist,
  orderImagingStudy,
  type RadiologyStudyItem,
  type ImagingModality,
} from "@/lib/radiology.functions";
import { MedicalImageViewerModal } from "@/components/radiology/MedicalImageViewerModal";
import { UploadImagingModal } from "@/components/radiology/UploadImagingModal";
import { RadiologyReportDocument } from "@/components/clinical-docs/RadiologyReportDocument";
import { PrintableDocumentModal } from "@/components/clinical-docs/PrintableDocumentModal";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/radiology")({
  head: () => ({
    meta: [
      { title: "Radiology & Diagnostic Imaging — HospNest" },
      { name: "description", content: "Department imaging order requests, radiographer acquisition worklist, interactive viewer, and signed radiologist reports." },
    ],
  }),
  component: RadiologyDepartmentPage,
});

type RadiologyTab = "requests" | "worklist" | "reports";

function RadiologyDepartmentPage() {
  const { activeHospitalId, shellData } = useAppShell();
  const currentHospital = shellData?.hospitals.find((h) => h.id === activeHospitalId);
  const queryClient = useQueryClient();

  const getWorklistFn = useServerFn(getRadiologyDepartmentWorklist);

  const [activeTab, setActiveTab] = useState<RadiologyTab>("requests");
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [viewingStudy, setViewingStudy] = useState<RadiologyStudyItem | null>(null);
  const [uploadStudy, setUploadStudy] = useState<RadiologyStudyItem | null>(null);
  const [printingStudy, setPrintingStudy] = useState<RadiologyStudyItem | null>(null);

  // Query Radiology Department
  const {
    data: radiologyData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["radiology-department", activeHospitalId, modalityFilter],
    queryFn: () =>
      getWorklistFn({
        data: {
          hospitalId: activeHospitalId || undefined,
          modalityFilter: modalityFilter,
        },
      }),
    enabled: Boolean(activeHospitalId),
  });

  const { requests = [], worklist = [], reports = [], stats = { totalRequests: 0, totalWorklist: 0, totalReports: 0, criticalCount: 0 } } =
    radiologyData || {};

  // Filter current active tab items by search query
  const currentList = useMemo(() => {
    let list: RadiologyStudyItem[] = [];
    if (activeTab === "requests") list = requests;
    else if (activeTab === "worklist") list = worklist;
    else list = reports;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.bodyPart.toLowerCase().includes(q) ||
        (s.clinicalIndication && s.clinicalIndication.toLowerCase().includes(q)) ||
        s.modality.toLowerCase().includes(q)
    );
  }, [activeTab, requests, worklist, reports, searchQuery]);

  const getModalityBadge = (modality: string) => {
    switch (modality) {
      case "xray":
        return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 font-mono font-bold uppercase text-[10px]">X-Ray</Badge>;
      case "ct":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono font-bold uppercase text-[10px]">CT Scan</Badge>;
      case "mri":
        return <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 font-mono font-bold uppercase text-[10px]">MRI</Badge>;
      case "ultrasound":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold uppercase text-[10px]">Ultrasound</Badge>;
      case "mammography":
        return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 font-mono font-bold uppercase text-[10px]">Mammogram</Badge>;
      default:
        return <Badge variant="outline" className="font-mono font-bold uppercase text-[10px]">{modality}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
        <div className="h-8 w-64 bg-muted/60 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Clinical Ops</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Radiology & Imaging</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-3">
            <Scan className="size-7 text-teal-600 dark:text-teal-400" />
            Radiology & Diagnostic Imaging
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Imaging orders worklist, scan acquisition upload, interactive diagnostic image viewer, and signed radiologist reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setUploadStudy({} as any)}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground font-semibold shadow-soft"
          >
            <Upload className="size-4" />
            Upload Diagnostic Scan
          </Button>
        </div>
      </div>

      {/* 2. KPI Stat Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-muted-foreground">Pending Acquisition</span>
          <p className="font-display text-2xl font-black text-foreground mt-0.5">{stats.totalRequests}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Awaiting Reporting</span>
          <p className="font-display text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{stats.totalWorklist}</p>
        </div>
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">Reported & Verified</span>
          <p className="font-display text-2xl font-black text-teal-700 dark:text-teal-300 mt-0.5">{stats.totalReports}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 shadow-soft">
          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Critical Alerts</span>
          <p className="font-display text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5">{stats.criticalCount}</p>
        </div>
      </div>

      {/* 3. Navigation Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-soft">
        {/* Tab Buttons */}
        <div className="flex items-center rounded-xl border border-border bg-muted/30 p-1">
          {[
            { id: "requests", label: "Requests", count: requests.length },
            { id: "worklist", label: "Worklist (Acquired)", count: worklist.length },
            { id: "reports", label: "Signed Reports", count: reports.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as RadiologyTab)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 font-mono text-[10px]">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by body part, indication..."
              className="pl-8 h-9 text-xs w-48"
            />
          </div>

          <Select value={modalityFilter} onValueChange={setModalityFilter}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="All Modalities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Modalities</SelectItem>
              <SelectItem value="xray" className="text-xs">X-Ray</SelectItem>
              <SelectItem value="ct" className="text-xs">CT Scan</SelectItem>
              <SelectItem value="mri" className="text-xs">MRI</SelectItem>
              <SelectItem value="ultrasound" className="text-xs">Ultrasound</SelectItem>
              <SelectItem value="mammography" className="text-xs">Mammogram</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Tab Content: Requests / Worklist / Reports */}
      {currentList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Scan className="mx-auto size-10 text-muted-foreground/60" />
          <h3 className="mt-3 font-display text-base font-bold text-foreground">
            No {activeTab} on record
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {activeTab === "requests" && "Imaging orders raised during doctor consultations will appear here."}
            {activeTab === "worklist" && "Acquired scans awaiting radiologist diagnosis will appear here."}
            {activeTab === "reports" && "Completed and signed radiology interpretations will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentList.map((study) => (
            <div
              key={study.id}
              className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden flex flex-col justify-between transition-all hover:border-teal-500/40 hover:shadow-md"
            >
              {/* Scan Thumbnail if available */}
              {study.imageUrl ? (
                <div
                  className="relative h-44 w-full cursor-pointer bg-slate-950 flex items-center justify-center overflow-hidden"
                  onClick={() => setViewingStudy(study)}
                >
                  <img
                    src={study.imageUrl}
                    alt={study.bodyPart}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {getModalityBadge(study.modality)}
                    {study.isCritical && (
                      <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                    <p className="text-xs font-bold">{study.bodyPart}</p>
                    <p className="text-[11px] text-slate-300 line-clamp-1">{study.clinicalIndication}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 font-bold text-xs">
                      📷
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{study.bodyPart}</h4>
                      <span className="text-[10px] text-muted-foreground">Order Date: {new Date(study.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {getModalityBadge(study.modality)}
                </div>
              )}

              {/* Study Card Body */}
              <div className="p-4 space-y-2.5 text-xs flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Indication:</span>
                    <span className="text-[11px] text-muted-foreground font-mono">#{study.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 bg-muted/20 rounded p-2 border border-border/40">
                    {study.clinicalIndication || "Routine diagnostic evaluation"}
                  </p>

                  {study.impression && (
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 block">Impression:</span>
                      <p className="text-foreground line-clamp-2 text-[11px] font-medium">{study.impression}</p>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                  {study.imageUrl ? (
                    <Button
                      onClick={() => setViewingStudy(study)}
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs font-semibold gap-1.5 flex-1"
                    >
                      <Eye className="size-3.5" />
                      Open Diagnostic Viewer
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setUploadStudy(study)}
                      size="sm"
                      className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground flex-1"
                    >
                      <Upload className="size-3.5" />
                      Acquire & Upload Scan
                    </Button>
                  )}

                  {study.status === "reported" && (
                    <Button
                      onClick={() => setPrintingStudy(study)}
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                    >
                      <Printer className="size-3.5" />
                      Print
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. DIAGNOSTIC VIEWER MODAL */}
      <MedicalImageViewerModal
        study={viewingStudy}
        patientName={viewingStudy?.bodyPart || "Patient Scan"}
        open={Boolean(viewingStudy)}
        onOpenChange={(open) => !open && setViewingStudy(null)}
        onReportSaved={() => {
          refetch();
          toast.success("Radiology report signed and saved!");
        }}
      />

      {/* 6. UPLOAD MODAL */}
      <UploadImagingModal
        open={Boolean(uploadStudy)}
        onOpenChange={(open) => !open && setUploadStudy(null)}
        patientId={uploadStudy?.patientId || "00000000-0000-0000-0000-000000000000"}
        patientName="Inpatient / Outpatient Scan"
        encounterId={uploadStudy?.encounterId || undefined}
        onUploadComplete={() => {
          refetch();
          setUploadStudy(null);
          toast.success("Scan uploaded to worklist!");
        }}
      />

      {/* 7. PRINTABLE REPORT MODAL */}
      {printingStudy && (
        <PrintableDocumentModal
          open={Boolean(printingStudy)}
          onOpenChange={(open) => !open && setPrintingStudy(null)}
          title={`Radiology Report — ${printingStudy.bodyPart}`}
        >
          <RadiologyReportDocument
            hospital={{
              name: currentHospital?.name || "HospNest Medical Center",
              state: "Nigeria",
              contactPhone: "+234 800 HOSPNEST",
              licenseNumber: "FMOH/HOSP/2026/09",
            }}
            patient={{
              fullName: "Patient Medical Record",
            }}
            study={{
              accessionNumber: `RAD-${printingStudy.id.slice(0, 8).toUpperCase()}`,
              studyDate: printingStudy.studyDate,
              modality: printingStudy.modality.toUpperCase(),
              bodyPart: printingStudy.bodyPart,
              clinicalIndication: printingStudy.clinicalIndication,
              reportingRadiologist: printingStudy.radiologistName || "Dr. Staff Radiologist",
              radiologistRank: "Consultant Diagnostic Radiologist",
              findings: printingStudy.findings || "No acute osseous or soft tissue abnormality identified.",
              impression: printingStudy.impression || "Unremarkable examination.",
              isCritical: printingStudy.isCritical,
            }}
          />
        </PrintableDocumentModal>
      )}
    </div>
  );
}
