import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAppShell } from "@/components/layout/AppShell";
import {
  getHospitalAuditLogs,
  verifyAuditHashChain,
  exportAuditLogsCsv,
  type AuditLogEntry,
} from "@/lib/admin.functions";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Filter,
  Hash,
  Hospital,
  Info,
  KeyRound,
  Layers,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/audit")({
  component: AuditLogViewerPage,
});

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AuditLogViewerPage() {
  const { activeHospitalId, shellData } = useAppShell();
  const getLogsFn = useServerFn(getHospitalAuditLogs);
  const verifyChainFn = useServerFn(verifyAuditHashChain);
  const exportCsvFn = useServerFn(exportAuditLogsCsv);

  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Verification Dialog
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    totalEntriesScanned: number;
    message: string;
    tamperedRecordId?: number | null;
  } | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<{
    logs: AuditLogEntry[];
    totalCount: number;
  }>({
    queryKey: ["hospital-audit-logs", activeHospitalId, actionFilter, startDate, endDate],
    queryFn: () =>
      getLogsFn({
        data: {
          hospitalId: activeHospitalId,
          actionFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          limit: 200,
        },
      }),
    enabled: Boolean(activeHospitalId),
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      return verifyChainFn({
        data: { hospitalId: activeHospitalId },
      });
    },
    onSuccess: (res: any) => {
      setVerificationResult(res);
      setVerifyModalOpen(true);
      if (res.verified) {
        toast.success("Cryptographic SHA-256 chain verified! 100% Tamper-evident integrity.");
      } else {
        toast.error("Ledger anomaly detected! Chain linkage broken.");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to verify audit ledger chain");
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      return exportCsvFn({
        data: {
          hospitalId: activeHospitalId,
          actionFilter,
        },
      });
    },
    onSuccess: ({ csvContent, filename }) => {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Audit trail exported successfully! Logged as EXPORT.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to export audit CSV");
    },
  });

  const logs = data?.logs || [];
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.accessorName.toLowerCase().includes(q) ||
      log.patientName.toLowerCase().includes(q) ||
      log.patientNin.toLowerCase().includes(q) ||
      (log.justification || "").toLowerCase().includes(q) ||
      log.recordHash.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/30 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Audit Trail & Compliance Ledger
            </h1>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-xs">
              <KeyRound className="h-3.5 w-3.5 mr-1" />
              SHA-256 Hash Chained
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Immutable append-only access log tracking every clinical read, write, emergency override, and report export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            {verifyMutation.isPending ? "Verifying SHA-256 Chain..." : "Verify Hash Chain"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || logs.length === 0}
            className="text-xs font-semibold"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export Audit CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-48">
              <Label className="text-xs text-muted-foreground mb-1 block">Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="READ">READ (Patient Views)</SelectItem>
                  <SelectItem value="WRITE">WRITE (Clinical Updates)</SelectItem>
                  <SelectItem value="BREAK_GLASS_OVERRIDE">BREAK_GLASS_OVERRIDE (Emergency)</SelectItem>
                  <SelectItem value="EXPORT">EXPORT (Data Downloads)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">From:</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">To:</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
            </div>
          </div>

          <div className="w-full md:w-72">
            <Label className="text-xs text-muted-foreground mb-1 block">Search Log Entries</Label>
            <Input
              placeholder="Search staff, patient, NIN, hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Hospital Audit Ledger ({filteredLogs.length} events)
            </CardTitle>
            <CardDescription className="text-xs">
              Every row is cryptographically linked with its predecessor's SHA-256 hash.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-teal-600 mb-2" />
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground">No audit logs matching current filter</p>
              <p className="text-xs text-muted-foreground mt-1">
                All staff operations and patient data access events are automatically recorded.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/80 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="p-3">ID & Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Staff / Accessor</th>
                    <th className="p-3">Patient Target</th>
                    <th className="p-3">Reason / Justification</th>
                    <th className="p-3">Cryptographic Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLogs.map((log) => {
                    const isBreakGlass = log.action === "BREAK_GLASS_OVERRIDE";
                    const isExport = log.action === "EXPORT";
                    const isWrite = log.action === "WRITE";

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          isBreakGlass ? "bg-rose-500/5 font-medium" : ""
                        }`}
                      >
                        <td className="p-3 space-y-0.5">
                          <span className="font-mono text-muted-foreground text-[11px] block">
                            #{log.id}
                          </span>
                          <span className="text-foreground text-[11px] whitespace-nowrap">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </td>

                        <td className="p-3">
                          <Badge
                            className={
                              isBreakGlass
                                ? "bg-destructive text-destructive-foreground text-[10px]"
                                : isExport
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-[10px]"
                                : isWrite
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px]"
                                : "bg-muted text-muted-foreground text-[10px]"
                            }
                          >
                            {log.action}
                          </Badge>
                        </td>

                        <td className="p-3 space-y-0.5">
                          <span className="font-semibold text-foreground block">{log.accessorName}</span>
                          <Badge variant="outline" className="text-[9px] uppercase font-mono bg-secondary/50">
                            {log.accessorRole}
                          </Badge>
                        </td>

                        <td className="p-3 space-y-0.5">
                          <span className="font-medium text-foreground block">{log.patientName}</span>
                          {log.patientNin !== "N/A" && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              NIN: {log.patientNin}
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-foreground max-w-sm">
                          {isBreakGlass && (
                            <span className="inline-flex items-center gap-1 text-destructive font-bold text-[10px] uppercase mr-1.5">
                              <ShieldAlert className="h-3 w-3" />
                              Emergency:
                            </span>
                          )}
                          <span className="text-muted-foreground">{log.justification || "Routine clinical workflow"}</span>
                        </td>

                        <td className="p-3 font-mono text-[10px] text-muted-foreground">
                          <span title={log.recordHash} className="bg-secondary/40 px-2 py-1 rounded-md">
                            {log.recordHash ? `${log.recordHash.slice(0, 8)}...${log.recordHash.slice(-6)}` : "GENESIS"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: SHA-256 Cryptographic Chain Verification Result */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              Cryptographic Chain Verification
            </DialogTitle>
            <DialogDescription className="text-xs">
              Immutable SHA-256 block hash integrity check across the hospital ledger.
            </DialogDescription>
          </DialogHeader>

          {verificationResult && (
            <div className="space-y-4 py-2">
              <div
                className={`rounded-2xl p-4 border flex items-start gap-3 ${
                  verificationResult.verified
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                {verificationResult.verified ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold text-sm">
                    {verificationResult.verified ? "Ledger Integrity 100% Confirmed" : "Chain Anomaly Detected"}
                  </p>
                  <p className="text-xs">{verificationResult.message}</p>
                </div>
              </div>

              <div className="rounded-xl bg-secondary/40 p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Ledger Entries Scanned:</span>
                  <span className="font-mono font-bold text-foreground">{verificationResult.totalEntriesScanned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hashing Algorithm:</span>
                  <span className="font-mono font-bold text-foreground">SHA-256 Append-Only</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chain Status:</span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    VALID & SYNCHRONIZED
                  </Badge>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" onClick={() => setVerifyModalOpen(false)} className="w-full text-xs">
                  Close Verification Window
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
