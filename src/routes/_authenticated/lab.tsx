import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Beaker,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  FlaskConical,
  Heart,
  Loader2,
  Lock,
  Microscope,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Stethoscope,
  TestTube,
  User,
  Zap,
} from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLabWorkbench,
  advanceLabOrderStatus,
  recordLabResult,
  type LabWorklistItem,
} from "@/lib/lab.functions";
import { PrintableDocumentModal } from "@/components/clinical-docs/PrintableDocumentModal";
import { LabReportDocument } from "@/components/clinical-docs/LabReportDocument";
import { toast } from "sonner";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lab")({
  head: () => ({
    meta: [
      { title: "Laboratory Workbench — HospNest" },
      { name: "description", content: "Clinical laboratory order worklist, sample collection, test processing, and structured result capture." },
    ],
  }),
  component: LabWorkbenchPage,
});

type StatusFilter = "all" | "ordered" | "sample_collected" | "processing" | "completed" | "critical";

function LabWorkbenchPage() {
  const { activeHospitalId } = useAppShell();
  const getWorkbenchFn = useServerFn(getLabWorkbench);
  const advanceStatusFn = useServerFn(advanceLabOrderStatus);
  const recordResultFn = useServerFn(recordLabResult);

  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<LabWorklistItem | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // Result entry form state
  const [resultValue, setResultValue] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [abnormalFlag, setAbnormalFlag] = useState<"normal" | "abnormal" | "critical">("normal");
  const [comments, setComments] = useState("");

  // Printable Report state
  const [printingLabItem, setPrintingLabItem] = useState<LabWorklistItem | null>(null);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const {
    data: labData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["lab-workbench", activeHospitalId],
    queryFn: () => getWorkbenchFn({ data: { hospitalId: activeHospitalId || undefined } }),
    refetchInterval: 10000,
  });

  // Advance order status handler
  const handleAdvanceStatus = (
    order: LabWorklistItem,
    nextStatus: "sample_collected" | "processing" | "completed" | "critical",
  ) => {
    startTransition(async () => {
      try {
        const res = await advanceStatusFn({
          data: {
            labOrderId: order.id,
            encounterId: order.encounterId,
            patientId: order.patientId,
            hospitalId: activeHospitalId || undefined,
            nextStatus,
            sampleType: order.sampleType || "Blood",
          },
        });

        if (res.success) {
          const statusText =
            nextStatus === "sample_collected"
              ? "Sample marked as Collected."
              : nextStatus === "processing"
              ? "Investigation marked In Progress."
              : "Status updated.";
          toast.success(statusText);
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to update status");
      }
    });
  };

  // Open result entry modal
  const handleOpenResultModal = (order: LabWorklistItem) => {
    setSelectedOrder(order);
    setResultValue(order.resultValue || "");
    setUnit(order.resultMetadata?.unit || "");
    setReferenceRange(order.resultMetadata?.referenceRange || "");
    setAbnormalFlag(order.resultMetadata?.abnormalFlag || "normal");
    setComments(order.resultMetadata?.comments || "");
    setIsResultModalOpen(true);
  };

  // Save result entry handler
  const handleSaveResult = () => {
    if (!selectedOrder || !resultValue.trim()) {
      toast.error("Please enter a test result value.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await recordResultFn({
          data: {
            labOrderId: selectedOrder.id,
            encounterId: selectedOrder.encounterId,
            patientId: selectedOrder.patientId,
            hospitalId: activeHospitalId || undefined,
            resultValue,
            unit: unit || undefined,
            referenceRange: referenceRange || undefined,
            abnormalFlag,
            comments: comments || undefined,
          },
        });

        if (res.success) {
          toast.success(
            abnormalFlag === "critical"
              ? "CRITICAL result recorded and flagged for immediate doctor attention."
              : "Lab result recorded and published to doctor workspace.",
          );
          setIsResultModalOpen(false);
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to record lab result.");
      }
    });
  };

  // Filter worklist
  const filteredList = useMemo(() => {
    if (!labData?.worklist) return [];
    let list = labData.worklist;

    if (activeTab !== "all") {
      list = list.filter((item) => item.status === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.patient.fullName.toLowerCase().includes(q) ||
          item.patient.nin.toLowerCase().includes(q) ||
          item.test.name.toLowerCase().includes(q) ||
          item.test.code.toLowerCase().includes(q) ||
          (item.orderedByDoctor.fullName && item.orderedByDoctor.fullName.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [labData?.worklist, activeTab, searchQuery]);

  return (
    <RoleGuard
      allowedRoles={["lab_tech", "doctor", "hospital_admin", "super_admin"]}
      requiredPermission="lab"
      fallbackTitle="Laboratory Workstation Restricted"
      fallbackMessage="Access to medical laboratory orders, accessioning, specimen analysis, and diagnostic test results is restricted to licensed Laboratory Scientists, Pathologists, and authorized Medical Staff."
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FlaskConical className="size-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Laboratory Workbench
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage test worklists, sample collection, laboratory analysis, and structured result publication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 border-border"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Worklist
          </Button>
          <Button asChild size="sm" variant="secondary" className="gap-1.5">
            <Link to="/consultations">
              <Stethoscope className="size-3.5" /> Doctor Consultations
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Worklist Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div
          onClick={() => setActiveTab("ordered")}
          className={`cursor-pointer rounded-xl border p-4 shadow-soft transition-all ${
            activeTab === "ordered"
              ? "border-amber-500 bg-amber-500/10"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            1. Requested / Pending
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
              {labData?.counts.ordered ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">tests</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("sample_collected")}
          className={`cursor-pointer rounded-xl border p-4 shadow-soft transition-all ${
            activeTab === "sample_collected"
              ? "border-blue-500 bg-blue-500/10"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            2. Sample Collected
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-blue-600 dark:text-blue-400">
              {labData?.counts.sampleCollected ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">ready</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("processing")}
          className={`cursor-pointer rounded-xl border p-4 shadow-soft transition-all ${
            activeTab === "processing"
              ? "border-purple-500 bg-purple-500/10"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            3. In Analysis
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-purple-600 dark:text-purple-400">
              {labData?.counts.processing ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">processing</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("completed")}
          className={`cursor-pointer rounded-xl border p-4 shadow-soft transition-all ${
            activeTab === "completed"
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            4. Completed
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {labData?.counts.completed ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">results ready</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("critical")}
          className={`cursor-pointer rounded-xl border p-4 shadow-soft transition-all ${
            activeTab === "critical"
              ? "border-red-500 bg-red-500/15"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
            <AlertOctagon className="size-3" /> Critical Values
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-red-600 dark:text-red-400">
              {labData?.counts.critical ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">flagged</span>
          </div>
        </div>
      </div>

      {/* Main Worklist Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        {/* Filter Navigation & Search */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: `All Orders (${labData?.counts.total ?? 0})` },
              { id: "ordered", label: "Requested" },
              { id: "sample_collected", label: "Sample Collected" },
              { id: "processing", label: "In Analysis" },
              { id: "completed", label: "Completed" },
              { id: "critical", label: "Critical" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StatusFilter)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, NIN, test name, doctor..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Worklist Table */}
        {isLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading laboratory workbench...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-destructive">
            <AlertTriangle className="mx-auto size-8" />
            <p className="mt-2 text-sm">{(error as any)?.message || "Failed to load laboratory orders"}</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500/70" />
            <h3 className="mt-3 font-display text-base font-bold text-foreground">
              No orders found in this view
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              All requested diagnostic lab orders will appear here as doctors submit them from the consultation workspace.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 p-4.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: Patient & Test Details */}
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary font-bold border border-primary/20">
                    <FlaskConical className="size-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-sm font-bold text-foreground">
                        {item.test.name}
                      </h3>
                      <span className="font-mono text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.2 rounded">
                        {item.test.code}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.2 text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "ordered"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : item.status === "sample_collected"
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                            : item.status === "processing"
                            ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
                            : item.status === "critical"
                            ? "bg-red-500/20 text-red-700 dark:text-red-300 font-extrabold animate-pulse"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Patient & Doctor Meta */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Patient: <Link to="/patients/$patientId" params={{ patientId: item.patientId }} className="hover:underline font-bold text-foreground">{item.patient.fullName}</Link> ({item.patient.age} • {item.patient.gender})
                      </span>
                      <span className="font-mono text-[11px]">NIN: {item.patient.nin}</span>
                      {item.orderedByDoctor.fullName && (
                        <span>Ordered by Dr. {item.orderedByDoctor.fullName}</span>
                      )}
                    </div>

                    {/* Sample Type & Timestamps */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.2">Sample: {item.sampleType || "Blood/Serum"}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> Ordered {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {item.sampleCollectedAt && (
                        <span>• Collected: {new Date(item.sampleCollectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>

                    {/* Completed Result Display */}
                    {item.resultValue && (
                      <div className="mt-3 rounded-lg border border-border bg-background p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">Result Value:</span>
                          <span className={`font-mono text-sm font-bold ${item.isCritical ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                            {item.resultValue} {item.resultMetadata?.unit || ""}
                          </span>
                        </div>
                        {item.resultMetadata?.referenceRange && (
                          <p className="text-[11px] text-muted-foreground">
                            Reference Range: {item.resultMetadata.referenceRange}
                          </p>
                        )}
                        {item.resultMetadata?.comments && (
                          <p className="text-[11px] text-foreground/80 italic">
                            Tech Comments: "{item.resultMetadata.comments}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Step-by-Step Workflow Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
                  {item.status === "ordered" && (
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStatus(item, "sample_collected")}
                      disabled={isPending}
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                    >
                      <TestTube className="size-3.5" /> Sample Collected
                    </Button>
                  )}

                  {item.status === "sample_collected" && (
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStatus(item, "processing")}
                      disabled={isPending}
                      className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
                    >
                      <Microscope className="size-3.5" /> Start Analysis
                    </Button>
                  )}

                  {(item.status === "processing" || item.status === "sample_collected") && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenResultModal(item)}
                      disabled={isPending}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-sm font-semibold"
                    >
                      <CheckCircle2 className="size-3.5" /> Enter Results
                    </Button>
                  )}

                  {(item.status === "completed" || item.status === "critical") && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPrintingLabItem(item);
                          setIsPrintReportOpen(true);
                        }}
                        className="text-xs h-8 gap-1.5 border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 font-semibold"
                      >
                        <Printer className="size-3.5 text-teal-600" /> Print Report
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenResultModal(item)}
                        disabled={isPending}
                        className="text-xs h-8 gap-1.5 border-border"
                      >
                        <FileText className="size-3.5" /> Edit Result
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Lab Result Dialog Modal */}
      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FlaskConical className="size-4" />
              </div>
              <DialogTitle className="font-display text-lg font-bold">
                Record Lab Result
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Test: <span className="font-bold text-foreground">{selectedOrder?.test.name}</span> for patient <span className="font-bold text-foreground">{selectedOrder?.patient.fullName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Standard Reference info */}
            {selectedOrder?.test.standardRange && (
              <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] border border-border">
                <span className="font-bold text-foreground">Standard Reference Guidelines: </span>
                <span className="font-mono text-muted-foreground">
                  {JSON.stringify(selectedOrder.test.standardRange)}
                </span>
              </div>
            )}

            {/* Result Value and Unit */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="res-val" className="text-xs font-bold">Result Value *</Label>
                <Input
                  id="res-val"
                  value={resultValue}
                  onChange={(e) => setResultValue(e.target.value)}
                  placeholder="e.g. 14.2, Positive (+), 110"
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="res-unit" className="text-xs font-bold">Unit</Label>
                <Input
                  id="res-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="mg/dL, g/dL, %"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Reference Range */}
            <div className="space-y-1">
              <Label htmlFor="ref-range" className="text-xs font-bold">Normal Reference Range</Label>
              <Input
                id="ref-range"
                value={referenceRange}
                onChange={(e) => setReferenceRange(e.target.value)}
                placeholder="e.g. 70 - 110 mg/dL, 12.0 - 16.0 g/dL, Negative"
                className="h-9 text-xs"
              />
            </div>

            {/* Abnormal Flag Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">Result Interpretation Flag</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAbnormalFlag("normal")}
                  className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition-all ${
                    abnormalFlag === "normal"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  🟢 Normal
                </button>
                <button
                  type="button"
                  onClick={() => setAbnormalFlag("abnormal")}
                  className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition-all ${
                    abnormalFlag === "abnormal"
                      ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  🟡 Abnormal
                </button>
                <button
                  type="button"
                  onClick={() => setAbnormalFlag("critical")}
                  className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition-all ${
                    abnormalFlag === "critical"
                      ? "border-red-500 bg-red-500/20 text-red-700 dark:text-red-300 shadow-sm animate-pulse"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  🔴 Critical Alert
                </button>
              </div>
            </div>

            {/* Comments / Tech Notes */}
            <div className="space-y-1">
              <Label htmlFor="lab-comments" className="text-xs font-bold">Technician Observations / Comments</Label>
              <Textarea
                id="lab-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Specimen slightly hemolyzed, test repeated twice for confirmation..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResultModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveResult}
              disabled={isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Publish Result to Doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Diagnostic Laboratory Report Modal */}
      {printingLabItem && (
        <PrintableDocumentModal
          open={isPrintReportOpen}
          onOpenChange={setIsPrintReportOpen}
          title="Diagnostic Pathology Report"
          documentRefCode={`LAB-${printingLabItem.id.slice(0, 8).toUpperCase()}`}
        >
          <LabReportDocument
            hospital={{
              name: labData?.hospitalName || "HospNest Diagnostic Laboratory",
              address: "Department of Pathology & Medical Investigation",
              state: "Nigeria",
              contactPhone: "+234 800 000 9999",
              licenseNumber: "FMOH-LAB-014",
            }}
            patient={{
              fullName: printingLabItem.patient.fullName,
              nin: printingLabItem.patient.nin,
              age: printingLabItem.patient.age,
              gender: printingLabItem.patient.gender,
            }}
            lab={{
              reportNumber: `LAB-${printingLabItem.id.slice(0, 8).toUpperCase()}`,
              testName: printingLabItem.test.name,
              testCode: printingLabItem.test.code,
              category: printingLabItem.test.category || "Clinical Investigation",
              specimenType: printingLabItem.sampleType || "Blood / Serum",
              collectionDate: printingLabItem.sampleCollectedAt || printingLabItem.createdAt,
              reportedDate: printingLabItem.resultMetadata?.enteredAt || new Date().toISOString(),
              orderingDoctor: printingLabItem.orderedByDoctor.fullName
                ? `Dr. ${printingLabItem.orderedByDoctor.fullName}`
                : "Attending Physician",
              pathologistOrScientist:
                printingLabItem.technician.fullName || "Medical Laboratory Scientist",
              overallStatus: printingLabItem.isCritical ? "critical" : "completed",
              clinicalIndication: "Clinical evaluation & diagnostic investigation",
              parameters: [
                {
                  parameterName: printingLabItem.test.name,
                  measuredValue: printingLabItem.resultValue || "Recorded",
                  unit: printingLabItem.resultMetadata?.unit || "",
                  referenceInterval: printingLabItem.resultMetadata?.referenceRange || "Normal Range",
                  flag: printingLabItem.resultMetadata?.abnormalFlag || "normal",
                },
              ],
              comments:
                printingLabItem.resultMetadata?.comments ||
                "Result validated and authorized in accordance with standard medical laboratory protocol.",
            }}
          />
        </PrintableDocumentModal>
      )}
      </div>
    </RoleGuard>
  );
}
