import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Edit,
  FlaskConical,
  Layers,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Stethoscope,
  Trash2,
} from "lucide-react";

import { useAppShell } from "@/components/layout/AppShell";
import {
  getHospitalSettingsData,
  updateHospitalProfile,
  createOrUpdateDepartment,
  deleteDepartment,
  saveHospitalService,
  updateHospitalLabTest,
  type DepartmentItem,
  type HospitalServiceItem,
  type HospitalLabTestItem,
} from "@/lib/hospital-settings.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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

const title = "Hospital Settings & Facility Configuration — HospNest";
const description =
  "Configure hospital profile, clinical departments, consultation fees, service tariffs, and laboratory test catalogs.";

export const Route = createFileRoute("/_authenticated/settings")({
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
  component: SettingsPage,
});

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const HOSPITAL_TYPES = [
  { value: "tertiary", label: "Tertiary Teaching / Specialist Hospital" },
  { value: "secondary", label: "State General / Secondary Hospital" },
  { value: "primary", label: "Primary Health Care Centre (PHC)" },
  { value: "private", label: "Private Specialist Hospital / Clinic" },
  { value: "faith_based", label: "Faith-Based Mission Hospital" },
];

function SettingsPage() {
  const queryClient = useQueryClient();
  const { activeHospitalId } = useAppShell();

  const getSettingsFn = useServerFn(getHospitalSettingsData);
  const updateProfileFn = useServerFn(updateHospitalProfile);
  const saveDeptFn = useServerFn(createOrUpdateDepartment);
  const deleteDeptFn = useServerFn(deleteDepartment);
  const saveServiceFn = useServerFn(saveHospitalService);
  const updateLabTestFn = useServerFn(updateHospitalLabTest);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["hospital-settings", activeHospitalId],
    queryFn: () => getSettingsFn({ data: { hospitalId: activeHospitalId } }),
    enabled: !!activeHospitalId,
  });

  const isAdmin = data?.isAdmin ?? false;

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    name: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    state: "",
    lga: "",
    hospitalType: "",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Initialize profile form when data loads
  const handleStartEditProfile = () => {
    if (!data?.hospital) return;
    setProfileForm({
      name: data.hospital.name,
      address: data.hospital.address || "",
      contactEmail: data.hospital.contactEmail || "",
      contactPhone: data.hospital.contactPhone || "",
      state: data.hospital.state || "Lagos",
      lga: data.hospital.lga || "",
      hospitalType: data.hospital.hospitalType || "secondary",
    });
    setIsEditingProfile(true);
  };

  // Department Modal State
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: "",
    code: "",
    floor: "",
    headOfDeptId: "",
  });

  const [deptSearch, setDeptSearch] = useState("");
  const [deleteDeptConfirmId, setDeleteDeptConfirmId] = useState<string | null>(null);

  // Service Tariff Modal State
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<HospitalServiceItem | null>(null);
  const [serviceForm, setServiceForm] = useState({
    serviceCode: "",
    serviceName: "",
    category: "Consultation",
    price: 0,
    isActive: true,
  });
  const [serviceSearch, setServiceSearch] = useState("");

  // Lab Test Modal State
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [editingLabTest, setEditingLabTest] = useState<HospitalLabTestItem | null>(null);
  const [labForm, setLabForm] = useState({
    price: 0,
    isAvailable: true,
  });
  const [labSearch, setLabSearch] = useState("");

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (form: typeof profileForm) =>
      updateProfileFn({
        data: {
          hospitalId: activeHospitalId,
          name: form.name,
          address: form.address,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          state: form.state,
          lga: form.lga,
          hospitalType: form.hospitalType,
        },
      }),
    onSuccess: () => {
      toast.success("Hospital profile updated successfully.");
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ["hospital-settings", activeHospitalId] });
      queryClient.invalidateQueries({ queryKey: ["app-shell-data"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update hospital profile.");
    },
  });

  const saveDeptMutation = useMutation({
    mutationFn: (form: {
      name: string;
      code: string;
      floor?: string | undefined;
      headOfDeptId?: string | undefined;
      departmentId?: string | undefined;
    }) =>
      saveDeptFn({
        data: {
          hospitalId: activeHospitalId,
          departmentId: form.departmentId,
          name: form.name,
          code: form.code,
          floor: form.floor || undefined,
          headOfDeptId: form.headOfDeptId || undefined,
        },
      }),
    onSuccess: () => {
      toast.success(editingDept ? "Department updated." : "Department created.");
      setDeptModalOpen(false);
      setEditingDept(null);
      queryClient.invalidateQueries({ queryKey: ["hospital-settings", activeHospitalId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save department.");
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (departmentId: string) =>
      deleteDeptFn({
        data: {
          hospitalId: activeHospitalId,
          departmentId,
        },
      }),
    onSuccess: () => {
      toast.success("Department removed.");
      setDeleteDeptConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["hospital-settings", activeHospitalId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete department.");
    },
  });

  const saveServiceMutation = useMutation({
    mutationFn: (form: {
      serviceCode: string;
      serviceName: string;
      category: string;
      price: number;
      isActive: boolean;
      serviceId?: string | undefined;
    }) =>
      saveServiceFn({
        data: {
          hospitalId: activeHospitalId,
          serviceId: form.serviceId,
          serviceCode: form.serviceCode,
          serviceName: form.serviceName,
          category: form.category,
          price: Number(form.price),
          isActive: form.isActive,
        },
      }),
    onSuccess: () => {
      toast.success(editingService ? "Tariff updated." : "Service tariff added.");
      setServiceModalOpen(false);
      setEditingService(null);
      queryClient.invalidateQueries({ queryKey: ["hospital-settings", activeHospitalId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save tariff.");
    },
  });

  const updateLabMutation = useMutation({
    mutationFn: (form: { testId: string; price: number; isAvailable: boolean }) =>
      updateLabTestFn({
        data: {
          hospitalId: activeHospitalId,
          testId: form.testId,
          price: Number(form.price),
          isAvailable: form.isAvailable,
        },
      }),
    onSuccess: () => {
      toast.success("Laboratory test tariff updated.");
      setLabModalOpen(false);
      setEditingLabTest(null);
      queryClient.invalidateQueries({ queryKey: ["hospital-settings", activeHospitalId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update lab test.");
    },
  });

  // Filtered lists
  const filteredDepartments = useMemo(() => {
    if (!data?.departments) return [];
    if (!deptSearch.trim()) return data.departments;
    const q = deptSearch.toLowerCase();
    return data.departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.headOfDeptName && d.headOfDeptName.toLowerCase().includes(q)),
    );
  }, [data?.departments, deptSearch]);

  const filteredServices = useMemo(() => {
    if (!data?.services) return [];
    if (!serviceSearch.trim()) return data.services;
    const q = serviceSearch.toLowerCase();
    return data.services.filter(
      (s) =>
        s.serviceName.toLowerCase().includes(q) ||
        s.serviceCode.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [data?.services, serviceSearch]);

  const filteredLabTests = useMemo(() => {
    if (!data?.labTests) return [];
    if (!labSearch.trim()) return data.labTests;
    const q = labSearch.toLowerCase();
    return data.labTests.filter(
      (l) =>
        l.testName.toLowerCase().includes(q) ||
        l.testCode.toLowerCase().includes(q) ||
        (l.category && l.category.toLowerCase().includes(q)),
    );
  }, [data?.labTests, labSearch]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm font-medium text-slate-600">Loading facility configuration...</p>
        </div>
      </div>
    );
  }

  if (!data?.hospital) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Hospital Not Found</h3>
        <p className="text-sm text-slate-500">Please select an active hospital workplace.</p>
      </div>
    );
  }

  const { hospital } = data;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Hospital Settings
            </h1>
            {isAdmin ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Shield className="mr-1 h-3 w-3" /> Admin Config Mode
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-100 text-slate-700">
                Read-Only Staff View
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Configure {hospital.name} facility profiles, clinical departments, tariffs, and diagnostic catalogs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Administrator Privileges Required for Modifications</p>
            <p className="text-xs text-amber-800/90 mt-0.5">
              You are signed in as a clinical staff member ({data.callerRole}). You have view access to hospital directory data and service catalogs. To modify tariffs or facility settings, please contact a Hospital Administrator.
            </p>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-slate-100/80 rounded-xl">
          <TabsTrigger value="profile" className="py-2.5 text-xs md:text-sm gap-2">
            <Building2 className="h-4 w-4" />
            Hospital Profile
          </TabsTrigger>
          <TabsTrigger value="departments" className="py-2.5 text-xs md:text-sm gap-2">
            <Layers className="h-4 w-4" />
            Departments ({data.departments.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="py-2.5 text-xs md:text-sm gap-2">
            <Receipt className="h-4 w-4" />
            Tariffs & Consultation ({data.services.length})
          </TabsTrigger>
          <TabsTrigger value="lab-tests" className="py-2.5 text-xs md:text-sm gap-2">
            <FlaskConical className="h-4 w-4" />
            Lab Catalog ({data.labTests.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: HOSPITAL PROFILE */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="rounded-2xl border bg-white p-6 md:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Facility Identity & Credentials</h2>
                <p className="text-sm text-slate-500">
                  National health facility registry parameters, official licensing, and address details.
                </p>
              </div>
              {isAdmin && !isEditingProfile && (
                <Button
                  onClick={handleStartEditProfile}
                  variant="outline"
                  className="gap-2 border-teal-600 text-teal-700 hover:bg-teal-50 self-start md:self-auto"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>

            {isEditingProfile ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateProfileMutation.mutate(profileForm);
                }}
                className="mt-6 space-y-6"
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hosp-name" className="text-xs font-semibold text-slate-700">
                      Hospital / Health Facility Name *
                    </Label>
                    <Input
                      id="hosp-name"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      placeholder="e.g., Lagos University Teaching Hospital"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hosp-type" className="text-xs font-semibold text-slate-700">
                      Facility Tier / Category *
                    </Label>
                    <Select
                      value={profileForm.hospitalType}
                      onValueChange={(val) => setProfileForm({ ...profileForm, hospitalType: val })}
                    >
                      <SelectTrigger id="hosp-type">
                        <SelectValue placeholder="Select facility tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOSPITAL_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hosp-state" className="text-xs font-semibold text-slate-700">
                      State *
                    </Label>
                    <Select
                      value={profileForm.state}
                      onValueChange={(val) => setProfileForm({ ...profileForm, state: val })}
                    >
                      <SelectTrigger id="hosp-state">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIGERIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hosp-lga" className="text-xs font-semibold text-slate-700">
                      Local Government Area (LGA)
                    </Label>
                    <Input
                      id="hosp-lga"
                      value={profileForm.lga}
                      onChange={(e) => setProfileForm({ ...profileForm, lga: e.target.value })}
                      placeholder="e.g., Surulere, Ikeja, Abuja Municipal"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="hosp-addr" className="text-xs font-semibold text-slate-700">
                      Physical Street Address
                    </Label>
                    <Input
                      id="hosp-addr"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="e.g., Ishaga Road, Idi-Araba"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hosp-email" className="text-xs font-semibold text-slate-700">
                      Official Contact Email
                    </Label>
                    <Input
                      id="hosp-email"
                      type="email"
                      value={profileForm.contactEmail}
                      onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
                      placeholder="admin@hospital.org.ng"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hosp-phone" className="text-xs font-semibold text-slate-700">
                      Official Phone / Emergency Dispatch
                    </Label>
                    <Input
                      id="hosp-phone"
                      value={profileForm.contactPhone}
                      onChange={(e) => setProfileForm({ ...profileForm, contactPhone: e.target.value })}
                      placeholder="+234 800 000 0000"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {updateProfileMutation.isPending ? "Saving changes..." : "Save Hospital Profile"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Facility Name</p>
                  <p className="text-base font-bold text-slate-900">{hospital.name}</p>
                  <p className="text-xs text-slate-500 font-mono">Slug: {hospital.slug}</p>
                </div>

                <div className="space-y-1 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Facility Tier</p>
                  <Badge variant="secondary" className="font-semibold capitalize text-teal-800 bg-teal-100/70">
                    {hospital.hospitalType.replace(/_/g, " ")}
                  </Badge>
                  <p className="text-xs text-slate-500">License: {hospital.licenseNumber || "HEFAMAA Registered"}</p>
                </div>

                <div className="space-y-1 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verification Status</p>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verified National Entity</span>
                  </div>
                  <p className="text-xs text-slate-500">Registered: {new Date(hospital.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="space-y-1 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location & Jurisdiction</p>
                  <div className="flex items-start gap-1.5 text-sm font-medium text-slate-800">
                    <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>{hospital.address || "Address not set"}, {hospital.lga ? `${hospital.lga}, ` : ""}{hospital.state} State</span>
                  </div>
                </div>

                <div className="space-y-1 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Official Contacts</p>
                  <p className="text-sm font-medium text-slate-800">{hospital.contactEmail || "No email registered"}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Phone className="h-3 w-3" />
                    <span>{hospital.contactPhone || "No phone registered"}</span>
                  </div>
                </div>

                <div className="space-y-1 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security & Multi-Tenancy</p>
                  <p className="text-xs text-slate-600">
                    RLS Isolated Tenant UUID:
                  </p>
                  <p className="text-xs font-mono text-slate-500 truncate" title={hospital.id}>
                    {hospital.id}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: DEPARTMENTS */}
        <TabsContent value="departments" className="mt-6 space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Clinical & Operational Departments</h2>
                <p className="text-sm text-slate-500">
                  Manage hospital units, assign department codes, locations, and designate Heads of Department (HOD).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search departments..."
                    className="pl-9 h-9 text-xs"
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                  />
                </div>
                {isAdmin && (
                  <Button
                    onClick={() => {
                      setEditingDept(null);
                      setDeptForm({ name: "", code: "", floor: "", headOfDeptId: "" });
                      setDeptModalOpen(true);
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 h-9 text-xs font-semibold shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Add Department
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Department Name</th>
                    <th className="px-4 py-3">Floor / Wing</th>
                    <th className="px-4 py-3">Head of Department (HOD)</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="py-8 text-center text-slate-400">
                        No departments found.
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-teal-700 text-xs">
                          {dept.code}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {dept.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {dept.floor || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-xs">
                          {dept.headOfDeptName ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                              <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                              {dept.headOfDeptName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-600 hover:text-teal-600 hover:bg-teal-50"
                                onClick={() => {
                                  setEditingDept(dept);
                                  setDeptForm({
                                    name: dept.name,
                                    code: dept.code,
                                    floor: dept.floor || "",
                                    headOfDeptId: dept.headOfDeptId || "",
                                  });
                                  setDeptModalOpen(true);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => setDeleteDeptConfirmId(dept.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: SERVICES & CONSULTATION TARIFFS */}
        <TabsContent value="services" className="mt-6 space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Standard Service Tariffs & Consultation Fees</h2>
                <p className="text-sm text-slate-500">
                  Manage billable baseline charges including General OPD, Specialist consultation, Emergency triage, and procedures.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search tariffs..."
                    className="pl-9 h-9 text-xs"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                  />
                </div>
                {isAdmin && (
                  <Button
                    onClick={() => {
                      setEditingService(null);
                      setServiceForm({
                        serviceCode: `SRV-${Math.floor(100 + Math.random() * 900)}`,
                        serviceName: "",
                        category: "Consultation",
                        price: 5000,
                        isActive: true,
                      });
                      setServiceModalOpen(true);
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 h-9 text-xs font-semibold shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Add Service Tariff
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Service Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Standard Fee (₦)</th>
                    <th className="px-4 py-3">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-slate-400">
                        No service tariffs configured.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-700 text-xs">
                          {srv.serviceCode}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {srv.serviceName}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 text-xs font-medium">
                            {srv.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          ₦{srv.price.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          {srv.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs">
                              Active Tariff
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-200 text-slate-600 border-0 text-xs">
                              Disabled
                            </Badge>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-600 hover:text-teal-600 hover:bg-teal-50"
                              onClick={() => {
                                setEditingService(srv);
                                setServiceForm({
                                  serviceCode: srv.serviceCode,
                                  serviceName: srv.serviceName,
                                  category: srv.category,
                                  price: srv.price,
                                  isActive: srv.isActive,
                                });
                                setServiceModalOpen(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: LABORATORY TEST CATALOG */}
        <TabsContent value="lab-tests" className="mt-6 space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Hospital Laboratory Test Catalog</h2>
                <p className="text-sm text-slate-500">
                  Configure diagnostic investigations, hospital unit pricing, and reagent availability flags.
                </p>
              </div>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search lab tests..."
                  className="pl-9 h-9 text-xs"
                  value={labSearch}
                  onChange={(e) => setLabSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Investigation Name</th>
                    <th className="px-4 py-3">Department Category</th>
                    <th className="px-4 py-3">Tariff Fee (₦)</th>
                    <th className="px-4 py-3">Laboratory Status</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLabTests.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-slate-400">
                        No laboratory tests matched your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLabTests.map((test) => (
                      <tr key={test.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-teal-700 text-xs">
                          {test.testCode}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {test.testName}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 capitalize">
                            {test.category || "General Pathology"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          ₦{test.price.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          {test.isAvailable ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs">
                              Available In-House
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-rose-100 text-rose-800 border-0 text-xs">
                              Reagents Unavailable
                            </Badge>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-600 hover:text-teal-600 hover:bg-teal-50"
                              onClick={() => {
                                setEditingLabTest(test);
                                setLabForm({
                                  price: test.price,
                                  isAvailable: test.isAvailable,
                                });
                                setLabModalOpen(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL: DEPARTMENT ADD / EDIT */}
      <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? "Edit Clinical Department" : "Add New Department"}
            </DialogTitle>
            <DialogDescription>
              Assign a unique code and department details for hospital scheduling and routing.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveDeptMutation.mutate({
                name: deptForm.name,
                code: deptForm.code,
                floor: deptForm.floor || undefined,
                headOfDeptId: deptForm.headOfDeptId || undefined,
                ...(editingDept?.id ? { departmentId: editingDept.id } : {}),
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="dept-name" className="text-xs font-semibold">
                Department Name *
              </Label>
              <Input
                id="dept-name"
                required
                placeholder="e.g. Obstetrics & Gynaecology"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dept-code" className="text-xs font-semibold">
                  Dept Code *
                </Label>
                <Input
                  id="dept-code"
                  required
                  placeholder="e.g. O&G, OPD, PEDS"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dept-floor" className="text-xs font-semibold">
                  Floor / Wing
                </Label>
                <Input
                  id="dept-floor"
                  placeholder="e.g. 2nd Floor, Wing B"
                  value={deptForm.floor}
                  onChange={(e) => setDeptForm({ ...deptForm, floor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-hod" className="text-xs font-semibold">
                Head of Department (HOD)
              </Label>
              <Select
                value={deptForm.headOfDeptId || "unassigned"}
                onValueChange={(val) => setDeptForm({ ...deptForm, headOfDeptId: val === "unassigned" ? "" : val })}
              >
                <SelectTrigger id="dept-hod">
                  <SelectValue placeholder="Assign HOD from Staff list" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {data?.staffMembers?.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.fullName} ({staff.role.replace(/_/g, " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeptModalOpen(false)}
                disabled={saveDeptMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveDeptMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {saveDeptMutation.isPending ? "Saving..." : "Save Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: DELETE DEPARTMENT CONFIRM */}
      <Dialog open={!!deleteDeptConfirmId} onOpenChange={() => setDeleteDeptConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-700 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Remove Department
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this department? This action will be audited.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDeptConfirmId(null)}
              disabled={deleteDeptMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDeptConfirmId) {
                  deleteDeptMutation.mutate(deleteDeptConfirmId);
                }
              }}
              disabled={deleteDeptMutation.isPending}
            >
              {deleteDeptMutation.isPending ? "Removing..." : "Delete Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: SERVICE TARIFF ADD / EDIT */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service Tariff" : "Add Service Tariff"}
            </DialogTitle>
            <DialogDescription>
              Configure fee schedules for consultations, hospital stays, and administrative services.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveServiceMutation.mutate({
                serviceCode: serviceForm.serviceCode,
                serviceName: serviceForm.serviceName,
                category: serviceForm.category,
                price: serviceForm.price,
                isActive: serviceForm.isActive,
                ...(editingService?.id ? { serviceId: editingService.id } : {}),
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="srv-name" className="text-xs font-semibold">
                Service Name *
              </Label>
              <Input
                id="srv-name"
                required
                placeholder="e.g. General OPD Consultation"
                value={serviceForm.serviceName}
                onChange={(e) => setServiceForm({ ...serviceForm, serviceName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="srv-code" className="text-xs font-semibold">
                  Service Code *
                </Label>
                <Input
                  id="srv-code"
                  required
                  placeholder="e.g. CNS-GEN, BED-GEN"
                  value={serviceForm.serviceCode}
                  onChange={(e) => setServiceForm({ ...serviceForm, serviceCode: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="srv-cat" className="text-xs font-semibold">
                  Category
                </Label>
                <Select
                  value={serviceForm.category}
                  onValueChange={(val) => setServiceForm({ ...serviceForm, category: val })}
                >
                  <SelectTrigger id="srv-cat">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Admission">Admission & Bed</SelectItem>
                    <SelectItem value="Nursing">Nursing Procedure</SelectItem>
                    <SelectItem value="Registration">Registration & Card</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="Surgery">Surgery / Procedure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="srv-price" className="text-xs font-semibold">
                Standard Tariff Fee (₦) *
              </Label>
              <Input
                id="srv-price"
                type="number"
                min="0"
                step="50"
                required
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">Active Tariff</p>
                <p className="text-xs text-slate-500">Available for selection in consultations and billing</p>
              </div>
              <Switch
                checked={serviceForm.isActive}
                onCheckedChange={(checked) => setServiceForm({ ...serviceForm, isActive: checked })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setServiceModalOpen(false)}
                disabled={saveServiceMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveServiceMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {saveServiceMutation.isPending ? "Saving..." : "Save Tariff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: LAB TEST EDIT */}
      <Dialog open={labModalOpen} onOpenChange={setLabModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Laboratory Investigation Tariff</DialogTitle>
            <DialogDescription>
              {editingLabTest?.testName} ({editingLabTest?.testCode})
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingLabTest) {
                updateLabMutation.mutate({
                  testId: editingLabTest.id,
                  price: labForm.price,
                  isAvailable: labForm.isAvailable,
                });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="lab-price" className="text-xs font-semibold">
                Investigation Price (₦) *
              </Label>
              <Input
                id="lab-price"
                type="number"
                min="0"
                step="50"
                required
                value={labForm.price}
                onChange={(e) => setLabForm({ ...labForm, price: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">Available In-House</p>
                <p className="text-xs text-slate-500">Enable if diagnostic reagents and equipment are active</p>
              </div>
              <Switch
                checked={labForm.isAvailable}
                onCheckedChange={(checked) => setLabForm({ ...labForm, isAvailable: checked })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLabModalOpen(false)}
                disabled={updateLabMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateLabMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {updateLabMutation.isPending ? "Saving..." : "Update Lab Tariff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
