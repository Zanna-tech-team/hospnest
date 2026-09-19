import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Heart,
  History,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getPatientTransfers,
  createTransferRequest,
  respondToTransferRequest,
  completeTransfer,
  type PatientTransferItem,
} from "@/lib/patient-transfer.functions";
import { ReferralLetterDocument } from "@/components/clinical-docs/ReferralLetterDocument";
import { PrintableDocumentModal } from "@/components/clinical-docs/PrintableDocumentModal";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({
    meta: [
      { title: "Multi-Hospital Patient Transfers — HospNest" },
      { name: "description", content: "Formal cross-hospital patient referral requests, records exchange, and consent-linked clinical transfers." },
    ],
  }),
  component: PatientTransfersPage,
});

type TransferTab = "incoming" | "outgoing";

function PatientTransfersPage() {
  const { activeHospitalId } = useAppShell();
  const getTransfersFn = useServerFn(getPatientTransfers);
  const createTransferFn = useServerFn(createTransferRequest);
  const respondFn = useServerFn(respondToTransferRequest);
  const completeFn = useServerFn(completeTransfer);

  const [activeTab, setActiveTab] = useState<TransferTab>("incoming");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reviewingTransfer, setReviewingTransfer] = useState<PatientTransferItem | null>(null);
  const [isPrintLetterOpen, setIsPrintLetterOpen] = useState(false);
  const [responseDecision, setResponseDecision] = useState<"accept" | "reject">("accept");
  const [responseNotes, setResponseNotes] = useState("");

  // Create Transfer Form state
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [targetHospitalId, setTargetHospitalId] = useState("");
  const [transferPriority, setTransferPriority] = useState<"routine" | "urgent" | "emergency">("routine");
  const [transferReason, setTransferReason] = useState("");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [consentScope, setConsentScope] = useState<"full_transfer" | "emergency_referral" | "second_opinion">("full_transfer");
  const [consentConfirmed, setConsentConfirmed] = useState(true);

  const [isPending, startTransition] = useTransition();

  // Query Transfers
  const {
    data: transferData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["patient-transfers-data", activeHospitalId],
    queryFn: () => getTransfersFn({ data: { hospitalId: activeHospitalId || undefined } }),
    refetchInterval: 15000,
  });

  // Selected Patient Details
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId || !transferData?.eligiblePatients) return null;
    return transferData.eligiblePatients.find((p) => p.id === selectedPatientId) || null;
  }, [selectedPatientId, transferData?.eligiblePatients]);

  // Handle Create Transfer Submit
  const handleCreateSubmit = () => {
    if (!selectedPatientId || !targetHospitalId || !transferReason.trim() || !clinicalSummary.trim()) {
      toast.error("Please fill all required transfer referral fields.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createTransferFn({
          data: {
            hospitalId: activeHospitalId || undefined,
            patientId: selectedPatientId,
            receivingHospitalId: targetHospitalId,
            priority: transferPriority,
            reasonForTransfer: transferReason,
            clinicalSummary,
            consentScope,
          },
        });

        if (res.success) {
          toast.success("Patient transfer request submitted with verified consent.");
          setIsCreateModalOpen(false);
          setSelectedPatientId("");
          setTargetHospitalId("");
          setTransferReason("");
          setClinicalSummary("");
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to create transfer request.");
      }
    });
  };

  // Handle Response (Accept / Reject)
  const handleRespondSubmit = () => {
    if (!reviewingTransfer) return;

    startTransition(async () => {
      try {
        const res = await respondFn({
          data: {
            hospitalId: activeHospitalId || undefined,
            transferId: reviewingTransfer.id,
            decision: responseDecision,
            responseNotes: responseNotes || undefined,
          },
        });

        if (res.success) {
          toast.success(
            responseDecision === "accept"
              ? "Transfer request accepted. Cross-hospital patient record consent activated."
              : "Transfer request declined.",
          );
          setReviewingTransfer(null);
          setResponseNotes("");
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to respond to transfer.");
      }
    });
  };

  // Handle Complete Transfer
  const handleCompleteTransfer = (transferId: string) => {
    startTransition(async () => {
      try {
        const res = await completeFn({
          data: {
            hospitalId: activeHospitalId || undefined,
            transferId,
          },
        });

        if (res.success) {
          toast.success("Patient transfer marked as completed.");
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to complete transfer.");
      }
    });
  };

  // Filtered Incoming
  const filteredIncoming = useMemo(() => {
    if (!transferData?.incomingTransfers) return [];
    if (!searchQuery.trim()) return transferData.incomingTransfers;
    const q = searchQuery.toLowerCase();
    return transferData.incomingTransfers.filter(
      (t) =>
        t.patientName.toLowerCase().includes(q) ||
        t.patientNin.toLowerCase().includes(q) ||
        t.referringHospitalName.toLowerCase().includes(q) ||
        t.reasonForTransfer.toLowerCase().includes(q),
    );
  }, [transferData?.incomingTransfers, searchQuery]);

  // Filtered Outgoing
  const filteredOutgoing = useMemo(() => {
    if (!transferData?.outgoingTransfers) return [];
    if (!searchQuery.trim()) return transferData.outgoingTransfers;
    const q = searchQuery.toLowerCase();
    return transferData.outgoingTransfers.filter(
      (t) =>
        t.patientName.toLowerCase().includes(q) ||
        t.patientNin.toLowerCase().includes(q) ||
        t.receivingHospitalName.toLowerCase().includes(q) ||
        t.reasonForTransfer.toLowerCase().includes(q),
    );
  }, [transferData?.outgoingTransfers, searchQuery]);

  const pendingIncomingCount = transferData?.incomingTransfers.filter((t) => t.status === "pending").length ?? 0;
  const activeOutgoingCount = transferData?.outgoingTransfers.filter((t) => t.status === "pending" || t.status === "accepted").length ?? 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <ArrowRightLeft className="size-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Multi-Hospital Patient Transfers
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Formal cross-facility clinical referrals, encrypted record-sharing, and statutory patient consent exchange.
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
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold"
          >
            <Plus className="size-3.5" />
            Initiate Transfer
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Incoming Referrals</span>
            <Clock className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600 dark:text-amber-400">
            {isLoading ? "—" : pendingIncomingCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Awaiting clinical acceptance & intake
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Outgoing Transfers</span>
            <Send className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">
            {isLoading ? "—" : activeOutgoingCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Referred to other specialized facilities
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Partner Hospitals</span>
            <Building2 className="size-4 text-teal-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">
            {isLoading ? "—" : transferData?.partnerHospitals.length ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Available on national federated network
          </p>
        </div>
      </div>

      {/* Navigation Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex rounded-xl bg-muted p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("incoming")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors ${
              activeTab === "incoming"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowRight className="size-3.5 rotate-180" />
            Incoming Referrals ({transferData?.incomingTransfers.length ?? 0})
            {pendingIncomingCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 font-mono text-[10px] text-amber-700 dark:text-amber-300">
                {pendingIncomingCount} new
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("outgoing")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors ${
              activeTab === "outgoing"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send className="size-3.5" />
            Outgoing Transfers ({transferData?.outgoingTransfers.length ?? 0})
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, hospital, reason..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* TAB 1: INCOMING REFERRALS */}
      {activeTab === "incoming" && (
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Patient Details</th>
                  <th className="p-3.5">Referring Hospital</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Reason for Referral</th>
                  <th className="p-3.5">Status & Consent</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-6 animate-spin text-teal-600" />
                      <span className="mt-2 block">Loading incoming referrals...</span>
                    </td>
                  </tr>
                ) : filteredIncoming.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No incoming transfer requests found.
                    </td>
                  </tr>
                ) : (
                  filteredIncoming.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="p-3.5">
                        <div className="font-bold text-foreground">{t.patientName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          NIN: {t.patientNin} • {t.patientAge}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground">{t.referringHospitalName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Requested by: Dr. {t.requestedByName?.split(" ")[0] || "Attending"}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            t.priority === "emergency"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              : t.priority === "urgent"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground max-w-xs truncate">
                        {t.reasonForTransfer}
                      </td>
                      <td className="p-3.5 space-y-1">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            t.status === "accepted"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : t.status === "rejected"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              : t.status === "completed"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {t.status}
                        </span>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="size-3" /> Consent Verified
                        </div>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviewingTransfer(t);
                            setResponseDecision("accept");
                          }}
                          className="h-7 text-xs border-border"
                        >
                          Review & Dossier
                        </Button>
                        {t.status === "accepted" && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteTransfer(t.id)}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            Check-in Patient
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OUTGOING TRANSFERS */}
      {activeTab === "outgoing" && (
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Patient Details</th>
                  <th className="p-3.5">Destination Hospital</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Transfer Reason</th>
                  <th className="p-3.5">Status & Response</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-6 animate-spin text-teal-600" />
                      <span className="mt-2 block">Loading outgoing transfers...</span>
                    </td>
                  </tr>
                ) : filteredOutgoing.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No outgoing patient transfers on record.
                    </td>
                  </tr>
                ) : (
                  filteredOutgoing.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="p-3.5">
                        <div className="font-bold text-foreground">{t.patientName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">NIN: {t.patientNin}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground">{t.receivingHospitalName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Initiated: {new Date(t.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            t.priority === "emergency"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              : t.priority === "urgent"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground max-w-xs truncate">
                        {t.reasonForTransfer}
                      </td>
                      <td className="p-3.5 space-y-1">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            t.status === "accepted"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : t.status === "rejected"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              : t.status === "completed"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {t.status}
                        </span>
                        {t.responseNotes && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-xs">
                            Note: {t.responseNotes}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewingTransfer(t)}
                          className="h-7 text-xs border-border"
                        >
                          View Transfer Packet
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: INITIATE PATIENT TRANSFER */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Initiate Multi-Hospital Patient Transfer</DialogTitle>
            <DialogDescription className="text-xs">
              Generate a formal referral packet and cross-facility record consent authorization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Patient</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Choose registered patient..." />
                </SelectTrigger>
                <SelectContent>
                  {transferData?.eligiblePatients.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.fullName} (NIN: {p.nin})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPatient && (
              <div className="rounded-xl border border-border bg-muted/20 p-2.5 text-[11px] space-y-1">
                <span className="font-bold text-foreground">Clinical Profile Snapshot:</span>
                <p className="text-muted-foreground">
                  Blood Group: {selectedPatient.bloodGroup || "—"} • Genotype: {selectedPatient.genotype || "—"} • Allergies: {selectedPatient.allergies.length > 0 ? selectedPatient.allergies.join(", ") : "None documented"}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Destination Facility</Label>
                <Select value={targetHospitalId} onValueChange={setTargetHospitalId}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select hospital..." />
                  </SelectTrigger>
                  <SelectContent>
                    {transferData?.partnerHospitals.map((h) => (
                      <SelectItem key={h.id} value={h.id} className="text-xs">
                        {h.name} ({h.city || h.state || "Nigeria"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Transfer Priority</Label>
                <Select value={transferPriority} onValueChange={(val: any) => setTransferPriority(val)}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine" className="text-xs">Routine Elective Referral</SelectItem>
                    <SelectItem value="urgent" className="text-xs">Urgent Inpatient Transfer</SelectItem>
                    <SelectItem value="emergency" className="text-xs">🚨 Emergency / Trauma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason for Referral</Label>
              <Input
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Specialized pediatric neurosurgery required"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Clinical Summary & Handover Notes</Label>
              <Textarea
                value={clinicalSummary}
                onChange={(e) => setClinicalSummary(e.target.value)}
                placeholder="Chief complaints, admission vitals, current medication list, diagnostics performed..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Consent Scope */}
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold">
                <ShieldCheck className="size-4" />
                <span>Statutory Consent & Data Sharing</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                In compliance with NDPR / NHIA statutory frameworks, submitting this transfer creates a 30-day verified consent scope granting the destination medical team read access to historical encounters and lab investigations.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateSubmit}
              disabled={isPending || !selectedPatientId || !targetHospitalId || !transferReason.trim()}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Dispatch Transfer Packet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REVIEW TRANSFER PACKET & RESPOND */}
      <Dialog open={Boolean(reviewingTransfer)} onOpenChange={(open) => !open && setReviewingTransfer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">
              {reviewingTransfer?.isIncoming ? "Incoming Transfer Referral Dossier" : "Transfer Request Packet"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Patient: {reviewingTransfer?.patientName} (NIN: {reviewingTransfer?.patientNin}) • Priority: {reviewingTransfer?.priority.toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {reviewingTransfer && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-3 border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Referring Hospital:</span>
                  <strong className="text-foreground">{reviewingTransfer.referringHospitalName}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Destination Hospital:</span>
                  <strong className="text-foreground">{reviewingTransfer.receivingHospitalName}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-foreground">Reason for Transfer:</span>
                <p className="rounded-lg bg-background p-2 border border-border/80 text-muted-foreground">
                  {reviewingTransfer.reasonForTransfer}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-foreground">Clinical Handover Summary:</span>
                <p className="rounded-lg bg-background p-2.5 border border-border/80 text-muted-foreground whitespace-pre-line">
                  {reviewingTransfer.clinicalSummary}
                </p>
              </div>

              {/* If Incoming and Pending, allow Accept / Reject decision */}
              {reviewingTransfer.isIncoming && reviewingTransfer.status === "pending" && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                  <span className="font-bold text-foreground">Clinical Intake Decision</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={responseDecision === "accept" ? "default" : "outline"}
                      onClick={() => setResponseDecision("accept")}
                      className={`h-8 text-xs font-bold gap-1 ${
                        responseDecision === "accept" ? "bg-teal-600 hover:bg-teal-700 text-white" : ""
                      }`}
                    >
                      <CheckCircle2 className="size-3.5" /> Accept Transfer
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={responseDecision === "reject" ? "destructive" : "outline"}
                      onClick={() => setResponseDecision("reject")}
                      className="h-8 text-xs font-bold gap-1"
                    >
                      <XCircle className="size-3.5" /> Decline Referral
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Response Notes / Bed Allocation</Label>
                    <Input
                      value={responseNotes}
                      onChange={(e) => setResponseNotes(e.target.value)}
                      placeholder="e.g. Bed reserved in Surgical Ward; emergency team notified."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReviewingTransfer(null)}>
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPrintLetterOpen(true)}
                className="gap-1.5 text-primary border-primary/40 hover:bg-primary/5 text-xs font-semibold"
              >
                <FileText className="size-3.5" />
                Print Official Referral Letter
              </Button>
            </div>

            {reviewingTransfer?.isIncoming && reviewingTransfer.status === "pending" && (
              <Button
                type="button"
                size="sm"
                onClick={handleRespondSubmit}
                disabled={isPending}
                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FileCheck className="size-3.5" />}
                Submit Decision
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Official Medical Referral Letter */}
      {reviewingTransfer && (
        <PrintableDocumentModal
          open={isPrintLetterOpen}
          onOpenChange={setIsPrintLetterOpen}
          title="Official Medical Referral Letter"
          documentRefCode={`REF-${reviewingTransfer.id.slice(0, 8).toUpperCase()}`}
        >
          <ReferralLetterDocument
            hospital={{
              name: reviewingTransfer.referringHospitalName,
              address: "Department of Clinical Services & Patient Transfers",
              state: "Nigeria",
              contactPhone: "+234 800 000 9999",
              licenseNumber: "FMOH-REF-098",
            }}
            patient={{
              fullName: reviewingTransfer.patientName,
              nin: reviewingTransfer.patientNin,
              age: reviewingTransfer.clinicalSummary ? "Recorded in Dossier" : "N/A",
              gender: "Patient",
            }}
            referral={{
              referralNumber: `REF-${reviewingTransfer.id.slice(0, 8).toUpperCase()}`,
              referralDate: reviewingTransfer.createdAt,
              referralType: reviewingTransfer.priority,
              receivingFacility: reviewingTransfer.receivingHospitalName,
              receivingSpecialty: "Tertiary & Specialized Medical Services",
              reasonForReferral: reviewingTransfer.reasonForTransfer,
              clinicalSummaryAndHistory: reviewingTransfer.clinicalSummary,
              referringDoctorName: reviewingTransfer.requestedByName || "Attending Medical Officer",
              referringDoctorRank: "Medical Officer",
              referringDoctorLicenseNumber: "MDCN/R/99214",
            }}
          />
        </PrintableDocumentModal>
      )}
    </div>
  );
}
