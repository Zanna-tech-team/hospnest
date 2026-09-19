import { useState, createContext, useContext } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  ArrowRightLeft,
  Baby,
  BarChart3,
  Bed,
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Hospital,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pill,
  Scan,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
  Mic,
  Crown,
  Globe,
} from "lucide-react";

import type { AppShellData, Workplace } from "@/lib/auth-shell.functions";
import type { StaffRole } from "@/lib/team.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalCommandPalette } from "@/components/navigation/GlobalCommandPalette";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { UserProfileModal } from "@/components/layout/UserProfileModal";
import logo from "@/assets/hospnest-logo.png.asset.json";

type AppShellContextType = {
  activeHospitalId: string;
  setActiveHospitalId: (id: string) => void;
  shellData?: AppShellData | undefined;
  isLoading: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
};

const AppShellContext = createContext<AppShellContextType>({
  activeHospitalId: "",
  setActiveHospitalId: () => {},
  isLoading: false,
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export const useAppShell = () => useContext(AppShellContext);

const ROLE_DISPLAY: Record<StaffRole | "patient", { label: string; color: string; badge: string }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30", badge: "bg-purple-500" },
  hospital_admin: { label: "Hospital Admin", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30", badge: "bg-blue-500" },
  doctor: { label: "Doctor", color: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30", badge: "bg-teal-500" },
  nurse: { label: "Nurse", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", badge: "bg-emerald-500" },
  lab_tech: { label: "Lab Tech", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30", badge: "bg-amber-500" },
  pharmacist: { label: "Pharmacist", color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30", badge: "bg-rose-500" },
  front_desk: { label: "Front Desk", color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30", badge: "bg-sky-500" },
  billing_officer: { label: "Billing Officer", color: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30", badge: "bg-orange-500" },
  patient: { label: "Patient", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30", badge: "bg-cyan-500" },
};

type NavItem = {
  label: string;
  href: string;
  icon: any;
  badge?: string | undefined;
  category?: "core" | "clinical" | "operations" | "admin" | undefined;
};

// 1. PATIENT NAVIGATION (Isolated strictly to patient features)
const PATIENT_NAVIGATION: NavItem[] = [
  { label: "My Health Portal", href: "/portal", icon: HeartPulse, category: "core" },
  { label: "Book Appointment", href: "/portal", icon: Calendar, category: "clinical" },
  { label: "My Prescriptions", href: "/portal", icon: Pill, category: "operations" },
  { label: "My Invoices & Bills", href: "/portal", icon: CreditCard, category: "operations" },
];

// 2. DOCTOR NAVIGATION (Isolated to clinical practice)
const DOCTOR_NAVIGATION: NavItem[] = [
  { label: "Clinical Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "core" },
  { label: "Consultations & SOAP", href: "/consultations", icon: Stethoscope, category: "clinical" },
  { label: "Patient Directory", href: "/patients", icon: User, category: "clinical" },
  { label: "Inpatient Admissions", href: "/admissions", icon: Bed, category: "clinical" },
  { label: "Maternity & ANC", href: "/maternity", icon: Baby, category: "clinical" },
  { label: "VoiceCare AI Assistant", href: "/voicecare", icon: Mic, badge: "VOICE", category: "core" },
];

// 3. NURSE NAVIGATION (Includes triage and patient intake deck)
const NURSE_NAVIGATION: NavItem[] = [
  { label: "Nursing Station", href: "/dashboard", icon: LayoutDashboard, category: "core" },
  { label: "Triage & Vitals Queue", href: "/triage", icon: Activity, category: "clinical" },
  { label: "Front Desk & Intake Deck", href: "/front-desk", icon: IdCard, category: "clinical" },
  { label: "Ward & Bed Management", href: "/wards", icon: Building2, category: "clinical" },
  { label: "Inpatient Admissions", href: "/admissions", icon: Bed, category: "clinical" },
  { label: "Patient Directory", href: "/patients", icon: User, category: "clinical" },
  { label: "Maternity & ANC", href: "/maternity", icon: Baby, category: "clinical" },
];

// 4. LAB TECHNICIAN NAVIGATION (Strictly laboratory diagnostics)
const LAB_TECH_NAVIGATION: NavItem[] = [
  { label: "Lab Diagnostic Hub", href: "/dashboard", icon: LayoutDashboard, category: "core" },
  { label: "Lab Worklist & Tests", href: "/lab", icon: FlaskConical, category: "operations" },
];

// 5. PHARMACIST NAVIGATION (Strictly dispensary & inventory)
const PHARMACIST_NAVIGATION: NavItem[] = [
  { label: "Pharmacy Operations", href: "/dashboard", icon: LayoutDashboard, category: "core" },
  { label: "Prescription Dispensary", href: "/pharmacy", icon: Pill, category: "operations" },
  { label: "Drug Inventory & Stock", href: "/pharmacy/inventory", icon: Package, category: "operations" },
];

// 6. FRONT DESK & INTAKE NAVIGATION (Strictly intake and appointments)
const FRONT_DESK_NAVIGATION: NavItem[] = [
  { label: "Front Desk Station", href: "/dashboard", icon: LayoutDashboard, category: "core" },
  { label: "Patient Intake Deck", href: "/front-desk", icon: IdCard, category: "clinical" },
  { label: "Appointments & Schedule", href: "/appointments", icon: Calendar, category: "clinical" },
  { label: "Patient Directory", href: "/patients", icon: User, category: "clinical" },
];

// 7. HOSPITAL ADMIN NAVIGATION (Full hospital management)
const HOSPITAL_ADMIN_NAVIGATION: NavItem[] = [
  { label: "Executive Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "core" },
  { label: "Front Desk Intake", href: "/front-desk", icon: IdCard, category: "clinical" },
  { label: "Appointments & Schedule", href: "/appointments", icon: Calendar, category: "clinical" },
  { label: "Patient Directory", href: "/patients", icon: User, category: "clinical" },
  { label: "Triage & Vitals", href: "/triage", icon: Activity, category: "clinical" },
  { label: "Consultations", href: "/consultations", icon: Stethoscope, category: "clinical" },
  { label: "Inpatient Admissions", href: "/admissions", icon: Bed, category: "clinical" },
  { label: "Wards & Bed Matrix", href: "/wards", icon: Building2, category: "clinical" },
  { label: "Maternity & ANC", href: "/maternity", icon: Baby, category: "clinical" },
  { label: "Patient Transfers", href: "/transfers", icon: ArrowRightLeft, category: "clinical" },
  { label: "Radiology & Imaging", href: "/radiology", icon: Scan, category: "operations" },
  { label: "Laboratory", href: "/lab", icon: FlaskConical, category: "operations" },
  { label: "Pharmacy Dispensary", href: "/pharmacy", icon: Pill, category: "operations" },
  { label: "Drug Inventory", href: "/pharmacy/inventory", icon: Package, category: "operations" },
  { label: "Billing & Claims", href: "/billing", icon: CreditCard, category: "operations" },
  { label: "Staff & Roster", href: "/team", icon: Users, category: "admin" },
  { label: "Reports & Analytics", href: "/reports", icon: FileSpreadsheet, category: "admin" },
  { label: "Audit Ledger", href: "/audit", icon: ShieldCheck, category: "admin" },
  { label: "Hospital Settings", href: "/settings", icon: Settings, category: "admin" },
];

// 8. SUPER ADMIN NAVIGATION
const SUPERADMIN_NAVIGATION_ITEMS: NavItem[] = [
  { label: "Global Command Center", href: "/superadmin", icon: LayoutDashboard, badge: "GLOBAL", category: "admin" },
  { label: "Hospitals & Clinics Network", href: "/superadmin?tab=hospitals", icon: Building2, badge: "NETWORK", category: "admin" },
  { label: "VoiceCare Platform & Labs", href: "/voicecare", icon: Mic, badge: "VOICE", category: "core" },
  { label: "Platform Users & Roles", href: "/superadmin?tab=users", icon: Users, category: "admin" },
  { label: "Emergency Break-Glass Ledger", href: "/superadmin?tab=breakglass", icon: ShieldAlert, badge: "OVERSIGHT", category: "admin" },
  { label: "Cryptographic Audit Ledger", href: "/superadmin?tab=audit", icon: ShieldCheck, badge: "SHA-256", category: "admin" },
  { label: "Platform Tiers & Policies", href: "/superadmin?tab=settings", icon: Settings, category: "admin" },
];

const DELEGATED_MODULE_LOOKUP: Record<string, NavItem> = {
  front_desk: { label: "Front Desk Intake", href: "/front-desk", icon: IdCard, category: "clinical" },
  appointments: { label: "Appointments", href: "/appointments", icon: Calendar, category: "clinical" },
  patients: { label: "Patient Directory", href: "/patients", icon: User, category: "clinical" },
  triage: { label: "Triage & Vitals", href: "/triage", icon: Activity, category: "clinical" },
  consultations: { label: "Consultations", href: "/consultations", icon: Stethoscope, category: "clinical" },
  admissions: { label: "Inpatient Admissions", href: "/admissions", icon: Bed, category: "clinical" },
  wards: { label: "Wards & Bed Matrix", href: "/wards", icon: Building2, category: "clinical" },
  maternity: { label: "Maternity & ANC", href: "/maternity", icon: Baby, category: "clinical" },
  transfers: { label: "Patient Transfers", href: "/transfers", icon: ArrowRightLeft, category: "clinical" },
  radiology: { label: "Radiology & Imaging", href: "/radiology", icon: Scan, category: "operations" },
  lab: { label: "Laboratory", href: "/lab", icon: FlaskConical, category: "operations" },
  pharmacy: { label: "Pharmacy Dispensary", href: "/pharmacy", icon: Pill, category: "operations" },
  billing: { label: "Billing & Claims", href: "/billing", icon: CreditCard, category: "operations" },
  team: { label: "Staff & Roster", href: "/team", icon: Users, category: "admin" },
  voicecare: { label: "VoiceCare AI", href: "/voicecare", icon: Mic, badge: "VOICE", category: "core" },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [superadminInspectionMode, setSuperadminInspectionMode] = useState<boolean>(false);

  const {
    user,
    role,
    activeHospitalId,
    setActiveHospitalId,
    shellData,
    profile,
    workplaces,
    activeWorkplace,
    modulePermissions,
    isAdmin,
    isSuperAdmin,
    isPatient,
    isLoading,
    signOut,
  } = useAuth();

  const handleSignOut = signOut;

  // Strict role evaluation: NEVER fallback to "doctor"
  const currentRole = role || (isSuperAdmin ? "super_admin" : isAdmin ? "hospital_admin" : isPatient ? "patient" : null);

  // Determine if Super Admin is in Global View or inspecting a single hospital's clinical workspace
  const isGlobalSuperAdminView = isSuperAdmin && (!superadminInspectionMode || currentPath.startsWith("/superadmin") || currentPath.startsWith("/voicecare"));

  // Strictly isolated navigation based on role
  let visibleNavItems: NavItem[] = [];

  if (isLoading) {
    visibleNavItems = [];
  } else if (isPatient) {
    visibleNavItems = PATIENT_NAVIGATION;
  } else if (isGlobalSuperAdminView) {
    visibleNavItems = SUPERADMIN_NAVIGATION_ITEMS;
  } else if (isAdmin || currentRole === "hospital_admin") {
    visibleNavItems = HOSPITAL_ADMIN_NAVIGATION;
  } else if (currentRole === "doctor") {
    visibleNavItems = [...DOCTOR_NAVIGATION];
  } else if (currentRole === "nurse") {
    visibleNavItems = [...NURSE_NAVIGATION];
  } else if (currentRole === "lab_tech") {
    visibleNavItems = [...LAB_TECH_NAVIGATION];
  } else if (currentRole === "pharmacist") {
    visibleNavItems = [...PHARMACIST_NAVIGATION];
  } else if (currentRole === "front_desk") {
    visibleNavItems = [...FRONT_DESK_NAVIGATION];
  } else {
    visibleNavItems = [
      {
        label: "My Station",
        href: "/dashboard",
        icon: LayoutDashboard,
        category: "core",
      },
    ];
  }

  // Dynamic delegated permissions: If staff has module assigned by admin, append it if not already in list
  if (!isPatient && !isAdmin && !isSuperAdmin && modulePermissions.length > 0) {
    for (const perm of modulePermissions) {
      const extraItem = DELEGATED_MODULE_LOOKUP[perm];
      if (extraItem && !visibleNavItems.some((it) => it.href === extraItem.href)) {
        visibleNavItems.push(extraItem);
      }
    }
  }

  const roleMeta = (currentRole && ROLE_DISPLAY[currentRole]) || {
    label: currentRole ? currentRole.replace("_", " ").toUpperCase() : "Clinical Member",
    color: "bg-muted text-foreground border-border",
    badge: "bg-teal-500",
  };

  // Determine current active page label for breadcrumb
  const currentNav = visibleNavItems.find(
    (item) => item.href === currentPath || (item.href !== "/" && currentPath.startsWith(item.href)),
  );
  const currentTitle = isGlobalSuperAdminView && currentPath.startsWith("/superadmin")
    ? "National Platform Control Center"
    : currentNav?.label || (isPatient ? "Patient Health Portal" : "Workspace");

  return (
    <AppShellContext.Provider
      value={{
        activeHospitalId,
        setActiveHospitalId,
        shellData,
        isLoading,
        isCollapsed,
        setIsCollapsed,
      }}
    >
      <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-teal-500 selection:text-white">
        {/* ========================================================= */}
        {/* DESKTOP SIDEBAR (COLLAPSIBLE WITH SMOOTH TRANSITION)     */}
        {/* ========================================================= */}
        <aside
          className={`hidden lg:flex flex-col border-r border-border/80 bg-card/95 backdrop-blur-md transition-all duration-300 ease-in-out select-none relative z-40 ${
            isCollapsed ? "w-20" : "w-64"
          }`}
        >
          {/* Brand & Logo Header */}
          <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
            <Link to="/" className="flex items-center gap-3 group overflow-hidden">
              <img
                src={logo.url}
                alt="HospNest"
                className="size-9 shrink-0 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105"
              />
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden transition-opacity duration-200">
                  <span className="font-display text-base font-extrabold tracking-tight text-foreground leading-tight">
                    Hosp<span className="text-teal-600 dark:text-teal-400">Nest</span>
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
                    Hospital OS
                  </span>
                </div>
              )}
            </Link>

            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(true)}
                className="size-7 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            )}
          </div>

          {/* Hospital / Platform Workspace Switcher */}
          <div className="p-3 border-b border-border/60">
            {isLoading ? (
              <div className="h-10 animate-pulse rounded-xl bg-muted" />
            ) : isPatient ? (
              isCollapsed ? (
                <div
                  className="flex size-10 mx-auto items-center justify-center rounded-xl font-bold text-xs bg-teal-500/10 text-teal-600"
                  title="Patient Health Portal"
                >
                  <HeartPulse className="size-4" />
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 shadow-2xs">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
                    <HeartPulse className="size-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-xs font-bold text-foreground">
                      Personal Health
                    </p>
                    <p className="text-[9px] text-teal-700 dark:text-teal-300 uppercase font-mono tracking-wider">
                      PATIENT PORTAL
                    </p>
                  </div>
                </div>
              )
            ) : isCollapsed ? (
              <div
                className={`flex size-10 mx-auto items-center justify-center rounded-xl font-bold text-xs ${
                  isGlobalSuperAdminView
                    ? "bg-purple-500/10 text-purple-600"
                    : "bg-teal-500/10 text-teal-600"
                }`}
                title={isGlobalSuperAdminView ? "Superadmin Command Center" : (shellData?.activeWorkplace?.name || "Active Hospital")}
              >
                {isGlobalSuperAdminView ? <Crown className="size-4" /> : <Building2 className="size-4" />}
              </div>
            ) : isGlobalSuperAdminView ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 shadow-2xs">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                  <Crown className="size-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-bold text-foreground">
                    National Platform
                  </p>
                  <p className="text-[9px] text-purple-700 dark:text-purple-300 uppercase font-mono tracking-wider">
                    SUPERADMIN COMMAND
                  </p>
                </div>
              </div>
            ) : (shellData?.workplaces?.length ?? 0) > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-normal bg-background border-border/80 shadow-2xs hover:border-teal-500/40 rounded-xl h-auto"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                        <Building2 className="size-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="truncate text-xs font-bold text-foreground">
                          {shellData?.activeWorkplace?.name || "Select Hospital"}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize truncate">
                          {shellData?.activeWorkplace?.role || "Workspace"}
                        </p>
                      </div>
                    </div>
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60" align="start">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Switch Hospital Workspace
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {shellData?.workplaces.map((w: Workplace) => (
                    <DropdownMenuItem
                      key={w.hospitalId}
                      onClick={() => setActiveHospitalId(w.hospitalId)}
                      className="flex items-center justify-between text-xs font-medium py-2 cursor-pointer"
                    >
                      <div className="truncate">
                        <p className="font-semibold text-foreground truncate">{w.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{w.role}</p>
                      </div>
                      {w.hospitalId === activeHospitalId && (
                        <Check className="size-3.5 text-teal-600 shrink-0 ml-2" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/hospital-setup" className="text-xs text-teal-600 font-bold flex items-center gap-1.5 cursor-pointer">
                      <UserPlus className="size-3.5" /> Register Another Hospital
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : shellData?.activeWorkplace ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-background/80 px-3 py-2 shadow-2xs">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                  <Building2 className="size-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-bold text-foreground">
                    {shellData.activeWorkplace.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    {shellData.activeWorkplace.role}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/80 bg-background/50 p-2 text-xs text-muted-foreground text-center">
                National Portal
              </div>
            )}
          </div>

          {/* Navigation Links List */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4 scrollbar-thin">
            {isLoading ? (
              <div className="space-y-2 px-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 w-full rounded-xl bg-muted/60 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {!isCollapsed && (
                  <p className="px-3 pb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    {isGlobalSuperAdminView
                      ? "National Governance"
                      : isPatient
                      ? "Patient Health Records"
                      : "Clinical Modules"}
                  </p>
                )}
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? "bg-teal-600 text-white shadow-soft font-bold"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      } ${isCollapsed ? "justify-center px-2" : ""}`}
                    >
                      <Icon className={`size-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                      {isActive && !isCollapsed && (
                        <span className="ml-auto size-1.5 rounded-full bg-white animate-pulse" />
                      )}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Footer & Expand/Collapse Trigger */}
          <div className="border-t border-border/70 p-3 space-y-2">
            {isLoading ? (
              <div className="h-10 w-full bg-muted/60 rounded-xl animate-pulse" />
            ) : isCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="size-9 rounded-xl bg-teal-600 text-white font-display text-xs font-bold shadow-xs hover:bg-teal-700"
                  title="View Profile & Credentials"
                >
                  {shellData?.user?.fullName?.charAt(0).toUpperCase() || "U"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed(false)}
                  className="size-8 text-muted-foreground hover:text-foreground rounded-lg"
                  title="Expand Sidebar"
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="size-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                  title="Sign Out"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/60 p-2 shadow-2xs hover:border-teal-500/40 transition-colors">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-2.5 overflow-hidden text-left flex-1 hover:opacity-90 transition-opacity p-0.5 rounded-xl cursor-pointer"
                  title="Click to view full profile & credentials"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white font-display text-xs font-bold shadow-xs">
                    {shellData?.user?.fullName?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-xs font-bold text-foreground hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                      {shellData?.user?.fullName || (isPatient ? "Patient Member" : "Staff Member")}
                    </p>
                    <span
                      className={`inline-block truncate rounded-md border px-1.5 py-0.2 text-[9px] font-bold uppercase ${roleMeta.color}`}
                    >
                      {roleMeta.label}
                    </span>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg shrink-0 ml-1"
                  onClick={handleSignOut}
                  title="Sign Out"
                >
                  <LogOut className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* ========================================================= */}
        {/* MAIN APPLICATION CONTAINER (SYNCHRONIZED SCROLL & HEADER) */}
        {/* ========================================================= */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Synchronized Glassmorphism Top Navigation Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/85 backdrop-blur-xl px-4 sm:px-6 transition-all duration-200">
            {/* Left: Mobile Toggle / Breadcrumb / Live Status */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="size-8 lg:hidden text-foreground"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </Button>

              {/* Desktop Expand/Collapse button in Top Bar */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex size-8 text-muted-foreground hover:text-foreground rounded-lg"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              </Button>

              <div className="flex items-center gap-2 text-xs">
                <span className="hidden sm:inline font-semibold text-muted-foreground">
                  HospNest
                </span>
                <span className="hidden sm:inline text-muted-foreground/40">/</span>
                <span className="font-bold text-foreground">
                  {currentTitle}
                </span>
              </div>
            </div>

            {/* Right: Actions, Notifications, Role Badge & User Profile */}
            <div className="flex items-center gap-2.5">
              {/* Live Status Pill */}
              <div className="hidden md:flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-2xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Hospital OS Live</span>
              </div>

              {/* Quick Hospital Switcher Badge (Top Bar) */}
              {shellData?.activeWorkplace && (
                <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground">
                  <Building2 className="size-3.5 text-teal-600" />
                  <span className="truncate max-w-[150px]">{shellData.activeWorkplace.name}</span>
                </div>
              )}

              {/* Command Palette Trigger */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden sm:flex items-center gap-2 h-8 px-2.5 text-xs text-muted-foreground bg-muted/40 hover:bg-muted border-border/80 rounded-xl"
              >
                <Search className="size-3.5" />
                <span>Search</span>
                <kbd className="pointer-events-none hidden h-4.5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>

              {/* Live Real-time Hospital Notification Center */}
              <NotificationCenter hospitalId={activeHospitalId} />

              {/* User Role Badge */}
              <Badge
                variant="outline"
                className={`hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 ${roleMeta.color}`}
              >
                {roleMeta.label}
              </Badge>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 rounded-full border border-border bg-teal-600 text-white font-bold text-xs shadow-xs hover:bg-teal-700 cursor-pointer">
                    {shellData?.user?.fullName?.charAt(0).toUpperCase() || "U"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs">
                    <p className="font-bold text-foreground">{shellData?.user?.fullName || "Staff Member"}</p>
                    <p className="text-[10px] text-muted-foreground font-normal">{roleMeta.label}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)} className="text-xs cursor-pointer font-medium">
                    <UserCheck className="mr-2 size-3.5 text-teal-600" /> View Profile & Credentials
                  </DropdownMenuItem>
                  {(isAdmin || isSuperAdmin) && (
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="text-xs cursor-pointer">
                        <Settings className="mr-2 size-3.5" /> Settings & Facility
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isPatient && (
                    <DropdownMenuItem asChild>
                      <Link to="/portal" className="text-xs cursor-pointer">
                        <HeartPulse className="mr-2 size-3.5 text-teal-600" /> My Health Portal
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-xs text-rose-600 cursor-pointer">
                    <LogOut className="mr-2 size-3.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Mobile Drawer Navigation */}
          {mobileMenuOpen && (
            <div className="border-b border-border bg-card px-4 py-4 lg:hidden space-y-4 shadow-lift">
              {/* Mobile Hospital Switcher */}
              {!isPatient && (shellData?.workplaces?.length ?? 0) > 1 && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Active Hospital</Label>
                  <Select
                    value={activeHospitalId}
                    onValueChange={(v) => {
                      setActiveHospitalId(v);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <SelectTrigger className="w-full bg-background text-xs">
                      <SelectValue placeholder="Select Hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {shellData?.workplaces.map((w: Workplace) => (
                        <SelectItem key={w.hospitalId} value={w.hospitalId} className="text-xs">
                          {w.name} ({w.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <nav className="grid grid-cols-2 gap-1.5">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.href;

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold ${
                        isActive
                          ? "bg-teal-600 text-white font-bold shadow-xs"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="text-xs text-left hover:opacity-80 transition-opacity"
                >
                  <p className="font-bold text-foreground">{shellData?.user?.fullName}</p>
                  <p className="text-[11px] text-teal-600 font-semibold">{roleMeta.label} • View Profile</p>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:bg-rose-500/10 text-xs"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-1.5 size-3.5" /> Sign Out
                </Button>
              </div>
            </div>
          )}

          {/* Dynamic Page Content Viewport */}
          {isSuperAdmin && !isGlobalSuperAdminView && (
            <div className="bg-purple-950/80 border-b border-purple-500/40 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-purple-100 shadow-md">
              <div className="flex items-center gap-2">
                <Crown className="size-4 text-purple-400 shrink-0" />
                <span>
                  <strong>Superadmin Facility Inspection:</strong> You are viewing clinical workspace for{" "}
                  <strong className="text-white underline">{shellData?.activeWorkplace?.name || "Selected Facility"}</strong>
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSuperadminInspectionMode(false);
                  window.location.href = "/superadmin";
                }}
                className="h-7 text-[11px] bg-purple-600 hover:bg-purple-700 text-white font-semibold shrink-0"
              >
                Return to Global Command Center
              </Button>
            </div>
          )}
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>

      {/* Global User Profile & Credentials Modal */}
      <UserProfileModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        shellData={shellData}
        currentRole={currentRole as any}
        onSignOut={handleSignOut}
      />

      {/* Global Command Palette (⌘K / Ctrl+K) */}
      <GlobalCommandPalette open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen} />
    </AppShellContext.Provider>
  );
}
