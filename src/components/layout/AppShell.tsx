import { useState, createContext, useContext } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowRightLeft,
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
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getAppShellData, type AppShellData, type Workplace } from "@/lib/auth-shell.functions";
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
  patient: { label: "Patient", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30", badge: "bg-cyan-500" },
};

type NavItem = {
  label: string;
  href: string;
  icon: any;
  roles?: StaffRole[];
  patientOnly?: boolean;
  category?: "core" | "clinical" | "operations" | "admin";
  badge?: string;
};

const NAVIGATION_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    category: "core",
  },
  {
    label: "My Health Portal",
    href: "/portal",
    icon: HeartPulse,
    patientOnly: true,
    category: "core",
  },
  {
    label: "Front Desk Intake",
    href: "/front-desk",
    icon: IdCard,
    category: "clinical",
  },
  {
    label: "Appointments & Scheduling",
    href: "/appointments",
    icon: Calendar,
    category: "clinical",
  },
  {
    label: "Patients Directory",
    href: "/patients",
    icon: User,
    category: "clinical",
  },
  {
    label: "Triage & Vitals",
    href: "/triage",
    icon: Activity,
    category: "clinical",
  },
  {
    label: "Consultations",
    href: "/consultations",
    icon: Stethoscope,
    category: "clinical",
  },
  {
    label: "Ward & Inpatients",
    href: "/wards",
    icon: Bed,
    category: "clinical",
  },
  {
    label: "Patient Transfers",
    href: "/transfers",
    icon: ArrowRightLeft,
    category: "clinical",
  },
  {
    label: "Radiology & Imaging",
    href: "/radiology",
    icon: Scan,
    category: "operations",
  },
  {
    label: "Laboratory",
    href: "/lab",
    icon: FlaskConical,
    category: "operations",
  },
  {
    label: "Pharmacy Dispensary",
    href: "/pharmacy",
    icon: Pill,
    category: "operations",
  },
  {
    label: "Drug Inventory",
    href: "/pharmacy/inventory",
    icon: Package,
    category: "operations",
  },
  {
    label: "Billing & Claims",
    href: "/billing",
    icon: CreditCard,
    category: "operations",
  },
  {
    label: "Staff & Roster",
    href: "/team",
    icon: Users,
    roles: ["hospital_admin", "super_admin"],
    category: "admin",
  },
  {
    label: "Reports & Analytics",
    href: "/reports",
    icon: FileSpreadsheet,
    roles: ["hospital_admin", "super_admin"],
    category: "admin",
  },
  {
    label: "Audit Ledger",
    href: "/audit",
    icon: ShieldCheck,
    roles: ["hospital_admin", "super_admin"],
    category: "admin",
  },
  {
    label: "Hospital Settings",
    href: "/settings",
    icon: Settings,
    category: "admin",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const shellFn = useServerFn(getAppShellData);
  const { data: shellData, isLoading } = useQuery({
    queryKey: ["app-shell-data", selectedHospitalId],
    queryFn: () => shellFn({ data: { hospitalId: selectedHospitalId || undefined } }),
  });

  const activeHospitalId = selectedHospitalId || shellData?.activeWorkplace?.hospitalId || "";
  const isPatientUser = Boolean(shellData?.isPatient);
  const hasStaffWorkplaces = (shellData?.workplaces?.length ?? 0) > 0;
  const currentRole = shellData?.activeWorkplace?.role || (isPatientUser ? "patient" : "doctor");
  const isAdmin = shellData?.isAdmin || false;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  // Filter navigation items by role
  const visibleNavItems = NAVIGATION_ITEMS.filter((item) => {
    if (item.patientOnly) {
      return isPatientUser || !hasStaffWorkplaces;
    }
    if (!hasStaffWorkplaces && isPatientUser) {
      return false;
    }
    if (!item.roles) return true;
    return item.roles.includes(currentRole as StaffRole) || (isAdmin && item.roles.includes("hospital_admin"));
  });

  const roleMeta = ROLE_DISPLAY[currentRole] || {
    label: currentRole,
    color: "bg-muted text-foreground border-border",
    badge: "bg-teal-500",
  };

  // Determine current active page label for breadcrumb
  const currentNav = visibleNavItems.find(
    (item) => item.href === currentPath || (item.href !== "/" && currentPath.startsWith(item.href)),
  );
  const currentTitle = currentNav?.label || "Workspace";

  return (
    <AppShellContext.Provider
      value={{
        activeHospitalId,
        setActiveHospitalId: setSelectedHospitalId,
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

          {/* Hospital Workspace Switcher */}
          <div className="p-3 border-b border-border/60">
            {isLoading ? (
              <div className="h-10 animate-pulse rounded-xl bg-muted" />
            ) : isCollapsed ? (
              <div
                className="flex size-10 mx-auto items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 font-bold text-xs"
                title={shellData?.activeWorkplace?.name || "Active Hospital"}
              >
                <Building2 className="size-4" />
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
                      onClick={() => setSelectedHospitalId(w.hospitalId)}
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
            {!isCollapsed && (
              <p className="px-3 pb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Clinical Modules
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
          </nav>

          {/* Footer & Expand/Collapse Trigger */}
          <div className="border-t border-border/70 p-3 space-y-2">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2">
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
              <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/60 p-2.5 shadow-2xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white font-display text-xs font-bold shadow-xs">
                    {shellData?.user?.fullName?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-xs font-bold text-foreground">
                      {shellData?.user?.fullName || "Staff Member"}
                    </p>
                    <span
                      className={`inline-block truncate rounded-md border px-1.5 py-0.2 text-[9px] font-bold uppercase ${roleMeta.color}`}
                    >
                      {roleMeta.label}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg shrink-0"
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
                  <Button variant="ghost" size="icon" className="size-8 rounded-full border border-border bg-teal-600 text-white font-bold text-xs shadow-xs">
                    {shellData?.user?.fullName?.charAt(0).toUpperCase() || "U"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs">
                    <p className="font-bold text-foreground">{shellData?.user?.fullName || "Staff Member"}</p>
                    <p className="text-[10px] text-muted-foreground font-normal">{roleMeta.label}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="text-xs cursor-pointer">
                      <Settings className="mr-2 size-3.5" /> Settings & Facility
                    </Link>
                  </DropdownMenuItem>
                  {isPatientUser && (
                    <DropdownMenuItem asChild>
                      <Link to="/portal" className="text-xs cursor-pointer">
                        <HeartPulse className="mr-2 size-3.5 text-teal-600" /> Health Portal
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
              {(shellData?.workplaces?.length ?? 0) > 1 && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Active Hospital</Label>
                  <Select
                    value={activeHospitalId}
                    onValueChange={(v) => {
                      setSelectedHospitalId(v);
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
                <div className="text-xs">
                  <p className="font-bold text-foreground">{shellData?.user?.fullName}</p>
                  <p className="text-[11px] text-muted-foreground">{roleMeta.label}</p>
                </div>
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
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
