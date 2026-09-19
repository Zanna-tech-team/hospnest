import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HeartPulse,
  Hospital,
  Key,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import type { AppShellData } from "@/lib/auth-shell.functions";
import type { StaffRole } from "@/lib/team.functions";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shellData?: AppShellData | undefined;
  currentRole?: StaffRole | "patient";
  onSignOut?: () => void;
}

const ROLE_META: Record<StaffRole | "patient", { label: string; bg: string; text: string; border: string; desc: string }> = {
  super_admin: {
    label: "Super Admin",
    bg: "bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500/30",
    desc: "National System Administrator with global oversight and regulatory controls.",
  },
  hospital_admin: {
    label: "Hospital Admin",
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
    desc: "Facility Medical Director & Chief Administrator with full institutional management.",
  },
  doctor: {
    label: "Medical Practitioner (Doctor)",
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-500/30",
    desc: "Licensed MDCN Physician authorized for consultations, admissions, and e-prescribing.",
  },
  nurse: {
    label: "Clinical Nurse",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    desc: "Registered Nurse authorized for vitals triage, desk intake, and inpatient care.",
  },
  lab_tech: {
    label: "Laboratory Medical Scientist",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    desc: "Licensed Laboratory Scientist authorized for diagnostics, specimen processing, and lab panic alerts.",
  },
  pharmacist: {
    label: "Hospital Pharmacist",
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
    desc: "Licensed Pharmacist authorized for prescription validation, drug dispensing, and inventory batch control.",
  },
  patient: {
    label: "Verified Patient",
    bg: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/30",
    desc: "Verified Patient with longitudinal health record access and digital consent governance.",
  },
};

export function UserProfileModal({
  open,
  onOpenChange,
  shellData: propsShellData,
  currentRole: propsCurrentRole,
  onSignOut: propsOnSignOut,
}: UserProfileModalProps) {
  const auth = useAuth();
  const shellData = propsShellData || auth.shellData;
  const currentRole = propsCurrentRole || auth.role || (auth.isPatient ? "patient" : auth.isSuperAdmin ? "super_admin" : null);
  const onSignOut = propsOnSignOut || auth.signOut;

  const profile = shellData?.profileDetails || auth.profile;
  const user = shellData?.user || auth.user;
  const activeHospital = shellData?.activeWorkplace || auth.activeWorkplace;
  const roleInfo = (currentRole && ROLE_META[currentRole]) || {
    label: currentRole ? currentRole.replace("_", " ").toUpperCase() : "Clinical Member",
    bg: "bg-muted",
    text: "text-foreground",
    border: "border-border",
    desc: "Authenticated HospNest Platform Member",
  };

  const displayName = profile?.fullName || user?.fullName || "Staff Member";
  const displayEmail = profile?.email || user?.email || "user@hospnest.org";
  const initial = displayName.charAt(0).toUpperCase() || "U";
  const permissions = shellData?.modulePermissions || auth.modulePermissions || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-border bg-card">
        {/* Top Header Card with Gradient */}
        <div className="bg-gradient-to-r from-teal-600/15 via-emerald-600/10 to-card p-6 border-b border-border/70 relative">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-display text-2xl font-bold shadow-md ring-4 ring-background">
              {initial}
            </div>
            <div className="space-y-1 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-bold text-foreground truncate">
                  {displayName}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}
                >
                  <ShieldCheck className="size-3 mr-1 inline" />
                  {roleInfo.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="size-3.5 shrink-0" />
                <span>{displayEmail}</span>
              </p>
              {profile?.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0" />
                  <span>{profile.phone}</span>
                </p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground mt-3 bg-background/80 p-2.5 rounded-xl border border-border/60">
            {roleInfo.desc}
          </p>
        </div>

        {/* Content Details Grid */}
        <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto scrollbar-thin">
          {/* Facility & Department Info */}
          <div className="rounded-2xl border border-border/80 bg-secondary/20 p-4 space-y-2.5 text-xs">
            <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              <Hospital className="size-4 text-teal-600" />
              Assigned Facility & Department
            </h4>
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
              <div>
                <span className="text-[11px] text-muted-foreground block">Hospital:</span>
                <span className="font-semibold text-foreground truncate block">
                  {activeHospital?.name || "National Platform"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Department:</span>
                <span className="font-semibold text-foreground truncate block">
                  {profile?.departmentName || "General Services"}
                </span>
              </div>
            </div>
          </div>

          {/* Credentials / Professional Verification (If Doctor, Nurse, Staff) */}
          {currentRole !== "patient" && (
            <div className="rounded-2xl border border-border/80 bg-secondary/20 p-4 space-y-2.5 text-xs">
              <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Stethoscope className="size-4 text-teal-600" />
                Professional Credentials & Licensing
              </h4>
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Specialization:</span>
                  <span className="font-semibold text-foreground">
                    {profile?.specialization || "Clinical Officer"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">License / Reg Number:</span>
                  <span className="font-mono font-bold text-foreground">
                    {profile?.licenseNumber || `MDCN-${profile?.id?.slice(0, 6).toUpperCase() || "VERIFIED"}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Patient Health Info (If Patient) */}
          {currentRole === "patient" && (
            <div className="rounded-2xl border border-border/80 bg-secondary/20 p-4 space-y-2.5 text-xs">
              <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <HeartPulse className="size-4 text-teal-600" />
                Verified Patient Identity
              </h4>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
                <div>
                  <span className="text-[11px] text-muted-foreground block">NIN:</span>
                  <span className="font-mono font-bold text-foreground">
                    {profile?.nin ? `${profile.nin.slice(0, 3)}••••${profile.nin.slice(-3)}` : "Verified"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Blood Group:</span>
                  <span className="font-bold text-rose-600">
                    {profile?.bloodGroup || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Genotype:</span>
                  <span className="font-bold text-purple-600">
                    {profile?.genotype || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Authorized Module Access Rights */}
          <div className="rounded-2xl border border-border/80 bg-background p-4 space-y-2 text-xs">
            <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              <Key className="size-3.5 text-teal-600" />
              Role Access Scope & Module Authorization
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Your side panel and clinical features are isolated strictly to your licensed scope of practice.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="secondary" className="text-[10px] font-medium">
                {roleInfo.label}
              </Badge>
              {permissions.map((perm, i) => (
                <Badge key={i} variant="outline" className="text-[10px] capitalize">
                  {perm.replace("_", " ")}
                </Badge>
              ))}
              <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-500/10 border-emerald-500/20">
                Active Session
              </Badge>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
          >
            <LogOut className="mr-1.5 size-3.5" /> Sign Out
          </Button>

          <div className="flex items-center gap-2">
            {currentRole === "patient" && (
              <Button
                asChild
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                onClick={() => onOpenChange(false)}
              >
                <Link to="/portal">
                  <HeartPulse className="mr-1.5 size-3.5" /> My Health Portal
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
