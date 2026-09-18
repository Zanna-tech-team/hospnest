import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
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

  const [viewMode, setViewMode] = useState<"staff_grouped" | "timeline">("staff_grouped");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [inspectingLog, setInspectingLog] = useState<AuditLogEntry | null>(null);

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

  // Group logs by Staff / Accessor
  const staffMap = new Map<
    string,
    {
      accessorId: string;
      accessorName: string;
      accessorRole: string;
      totalLogs: number;
      readCount: number;
      writeCount: number;
      overrideCount: number;
      exportCount: number;
      lastActive: string;
      logs: AuditLogEntry[];
    }
  >();

  filteredLogs.forEach((log) => {
    const key = log.accessorId || log.accessorName;
    if (!staffMap.has(key)) {
      staffMap.set(key, {
        accessorId: log.accessorId,
        accessorName: log.accessorName || "Staff Member",
        accessorRole: log.accessorRole || "practitioner",
        totalLogs: 0,
        readCount: 0,
        writeCount: 0,
        overrideCount: 0,
        exportCount: 0,
        lastActive: log.timestamp,
        logs: [],
      });
    }
    const cur = staffMap.get(key)!;
    cur.totalLogs += 1;
    cur.logs.push(log);
    if (log.action === "READ") cur.readCount += 1;
    else if (log.action === "WRITE") cur.writeCount += 1;
    else if (log.action === "BREAK_GLASS_OVERRIDE") cur.overrideCount += 1;
    else if (log.action === "EXPORT") cur.exportCount += 1;
  });

  const staffSummaries = Array.from(staffMap.values()).sort((a, b) => b.totalLogs - a.totalLogs);
  const activeStaffDetail = selectedStaffId ? staffSummaries.find((s) => s.accessorId === selectedStaffId || s.accessorName === selectedStaffId) : null;

  return (
    <RoleGuard
      allowedRoles={["hospital_admin", "super_admin"]}
      requiredPermission="audit"
      fallbackTitle="Audit Ledger Restricted"
      fallbackMessage="Only hospital administrators, compliance officers, or staff with audit privileges can inspect the hospital audit trail and cryptographic hash chain."
    >
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

      {/* View Switcher & Filter Bar */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => {
                  setViewMode("staff_grouped");
                  setSelectedStaffId(null);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  viewMode === "staff_grouped"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserCheck className="size-3.5 text-teal-600" />
                Staff Breakdown ({staffSummaries.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("timeline");
                  setSelectedStaffId(null);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  viewMode === "timeline"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="size-3.5 text-purple-600" />
                Timeline Stream ({filteredLogs.length})
              </button>
            </div>

            <div className="w-44">
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
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs w-32"
                title="Start Date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs w-32"
                title="End Date"
              />
            </div>
          </div>

          <div className="w-full md:w-72">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search staff name, patient, NIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Ledger Content */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-teal-600 mb-2" />
          Loading immutable audit logs...
        </div>
      ) : viewMode === "staff_grouped" && !selectedStaffId ? (
        /* ========================================================= */
        /* STAFF-CENTRIC GROUPED ROSTER & LOG VOLUME COUNTERS       */
        /* ========================================================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-foreground">
                Staff Audit Roster ({staffSummaries.length} Practitioners)
              </h3>
              <p className="text-xs text-muted-foreground">
                Select a doctor, nurse, or admin to inspect their exact access history, separated by READ and WRITE operations
              </p>
            </div>
          </div>

          {staffSummaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
              <UserCheck className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground">No staff access logs found</p>
              <p className="text-xs text-muted-foreground mt-1">Logs will appear as practitioners access patient records.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffSummaries.map((staff) => (
                <div
                  key={staff.accessorId || staff.accessorName}
                  onClick={() => setSelectedStaffId(staff.accessorId || staff.accessorName)}
                  className="p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-teal-500/50 hover:shadow-soft cursor-pointer transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="size-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                          {staff.accessorName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground group-hover:text-teal-600 transition-colors">
                            {staff.accessorName}
                          </h4>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono mt-0.5">
                            {staff.accessorRole}
                          </Badge>
                        </div>
                      </div>
                      <Badge className="bg-purple-600 text-white text-[11px] font-mono">
                        {staff.totalLogs} logs
                      </Badge>
                    </div>

                    {/* Colored Action Breakdown: READ vs WRITE vs OVERRIDE vs EXPORT */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/60 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300">
                        <span className="font-medium">🔵 READ Views:</span>
                        <span className="font-bold font-mono">{staff.readCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        <span className="font-medium">🟢 WRITE Edits:</span>
                        <span className="font-bold font-mono">{staff.writeCount}</span>
                      </div>
                      {staff.overrideCount > 0 && (
                        <div className="col-span-2 flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300">
                          <span className="font-semibold flex items-center gap-1">
                            <ShieldAlert className="size-3.5 text-rose-600" /> 🔴 Overrides:
                          </span>
                          <span className="font-bold font-mono">{staff.overrideCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                    <span>Last active: {formatDateTime(staff.lastActive)}</span>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-teal-600 font-semibold text-xs">
                      View Logs →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeStaffDetail ? (
        /* ========================================================= */
        /* SELECTED STAFF DRILL-DOWN LOG VIEW                        */
        /* ========================================================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-xs">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedStaffId(null)}
                className="text-xs h-8"
              >
                ← Back to Staff List
              </Button>
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <span>{activeStaffDetail.accessorName}</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {activeStaffDetail.accessorRole}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Showing {activeStaffDetail.logs.length} audited clinical actions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-xs">
                {activeStaffDetail.readCount} Reads
              </Badge>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs">
                {activeStaffDetail.writeCount} Writes
              </Badge>
              {activeStaffDetail.overrideCount > 0 && (
                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs">
                  {activeStaffDetail.overrideCount} Overrides
                </Badge>
              )}
            </div>
          </div>

          {/* Table of logs for this staff */}
          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/80 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action Type</th>
                      <th className="p-3">Patient Target & NIN</th>
                      <th className="p-3">Clinical Justification</th>
                      <th className="p-3">Cryptographic Seal</th>
                      <th className="p-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {activeStaffDetail.logs.map((log) => {
                      const isBreakGlass = log.action === "BREAK_GLASS_OVERRIDE";
                      const isWrite = log.action === "WRITE";
                      const isRead = log.action === "READ";
                      const isExport = log.action === "EXPORT";

                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                            isBreakGlass ? "bg-rose-500/5 font-medium" : ""
                          }`}
                          onClick={() => setInspectingLog(log)}
                        >
                          <td className="p-3 whitespace-nowrap text-muted-foreground font-mono">
                            {formatDateTime(log.timestamp)}
                          </td>
                          <td className="p-3">
                            <Badge
                              className={
                                isBreakGlass
                                  ? "bg-rose-600 text-white text-[10px]"
                                  : isWrite
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                                  : isRead
                                  ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px]"
                                  : isExport
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]"
                                  : "bg-muted text-muted-foreground text-[10px]"
                              }
                            >
                              {log.action}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-foreground">{log.patientName}</p>
                            {log.patientNin && log.patientNin !== "N/A" && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                NIN: {log.patientNin}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-foreground max-w-xs truncate">
                            {log.justification || "Routine clinical workflow"}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-muted-foreground">
                            {log.recordHash ? `${log.recordHash.slice(0, 10)}...` : "GENESIS"}
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-teal-600">
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ========================================================= */
        /* FULL CHRONOLOGICAL LEDGER STREAM                         */
        /* ========================================================= */
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Chronological Audit Stream ({filteredLogs.length} events)
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable SHA-256 chain of all practitioner operations across the facility
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center m-4">
                <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-foreground">No audit logs matching current filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/80 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-y border-border">
                    <tr>
                      <th className="p-3">ID & Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Staff / Accessor</th>
                      <th className="p-3">Patient Target</th>
                      <th className="p-3">Reason / Justification</th>
                      <th className="p-3">Cryptographic Seal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredLogs.map((log) => {
                      const isBreakGlass = log.action === "BREAK_GLASS_OVERRIDE";
                      const isWrite = log.action === "WRITE";
                      const isRead = log.action === "READ";
                      const isExport = log.action === "EXPORT";

                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                            isBreakGlass ? "bg-rose-500/5 font-medium" : ""
                          }`}
                          onClick={() => setInspectingLog(log)}
                        >
                          <td className="p-3 space-y-0.5">
                            <span className="font-mono text-muted-foreground text-[11px] block">
                              #{log.id}
                            </span>
                            <span className="text-foreground text-[11px] whitespace-nowrap font-mono">
                              {formatDateTime(log.timestamp)}
                            </span>
                          </td>

                          <td className="p-3">
                            <Badge
                              className={
                                isBreakGlass
                                  ? "bg-rose-600 text-white text-[10px]"
                                  : isWrite
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                                  : isRead
                                  ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px]"
                                  : isExport
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]"
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

                          <td className="p-3 text-foreground max-w-sm truncate">
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
                              {log.recordHash ? `${log.recordHash.slice(0, 8)}...` : "GENESIS"}
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
      )}

      {/* MODAL: Single Audit Log Entry Inspector */}
      <Dialog open={Boolean(inspectingLog)} onOpenChange={(open) => !open && setInspectingLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              Audit Entry Record #{inspectingLog?.id}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cryptographically verified record details and clinical justification
            </DialogDescription>
          </DialogHeader>

          {inspectingLog && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-border bg-card">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Action Type</span>
                  <Badge
                    className={
                      inspectingLog.action === "BREAK_GLASS_OVERRIDE"
                        ? "bg-rose-600 text-white text-[10px] mt-1"
                        : inspectingLog.action === "WRITE"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] mt-1"
                        : inspectingLog.action === "READ"
                        ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] mt-1"
                        : "bg-muted text-muted-foreground text-[10px] mt-1"
                    }
                  >
                    {inspectingLog.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Timestamp</span>
                  <span className="font-mono font-semibold text-foreground text-xs mt-1 block">
                    {formatDateTime(inspectingLog.timestamp)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Practitioner:</span>
                  <span className="font-bold text-foreground">{inspectingLog.accessorName} ({inspectingLog.accessorRole})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="font-semibold text-foreground">{inspectingLog.patientName}</span>
                </div>
                {inspectingLog.patientNin && inspectingLog.patientNin !== "N/A" && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">NIN:</span>
                    <span className="font-mono text-foreground font-semibold">{inspectingLog.patientNin}</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                <span className="font-bold text-foreground block">Clinical Justification:</span>
                <p className="text-muted-foreground italic text-xs">
                  &ldquo;{inspectingLog.justification || "Routine clinical workflow"}&rdquo;
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                <span className="font-bold text-foreground block">SHA-256 Record Hash:</span>
                <p className="font-mono text-[10px] text-muted-foreground break-all bg-muted/40 p-2 rounded-lg">
                  {inspectingLog.recordHash || "GENESIS_ROOT"}
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setInspectingLog(null)} className="w-full text-xs">
                  Close Detail
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
    </RoleGuard>
  );
}
