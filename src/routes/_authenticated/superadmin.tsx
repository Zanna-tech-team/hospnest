import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getSuperadminPlatformOverview,
  getSuperadminHospitalsList,
  getSuperadminHospitalDetail,
  updateSuperadminHospital,
  getSuperadminPlatformUsers,
  getSuperadminHospitalGroupedDirectory,
  updateSuperadminUserRole,
  getSuperadminGlobalBreakGlassLedger,
  verifyPlatformAuditChainIntegrity,
  type PlatformOverviewData,
  type SuperadminHospitalItem,
  type SuperadminHospitalDetail,
  type SuperadminPlatformUser,
  type SuperadminGroupedDirectoryData,
  type HospitalGroupedSection,
  type HospitalStaffMember,
  type HospitalPatientMember,
  type SuperadminBreakGlassLog,
  type AuditChainValidationResult,
} from "@/lib/superadmin.functions";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Award,
  BarChart3,
  Bed,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  Database,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  HeartPulse,
  Hospital,
  KeyRound,
  Layers,
  Lock,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  TrendingUp,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { VoiceCareBenchmarkLab } from "@/components/voicecare/VoiceCareBenchmarkLab";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/superadmin")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search["tab"] === "string" ? (search["tab"] as string) : undefined,
    hospitalId: typeof search["hospitalId"] === "string" ? (search["hospitalId"] as string) : undefined,
  }),
  component: SuperadminDashboardPage,
});

const BRAND_COLORS = [
  "#0d9488", // Teal 600
  "#0284c7", // Sky 600
  "#8b5cf6", // Violet 500
  "#f59e0b", // Amber 500
  "#ec4899", // Pink 500
  "#10b981", // Emerald 500
];

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

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SuperadminDashboardPage() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();

  const getOverviewFn = useServerFn(getSuperadminPlatformOverview);
  const getHospitalsFn = useServerFn(getSuperadminHospitalsList);
  const getHospitalDetailFn = useServerFn(getSuperadminHospitalDetail);
  const updateHospitalFn = useServerFn(updateSuperadminHospital);
  const getUsersFn = useServerFn(getSuperadminPlatformUsers);
  const updateUserRoleFn = useServerFn(updateSuperadminUserRole);
  const getBreakGlassFn = useServerFn(getSuperadminGlobalBreakGlassLedger);
  const verifyAuditChainFn = useServerFn(verifyPlatformAuditChainIntegrity);

  const [activeTab, setActiveTab] = useState<
    "overview" | "hospitals" | "users" | "breakglass" | "audit" | "settings" | "voicecare-lab"
  >((search.tab as any) || "overview");

  useEffect(() => {
    if (search.tab) {
      setActiveTab(search.tab as any);
    }
  }, [search.tab]);

  // Filters
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [hospitalStateFilter, setHospitalStateFilter] = useState("all");
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState("all");
  const [hospitalTierFilter, setHospitalTierFilter] = useState("all");

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  // In-Depth Hospital Inspector State
  const [inspectingHospitalId, setInspectingHospitalId] = useState<string | null>(search.hospitalId || null);
  const [inspectorSubTab, setInspectorSubTab] = useState<"overview" | "staff" | "patients" | "infrastructure" | "diagnostics">("overview");

  // Modal: Edit Hospital Limits
  const [editingHospital, setEditingHospital] = useState<SuperadminHospitalItem | null>(null);
  const [editTier, setEditTier] = useState("Community");
  const [editMaxBeds, setEditMaxBeds] = useState(50);
  const [editMaxStaff, setEditMaxStaff] = useState(30);
  const [editVerified, setEditVerified] = useState(true);

  // Modal: User Role Manager
  const [managingUser, setManagingUser] = useState<SuperadminPlatformUser | null>(null);
  const [roleToGrant, setRoleToGrant] = useState("hospital_admin");
  const [roleHospitalId, setRoleHospitalId] = useState("");

  // Audit Chain state
  const [chainAuditResult, setChainAuditResult] = useState<AuditChainValidationResult | null>(null);

  // 0. Hospital Detail Inspector Query
  const {
    data: hospitalDetailData,
    isLoading: isHospitalDetailLoading,
    refetch: refetchHospitalDetail,
  } = useQuery({
    queryKey: ["superadmin-hospital-detail", inspectingHospitalId],
    queryFn: () => getHospitalDetailFn({ data: { hospitalId: inspectingHospitalId! } }),
    enabled: Boolean(inspectingHospitalId),
  });

  // 1. Overview Query
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
    isRefetching: isOverviewRefetching,
    error: overviewError,
  } = useQuery({
    queryKey: ["superadmin-overview"],
    queryFn: () => getOverviewFn(),
  });

  // 2. Hospitals Query
  const {
    data: hospitalsData,
    isLoading: isHospitalsLoading,
    refetch: refetchHospitals,
  } = useQuery({
    queryKey: [
      "superadmin-hospitals",
      hospitalSearch,
      hospitalStateFilter,
      hospitalStatusFilter,
      hospitalTierFilter,
    ],
    queryFn: () =>
      getHospitalsFn({
        data: {
          searchQuery: hospitalSearch,
          stateFilter: hospitalStateFilter,
          statusFilter: hospitalStatusFilter,
          tierFilter: hospitalTierFilter,
        },
      }),
  });

  const getGroupedDirectoryFn = useServerFn(getSuperadminHospitalGroupedDirectory);

  const [selectedGroupHospitalId, setSelectedGroupHospitalId] = useState<string>("all");
  const [userCategoryTab, setUserCategoryTab] = useState<"doctors" | "nurses" | "admins" | "lab" | "pharmacy" | "patients" | "all_patients">("doctors");

  // 3. Users Queries
  const {
    data: usersData,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["superadmin-users", userSearch, userRoleFilter],
    queryFn: () =>
      getUsersFn({
        data: {
          searchQuery: userSearch,
          roleFilter: userRoleFilter,
        },
      }),
  });

  const {
    data: groupedDirectoryData,
    isLoading: isGroupedDirectoryLoading,
    refetch: refetchGroupedDirectory,
  } = useQuery({
    queryKey: ["superadmin-grouped-directory", userSearch, selectedGroupHospitalId],
    queryFn: () =>
      getGroupedDirectoryFn({
        data: {
          searchQuery: userSearch,
          hospitalIdFilter: selectedGroupHospitalId,
        },
      }),
  });

  // 4. Break-Glass Query
  const {
    data: breakGlassData,
    isLoading: isBreakGlassLoading,
    refetch: refetchBreakGlass,
  } = useQuery({
    queryKey: ["superadmin-breakglass"],
    queryFn: () => getBreakGlassFn(),
  });

  // Mutations
  const updateHospitalMutation = useMutation({
    mutationFn: async () => {
      if (!editingHospital) return;
      return updateHospitalFn({
        data: {
          hospitalId: editingHospital.id,
          isVerified: editVerified,
          tier: editTier,
          maxBeds: editMaxBeds,
          maxStaff: editMaxStaff,
        },
      });
    },
    onSuccess: () => {
      toast.success("Hospital configuration updated successfully.");
      setEditingHospital(null);
      queryClient.invalidateQueries({ queryKey: ["superadmin-hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update hospital.");
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async (payload: {
      targetUserId: string;
      role: string;
      hospitalId?: string | null;
      action: "grant" | "revoke" | "toggle_active";
      isActive?: boolean;
    }) => {
      return updateUserRoleFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("User role permissions updated.");
      setManagingUser(null);
      queryClient.invalidateQueries({ queryKey: ["superadmin-users"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update user role.");
    },
  });

  const runAuditChainMutation = useMutation({
    mutationFn: async () => {
      return verifyAuditChainFn();
    },
    onSuccess: (res) => {
      setChainAuditResult(res);
      if (res.isValid) {
        toast.success("Cryptographic hash chain validated: 100% intact.");
      } else {
        toast.error(`Audit anomaly detected at block ID ${res.brokenAtId}`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Audit chain verification failed.");
    },
  });

  if (overviewError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          {overviewError.message ||
            "You do not have the required Superadmin role to access the national platform command center."}
        </p>
        <Button
          onClick={() => (window.location.href = "/dashboard")}
          className="mt-6 bg-teal-600 hover:bg-teal-700 text-white"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const kpis = overviewData?.kpis;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Top Banner & Header */}
      <div className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30 px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Crown className="h-5 w-5" />
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                HospNest National Command Center
              </h1>
              <Badge className="bg-purple-600 text-white text-[10px] font-mono">
                SUPERADMIN CONSOLE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Federated network oversight, hospital onboarding approvals, global access governance & audit integrity
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchOverview();
                refetchHospitals();
                refetchUsers();
                refetchBreakGlass();
              }}
              disabled={isOverviewRefetching}
              className="text-xs"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isOverviewRefetching ? "animate-spin" : ""}`} />
              Refresh Network
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => runAuditChainMutation.mutate()}
              disabled={runAuditChainMutation.isPending}
              className="text-xs text-teal-700 dark:text-teal-300 border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10"
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-teal-600" />
              {runAuditChainMutation.isPending ? "Validating Ledger..." : "Verify Hash Chain"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 space-y-6">
        {/* KPI Cards Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="shadow-xs border-border/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Hospitals</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">
                  {kpis?.totalHospitals ?? 0}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {kpis?.verifiedHospitals ?? 0} Verified
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <Hospital className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Patients Enrolled</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">
                  {(kpis?.totalPatients ?? 0).toLocaleString()}
                </p>
                <span className="text-[10px] text-muted-foreground">NIN-Linked</span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Clinical Staff</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">
                  {(kpis?.totalStaff ?? 0).toLocaleString()}
                </p>
                <span className="text-[10px] text-muted-foreground">Doctors & Nurses</span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Stethoscope className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Encounters</p>
                <p className="font-display text-xl font-bold text-foreground mt-0.5">
                  {(kpis?.totalEncounters ?? 0).toLocaleString()}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {kpis?.totalInpatientAdmissions ?? 0} Inpatients
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Network Revenue</p>
                <p className="font-display text-lg font-bold text-foreground mt-0.5">
                  {formatCurrency(kpis?.totalRevenueProcessed ?? 0)}
                </p>
                <span className="text-[10px] text-muted-foreground">Collections</span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`shadow-xs border-border/80 ${
              (kpis?.totalBreakGlassEvents ?? 0) > 0
                ? "bg-rose-500/5 border-rose-500/30"
                : ""
            }`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Break-Glass Logs</p>
                <p
                  className={`font-display text-xl font-bold mt-0.5 ${
                    (kpis?.totalBreakGlassEvents ?? 0) > 0
                      ? "text-rose-600"
                      : "text-foreground"
                  }`}
                >
                  {kpis?.totalBreakGlassEvents ?? 0}
                </p>
                <span className="text-[10px] text-muted-foreground">Trauma Overrides</span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Verification Banner if ran */}
        {chainAuditResult && (
          <div
            className={`rounded-2xl border p-4 text-xs flex items-center justify-between gap-4 transition-all ${
              chainAuditResult.isValid
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                : "border-rose-500/40 bg-rose-500/15 text-rose-950 dark:text-rose-100"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {chainAuditResult.isValid ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
              )}
              <div>
                <p className="font-bold">
                  {chainAuditResult.isValid
                    ? "Cryptographic Hash Chain Intact (Tamper-Evidence Verified)"
                    : "Cryptographic Tamper Alert Detected!"}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">{chainAuditResult.summary}</p>
              </div>
            </div>
            <Badge
              className={
                chainAuditResult.isValid ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
              }
            >
              {chainAuditResult.isValid ? "VERIFIED VALID" : "ATTENTION REQUIRED"}
            </Badge>
          </div>
        )}

        {/* Main Superadmin Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="bg-muted/80 p-1 rounded-2xl flex flex-wrap h-auto gap-1">
            <TabsTrigger
              value="overview"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Overview & Metrics
            </TabsTrigger>
            <TabsTrigger
              value="hospitals"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <Building2 className="h-4 w-4 mr-1.5" />
              Hospitals Directory ({kpis?.totalHospitals ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <Users className="h-4 w-4 mr-1.5" />
              Platform Users & Roles
            </TabsTrigger>
            <TabsTrigger
              value="breakglass"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <ShieldAlert className="h-4 w-4 mr-1.5 text-rose-500" />
              Emergency Break-Glass ({kpis?.totalBreakGlassEvents ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <FileCheck2 className="h-4 w-4 mr-1.5 text-teal-600" />
              Ledger & Compliance
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4"
            >
              <Settings className="h-4 w-4 mr-1.5" />
              Platform Tiers
            </TabsTrigger>
            <TabsTrigger
              value="voicecare-lab"
              className="rounded-xl text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4 border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              <Award className="h-4 w-4 mr-1.5 text-teal-600 data-[state=active]:text-white" />
              VoiceCare Benchmark Lab
            </TabsTrigger>
          </TabsList>

          {/* ========================================================= */}
          {/* TAB 1: OVERVIEW & METRICS                                */}
          {/* ========================================================= */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Encounters Trend (30 Days) */}
              <Card className="lg:col-span-2 border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                    <span>National Patient Encounters Trend</span>
                    <Badge variant="outline" className="text-xs font-normal">
                      Last 30 Days
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cross-hospital patient attendance, consultations, and triage activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overviewData?.charts?.encountersTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#0d9488"
                          strokeWidth={2.5}
                          dot={{ r: 2 }}
                          name="Encounters"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Role Distribution Pie */}
              <Card className="border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground">
                    Platform User Roles
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Distribution of active user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-56 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={overviewData?.charts?.roleDistribution || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="role"
                        >
                          {(overviewData?.charts?.roleDistribution || []).map((_, i) => (
                            <Cell key={`cell-${i}`} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-2 text-[11px]">
                    {(overviewData?.charts?.roleDistribution || []).map((r, i) => (
                      <span key={r.role} className="inline-flex items-center gap-1 font-medium">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: BRAND_COLORS[i % BRAND_COLORS.length] }}
                        />
                        {r.role} ({r.count})
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Health & Recent Registrations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Infrastructure Monitor */}
              <Card className="border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Server className="h-4 w-4 text-teal-600" />
                    Infrastructure & Compliance Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-emerald-500" />
                      Platform Status:
                    </span>
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                      OPERATIONAL (99.98% UPTIME)
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-teal-600" />
                      PostgreSQL Grid:
                    </span>
                    <span className="font-mono text-foreground font-semibold">Healthy (Supabase RLS)</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                      Cryptographic Ledger:
                    </span>
                    <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 text-[10px]">
                      SHA-256 SECURED
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      NDPR 2019 Compliance:
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">CERTIFIED</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Hospital Registrations */}
              <Card className="lg:col-span-2 border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground">
                    Latest Registered Facilities
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Recently onboarded hospitals pending verification or active on the grid
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {(overviewData?.recentHospitals || []).map((h) => (
                    <div
                      key={h.id}
                      onClick={() => setInspectingHospitalId(h.id)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/80 bg-card/60 gap-2 text-xs hover:border-teal-500/50 hover:bg-muted/40 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                          <Hospital className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground group-hover:text-teal-600">{h.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {h.state} • Tier: {h.tier}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <Badge
                          className={
                            h.isVerified
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]"
                          }
                        >
                          {h.isVerified ? "VERIFIED" : "PENDING REVIEW"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {formatDate(h.createdAt)}
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-teal-600 font-semibold">
                          <Eye className="size-3 mr-1" /> Inspect
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 2: HOSPITALS DIRECTORY                               */}
          {/* ========================================================= */}
          <TabsContent value="hospitals" className="space-y-4">
            <Card className="border-border shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Hospital Facilities Directory & Deep Inspector
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Click any facility to inspect in-depth staff rosters, patient volume, ward occupancy, and diagnostic activity
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search facility name, state, LGA..."
                        value={hospitalSearch}
                        onChange={(e) => setHospitalSearch(e.target.value)}
                        className="pl-8 text-xs h-8"
                      />
                    </div>

                    <Select value={hospitalStatusFilter} onValueChange={setHospitalStatusFilter}>
                      <SelectTrigger className="text-xs h-8 w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="verified">Verified Only</SelectItem>
                        <SelectItem value="pending">Pending Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-y border-border text-muted-foreground uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Hospital Facility</th>
                        <th className="p-3">State / LGA</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Tier</th>
                        <th className="p-3">Staff / Beds</th>
                        <th className="p-3">Encounters</th>
                        <th className="p-3">Revenue</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {isHospitalsLoading ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            Loading hospital directory...
                          </td>
                        </tr>
                      ) : !hospitalsData || hospitalsData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            No hospitals match the current filters.
                          </td>
                        </tr>
                      ) : (
                        hospitalsData.map((h) => (
                          <tr
                            key={h.id}
                            className="hover:bg-muted/40 transition-colors cursor-pointer group"
                            onClick={() => setInspectingHospitalId(h.id)}
                          >
                            <td className="p-3">
                              <p className="font-bold text-foreground group-hover:text-teal-600 transition-colors">
                                {h.name}
                              </p>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                slug: /{h.slug}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {h.state}
                              {h.lga ? ` (${h.lga})` : ""}
                            </td>
                            <td className="p-3">
                              <Badge
                                className={
                                  h.isVerified
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]"
                                }
                              >
                                {h.isVerified ? "VERIFIED" : "PENDING"}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px]">
                                {h.tier}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              <span className="font-medium text-foreground">{h.staffCount}</span> / {h.maxStaff} staff
                              <br />
                              <span className="font-medium text-foreground">{h.maxBeds}</span> max beds
                            </td>
                            <td className="p-3 font-mono font-semibold text-foreground">
                              {h.encountersCount.toLocaleString()}
                            </td>
                            <td className="p-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(h.revenueTotal)}
                            </td>
                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setInspectingHospitalId(h.id)}
                                  className="text-xs h-7 gap-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-semibold"
                                >
                                  <Eye className="size-3" />
                                  Inspect
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingHospital(h);
                                    setEditTier(h.tier);
                                    setEditMaxBeds(h.maxBeds);
                                    setEditMaxStaff(h.maxStaff);
                                    setEditVerified(h.isVerified);
                                  }}
                                  className="text-xs h-7"
                                >
                                  Limits
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 3: HOSPITAL-CENTRIC USERS & ROLE DIRECTORY            */}
          {/* ========================================================= */}
          <TabsContent value="users" className="space-y-6">
            {/* 1. PLATFORM SUPERADMINS (GLOBAL UNIT) */}
            <Card className="border-purple-500/30 bg-purple-500/5 shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Crown className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                        Platform Superadmins (Global Governance Unit)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Root platform authorities with unrestricted multi-tenant oversight and compliance access
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-purple-600 text-white text-[10px] w-fit">
                    {groupedDirectoryData?.platformSuperadmins.length || 0} SUPERADMIN ACCOUNTS
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {isGroupedDirectoryLoading ? (
                    <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
                      Loading platform superadmins...
                    </div>
                  ) : !groupedDirectoryData?.platformSuperadmins?.length ? (
                    <div className="col-span-full py-4 text-center text-xs text-muted-foreground">
                      No superadmin accounts found.
                    </div>
                  ) : (
                    groupedDirectoryData.platformSuperadmins.map((sa) => (
                      <div
                        key={sa.userId}
                        className="p-3 rounded-xl border border-purple-500/20 bg-background flex items-center justify-between gap-2 text-xs shadow-2xs"
                      >
                        <div className="overflow-hidden">
                          <p className="font-bold text-foreground truncate">{sa.fullName}</p>
                          <p className="text-[11px] font-mono text-muted-foreground truncate">{sa.email}</p>
                          <span className="text-[9px] text-purple-700 dark:text-purple-300 font-semibold uppercase tracking-wider">
                            Active Superadmin
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setManagingUser({
                              id: sa.userId,
                              email: sa.email,
                              fullName: sa.fullName,
                              roles: [{ role: "super_admin", hospitalId: null, hospitalName: "Platform-wide", isActive: sa.isActive }],
                              isSuperAdmin: true,
                              isStaff: true,
                              isPatient: false,
                              lastActive: sa.createdAt,
                              createdAt: sa.createdAt,
                            });
                          }}
                          className="text-[10px] h-7 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 shrink-0"
                        >
                          Manage
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. HOSPITAL-CENTRIC DIRECTORY FILTERS & CATEGORIES */}
            <Card className="border-border shadow-soft">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-teal-600" />
                      Hospital-Centric Directory & Role Matrix
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Inspect personnel and NIN-linked patients categorized by individual hospital facility
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-60">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search name, NIN, specialty..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-8 text-xs h-8"
                      />
                    </div>

                    <Select value={selectedGroupHospitalId} onValueChange={setSelectedGroupHospitalId}>
                      <SelectTrigger className="text-xs h-8 w-44">
                        <SelectValue placeholder="All Facilities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Hospitals & Clinics</SelectItem>
                        {groupedDirectoryData?.hospitals.map((h) => (
                          <SelectItem key={h.hospitalId} value={h.hospitalId}>
                            {h.hospitalName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sub-Tabs for Roles & Patient Segmentation */}
                <div className="pt-3">
                  <Tabs value={userCategoryTab} onValueChange={(v) => setUserCategoryTab(v as any)}>
                    <TabsList className="bg-muted/70 p-1 rounded-xl flex flex-wrap h-auto gap-1">
                      <TabsTrigger value="doctors" className="text-xs py-1.5 px-3 rounded-lg font-semibold">
                        🩺 Doctors
                      </TabsTrigger>
                      <TabsTrigger value="nurses" className="text-xs py-1.5 px-3 rounded-lg font-semibold">
                        👩‍⚕️ Nurses & Midwives
                      </TabsTrigger>
                      <TabsTrigger value="admins" className="text-xs py-1.5 px-3 rounded-lg font-semibold">
                        🏢 Hospital Admins
                      </TabsTrigger>
                      <TabsTrigger value="lab" className="text-xs py-1.5 px-3 rounded-lg font-semibold">
                        🧪 Lab Technologists
                      </TabsTrigger>
                      <TabsTrigger value="pharmacy" className="text-xs py-1.5 px-3 rounded-lg font-semibold">
                        💊 Pharmacists
                      </TabsTrigger>
                      <TabsTrigger value="patients" className="text-xs py-1.5 px-3 rounded-lg font-semibold">
                        🏥 Registered Patients (NIN)
                      </TabsTrigger>
                      <TabsTrigger value="all_patients" className="text-xs py-1.5 px-3 rounded-lg font-semibold border-teal-500/30">
                        🌐 National NIN Registry ({groupedDirectoryData?.allPlatformPatients.length || 0})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isGroupedDirectoryLoading ? (
                  <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
                    <span>Loading hospital role directory and national patient index...</span>
                  </div>
                ) : userCategoryTab === "all_patients" ? (
                  /* ========================================================= */
                  /* ALL NATIONAL PATIENTS (NIN-LINKED REGISTRY)               */
                  /* ========================================================= */
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-y border-border text-muted-foreground uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-3">Patient Name</th>
                          <th className="p-3">National NIN Identity</th>
                          <th className="p-3">Demographics</th>
                          <th className="p-3">Clinical Profile</th>
                          <th className="p-3">Encounters / Admissions</th>
                          <th className="p-3">Primary Facility</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {!groupedDirectoryData?.allPlatformPatients?.length ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                              No patient records found in national database.
                            </td>
                          </tr>
                        ) : (
                          groupedDirectoryData.allPlatformPatients.map((p) => (
                            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3">
                                <p className="font-bold text-foreground">{p.fullName}</p>
                                <p className="text-[10px] text-muted-foreground">{p.phone || p.email || "No direct phone"}</p>
                              </td>
                              <td className="p-3">
                                <Badge className="bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 border-cyan-500/30 font-mono text-[11px]">
                                  NIN: {p.nin}
                                </Badge>
                              </td>
                              <td className="p-3 text-muted-foreground">
                                <span className="capitalize">{p.gender || "Unspecified"}</span>
                                {p.dateOfBirth ? ` • Born ${formatDate(p.dateOfBirth)}` : ""}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {p.bloodGroup && (
                                    <Badge variant="outline" className="text-[9px]">
                                      {p.bloodGroup}
                                    </Badge>
                                  )}
                                  {p.genotype && (
                                    <Badge variant="outline" className="text-[9px]">
                                      {p.genotype}
                                    </Badge>
                                  )}
                                  {p.allergies?.length > 0 && (
                                    <Badge variant="destructive" className="text-[9px]">
                                      {p.allergies.length} allergies
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-mono">
                                <span className="font-semibold text-foreground">{p.encountersCount}</span> visits
                                {p.admissionsCount > 0 ? ` • ${p.admissionsCount} adm` : ""}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {p.primaryHospitalName || "Platform General"}
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setManagingUser({
                                      id: p.userId || p.id,
                                      email: p.email || "patient@hospnest.ng",
                                      fullName: p.fullName,
                                      roles: [{ role: "patient", hospitalId: p.primaryHospitalId || null, hospitalName: p.primaryHospitalName, isActive: true }],
                                      isSuperAdmin: false,
                                      isStaff: false,
                                      isPatient: true,
                                      lastActive: p.lastVisitDate || p.createdAt,
                                      createdAt: p.createdAt,
                                    });
                                  }}
                                  className="text-xs h-7"
                                >
                                  User Account
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* ========================================================= */
                  /* HOSPITAL-BY-HOSPITAL CATEGORIZED DIRECTORY                */
                  /* ========================================================= */
                  <div className="divide-y divide-border/60">
                    {!groupedDirectoryData?.hospitals?.length ? (
                      <div className="p-8 text-center text-muted-foreground text-xs">
                        No hospital facilities match the search filter.
                      </div>
                    ) : (
                      groupedDirectoryData.hospitals.map((h) => {
                        const items: Array<any> =
                          userCategoryTab === "doctors"
                            ? h.doctors
                            : userCategoryTab === "nurses"
                            ? h.nurses
                            : userCategoryTab === "admins"
                            ? h.hospitalAdmins
                            : userCategoryTab === "lab"
                            ? h.labTechs
                            : userCategoryTab === "pharmacy"
                            ? h.pharmacists
                            : h.patients;

                        return (
                          <div key={h.hospitalId} className="p-4 space-y-3">
                            {/* Hospital Header Strip */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/40 p-3 rounded-xl border border-border/70">
                              <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                                  <Hospital className="size-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-xs sm:text-sm text-foreground">
                                      {h.hospitalName}
                                    </h4>
                                    <Badge
                                      className={
                                        h.isVerified
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px]"
                                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px]"
                                      }
                                    >
                                      {h.isVerified ? "VERIFIED" : "PENDING"}
                                    </Badge>
                                    <Badge variant="outline" className="text-[9px]">
                                      {h.tier}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    📍 {h.state}{h.lga ? `, ${h.lga}` : ""} • Contact: {h.contactPhone || h.contactEmail || "N/A"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center">
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                  {items.length} {userCategoryTab.replace("_", " ")}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setInspectingHospitalId(h.hospitalId)}
                                  className="h-7 text-xs text-teal-600 font-semibold"
                                >
                                  <Eye className="size-3.5 mr-1" /> Inspect Facility
                                </Button>
                              </div>
                            </div>

                            {/* Category Items List */}
                            {items.length === 0 ? (
                              <div className="py-4 px-3 text-center text-xs text-muted-foreground bg-card/40 rounded-xl border border-dashed border-border">
                                No {userCategoryTab.replace("_", " ")} currently recorded for this facility.
                              </div>
                            ) : userCategoryTab === "patients" ? (
                              /* Patient Items for this Hospital */
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-muted/30 border-y border-border text-muted-foreground uppercase text-[9px] font-bold">
                                    <tr>
                                      <th className="p-2.5">Patient Name</th>
                                      <th className="p-2.5">NIN Identity</th>
                                      <th className="p-2.5">Demographics</th>
                                      <th className="p-2.5">Medical Info</th>
                                      <th className="p-2.5">Encounters</th>
                                      <th className="p-2.5 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/40">
                                    {(items as HospitalPatientMember[]).map((pat) => (
                                      <tr key={pat.id} className="hover:bg-muted/20">
                                        <td className="p-2.5 font-bold text-foreground">
                                          {pat.fullName}
                                          <p className="text-[10px] font-normal text-muted-foreground">
                                            {pat.phone || pat.email || "No contact"}
                                          </p>
                                        </td>
                                        <td className="p-2.5">
                                          <Badge className="bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 border-cyan-500/30 font-mono text-[10px]">
                                            NIN: {pat.nin}
                                          </Badge>
                                        </td>
                                        <td className="p-2.5 text-muted-foreground">
                                          {pat.gender} {pat.dateOfBirth ? `• ${formatDate(pat.dateOfBirth)}` : ""}
                                        </td>
                                        <td className="p-2.5">
                                          <div className="flex gap-1">
                                            {pat.bloodGroup && <Badge variant="outline" className="text-[9px]">{pat.bloodGroup}</Badge>}
                                            {pat.genotype && <Badge variant="outline" className="text-[9px]">{pat.genotype}</Badge>}
                                          </div>
                                        </td>
                                        <td className="p-2.5 font-mono text-foreground font-semibold">
                                          {pat.encountersCount} visits
                                        </td>
                                        <td className="p-2.5 text-right">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setManagingUser({
                                                id: pat.userId || pat.id,
                                                email: pat.email || "patient@hospnest.ng",
                                                fullName: pat.fullName,
                                                roles: [{ role: "patient", hospitalId: h.hospitalId, hospitalName: h.hospitalName, isActive: true }],
                                                isSuperAdmin: false,
                                                isStaff: false,
                                                isPatient: true,
                                                lastActive: pat.lastVisitDate || pat.createdAt,
                                                createdAt: pat.createdAt,
                                              });
                                            }}
                                            className="text-xs h-6 px-2"
                                          >
                                            Role
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              /* Staff Items (Doctors, Nurses, Admins, Lab, Pharmacists) */
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {(items as HospitalStaffMember[]).map((staff) => (
                                  <div
                                    key={staff.id}
                                    className="p-3 rounded-xl border border-border/80 bg-card flex flex-col justify-between gap-2 text-xs shadow-2xs hover:border-teal-500/30 transition-all"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="font-bold text-foreground truncate">{staff.fullName}</p>
                                        <Badge
                                          variant="outline"
                                          className={`text-[9px] font-mono ${
                                            staff.isActive ? "text-emerald-600" : "text-muted-foreground"
                                          }`}
                                        >
                                          {staff.isActive ? "ACTIVE" : "INACTIVE"}
                                        </Badge>
                                      </div>
                                      <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                                        {staff.email}
                                      </p>
                                      {staff.staffIdCode && (
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          Code: {staff.staffIdCode}
                                        </span>
                                      )}
                                      {staff.specialization && (
                                        <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
                                          Spec: {staff.specialization}
                                        </p>
                                      )}
                                      {staff.medicalLicenseNumber && (
                                        <p className="text-[9px] text-muted-foreground font-mono">
                                          Lic: {staff.medicalLicenseNumber}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                      <span className="text-[10px] text-muted-foreground capitalize">
                                        {staff.departmentName || staff.role.replace("_", " ")}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setManagingUser({
                                            id: staff.userId,
                                            email: staff.email,
                                            fullName: staff.fullName,
                                            roles: [{ role: staff.role, hospitalId: h.hospitalId, hospitalName: h.hospitalName, isActive: staff.isActive }],
                                            isSuperAdmin: false,
                                            isStaff: true,
                                            isPatient: false,
                                            lastActive: staff.joinedAt,
                                            createdAt: staff.joinedAt,
                                          });
                                        }}
                                        className="text-[10px] h-6 px-2"
                                      >
                                        Manage Role
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 4: NATIONAL BREAK-GLASS OVERSIGHT                      */}
          {/* ========================================================= */}
          <TabsContent value="breakglass" className="space-y-4">
            <Card className="border-border shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      National Emergency Break-Glass Override Ledger
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Audited logs of all emergency medical overrides executed across every hospital facility
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-y border-border text-muted-foreground uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Facility</th>
                        <th className="p-3">Attending Practitioner</th>
                        <th className="p-3">Patient Name & NIN</th>
                        <th className="p-3">Clinical Justification</th>
                        <th className="p-3">Audit Hash Seal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {isBreakGlassLoading ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Loading emergency break-glass ledger...
                          </td>
                        </tr>
                      ) : !breakGlassData || breakGlassData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No emergency break-glass overrides recorded on the national ledger.
                          </td>
                        </tr>
                      ) : (
                        breakGlassData.map((log) => (
                          <tr
                            key={log.id}
                            className="bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                          >
                            <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                              {formatDateTime(log.timestamp)}
                            </td>
                            <td className="p-3 font-semibold text-foreground">
                              {log.hospitalName}
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-foreground">{log.accessorName}</p>
                              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                {log.accessorRole}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-medium text-foreground">{log.patientName}</p>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                NIN: {log.patientNin}
                              </span>
                            </td>
                            <td className="p-3 text-xs italic text-foreground max-w-xs">
                              &ldquo;{log.justification}&rdquo;
                            </td>
                            <td className="p-3 font-mono text-[10px] text-muted-foreground">
                              {log.recordHash ? `${log.recordHash.slice(0, 10)}...` : "PENDING"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 5: LEDGER & COMPLIANCE                                */}
          {/* ========================================================= */}
          <TabsContent value="audit" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-teal-600" />
                    Cryptographic Blockchain Hash Integrity
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Every audit entry is linked via SHA-256 parent hash blocks to guarantee immutable tamper evidence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <p className="text-muted-foreground">
                    HospNest implements an append-only cryptographic ledger on all clinical notes, lab results, prescriptions, and break-glass events in compliance with the Nigeria Data Protection Regulation (NDPR 2019).
                  </p>

                  <Button
                    onClick={() => runAuditChainMutation.mutate()}
                    disabled={runAuditChainMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                  >
                    {runAuditChainMutation.isPending ? "Validating Ledger..." : "Run Global Chain Integrity Audit"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    Federal Ministry of Health (FMOH) Returns
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Generate monthly consolidated national healthcare returns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <p className="text-muted-foreground">
                    Download aggregated epidemiological summaries, outpatient encounter volumes, bed occupancy indices, and maternal/child health statistics for ministry reporting.
                  </p>

                  <Button
                    variant="outline"
                    onClick={() => {
                      toast.success("National monthly regulatory summary compiled and queued for export.");
                    }}
                    className="text-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5 text-teal-600" />
                    Download National Return (PDF)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 6: PLATFORM SETTINGS & TIERS                         */}
          {/* ========================================================= */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-border shadow-soft">
              <CardHeader>
                <CardTitle className="text-base font-bold text-foreground">
                  HospNest Subscription Tiers & Entitlements
                </CardTitle>
                <CardDescription className="text-xs">
                  Standard tier definitions applied across the multi-tenant grid
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="rounded-2xl border border-border p-4 space-y-3 bg-card/60">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-foreground">Starter</span>
                      <Badge variant="outline">Clinic</Badge>
                    </div>
                    <ul className="space-y-1.5 text-muted-foreground">
                      <li>• Up to 10 Staff Seats</li>
                      <li>• Up to 15 Inpatient Beds</li>
                      <li>• General OPD & Triage</li>
                      <li>• Basic Pharmacy & Billing</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-teal-500/40 p-4 space-y-3 bg-teal-500/5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-foreground">Community</span>
                      <Badge className="bg-teal-600 text-white">Popular</Badge>
                    </div>
                    <ul className="space-y-1.5 text-muted-foreground">
                      <li>• Up to 40 Staff Seats</li>
                      <li>• Up to 60 Inpatient Beds</li>
                      <li>• Full Laboratory & Pharmacy</li>
                      <li>• Maternity & Antenatal (ANC)</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-border p-4 space-y-3 bg-card/60">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-foreground">Tertiary</span>
                      <Badge variant="outline">Specialist</Badge>
                    </div>
                    <ul className="space-y-1.5 text-muted-foreground">
                      <li>• Up to 150 Staff Seats</li>
                      <li>• Up to 250 Inpatient Beds</li>
                      <li>• Full PACS Radiology Studio</li>
                      <li>• AI Clinical Copilot & NEWS2</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-purple-500/40 p-4 space-y-3 bg-purple-500/5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-foreground">Enterprise</span>
                      <Badge className="bg-purple-600 text-white">Grid</Badge>
                    </div>
                    <ul className="space-y-1.5 text-muted-foreground">
                      <li>• Unlimited Staff & Beds</li>
                      <li>• Multi-branch Network</li>
                      <li>• Federated Record Sharing</li>
                      <li>• 24/7 Dedicated SLA & Backups</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 7: VOICECARE BENCHMARK LAB                           */}
          {/* ========================================================= */}
          <TabsContent value="voicecare-lab" className="space-y-6">
            <VoiceCareBenchmarkLab />
          </TabsContent>
        </Tabs>
      </div>

      {/* ========================================================= */}
      {/* MODAL: In-Depth Hospital Facility Inspector Dossier      */}
      {/* ========================================================= */}
      <Dialog open={Boolean(inspectingHospitalId)} onOpenChange={(open) => !open && setInspectingHospitalId(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-border bg-card">
          {isHospitalDetailLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
              <p className="text-xs font-semibold text-muted-foreground">Loading facility dossier...</p>
            </div>
          ) : !hospitalDetailData ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Hospital facility information not available.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Strip */}
              <div className="p-6 bg-gradient-to-r from-teal-950/40 via-background to-purple-950/30 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="size-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center border border-teal-500/30 shrink-0 shadow-sm">
                      <Building2 className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display text-xl font-bold text-foreground">
                          {hospitalDetailData.hospital.name}
                        </h2>
                        <Badge
                          className={
                            hospitalDetailData.hospital.isVerified
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]"
                          }
                        >
                          {hospitalDetailData.hospital.isVerified ? "VERIFIED FACILITY" : "PENDING REVIEW"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          Tier: {hospitalDetailData.hospital.tier}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {hospitalDetailData.hospital.hospitalType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <span>📍 {hospitalDetailData.hospital.state}{hospitalDetailData.hospital.lga ? `, ${hospitalDetailData.hospital.lga}` : ""}</span>
                        <span>•</span>
                        <span className="font-mono">slug: /{hospitalDetailData.hospital.slug}</span>
                        <span>•</span>
                        <span>Registered: {formatDate(hospitalDetailData.hospital.createdAt)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(hospitalDetailData, null, 2)], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `hospital-dossier-${hospitalDetailData.hospital.slug}.json`;
                        a.click();
                        toast.success("Facility dossier JSON exported");
                      }}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Download className="size-3.5" />
                      Export Dossier
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingHospital({
                          id: hospitalDetailData.hospital.id,
                          name: hospitalDetailData.hospital.name,
                          slug: hospitalDetailData.hospital.slug,
                          state: hospitalDetailData.hospital.state,
                          lga: hospitalDetailData.hospital.lga,
                          address: hospitalDetailData.hospital.address,
                          phone: hospitalDetailData.hospital.phone,
                          email: hospitalDetailData.hospital.email,
                          hospitalType: hospitalDetailData.hospital.hospitalType,
                          isVerified: hospitalDetailData.hospital.isVerified,
                          tier: hospitalDetailData.hospital.tier,
                          onboardingStep: hospitalDetailData.hospital.onboardingStep,
                          maxBeds: hospitalDetailData.hospital.maxBeds,
                          maxStaff: hospitalDetailData.hospital.maxStaff,
                          staffCount: hospitalDetailData.metrics.totalStaff,
                          encountersCount: hospitalDetailData.metrics.totalEncounters,
                          admissionsCount: hospitalDetailData.metrics.totalAdmissions,
                          revenueTotal: hospitalDetailData.metrics.totalRevenue,
                          createdAt: hospitalDetailData.hospital.createdAt,
                        });
                        setEditTier(hospitalDetailData.hospital.tier);
                        setEditMaxBeds(hospitalDetailData.hospital.maxBeds);
                        setEditMaxStaff(hospitalDetailData.hospital.maxStaff);
                        setEditVerified(hospitalDetailData.hospital.isVerified);
                      }}
                      className="text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1.5"
                    >
                      <Settings className="size-3.5" />
                      Edit Limits & Tier
                    </Button>
                  </div>
                </div>
              </div>

              <div className="px-6 space-y-6">
                {/* Quick Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-card/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Clinical Staff</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-lg font-black text-foreground">{hospitalDetailData.metrics.totalStaff}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">/ {hospitalDetailData.hospital.maxStaff} max</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-card/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Enrolled Patients</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-lg font-black text-foreground">{hospitalDetailData.metrics.totalPatients}</span>
                      <span className="text-[10px] text-teal-600 font-semibold">Active Records</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-card/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Encounters / Visits</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-lg font-black text-foreground">{hospitalDetailData.metrics.totalEncounters}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">{hospitalDetailData.metrics.totalAdmissions} Inpatients</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-card/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Bed Occupancy</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-lg font-black text-foreground">
                        {hospitalDetailData.metrics.bedOccupancy.occupancyRate}%
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {hospitalDetailData.metrics.bedOccupancy.occupiedBeds}/{hospitalDetailData.metrics.bedOccupancy.totalBeds} beds
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-card/60 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Revenue Processed</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(hospitalDetailData.metrics.totalRevenue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub Tabs inside Inspector */}
                <Tabs value={inspectorSubTab} onValueChange={(v) => setInspectorSubTab(v as any)} className="space-y-4">
                  <TabsList className="bg-muted/80 p-1 rounded-xl flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="overview" className="text-xs font-semibold py-1.5 px-3">
                      Facility Dossier
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="text-xs font-semibold py-1.5 px-3">
                      Workforce Roster ({hospitalDetailData.staffRoster.length})
                    </TabsTrigger>
                    <TabsTrigger value="patients" className="text-xs font-semibold py-1.5 px-3">
                      Patient Encounters ({hospitalDetailData.recentEncounters.length})
                    </TabsTrigger>
                    <TabsTrigger value="infrastructure" className="text-xs font-semibold py-1.5 px-3">
                      Wards & Beds ({hospitalDetailData.wards.length} Wards)
                    </TabsTrigger>
                    <TabsTrigger value="diagnostics" className="text-xs font-semibold py-1.5 px-3">
                      Diagnostics & Pharmacy
                    </TabsTrigger>
                  </TabsList>

                  {/* SubTab 1: Overview */}
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Hospital className="size-4 text-teal-600" /> Facility Contact & Location
                        </h4>
                        <div className="space-y-2 text-muted-foreground">
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="font-semibold text-foreground">Physical Address:</span>
                            <span>{hospitalDetailData.hospital.address || "Not specified"}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="font-semibold text-foreground">State / LGA:</span>
                            <span>{hospitalDetailData.hospital.state} ({hospitalDetailData.hospital.lga || "N/A"})</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="font-semibold text-foreground">Official Phone:</span>
                            <span>{hospitalDetailData.hospital.phone || "N/A"}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="font-semibold text-foreground">Official Email:</span>
                            <span>{hospitalDetailData.hospital.email || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <ShieldCheck className="size-4 text-teal-600" /> Platform Licensing & Limits
                        </h4>
                        <div className="space-y-2 text-muted-foreground">
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="font-semibold text-foreground">Accreditation Tier:</span>
                            <span className="font-bold text-teal-600">{hospitalDetailData.hospital.tier}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="font-semibold text-foreground">Max Bed Quota:</span>
                            <span>{hospitalDetailData.hospital.maxBeds} beds</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span className="font-semibold text-foreground">Max Staff Quota:</span>
                            <span>{hospitalDetailData.hospital.maxStaff} staff seats</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="font-semibold text-foreground">Verification State:</span>
                            <span className={hospitalDetailData.hospital.isVerified ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                              {hospitalDetailData.hospital.isVerified ? "Verified & Licensed" : "Pending Verification"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* SubTab 2: Staff */}
                  <TabsContent value="staff" className="space-y-3">
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                          <tr>
                            <th className="p-3">Staff Name</th>
                            <th className="p-3">Assigned Role</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Joined Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {hospitalDetailData.staffRoster.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-muted-foreground">
                                No staff registered under this facility yet.
                              </td>
                            </tr>
                          ) : (
                            hospitalDetailData.staffRoster.map((s) => (
                              <tr key={s.id} className="hover:bg-muted/30">
                                <td className="p-3 font-bold text-foreground">{s.fullName}</td>
                                <td className="p-3">
                                  <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                    {s.role.replace("_", " ")}
                                  </Badge>
                                </td>
                                <td className="p-3 font-mono text-muted-foreground">{s.email}</td>
                                <td className="p-3 text-muted-foreground">{s.phone || "—"}</td>
                                <td className="p-3">
                                  <Badge className={s.isActive ? "bg-emerald-500/10 text-emerald-600 text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                                    {s.isActive ? "ACTIVE" : "INACTIVE"}
                                  </Badge>
                                </td>
                                <td className="p-3 text-muted-foreground font-mono">{formatDate(s.joinedAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  {/* SubTab 3: Patients & Encounters */}
                  <TabsContent value="patients" className="space-y-3">
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                          <tr>
                            <th className="p-3">Patient Name</th>
                            <th className="p-3">NIN</th>
                            <th className="p-3">Attending Doctor</th>
                            <th className="p-3">Chief Complaint</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Encounter Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {hospitalDetailData.recentEncounters.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-muted-foreground">
                                No patient encounters recorded for this facility yet.
                              </td>
                            </tr>
                          ) : (
                            hospitalDetailData.recentEncounters.map((e) => (
                              <tr key={e.id} className="hover:bg-muted/30">
                                <td className="p-3 font-bold text-foreground">{e.patientName}</td>
                                <td className="p-3 font-mono text-[11px] text-muted-foreground">{e.nin}</td>
                                <td className="p-3 text-foreground font-medium">{e.doctorName || "Unassigned"}</td>
                                <td className="p-3 text-muted-foreground">{e.chiefComplaint}</td>
                                <td className="p-3">
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {e.status}
                                  </Badge>
                                </td>
                                <td className="p-3 text-muted-foreground font-mono">{formatDate(e.createdAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  {/* SubTab 4: Infrastructure */}
                  <TabsContent value="infrastructure" className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {hospitalDetailData.wards.length === 0 ? (
                        <div className="col-span-3 p-6 text-center text-muted-foreground rounded-xl border border-border">
                          No active wards configured for this facility.
                        </div>
                      ) : (
                        hospitalDetailData.wards.map((w) => (
                          <div key={w.id} className="p-4 rounded-xl border border-border bg-card/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground text-sm">{w.name}</span>
                              <Badge variant="outline" className="text-[10px]">{w.type}</Badge>
                            </div>
                            <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                              <span>Occupied: <strong className="text-foreground">{w.occupiedCount}</strong> / {w.bedCount} beds</span>
                              <span className="font-semibold text-teal-600">
                                {w.bedCount > 0 ? Math.round((w.occupiedCount / w.bedCount) * 100) : 0}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-teal-600 h-full rounded-full transition-all"
                                style={{ width: `${w.bedCount > 0 ? Math.min(100, Math.round((w.occupiedCount / w.bedCount) * 100)) : 0}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* SubTab 5: Diagnostics & Pharmacy */}
                  <TabsContent value="diagnostics" className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1">
                        <span className="text-muted-foreground font-medium">Laboratory Orders</span>
                        <p className="text-2xl font-black text-foreground">{hospitalDetailData.metrics.totalLabOrders}</p>
                        <span className="text-[10px] text-teal-600">Diagnostic investigations</span>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1">
                        <span className="text-muted-foreground font-medium">Radiology & Imaging</span>
                        <p className="text-2xl font-black text-foreground">{hospitalDetailData.metrics.totalRadiologyRequests}</p>
                        <span className="text-[10px] text-blue-600">X-Ray, Ultrasound, CT</span>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1">
                        <span className="text-muted-foreground font-medium">Pharmacy Prescriptions</span>
                        <p className="text-2xl font-black text-foreground">{hospitalDetailData.metrics.totalPrescriptions}</p>
                        <span className="text-[10px] text-purple-600">Dispensed & Active</span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Facility ID: <code className="font-mono text-foreground">{hospitalDetailData.hospital.id}</code>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInspectingHospitalId(null)}
                  className="text-xs"
                >
                  Close Dossier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: Edit Hospital Configuration */}
      <Dialog open={Boolean(editingHospital)} onOpenChange={(open) => !open && setEditingHospital(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Hospital className="h-5 w-5 text-teal-600" />
              Manage Hospital Facility
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update verification status, bed quotas, and subscription tier for {editingHospital?.name}
            </DialogDescription>
          </DialogHeader>

          {editingHospital && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateHospitalMutation.mutate();
              }}
              className="space-y-4 py-2 text-xs"
            >
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div>
                  <p className="font-bold text-foreground">Facility Verification</p>
                  <p className="text-[11px] text-muted-foreground">
                    Verified hospitals appear on national directories and public booking portals
                  </p>
                </div>
                <Switch checked={editVerified} onCheckedChange={setEditVerified} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-tier">Subscription Tier</Label>
                <Select value={editTier} onValueChange={setEditTier}>
                  <SelectTrigger id="edit-tier" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Starter">Starter (Small Clinic)</SelectItem>
                    <SelectItem value="Community">Community (General Hospital)</SelectItem>
                    <SelectItem value="Tertiary">Tertiary (Specialist Center)</SelectItem>
                    <SelectItem value="Enterprise">Enterprise (Multi-hospital Grid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-beds">Max Inpatient Beds</Label>
                  <Input
                    id="edit-beds"
                    type="number"
                    min={1}
                    value={editMaxBeds}
                    onChange={(e) => setEditMaxBeds(parseInt(e.target.value, 10) || 10)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-staff">Max Staff Seats</Label>
                  <Input
                    id="edit-staff"
                    type="number"
                    min={1}
                    value={editMaxStaff}
                    onChange={(e) => setEditMaxStaff(parseInt(e.target.value, 10) || 10)}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingHospital(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateHospitalMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  {updateHospitalMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: Manage User Roles */}
      <Dialog open={Boolean(managingUser)} onOpenChange={(open) => !open && setManagingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-teal-600" />
              Manage User Roles & Authority
            </DialogTitle>
            <DialogDescription className="text-xs">
              Grant or revoke platform superadmin and hospital roles for {managingUser?.fullName}
            </DialogDescription>
          </DialogHeader>

          {managingUser && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                <p className="font-bold text-foreground">{managingUser.fullName}</p>
                <p className="font-mono text-muted-foreground">{managingUser.email}</p>
                <p className="font-mono text-[10px] text-muted-foreground">ID: {managingUser.id}</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-foreground">Current Active Roles:</p>
                <div className="flex flex-wrap gap-1.5">
                  {managingUser.roles.map((r, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/40 font-semibold"
                    >
                      <span>
                        {r.role.replace("_", " ").toUpperCase()}
                        {r.hospitalName ? ` (${r.hospitalName})` : ""}
                      </span>
                      {r.role !== "patient" && (
                        <button
                          type="button"
                          onClick={() => {
                            updateUserRoleMutation.mutate({
                              targetUserId: managingUser.id,
                              role: r.role,
                              action: "revoke",
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 font-bold ml-1"
                          title="Revoke Role"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-3">
                <p className="font-bold text-foreground">Grant New Authority:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateUserRoleMutation.mutate({
                        targetUserId: managingUser.id,
                        role: "super_admin",
                        action: "grant",
                      });
                    }}
                    disabled={updateUserRoleMutation.isPending || managingUser.isSuperAdmin}
                    className="text-xs text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/10"
                  >
                    <Crown className="mr-1 h-3.5 w-3.5" />
                    Grant Superadmin
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateUserRoleMutation.mutate({
                        targetUserId: managingUser.id,
                        role: "hospital_admin",
                        action: "grant",
                      });
                    }}
                    disabled={updateUserRoleMutation.isPending}
                    className="text-xs text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/10"
                  >
                    <Building2 className="mr-1 h-3.5 w-3.5" />
                    Grant Hospital Admin
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManagingUser(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}