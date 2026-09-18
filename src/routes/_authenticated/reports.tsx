import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/auth/RoleGuard";
import {
  getHospitalReportsData,
  exportHospitalReportCsv,
  type ReportType,
  type HospitalReportData,
} from "@/lib/admin.functions";
import {
  Activity,
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  FlaskConical,
  HeartPulse,
  Hospital,
  Layers,
  Pill,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  component: HospitalReportsPage,
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split("T")[0]!,
    endDate: end.toISOString().split("T")[0]!,
  };
}

export function HospitalReportsPage() {
  const { activeHospitalId, shellData } = useAppShell();
  const getReportsFn = useServerFn(getHospitalReportsData);
  const exportCsvFn = useServerFn(exportHospitalReportCsv);

  const defaults = getDefaultDates();
  const [reportType, setReportType] = useState<ReportType>("visits");
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<HospitalReportData>({
    queryKey: ["hospital-reports-data", activeHospitalId, reportType, startDate, endDate],
    queryFn: () =>
      getReportsFn({
        data: {
          hospitalId: activeHospitalId,
          reportType,
          startDate,
          endDate,
        },
      }),
    enabled: Boolean(activeHospitalId && startDate && endDate),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      return exportCsvFn({
        data: {
          hospitalId: activeHospitalId,
          reportType,
          startDate,
          endDate,
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
      toast.success(`Exported ${filename} successfully! Audited in ledger.`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to export report CSV");
    },
  });

  const setDatePreset = (preset: "today" | "7days" | "30days" | "thisMonth") => {
    const end = new Date();
    const start = new Date();
    if (preset === "today") {
      // today only
    } else if (preset === "7days") {
      start.setDate(start.getDate() - 7);
    } else if (preset === "30days") {
      start.setDate(start.getDate() - 30);
    } else if (preset === "thisMonth") {
      start.setDate(1);
    }
    setStartDate(start.toISOString().split("T")[0]!);
    setEndDate(end.toISOString().split("T")[0]!);
  };

  const rows = data?.rows || [];
  const filteredRows = rows.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return Object.values(r).some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <RoleGuard
      allowedRoles={["hospital_admin", "super_admin"]}
      requiredPermission="reports"
      fallbackTitle="Reports & Analytics Restricted"
      fallbackMessage="Only hospital administrators, data officers, or staff with reports privileges can access hospital analytics and dataset exports."
    >
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/30 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Reports & Data Exports
            </h1>
            <Badge variant="outline" className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Audited Admin Reports
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Generate custom date-range operational summaries, clinical volume, revenue collections, lab performance, and export CSVs.
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
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || rows.length === 0}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {exportMutation.isPending ? "Generating CSV..." : "Export to CSV"}
          </Button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Range:
            </span>
            <Button variant="outline" size="sm" onClick={() => setDatePreset("today")} className="text-xs h-8 px-2.5">
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDatePreset("7days")} className="text-xs h-8 px-2.5">
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDatePreset("30days")} className="text-xs h-8 px-2.5">
              Last 30 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDatePreset("thisMonth")} className="text-xs h-8 px-2.5">
              This Month
            </Button>
          </div>

          {/* Date Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="start-date" className="text-xs text-muted-foreground">From:</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="end-date" className="text-xs text-muted-foreground">To:</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Tabs (Visits, Revenue, Labs, Pharmacy, HMO Claims) */}
      <Tabs
        value={reportType}
        onValueChange={(val) => setReportType(val as ReportType)}
        className="space-y-6"
      >
        <TabsList className="bg-muted p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="visits" className="rounded-lg text-xs sm:text-sm font-semibold">
            <Stethoscope className="h-4 w-4 mr-1.5" />
            1. Patient Visits
          </TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-lg text-xs sm:text-sm font-semibold">
            <Receipt className="h-4 w-4 mr-1.5" />
            2. Revenue & Billing
          </TabsTrigger>
          <TabsTrigger value="labs" className="rounded-lg text-xs sm:text-sm font-semibold">
            <FlaskConical className="h-4 w-4 mr-1.5" />
            3. Lab Turnaround
          </TabsTrigger>
          <TabsTrigger value="pharmacy" className="rounded-lg text-xs sm:text-sm font-semibold">
            <Pill className="h-4 w-4 mr-1.5" />
            4. Drug Dispensing
          </TabsTrigger>
          <TabsTrigger value="claims" className="rounded-lg text-xs sm:text-sm font-semibold">
            <CreditCard className="h-4 w-4 mr-1.5" />
            5. HMO Claims Aging
          </TabsTrigger>
        </TabsList>

        {/* Report Content Container */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                {reportType === "visits" && "Patient Visits & Encounter Volume"}
                {reportType === "revenue" && "Revenue Collections & Service Breakdown"}
                {reportType === "labs" && "Laboratory Order Volume & Turnaround Times"}
                {reportType === "pharmacy" && "Drug Formulary Dispensing & Fulfillment"}
                {reportType === "claims" && "Insurance & HMO Claims Aging Analysis"}
              </CardTitle>
              <CardDescription className="text-xs">
                Reporting period: {formatDate(startDate)} to {formatDate(endDate)} ({filteredRows.length} total records)
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search report table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs w-48 sm:w-60"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-teal-600 mb-2" />
                Aggregating report data...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-foreground">No records match the selected date range</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust your start and end date filters above to expand the report period.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/80 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-b border-border">
                    {reportType === "visits" && (
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">NIN</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Attending Doctor</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Diagnosis</th>
                      </tr>
                    )}
                    {reportType === "revenue" && (
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Patient</th>
                        <th className="p-3">Gross Total</th>
                        <th className="p-3">HMO Cover</th>
                        <th className="p-3">Patient Payable</th>
                        <th className="p-3">Status</th>
                      </tr>
                    )}
                    {reportType === "labs" && (
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Investigation</th>
                        <th className="p-3">Specimen</th>
                        <th className="p-3">Patient</th>
                        <th className="p-3">Ordered By</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Turnaround</th>
                      </tr>
                    )}
                    {reportType === "pharmacy" && (
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Medication</th>
                        <th className="p-3">Patient</th>
                        <th className="p-3">Prescribed</th>
                        <th className="p-3">Dispensed</th>
                        <th className="p-3">Dispensed Date</th>
                        <th className="p-3">Status</th>
                      </tr>
                    )}
                    {reportType === "claims" && (
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">HMO Provider</th>
                        <th className="p-3">Policy #</th>
                        <th className="p-3">Patient</th>
                        <th className="p-3">Claim Amount</th>
                        <th className="p-3">Aging Bracket</th>
                        <th className="p-3">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRows.map((row: any, idx: number) => (
                      <tr key={row.id || idx} className="hover:bg-muted/30 transition-colors">
                        {reportType === "visits" && (
                          <>
                            <td className="p-3 font-mono text-muted-foreground">{formatDate(row.date)}</td>
                            <td className="p-3 font-semibold text-foreground">{row.patientName}</td>
                            <td className="p-3 font-mono text-muted-foreground">{row.nin}</td>
                            <td className="p-3"><Badge variant="secondary" className="text-[10px]">{row.department}</Badge></td>
                            <td className="p-3 text-muted-foreground">{row.doctorName}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px] capitalize bg-secondary">{row.status}</Badge>
                            </td>
                            <td className="p-3 text-foreground truncate max-w-xs">{row.diagnosis}</td>
                          </>
                        )}
                        {reportType === "revenue" && (
                          <>
                            <td className="p-3 font-mono text-muted-foreground">{formatDate(row.date)}</td>
                            <td className="p-3 font-mono font-bold text-foreground">{row.invoiceNumber}</td>
                            <td className="p-3 text-foreground">{row.patientName}</td>
                            <td className="p-3 font-mono font-bold text-foreground">{formatCurrency(row.grossAmount)}</td>
                            <td className="p-3 font-mono text-emerald-600">{formatCurrency(row.insuranceCoverage)}</td>
                            <td className="p-3 font-mono text-foreground">{formatCurrency(row.patientPayable)}</td>
                            <td className="p-3">
                              <Badge className="text-[10px] uppercase bg-secondary">{row.status}</Badge>
                            </td>
                          </>
                        )}
                        {reportType === "labs" && (
                          <>
                            <td className="p-3 font-mono text-muted-foreground">{formatDate(row.date)}</td>
                            <td className="p-3 font-semibold text-foreground">{row.testName}</td>
                            <td className="p-3 text-muted-foreground">{row.sampleType}</td>
                            <td className="p-3 text-foreground">{row.patientName}</td>
                            <td className="p-3 text-muted-foreground">{row.orderedBy}</td>
                            <td className="p-3">
                              <Badge className="text-[10px] uppercase bg-teal-500/10 text-teal-700 border-teal-500/20">{row.status}</Badge>
                            </td>
                            <td className="p-3 font-mono text-muted-foreground">{row.avgTurnaround}</td>
                          </>
                        )}
                        {reportType === "pharmacy" && (
                          <>
                            <td className="p-3 font-mono text-muted-foreground">{formatDate(row.date)}</td>
                            <td className="p-3 font-semibold text-foreground">{row.drugName}</td>
                            <td className="p-3 text-foreground">{row.patientName}</td>
                            <td className="p-3 font-mono text-muted-foreground">{row.quantityPrescribed} units</td>
                            <td className="p-3 font-mono font-bold text-foreground">{row.quantityDispensed} units</td>
                            <td className="p-3 font-mono text-muted-foreground">{formatDate(row.dispensedAt)}</td>
                            <td className="p-3">
                              <Badge className="text-[10px] uppercase bg-secondary">{row.status}</Badge>
                            </td>
                          </>
                        )}
                        {reportType === "claims" && (
                          <>
                            <td className="p-3 font-mono text-muted-foreground">{formatDate(row.date)}</td>
                            <td className="p-3 font-semibold text-foreground">{row.providerName}</td>
                            <td className="p-3 font-mono text-muted-foreground">{row.policyNumber}</td>
                            <td className="p-3 text-foreground">{row.patientName}</td>
                            <td className="p-3 font-mono font-bold text-foreground">{formatCurrency(row.claimAmount)}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px] bg-secondary">{row.ageBracket}</Badge>
                            </td>
                            <td className="p-3">
                              <Badge className="text-[10px] uppercase bg-teal-500/10 text-teal-700 border-teal-500/20">{row.status}</Badge>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
    </RoleGuard>
  );
}
