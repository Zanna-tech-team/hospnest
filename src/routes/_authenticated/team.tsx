import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit,
  Eye,
  Filter,
  LogOut,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  XCircle,
  FileBadge,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  getTeamContext,
  getStaffProfileAndSchedule,
  updateStaffProfile,
  updateStaffShifts,
  inviteStaffMember,
  toggleStaffStatus,
  getPendingStaffJoinRequests,
  resolveStaffJoinRequest,
  type StaffRole,
  type TeamMember,
  type WeeklyShift,
  type StaffJoinRequestItem,
} from "@/lib/team.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import logo from "@/assets/hospnest-logo.png.asset.json";
import { useAppShell } from "@/components/layout/AppShell";

const title = "Team & Staff Management — HospNest";
const description =
  "Invite doctors, nurses, pharmacists, lab technicians, and hospital staff with role-based access and shift scheduling.";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamPage,
});

const ROLE_DISPLAY: Record<StaffRole, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-100 text-purple-800 border-purple-200" },
  hospital_admin: { label: "Hospital Admin", color: "bg-blue-100 text-blue-800 border-blue-200" },
  doctor: { label: "Doctor", color: "bg-teal-100 text-teal-800 border-teal-200" },
  nurse: { label: "Nurse", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  lab_tech: { label: "Lab Technician", color: "bg-amber-100 text-amber-800 border-amber-200" },
  pharmacist: { label: "Pharmacist", color: "bg-rose-100 text-rose-800 border-rose-200" },
};

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function TeamPage() {
  const { activeHospitalId: shellHospitalId } = useAppShell();
  const queryClient = useQueryClient();
  const getContextFn = useServerFn(getTeamContext);
  const getProfileFn = useServerFn(getStaffProfileAndSchedule);
  const updateProfileFn = useServerFn(updateStaffProfile);
  const updateShiftsFn = useServerFn(updateStaffShifts);
  const inviteFn = useServerFn(inviteStaffMember);
  const toggleStatusFn = useServerFn(toggleStaffStatus);
  const getPendingRequestsFn = useServerFn(getPendingStaffJoinRequests);
  const resolveRequestFn = useServerFn(resolveStaffJoinRequest);

  const [hospitalId, setHospitalId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"roster" | "requests">("roster");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [assignedDeptMap, setAssignedDeptMap] = useState<Record<string, string>>({});

  const [lastInviteResult, setLastInviteResult] = useState<{
    fullName: string;
    role: string;
    inviteUrl: string;
  } | null>(null);

  // Invite Form State
  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    role: "doctor" as StaffRole,
    departmentId: "",
    phone: "",
    specialization: "",
    medicalLicenseNumber: "",
  });

  const { data: ctx, isLoading } = useQuery({
    queryKey: ["team-context", hospitalId || shellHospitalId],
    queryFn: () => getContextFn({ data: { hospitalId: hospitalId || shellHospitalId || undefined } }),
  });

  const activeHospitalId = hospitalId || shellHospitalId || ctx?.activeHospitalId || "";

  // Query Pending Staff Join Requests
  const { data: pendingRequestsData, isLoading: isLoadingPending } = useQuery({
    queryKey: ["pending-staff-requests", activeHospitalId],
    queryFn: () => getPendingRequestsFn({ data: { hospitalId: activeHospitalId } }),
    enabled: Boolean(activeHospitalId && ctx?.isAdmin),
  });

  const pendingRequests = pendingRequestsData?.requests ?? [];

  // Selected Staff Profile Query
  const { data: staffDetail, isLoading: isLoadingStaff } = useQuery({
    queryKey: ["staff-detail", activeHospitalId, selectedStaffId],
    queryFn: () =>
      selectedStaffId
        ? getProfileFn({ data: { hospitalId: activeHospitalId, staffId: selectedStaffId } })
        : null,
    enabled: Boolean(selectedStaffId && activeHospitalId),
  });

  // Edit Profile Form State
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    staffIdCode: "",
    phone: "",
    departmentId: "",
    specialization: "",
    medicalLicenseNumber: "",
  });

  // Shifts Form State
  const [shiftsList, setShiftsList] = useState<WeeklyShift[]>([]);
  const [newShiftDay, setNewShiftDay] = useState(1);
  const [newShiftStart, setNewShiftStart] = useState("08:00");
  const [newShiftEnd, setNewShiftEnd] = useState("16:00");

  // Sync profile form when detail data loads
  const handleOpenStaffModal = (staffId: string) => {
    setSelectedStaffId(staffId);
  };

  const handleLoadedStaffData = (data: any) => {
    if (!data?.staff) return;
    setProfileForm({
      fullName: data.staff.fullName || "",
      staffIdCode: data.staff.staffIdCode || "",
      phone: data.staff.phone || "",
      departmentId: data.staff.departmentId || "",
      specialization: data.staff.specialization || "",
      medicalLicenseNumber: data.staff.medicalLicenseNumber || "",
    });
    setShiftsList(data.shifts || []);
  };

  // Trigger data sync on staff detail change
  useMemo(() => {
    if (staffDetail) {
      handleLoadedStaffData(staffDetail);
    }
  }, [staffDetail]);

  const filteredMembers = useMemo(() => {
    if (!ctx?.members) return [];
    return ctx.members.filter((m: TeamMember) => {
      const matchesSearch =
        m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.staffIdCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.specialization && m.specialization.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [ctx?.members, searchTerm, roleFilter]);

  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteFn({
        data: {
          hospitalId: activeHospitalId,
          fullName: inviteForm.fullName,
          email: inviteForm.email,
          role: inviteForm.role,
          departmentId: inviteForm.departmentId || undefined,
          phone: inviteForm.phone || undefined,
          specialization: inviteForm.specialization || undefined,
          medicalLicenseNumber: inviteForm.medicalLicenseNumber || undefined,
        },
      }),
    onSuccess: (result) => {
      setIsInviteOpen(false);
      setInviteForm({
        fullName: "",
        email: "",
        role: "doctor",
        departmentId: "",
        phone: "",
        specialization: "",
        medicalLicenseNumber: "",
      });
      setLastInviteResult({
        fullName: result.invitedMember.fullName,
        role: result.invitedMember.role,
        inviteUrl: result.inviteUrl,
      });
      queryClient.invalidateQueries({ queryKey: ["team-context", activeHospitalId] });
      toast.success("Invitation generated successfully!");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to invite staff member"),
  });

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      updateProfileFn({
        data: {
          hospitalId: activeHospitalId,
          staffId: selectedStaffId!,
          fullName: profileForm.fullName,
          staffIdCode: profileForm.staffIdCode,
          phone: profileForm.phone || undefined,
          departmentId: profileForm.departmentId || undefined,
          specialization: profileForm.specialization || undefined,
          medicalLicenseNumber: profileForm.medicalLicenseNumber || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-context", activeHospitalId] });
      queryClient.invalidateQueries({ queryKey: ["staff-detail", activeHospitalId, selectedStaffId] });
      toast.success("Staff profile updated.");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update profile"),
  });

  const updateShiftsMutation = useMutation({
    mutationFn: () =>
      updateShiftsFn({
        data: {
          hospitalId: activeHospitalId,
          staffId: selectedStaffId!,
          shifts: shiftsList.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTimeStr: s.startTimeStr,
            endTimeStr: s.endTimeStr,
            departmentId: s.departmentId || undefined,
          })),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-context", activeHospitalId] });
      queryClient.invalidateQueries({ queryKey: ["staff-detail", activeHospitalId, selectedStaffId] });
      toast.success("Shift schedule synced & active on-duty permissions updated.");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update shifts"),
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { staffId: string; isActive: boolean }) =>
      toggleStatusFn({
        data: {
          hospitalId: activeHospitalId,
          staffId: vars.staffId,
          isActive: vars.isActive,
        },
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["team-context", activeHospitalId] });
      toast.success(
        vars.isActive
          ? "Staff member reactivated successfully."
          : "Staff member deactivated successfully.",
      );
    },
    onError: (err: Error) => toast.error(err.message || "Failed to change staff status"),
  });

  // Resolve Join Request Mutation (Approve or Reject)
  const resolveRequestMutation = useMutation({
    mutationFn: (vars: { requestId: string; action: "approve" | "reject"; departmentId?: string; reason?: string }) =>
      resolveRequestFn({
        data: {
          hospitalId: activeHospitalId,
          requestId: vars.requestId,
          action: vars.action,
          departmentId: vars.departmentId || undefined,
          rejectionReason: vars.reason || undefined,
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["pending-staff-requests", activeHospitalId] });
      queryClient.invalidateQueries({ queryKey: ["team-context", activeHospitalId] });
      toast.success(res.message || "Join request resolved successfully.");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to resolve join request"),
  });

  const handleAddShift = () => {
    if (!newShiftStart || !newShiftEnd) return;
    setShiftsList((prev) => [
      ...prev,
      {
        dayOfWeek: newShiftDay,
        startTimeStr: newShiftStart,
        endTimeStr: newShiftEnd,
        isActive: true,
      },
    ]);
  };

  const handleRemoveShift = (index: number) => {
    setShiftsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(url);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopiedToken(null), 3000);
    } catch {
      toast.error("Failed to copy invite link.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4" />
            </span>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Team & Access Management
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage clinical staff, review incoming staff affiliation requests, and configure shift rosters.
          </p>
        </div>

        {ctx?.isAdmin && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="mr-2 size-4" /> Direct Staff Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Invite Staff Member</DialogTitle>
                <DialogDescription>
                  Assign a role, department, and generate a temporary sign-up link.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMutation.mutate();
                }}
                className="space-y-4 py-2"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Dr. Amina Bello"
                    required
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Work Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="amina.bello@hospital.com"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(val: StaffRole) =>
                        setInviteForm({ ...inviteForm, role: val })
                      }
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="nurse">Nurse</SelectItem>
                        <SelectItem value="lab_tech">Lab Technician</SelectItem>
                        <SelectItem value="pharmacist">Pharmacist</SelectItem>
                        <SelectItem value="hospital_admin">Hospital Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={inviteForm.departmentId}
                      onValueChange={(val) =>
                        setInviteForm({ ...inviteForm, departmentId: val })
                      }
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="General / None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None / General</SelectItem>
                        {(ctx?.departments ?? []).map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      placeholder="08012345678"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="license">License # (Optional)</Label>
                    <Input
                      id="license"
                      placeholder="MDCN/12345"
                      value={inviteForm.medicalLicenseNumber}
                      onChange={(e) =>
                        setInviteForm({ ...inviteForm, medicalLicenseNumber: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    placeholder="e.g. Paediatrics, Pharmacy, Lab"
                    value={inviteForm.specialization}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, specialization: e.target.value })
                    }
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {inviteMutation.isPending ? "Generating Link…" : "Generate Invite Link"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Generated Invite Link Banner */}
      {lastInviteResult && (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 animate-in fade-in">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                <Check className="size-4" /> Staff Invitation Ready for {lastInviteResult.fullName} ({lastInviteResult.role})
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Share this unique link with the staff member to activate their workstation credentials.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={lastInviteResult.inviteUrl}
                className="max-w-md bg-card text-xs font-mono select-all"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyLink(lastInviteResult.inviteUrl)}
              >
                {copiedToken === lastInviteResult.inviteUrl ? (
                  <>
                    <Check className="mr-1.5 size-3.5 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 size-3.5" /> Copy
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLastInviteResult(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hospital Switcher */}
      {(ctx?.workplaces?.length ?? 0) > 1 && (
        <div className="mt-6 flex items-center gap-3">
          <Label className="text-xs text-muted-foreground uppercase font-semibold">
            Active Hospital:
          </Label>
          <Select value={activeHospitalId} onValueChange={(v) => setHospitalId(v)}>
            <SelectTrigger className="w-64 bg-card">
              <SelectValue placeholder="Choose hospital" />
            </SelectTrigger>
            <SelectContent>
              {ctx!.workplaces.map((w: any) => (
                <SelectItem key={w.hospitalId} value={w.hospitalId}>
                  {w.name} ({w.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main Section Navigation Tabs */}
      <div className="mt-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "roster" | "requests")}
          className="w-full"
        >
          <TabsList className="bg-muted/70 p-1 rounded-xl">
            <TabsTrigger value="roster" className="gap-2 text-xs sm:text-sm">
              <Users className="size-4" />
              <span>Active Staff Roster</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                {filteredMembers.length}
              </Badge>
            </TabsTrigger>
            {ctx?.isAdmin && (
              <TabsTrigger value="requests" className="gap-2 text-xs sm:text-sm">
                <FileBadge className="size-4 text-amber-600" />
                <span>Pending Join Requests</span>
                {pendingRequests.length > 0 && (
                  <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[10px] px-1.5 py-0 h-4 font-mono">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ----------------- PENDING JOIN REQUESTS TAB ----------------- */}
          {ctx?.isAdmin && (
            <TabsContent value="requests" className="mt-6 space-y-4 animate-in fade-in">
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-soft">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">
                      Staff Affiliation Applications
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Review professional credentials, verify council license numbers, and assign departments upon approval.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {pendingRequests.length} Pending
                  </Badge>
                </div>

                {isLoadingPending ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Loading pending staff join requests…
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="py-12 text-center">
                    <ShieldCheck className="mx-auto size-10 text-emerald-500/50" />
                    <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                      No Pending Affiliation Requests
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                      All submitted staff sign-up requests have been reviewed and resolved. New requests from doctors, nurses, and lab staff will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border mt-2">
                    {pendingRequests.map((req: StaffJoinRequestItem) => {
                      const roleInfo = ROLE_DISPLAY[req.requestedRole] || {
                        label: req.requestedRole,
                        color: "bg-gray-100 text-gray-800",
                      };
                      return (
                        <div
                          key={req.id}
                          className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-semibold text-foreground text-sm">
                                {req.fullName}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${roleInfo.color}`}
                              >
                                {roleInfo.label}
                              </span>
                              {req.medicalLicenseNumber && (
                                <Badge variant="outline" className="font-mono text-[11px] border-teal-300 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
                                  License: {req.medicalLicenseNumber}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <Mail className="size-3" /> {req.email}
                              </span>
                              {req.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="size-3" /> {req.phone}
                                </span>
                              )}
                              {req.specialization && (
                                <span>• Specialization: <strong className="text-foreground">{req.specialization}</strong></span>
                              )}
                              <span>• Applied: {new Date(req.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Department Assignment Selector */}
                            <div className="w-48">
                              <Select
                                value={assignedDeptMap[req.id] || req.departmentId || ""}
                                onValueChange={(v) =>
                                  setAssignedDeptMap((prev) => ({ ...prev, [req.id]: v }))
                                }
                              >
                                <SelectTrigger className="h-8 text-xs bg-card">
                                  <SelectValue placeholder="Assign Dept" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">General / None</SelectItem>
                                  {(ctx?.departments ?? []).map((d: any) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {d.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              size="sm"
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                              disabled={resolveRequestMutation.isPending}
                              onClick={() =>
                                resolveRequestMutation.mutate({
                                  requestId: req.id,
                                  action: "approve",
                                  departmentId: assignedDeptMap[req.id] || req.departmentId || undefined,
                                })
                              }
                            >
                              <CheckCircle2 className="size-3.5" /> Approve & Activate
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-xs gap-1.5"
                              disabled={resolveRequestMutation.isPending}
                              onClick={() =>
                                resolveRequestMutation.mutate({
                                  requestId: req.id,
                                  action: "reject",
                                })
                              }
                            >
                              <XCircle className="size-3.5" /> Decline
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* ----------------- ACTIVE STAFF ROSTER TAB ----------------- */}
          <TabsContent value="roster" className="mt-6 space-y-4 animate-in fade-in">
            {/* Filters and Search Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID code, or email…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-44 bg-card text-xs">
                    <SelectValue placeholder="Filter by Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="doctor">Doctors</SelectItem>
                    <SelectItem value="nurse">Nurses</SelectItem>
                    <SelectItem value="lab_tech">Lab Technicians</SelectItem>
                    <SelectItem value="pharmacist">Pharmacists</SelectItem>
                    <SelectItem value="hospital_admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Staff Table */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              {isLoading ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  Loading hospital roster…
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-12 text-center">
                  <UserCog className="mx-auto size-10 text-muted-foreground/50" />
                  <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                    No staff members found
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm || roleFilter !== "ALL"
                      ? "Try clearing your search filters."
                      : "Invite your first doctor, nurse, or pharmacist using the button above."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-secondary/50 text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3.5">Staff Member</th>
                        <th className="px-6 py-3.5">Staff ID Code</th>
                        <th className="px-6 py-3.5">Role</th>
                        <th className="px-6 py-3.5">Department</th>
                        <th className="px-6 py-3.5">Duty Status</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredMembers.map((m: TeamMember) => {
                        const roleInfo = ROLE_DISPLAY[m.role] || {
                          label: m.role,
                          color: "bg-gray-100 text-gray-800",
                        };
                        const isClinician = m.role === "doctor" || m.role === "nurse";
                        return (
                          <tr
                            key={m.id}
                            className="cursor-pointer transition-colors hover:bg-muted/40"
                            onClick={() => handleOpenStaffModal(m.id)}
                          >
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{m.fullName}</div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {m.email && (
                                  <span className="inline-flex items-center gap-1">
                                    <Mail className="size-3" /> {m.email}
                                  </span>
                                )}
                                {m.specialization && (
                                  <span>• {m.specialization}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs font-medium text-foreground">
                              {m.staffIdCode}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleInfo.color}`}
                              >
                                {roleInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">
                              {m.departmentName || "General / Unassigned"}
                            </td>
                            <td className="px-6 py-4">
                              {isClinician ? (
                                m.isOnShift ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                    On Shift
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
                                    <span className="size-2 rounded-full bg-slate-400" />
                                    Off Shift
                                  </span>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {m.isPending ? (
                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[11px]">
                                  Pending Sign-up
                                </Badge>
                              ) : m.isActive ? (
                                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[11px]">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 text-[11px]">
                                  Deactivated
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs text-foreground"
                                  onClick={() => handleOpenStaffModal(m.id)}
                                >
                                  <Eye className="mr-1 size-3.5" /> Details
                                </Button>
                                {ctx?.isAdmin && (
                                  <Button
                                    size="sm"
                                    variant={m.isActive ? "outline" : "default"}
                                    className={`h-8 px-2.5 text-xs ${
                                      m.isActive
                                        ? "text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    }`}
                                    disabled={toggleMutation.isPending}
                                    onClick={() =>
                                      toggleMutation.mutate({
                                        staffId: m.id,
                                        isActive: !m.isActive,
                                      })
                                    }
                                  >
                                    {m.isActive ? "Deactivate" : "Activate"}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>



        {/* Staff Detail & Schedule Dialog */}
        <Dialog
          open={Boolean(selectedStaffId)}
          onOpenChange={(open) => {
            if (!open) setSelectedStaffId(null);
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="font-display text-xl">
                    {staffDetail?.staff?.fullName || "Staff Member"}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {staffDetail?.staff?.staffIdCode} • {staffDetail?.staff?.departmentName || "General"}
                  </DialogDescription>
                </div>
                {staffDetail?.staff && (
                  <div>
                    {staffDetail.staff.isOnShift ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Currently on Duty
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                        <span className="size-2 rounded-full bg-slate-400" />
                        Off Shift
                      </span>
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>

            {isLoadingStaff ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading profile and schedule…
              </div>
            ) : (
              <Tabs defaultValue="profile" className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">Profile Details</TabsTrigger>
                  <TabsTrigger value="schedule">Weekly Shift Schedule</TabsTrigger>
                </TabsList>

                {/* Profile Form Tab */}
                <TabsContent value="profile" className="space-y-4 pt-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (staffDetail?.canEdit) updateProfileMutation.mutate();
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="editFullName">Full Name</Label>
                        <Input
                          id="editFullName"
                          disabled={!staffDetail?.canEdit}
                          value={profileForm.fullName}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, fullName: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editStaffIdCode">Staff ID Code</Label>
                        <Input
                          id="editStaffIdCode"
                          disabled={!staffDetail?.canEdit}
                          value={profileForm.staffIdCode}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, staffIdCode: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="editPhone">Phone</Label>
                        <Input
                          id="editPhone"
                          disabled={!staffDetail?.canEdit}
                          placeholder="e.g. 08012345678"
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editDepartment">Department</Label>
                        <Select
                          disabled={!staffDetail?.canEdit}
                          value={profileForm.departmentId}
                          onValueChange={(val) =>
                            setProfileForm({ ...profileForm, departmentId: val })
                          }
                        >
                          <SelectTrigger id="editDepartment">
                            <SelectValue placeholder="General / None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None / General</SelectItem>
                            {(ctx?.departments ?? []).map((d: any) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="editSpecialization">Specialization</Label>
                        <Input
                          id="editSpecialization"
                          disabled={!staffDetail?.canEdit}
                          placeholder="e.g. Cardiology, Triage"
                          value={profileForm.specialization}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, specialization: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editLicense">Medical License #</Label>
                        <Input
                          id="editLicense"
                          disabled={!staffDetail?.canEdit}
                          placeholder="e.g. MDCN/12345"
                          value={profileForm.medicalLicenseNumber}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              medicalLicenseNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {staffDetail?.canEdit && (
                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {updateProfileMutation.isPending ? "Saving…" : "Save Profile Changes"}
                        </Button>
                      </div>
                    )}
                  </form>
                </TabsContent>

                {/* Schedule & Shifts Tab */}
                <TabsContent value="schedule" className="space-y-5 pt-4">
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Clock className="size-4 text-primary" /> Active Clinical Access
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Clinicians scheduled on active shifts gain seamless, break-glass-free
                      access to assigned patient encounters and emergency vitals per hospital RLS security policies.
                    </p>
                  </div>

                  {/* Add Shift (Admin only) */}
                  {staffDetail?.canEdit && (
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <Label className="text-xs uppercase font-semibold text-muted-foreground">
                        Add Weekly Duty Slot
                      </Label>
                      <div className="grid grid-cols-4 gap-2 items-center">
                        <Select
                          value={String(newShiftDay)}
                          onValueChange={(v) => setNewShiftDay(Number(v))}
                        >
                          <SelectTrigger className="bg-background text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((d, i) => (
                              <SelectItem key={d} value={String(i)}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          type="time"
                          value={newShiftStart}
                          onChange={(e) => setNewShiftStart(e.target.value)}
                          className="bg-background text-xs"
                        />

                        <Input
                          type="time"
                          value={newShiftEnd}
                          onChange={(e) => setNewShiftEnd(e.target.value)}
                          className="bg-background text-xs"
                        />

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleAddShift}
                          className="text-xs"
                        >
                          <Plus className="mr-1 size-3.5" /> Add
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Shifts List */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-semibold text-muted-foreground">
                      Current Weekly Shifts ({shiftsList.length})
                    </Label>
                    {shiftsList.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                        No recurring shifts set. Add a duty window to enable active clinical shift privileges.
                      </div>
                    ) : (
                      <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                        {shiftsList
                          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                          .map((s, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between px-4 py-2.5 text-sm"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-24 font-semibold text-foreground">
                                  {DAYS_OF_WEEK[s.dayOfWeek]}
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {s.startTimeStr} – {s.endTimeStr}
                                </span>
                              </div>
                              {staffDetail?.canEdit && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="size-7 p-0 text-rose-600 hover:bg-rose-50"
                                  onClick={() => handleRemoveShift(idx)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {staffDetail?.canEdit && (
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        disabled={updateShiftsMutation.isPending}
                        onClick={() => updateShiftsMutation.mutate()}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {updateShiftsMutation.isPending ? "Syncing…" : "Save Weekly Shifts"}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}
