import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertCircle,
  Bed,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DoorOpen,
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
  Stethoscope,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { PrintableDocumentModal } from "@/components/clinical-docs/PrintableDocumentModal";
import { DischargeSummaryDocument } from "@/components/clinical-docs/DischargeSummaryDocument";
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
  getWardManagementData,
  admitPatient,
  transferBed,
  dischargePatient,
  assignWardStaffDuty,
  type WardItem,
  type ActiveAdmissionItem,
  type DischargeArchiveItem,
  type WardStaffScheduleItem,
} from "@/lib/wards.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wards")({
  head: () => ({
    meta: [
      { title: "Ward & Bed Management — HospNest" },
      { name: "description", content: "Inpatient admissions, real-time visual bed matrix, bed transfers, discharge summaries, and ward duty rosters." },
    ],
  }),
  component: WardManagementPage,
});

type WardTab = "matrix" | "inpatients" | "rosters" | "discharges";

function WardManagementPage() {
  const { activeHospitalId, shellData } = useAppShell();
  const currentHospital = shellData?.hospitals.find((h) => h.id === activeHospitalId);
  const getWardDataFn = useServerFn(getWardManagementData);
  const admitFn = useServerFn(admitPatient);
  const transferFn = useServerFn(transferBed);
  const dischargeFn = useServerFn(dischargePatient);
  const assignDutyFn = useServerFn(assignWardStaffDuty);

  const [activeTab, setActiveTab] = useState<WardTab>("matrix");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>("all");

  // Modals state
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isDutyModalOpen, setIsDutyModalOpen] = useState(false);
  const [viewingDischarge, setViewingDischarge] = useState<DischargeArchiveItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Admission form state
  const [admitPatientId, setAdmitPatientId] = useState("");
  const [admitWardId, setAdmitWardId] = useState("");
  const [admitBedId, setAdmitBedId] = useState("");
  const [admitReason, setAdmitReason] = useState("");
  const [admitCondition, setAdmitCondition] = useState("Stable");

  // Transfer form state
  const [activeTransferAdmission, setActiveTransferAdmission] = useState<ActiveAdmissionItem | null>(null);
  const [transferWardId, setTransferWardId] = useState("");
  const [transferBedId, setTransferBedId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // Discharge form state
  const [activeDischargeAdmission, setActiveDischargeAdmission] = useState<ActiveAdmissionItem | null>(null);
  const [dischargeCondition, setDischargeCondition] = useState<"recovered" | "improved" | "stable" | "transferred" | "deceased" | "against_medical_advice">("improved");
  const [dischargeSummaryText, setDischargeSummaryText] = useState("");
  const [dischargeInstructionsText, setDischargeInstructionsText] = useState("");

  // Duty assignment form state
  const [dutyWardId, setDutyWardId] = useState("");
  const [dutyStaffId, setDutyStaffId] = useState("");
  const [dutyRole, setDutyRole] = useState<"supervising_doctor" | "primary_nurse" | "assisting_nurse" | "intern" | "resident">("primary_nurse");
  const [dutyDate, setDutyDate] = useState(new Date().toISOString().split("T")[0]);
  const [dutyShiftType, setDutyShiftType] = useState<"morning" | "afternoon" | "night" | "full_day">("morning");
  const [dutyNotes, setDutyNotes] = useState("");

  const [isPending, startTransition] = useTransition();

  // Query Ward Data
  const {
    data: wardData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["ward-management-data", activeHospitalId],
    queryFn: () => getWardDataFn({ data: { hospitalId: activeHospitalId || undefined } }),
    refetchInterval: 15000,
  });

  // Filtered wards
  const filteredWards = useMemo(() => {
    if (!wardData?.wards) return [];
    if (selectedWardFilter === "all") return wardData.wards;
    return wardData.wards.filter((w) => w.id === selectedWardFilter);
  }, [wardData?.wards, selectedWardFilter]);

  // Filtered inpatients
  const filteredInpatients = useMemo(() => {
    if (!wardData?.activeAdmissions) return [];
    let list = wardData.activeAdmissions;
    if (selectedWardFilter !== "all") {
      list = list.filter((a) => a.wardId === selectedWardFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.patientName.toLowerCase().includes(q) ||
          a.patientNin.toLowerCase().includes(q) ||
          a.bedNumber.toLowerCase().includes(q) ||
          a.admissionReason.toLowerCase().includes(q),
      );
    }
    return list;
  }, [wardData?.activeAdmissions, selectedWardFilter, searchQuery]);

  // Available beds for selected ward in admission modal
  const availableBedsForAdmit = useMemo(() => {
    if (!admitWardId || !wardData?.wards) return [];
    const selectedWard = wardData.wards.find((w) => w.id === admitWardId);
    if (!selectedWard) return [];
    return selectedWard.beds.filter((b) => b.status === "available");
  }, [admitWardId, wardData?.wards]);

  // Available beds for transfer modal
  const availableBedsForTransfer = useMemo(() => {
    if (!transferWardId || !wardData?.wards) return [];
    const selectedWard = wardData.wards.find((w) => w.id === transferWardId);
    if (!selectedWard) return [];
    return selectedWard.beds.filter((b) => b.status === "available");
  }, [transferWardId, wardData?.wards]);

  // Handle Submit Admission
  const handleAdmitSubmit = () => {
    if (!admitPatientId || !admitWardId || !admitBedId || !admitReason.trim()) {
      toast.error("Please fill all required admission fields.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await admitFn({
          data: {
            hospitalId: activeHospitalId || undefined,
            patientId: admitPatientId,
            wardId: admitWardId,
            bedId: admitBedId,
            admissionReason: admitReason,
            initialCondition: admitCondition || undefined,
          },
        });

        if (res.success) {
          toast.success("Patient successfully admitted to ward bed.");
          setIsAdmitModalOpen(false);
          setAdmitPatientId("");
          setAdmitWardId("");
          setAdmitBedId("");
          setAdmitReason("");
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to admit patient.");
      }
    });
  };

  // Handle Submit Transfer
  const handleTransferSubmit = () => {
    if (!activeTransferAdmission || !transferWardId || !transferBedId) {
      toast.error("Please select a target ward and bed.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await transferFn({
          data: {
            admissionId: activeTransferAdmission.id,
            newWardId: transferWardId,
            newBedId: transferBedId,
            transferReason: transferReason || "Inpatient bed transfer",
            hospitalId: activeHospitalId || undefined,
          },
        });

        if (res.success) {
          toast.success("Patient transferred to new bed successfully.");
          setIsTransferModalOpen(false);
          setActiveTransferAdmission(null);
          setTransferWardId("");
          setTransferBedId("");
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to transfer patient.");
      }
    });
  };

  // Handle Submit Discharge
  const handleDischargeSubmit = () => {
    if (!activeDischargeAdmission || !dischargeSummaryText.trim()) {
      toast.error("Please enter a clinical discharge summary.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await dischargeFn({
          data: {
            admissionId: activeDischargeAdmission.id,
            dischargeCondition,
            dischargeSummary: dischargeSummaryText,
            dischargeInstructions: dischargeInstructionsText || undefined,
            hospitalId: activeHospitalId || undefined,
          },
        });

        if (res.success) {
          toast.success("Patient discharged and bed released.");
          setIsDischargeModalOpen(false);
          setActiveDischargeAdmission(null);
          setDischargeSummaryText("");
          setDischargeInstructionsText("");
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to discharge patient.");
      }
    });
  };

  // Handle Submit Ward Duty Assignment
  const handleAssignDutySubmit = () => {
    if (!dutyWardId || !dutyStaffId || !dutyDate) {
      toast.error("Please select ward, staff member, and date.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await assignDutyFn({
          data: {
            hospitalId: activeHospitalId || undefined,
            wardId: dutyWardId,
            staffId: dutyStaffId,
            roleInWard: dutyRole,
            shiftDate: dutyDate,
            shiftType: dutyShiftType,
            notes: dutyNotes || undefined,
          },
        });

        if (res.success) {
          toast.success("Ward staff duty assignment saved.");
          setIsDutyModalOpen(false);
          setDutyNotes("");
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to assign duty schedule.");
      }
    });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Bed className="size-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Ward & Inpatient Bed Management
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track bed occupancy, inpatient admissions, bed transfers, discharge summaries, and clinical duty rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            variant="outline"
            onClick={() => setIsDutyModalOpen(true)}
            className="gap-1.5 border-border"
          >
            <Calendar className="size-3.5" />
            Assign Ward Duty
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (wardData?.wards && wardData.wards.length > 0) {
                setAdmitWardId(wardData.wards[0].id);
              }
              setIsAdmitModalOpen(true);
            }}
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold"
          >
            <UserPlus className="size-3.5" />
            Admit Patient
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Bed Capacity</span>
            <Building2 className="size-4 text-teal-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">
            {isLoading ? "—" : wardData?.totalBeds ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {wardData?.wards.length ?? 0} hospital wards
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Inpatients</span>
            <Users className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">
            {isLoading ? "—" : wardData?.totalOccupied ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Currently admitted in beds
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Beds</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {isLoading ? "—" : wardData?.totalAvailable ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ready for immediate intake
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Hospital Occupancy Rate</span>
            <Activity className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">
            {isLoading ? "—" : `${wardData?.overallOccupancyRate ?? 0}%`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {Number(wardData?.overallOccupancyRate || 0) > 85 ? "High capacity alert" : "Normal capacity"}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex rounded-xl bg-muted p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors ${
              activeTab === "matrix"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bed className="size-3.5" />
            Bed Matrix ({wardData?.totalBeds ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("inpatients")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors ${
              activeTab === "inpatients"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="size-3.5" />
            Active Inpatients ({wardData?.activeAdmissions.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("rosters")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors ${
              activeTab === "rosters"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="size-3.5" />
            Ward Duty Rosters ({wardData?.staffSchedules.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("discharges")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors ${
              activeTab === "discharges"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="size-3.5" />
            Discharge Archive ({wardData?.recentDischarges.length ?? 0})
          </button>
        </div>

        {/* Filter by Ward */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Ward Filter:</Label>
          <Select value={selectedWardFilter} onValueChange={setSelectedWardFilter}>
            <SelectTrigger className="h-8 w-48 text-xs bg-background">
              <SelectValue placeholder="All Wards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Hospital Wards</SelectItem>
              {wardData?.wards.map((w) => (
                <SelectItem key={w.id} value={w.id} className="text-xs">
                  {w.name} ({w.occupiedCount}/{w.totalBeds})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TAB 1: BED MATRIX */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-teal-600" />
              <p className="mt-2 text-xs text-muted-foreground">Loading ward beds...</p>
            </div>
          ) : filteredWards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center shadow-soft">
              <Bed className="mx-auto size-12 text-muted-foreground/50" />
              <h3 className="mt-3 font-display text-base font-bold text-foreground">No Wards Configured</h3>
              <p className="text-xs text-muted-foreground mt-1">Please configure hospital wards in settings.</p>
            </div>
          ) : (
            filteredWards.map((ward) => (
              <div key={ward.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-bold text-foreground">{ward.name}</h3>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold capitalize">
                        {ward.type} Ward
                      </span>
                      {ward.floorLocation && (
                        <span className="text-xs text-muted-foreground">📍 {ward.floorLocation}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      Occupancy: <strong className="text-foreground">{ward.occupiedCount} / {ward.totalBeds}</strong> ({ward.occupancyRate}%)
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="size-2 rounded-full bg-emerald-500" /> {ward.availableCount} Available
                    </span>
                  </div>
                </div>

                {/* Beds Grid */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  {ward.beds.map((bed) => {
                    const isOccupied = bed.status === "occupied" || Boolean(bed.currentAdmission);
                    return (
                      <div
                        key={bed.id}
                        className={`rounded-xl border p-3 text-xs space-y-2 transition-all ${
                          isOccupied
                            ? "border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20"
                            : "border-border bg-muted/20 hover:border-border/80"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-foreground">{bed.bedNumber}</span>
                          <span
                            className={`rounded-full px-2 py-0.2 text-[10px] font-bold uppercase ${
                              isOccupied
                                ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {isOccupied ? "Occupied" : "Available"}
                          </span>
                        </div>

                        {bed.currentAdmission ? (
                          <div className="space-y-1">
                            <p className="font-bold text-foreground truncate">{bed.currentAdmission.patientName}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Day {bed.currentAdmission.lengthOfStayDays} • Dr. {bed.currentAdmission.admittingDoctor?.split(" ")[0] || "Staff"}
                            </p>
                            <div className="pt-1 flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const adm = wardData?.activeAdmissions.find((a) => a.id === bed.currentAdmission?.admissionId);
                                  if (adm) {
                                    setActiveDischargeAdmission(adm);
                                    setIsDischargeModalOpen(true);
                                  }
                                }}
                                className="h-6 w-full text-[10px] px-1 border-border"
                              >
                                Discharge
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground">₦{bed.dailyRate.toLocaleString()} / day</p>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setAdmitWardId(ward.id);
                                setAdmitBedId(bed.id);
                                setIsAdmitModalOpen(true);
                              }}
                              className="h-6 w-full text-[10px] px-1"
                            >
                              + Assign Bed
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE INPATIENTS */}
      {activeTab === "inpatients" && (
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, NIN, bed..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Total Inpatients: <strong className="text-foreground">{filteredInpatients.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Patient Details</th>
                  <th className="p-3.5">Ward & Bed</th>
                  <th className="p-3.5">Admission Date</th>
                  <th className="p-3.5">Length of Stay</th>
                  <th className="p-3.5">Admitting Doctor</th>
                  <th className="p-3.5">Admission Reason</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInpatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No active inpatients matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInpatients.map((adm) => (
                    <tr key={adm.id} className="hover:bg-muted/30">
                      <td className="p-3.5">
                        <div className="font-bold text-foreground">{adm.patientName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">NIN: {adm.patientNin} • {adm.age}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground">{adm.wardName}</div>
                        <span className="rounded bg-teal-500/10 px-1.5 py-0.2 font-mono text-[10px] font-bold text-teal-700 dark:text-teal-300">
                          {adm.bedNumber}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {new Date(adm.admissionDate).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">
                        {adm.lengthOfStayDays} {adm.lengthOfStayDays === 1 ? "day" : "days"}
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {adm.admittingDoctorName ? `Dr. ${adm.admittingDoctorName}` : "Attending Physician"}
                      </td>
                      <td className="p-3.5 text-muted-foreground max-w-xs truncate">
                        {adm.admissionReason}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveTransferAdmission(adm);
                            setTransferWardId(adm.wardId);
                            setIsTransferModalOpen(true);
                          }}
                          className="h-7 text-xs border-border"
                        >
                          Transfer Bed
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setActiveDischargeAdmission(adm);
                            setIsDischargeModalOpen(true);
                          }}
                          className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                        >
                          Discharge
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

      {/* TAB 3: WARD DUTY ROSTERS */}
      {activeTab === "rosters" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Ward Clinical Coverage & Shift Duty Schedule
              </h3>
              <p className="text-xs text-muted-foreground">
                Assigned supervising doctors, primary duty nurses, and clinical interns across ward timelines.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsDutyModalOpen(true)}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
            >
              <Plus className="size-3.5" /> Assign Staff to Ward
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Ward</th>
                  <th className="p-3.5">Staff Name & Role</th>
                  <th className="p-3.5">Ward Duty Role</th>
                  <th className="p-3.5">Shift Date</th>
                  <th className="p-3.5">Shift Type & Hours</th>
                  <th className="p-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wardData?.staffSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No ward duty assignments recorded yet.
                    </td>
                  </tr>
                ) : (
                  wardData?.staffSchedules.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="p-3.5 font-semibold text-foreground">{s.wardName}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-foreground">{s.staffName}</div>
                        <div className="text-[11px] text-muted-foreground capitalize">{s.staffRole}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            s.roleInWard === "supervising_doctor"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              : s.roleInWard === "primary_nurse"
                              ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                              : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {s.roleInWard.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-foreground">{s.shiftDate}</td>
                      <td className="p-3.5">
                        <span className="font-semibold capitalize">{s.shiftType}</span>
                        {s.startTime && s.endTime && (
                          <span className="text-muted-foreground ml-1 font-mono">({s.startTime} - {s.endTime})</span>
                        )}
                      </td>
                      <td className="p-3.5 text-muted-foreground">{s.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DISCHARGE ARCHIVE */}
      {activeTab === "discharges" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-display text-base font-bold text-foreground">
              Inpatient Discharge Archive & Summaries
            </h3>
            <p className="text-xs text-muted-foreground">
              Historical record of discharged inpatients and their structured discharge notes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Patient Name</th>
                  <th className="p-3.5">Ward & Bed</th>
                  <th className="p-3.5">Admission Period</th>
                  <th className="p-3.5">Discharge Condition</th>
                  <th className="p-3.5">Attending Doctor</th>
                  <th className="p-3.5 text-right">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wardData?.recentDischarges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No past discharge summaries archived yet.
                    </td>
                  </tr>
                ) : (
                  wardData?.recentDischarges.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="p-3.5 font-bold text-foreground">{d.patientName}</td>
                      <td className="p-3.5">
                        {d.wardName} <span className="font-mono text-[11px] text-muted-foreground">({d.bedNumber})</span>
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {new Date(d.admissionDate).toLocaleDateString()} → {new Date(d.dischargeDate).toLocaleDateString()} ({d.lengthOfStayDays}d)
                      </td>
                      <td className="p-3.5">
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                          {d.dischargeCondition}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {d.admittingDoctorName ? `Dr. ${d.admittingDoctorName}` : "Attending"}
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingDischarge(d)}
                          className="h-7 text-xs gap-1 border-border"
                        >
                          <FileText className="size-3" /> View Summary
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

      {/* MODAL 1: ADMIT PATIENT */}
      <Dialog open={isAdmitModalOpen} onOpenChange={setIsAdmitModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Admit Patient to Ward</DialogTitle>
            <DialogDescription className="text-xs">
              Assign an available hospital bed and record clinical admission indication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Patient</Label>
              <Select value={admitPatientId} onValueChange={setAdmitPatientId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Choose registered patient..." />
                </SelectTrigger>
                <SelectContent>
                  {wardData?.eligiblePatients.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.fullName} (NIN: {p.nin})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ward</Label>
                <Select
                  value={admitWardId}
                  onValueChange={(val) => {
                    setAdmitWardId(val);
                    setAdmitBedId("");
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select ward..." />
                  </SelectTrigger>
                  <SelectContent>
                    {wardData?.wards.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs">
                        {w.name} ({w.availableCount} free)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Available Bed</Label>
                <Select value={admitBedId} onValueChange={setAdmitBedId} disabled={!admitWardId}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Choose bed..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBedsForAdmit.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.bedNumber} (₦{b.dailyRate.toLocaleString()}/d)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Admission Reason & Diagnosis</Label>
              <Input
                value={admitReason}
                onChange={(e) => setAdmitReason(e.target.value)}
                placeholder="e.g. Acute severe pneumonia requiring oxygen therapy"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Initial Patient Condition</Label>
              <Select value={admitCondition} onValueChange={setAdmitCondition}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical" className="text-xs">Critical / High Dependency</SelectItem>
                  <SelectItem value="Guarded" className="text-xs">Guarded</SelectItem>
                  <SelectItem value="Stable" className="text-xs">Stable</SelectItem>
                  <SelectItem value="Fair" className="text-xs">Fair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAdmitModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAdmitSubmit}
              disabled={isPending || !admitPatientId || !admitBedId || !admitReason}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
              Confirm Admission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: TRANSFER BED */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Transfer Inpatient Bed</DialogTitle>
            <DialogDescription className="text-xs">
              Reassign {activeTransferAdmission?.patientName} to a different bed or specialized ward.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="rounded-lg bg-muted/30 p-2.5 border border-border text-muted-foreground">
              Current Location: <strong className="text-foreground">{activeTransferAdmission?.wardName} ({activeTransferAdmission?.bedNumber})</strong>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Destination Ward</Label>
                <Select
                  value={transferWardId}
                  onValueChange={(val) => {
                    setTransferWardId(val);
                    setTransferBedId("");
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select ward..." />
                  </SelectTrigger>
                  <SelectContent>
                    {wardData?.wards.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs">
                        {w.name} ({w.availableCount} free)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">New Bed</Label>
                <Select value={transferBedId} onValueChange={setTransferBedId} disabled={!transferWardId}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Choose bed..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBedsForTransfer.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.bedNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason for Bed Transfer</Label>
              <Input
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Step down from ICU to general ward"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleTransferSubmit}
              disabled={isPending || !transferBedId}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <DoorOpen className="size-3.5" />}
              Complete Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: DISCHARGE PATIENT */}
      <Dialog open={isDischargeModalOpen} onOpenChange={setIsDischargeModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">
              Discharge Patient & Generate Summary
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete inpatient stay for {activeDischargeAdmission?.patientName} (Stay: {activeDischargeAdmission?.lengthOfStayDays} days).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Discharge Condition</Label>
              <Select
                value={dischargeCondition}
                onValueChange={(val: any) => setDischargeCondition(val)}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recovered" className="text-xs">Fully Recovered</SelectItem>
                  <SelectItem value="improved" className="text-xs">Clinically Improved</SelectItem>
                  <SelectItem value="stable" className="text-xs">Stable (Home Care)</SelectItem>
                  <SelectItem value="transferred" className="text-xs">Transferred to Another Facility</SelectItem>
                  <SelectItem value="against_medical_advice" className="text-xs">Discharge Against Medical Advice (DAMA)</SelectItem>
                  <SelectItem value="deceased" className="text-xs">Deceased</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Clinical Discharge Summary</Label>
              <Textarea
                value={dischargeSummaryText}
                onChange={(e) => setDischargeSummaryText(e.target.value)}
                placeholder="Course in hospital, treatment response, procedures performed, resolved issues..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Post-Discharge Instructions & Follow-up</Label>
              <Textarea
                value={dischargeInstructionsText}
                onChange={(e) => setDischargeInstructionsText(e.target.value)}
                placeholder="Medication regimen at home, dietary advice, red flag symptoms, follow-up clinic date..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDischargeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDischargeSubmit}
              disabled={isPending || !dischargeSummaryText.trim()}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FileCheck className="size-3.5" />}
              Finalize Discharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ASSIGN WARD DUTY */}
      <Dialog open={isDutyModalOpen} onOpenChange={setIsDutyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Assign Ward Duty Shift</DialogTitle>
            <DialogDescription className="text-xs">
              Assign supervising doctor, primary nurse, or clinical intern to ward shift timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Hospital Ward</Label>
              <Select value={dutyWardId} onValueChange={setDutyWardId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Select target ward..." />
                </SelectTrigger>
                <SelectContent>
                  {wardData?.wards.map((w) => (
                    <SelectItem key={w.id} value={w.id} className="text-xs">
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Staff Member</Label>
              <Select value={dutyStaffId} onValueChange={setDutyStaffId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Choose staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {wardData?.availableStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.fullName} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Role in Ward</Label>
                <Select value={dutyRole} onValueChange={(val: any) => setDutyRole(val)}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supervising_doctor" className="text-xs">Supervising Doctor</SelectItem>
                    <SelectItem value="primary_nurse" className="text-xs">Primary Duty Nurse</SelectItem>
                    <SelectItem value="assisting_nurse" className="text-xs">Assisting Nurse</SelectItem>
                    <SelectItem value="intern" className="text-xs">Clinical Intern</SelectItem>
                    <SelectItem value="resident" className="text-xs">Medical Resident</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Shift Schedule</Label>
                <Select value={dutyShiftType} onValueChange={(val: any) => setDutyShiftType(val)}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning" className="text-xs">Morning (08:00 - 14:00)</SelectItem>
                    <SelectItem value="afternoon" className="text-xs">Afternoon (14:00 - 20:00)</SelectItem>
                    <SelectItem value="night" className="text-xs">Night (20:00 - 08:00)</SelectItem>
                    <SelectItem value="full_day" className="text-xs">Full 24-Hour Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Shift Date</Label>
              <Input
                type="date"
                value={dutyDate}
                onChange={(e) => setDutyDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Shift Notes / Special Instructions</Label>
              <Input
                value={dutyNotes}
                onChange={(e) => setDutyNotes(e.target.value)}
                placeholder="e.g. Lead morning ward rounds with pediatric team"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDutyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAssignDutySubmit}
              disabled={isPending || !dutyWardId || !dutyStaffId}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Calendar className="size-3.5" />}
              Save Duty Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW DISCHARGE SUMMARY MODAL */}
      <Dialog open={Boolean(viewingDischarge)} onOpenChange={(open) => !open && setViewingDischarge(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">
              Inpatient Discharge Summary
            </DialogTitle>
            <DialogDescription className="text-xs">
              Patient: {viewingDischarge?.patientName} • Ward: {viewingDischarge?.wardName} ({viewingDischarge?.bedNumber})
            </DialogDescription>
          </DialogHeader>

          {viewingDischarge && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-3 border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Admission Period:</span>
                  <strong className="text-foreground">
                    {new Date(viewingDischarge.admissionDate).toLocaleDateString()} — {new Date(viewingDischarge.dischargeDate).toLocaleDateString()} ({viewingDischarge.lengthOfStayDays}d)
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Discharge Condition:</span>
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 font-bold uppercase text-emerald-700 dark:text-emerald-400">
                    {viewingDischarge.dischargeCondition}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-foreground">Clinical Discharge Summary:</span>
                <p className="rounded-lg bg-background p-2.5 border border-border/80 text-muted-foreground whitespace-pre-line">
                  {viewingDischarge.dischargeSummary}
                </p>
              </div>

              {viewingDischarge.dischargeInstructions && (
                <div className="space-y-1">
                  <span className="font-semibold text-foreground">Discharge Instructions & Home Care:</span>
                  <p className="rounded-lg bg-background p-2.5 border border-border/80 text-muted-foreground whitespace-pre-line">
                    {viewingDischarge.dischargeInstructions}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewingDischarge(null)}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsPrintModalOpen(true)}
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              <FileText className="size-3.5" />
              Print Official Discharge Summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINTABLE DISCHARGE SUMMARY MODAL */}
      {viewingDischarge && (
        <PrintableDocumentModal
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
          title={`Discharge Summary — ${viewingDischarge.patientName}`}
        >
          <DischargeSummaryDocument
            hospital={{
              name: currentHospital?.name || "HospNest Medical Center",
              state: "Nigeria",
              contactPhone: "+234 800 HOSPNEST",
              licenseNumber: "FMOH/HOSP/2026/09",
            }}
            patient={{
              fullName: viewingDischarge.patientName,
            }}
            discharge={{
              summaryNumber: `DS-${viewingDischarge.id.slice(0, 8).toUpperCase()}`,
              admissionDate: viewingDischarge.admissionDate,
              dischargeDate: viewingDischarge.dischargeDate,
              wardName: viewingDischarge.wardName,
              bedNumber: viewingDischarge.bedNumber,
              attendingPhysician: viewingDischarge.admittingDoctorName || "Dr. Attending Consultant",
              physicianRank: "Consultant Inpatient Physician",
              admissionReason: viewingDischarge.admissionReason,
              primaryDiagnosis: viewingDischarge.admissionReason || "Inpatient Admission Course",
              hospitalCourseSummary: viewingDischarge.dischargeSummary,
              dischargeCondition: (viewingDischarge.dischargeCondition as any) || "improved",
              dischargeMedications: [],
              followUpInstructions: viewingDischarge.dischargeInstructions || "Follow up at outpatient clinic in 14 days or report immediately to ER if symptoms worsen.",
            }}
          />
        </PrintableDocumentModal>
      )}
    </div>
  );
}
