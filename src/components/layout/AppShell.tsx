import { useState, createContext, useContext } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  Bed,
  Building2,
  Calendar,
  Check,
  ChevronsUpDown,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  HeartPulse,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pill,
  Settings,
  ShieldCheck,
  Stethoscope,
  User,
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
};

const AppShellContext = createContext<AppShellContextType>({
  activeHospitalId: "",
  setActiveHospitalId: () => {},
  isLoading: false,
});

export const useAppShell = () => useContext(AppShellContext);

const ROLE_DISPLAY: Record<StaffRole | "patient", { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-100 text-purple-800 border-purple-200" },
  hospital_admin: { label: "Hospital Admin", color: "bg-blue-100 text-blue-800 border-blue-200" },
  doctor: { label: "Doctor", color: "bg-teal-100 text-teal-800 border-teal-200" },
  nurse: { label: "Nurse", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  lab_tech: { label: "Lab Tech", color: "bg-amber-100 text-amber-800 border-amber-200" },
  pharmacist: { label: "Pharmacist", color: "bg-rose-100 text-rose-800 border-rose-200" },
  patient: { label: "Patient", color: "bg-teal-50 text-teal-700 border-teal-300" },
};

type NavItem = {
  label: string;
  href: string;
  icon: any;
  roles?: StaffRole[]; // If specified, only these roles see it
  patientOnly?: boolean;
  isComingSoon?: boolean;
};

const NAVIGATION_ITEMS: NavItem[] = [
  {
    label: "Workspace Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Health Portal",
    href: "/portal",
    icon: HeartPulse,
    patientOnly: true,
  },
  {
    label: "Front Desk",
    href: "/front-desk",
    icon: IdCard,
  },
  {
    label: "Team & Roles",
    href: "/team",
    icon: Users,
    roles: ["hospital_admin", "super_admin"],
  },
  {
    label: "Patients Directory",
    href: "/patients",
    icon: User,
  },
  {
    label: "Triage & Vitals",
    href: "/triage",
    icon: Activity,
  },
  {
    label: "Consultations",
    href: "/consultations",
    icon: Stethoscope,
  },
  {
    label: "Ward & Beds",
    href: "/wards",
    icon: Bed,
  },
  {
    label: "Patient Transfers",
    href: "/transfers",
    icon: ArrowRightLeft,
  },
  {
    label: "Laboratory",
    href: "/lab",
    icon: FlaskConical,
  },
  {
    label: "Pharmacy",
    href: "/pharmacy",
    icon: Pill,
  },
  {
    label: "Drug Inventory",
    href: "/pharmacy/inventory",
    icon: Package,
  },
  {
    label: "Billing & Claims",
    href: "/billing",
    icon: CreditCard,
  },
  {
    label: "Reports & Exports",
    href: "/reports",
    icon: FileSpreadsheet,
    roles: ["hospital_admin", "super_admin"],
  },
  {
    label: "Audit Ledger",
    href: "/audit",
    icon: ShieldCheck,
    roles: ["hospital_admin", "super_admin"],
  },
  {
    label: "Hospital Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      return false; // Hide staff clinical modules for pure patient accounts
    }
    if (!item.roles) return true;
    return item.roles.includes(currentRole as StaffRole) || (isAdmin && item.roles.includes("hospital_admin"));
  });

  const roleMeta = ROLE_DISPLAY[currentRole] || {
    label: currentRole,
    color: "bg-gray-100 text-gray-800",
  };

  return (
    <AppShellContext.Provider
      value={{
        activeHospitalId,
        setActiveHospitalId: setSelectedHospitalId,
        shellData,
        isLoading,
      }}
    >
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-border bg-card lg:flex">
          {/* Brand Header */}
          <div className="flex h-16 items-center gap-3 border-b border-border px-5">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logo.url} alt="HospNest" className="size-8 rounded-lg object-contain" />
              <div className="flex flex-col">
                <span className="font-display text-base font-extrabold tracking-tight text-foreground">
                  Hosp<span className="text-teal">Nest</span>
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Hospital OS
                </span>
              </div>
            </Link>
          </div>

          {/* Hospital Switcher */}
          <div className="border-b border-border p-3">
            {isLoading ? (
              <div className="h-10 animate-pulse rounded-xl bg-muted" />
            ) : (shellData?.workplaces?.length ?? 0) > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex w-full items-center justify-between gap-2 px-3 text-left font-normal bg-background"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Building2 className="size-4 shrink-0 text-primary" />
                      <span className="truncate text-xs font-semibold">
                        {shellData?.activeWorkplace?.name || "Select Hospital"}
                      </span>
                    </div>
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Switch Hospital Workspace
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {shellData?.workplaces.map((w: Workplace) => (
                    <DropdownMenuItem
                      key={w.hospitalId}
                      onClick={() => setSelectedHospitalId(w.hospitalId)}
                      className="flex items-center justify-between text-xs font-medium"
                    >
                      <span className="truncate">{w.name}</span>
                      {w.hospitalId === activeHospitalId && (
                        <Check className="size-3.5 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/hospital-setup" className="text-xs text-primary font-semibold">
                      + Register another hospital
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : shellData?.activeWorkplace ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2">
                <Building2 className="size-4 text-primary shrink-0" />
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-bold text-foreground">
                    {shellData.activeWorkplace.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-mono">
                    {shellData.activeWorkplace.role}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-background p-2 text-xs text-muted-foreground text-center">
                No Hospital Attached
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            <p className="px-3 pb-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Modules
            </p>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href;

              if (item.isComingSoon) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground/60 cursor-not-allowed transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </div>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Sign Out Footer */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-2xl bg-secondary/40 p-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground font-display text-xs font-bold">
                {shellData?.user?.fullName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-bold text-foreground">
                  {shellData?.user?.fullName || "Staff Member"}
                </p>
                <span
                  className={`inline-block truncate rounded-full border px-2 py-0 text-[10px] font-semibold ${roleMeta.color}`}
                >
                  {roleMeta.label}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                onClick={handleSignOut}
                title="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Top Navigation & Drawer */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <img src={logo.url} alt="HospNest" className="size-7 rounded-md object-contain" />
                <span className="font-display text-base font-extrabold text-foreground">
                  Hosp<span className="text-teal">Nest</span>
                </span>
              </Link>
              {shellData?.activeWorkplace && (
                <span className="truncate rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground max-w-[140px]">
                  {shellData.activeWorkplace.name}
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </header>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="border-b border-border bg-card px-4 py-4 lg:hidden space-y-4">
              {/* Mobile Hospital Switcher */}
              {(shellData?.workplaces?.length ?? 0) > 1 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Active Hospital</Label>
                  <Select
                    value={activeHospitalId}
                    onValueChange={(v) => {
                      setSelectedHospitalId(v);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select Hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {shellData?.workplaces.map((w: Workplace) => (
                        <SelectItem key={w.hospitalId} value={w.hospitalId}>
                          {w.name} ({w.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Mobile Links */}
              <nav className="flex flex-col gap-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.href;

                  if (item.isComingSoon) {
                    return (
                      <div
                        key={item.href}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground/60"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="size-4" /> {item.label}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                          Coming soon
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="text-xs">
                  <p className="font-bold text-foreground">{shellData?.user?.fullName}</p>
                  <p className="text-muted-foreground">{roleMeta.label}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:bg-rose-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-1.5 size-3.5" /> Sign out
                </Button>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
