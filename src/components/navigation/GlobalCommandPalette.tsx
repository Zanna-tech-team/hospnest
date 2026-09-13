import React, { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRightLeft,
  Baby,
  Bed,
  Building2,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  HeartPulse,
  Hospital,
  IdCard,
  LayoutDashboard,
  Package,
  Pill,
  PlusCircle,
  Scan,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface GlobalCommandPaletteProps {
  open?: boolean | undefined;
  onOpenChange?: (open: boolean) => void;
}

export function GlobalCommandPalette({
  open: externalOpen,
  onOpenChange: setExternalOpen,
}: GlobalCommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const navigate = useNavigate();

  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : internalOpen;
  const setOpen = (openState: boolean) => {
    if (isControlled && setExternalOpen) {
      setExternalOpen(openState);
    } else {
      setInternalOpen(openState);
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen]);

  const runAction = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command, route, or quick clinical action..." />
      <CommandList className="max-h-[380px] overflow-y-auto">
        <CommandEmpty>No matching clinical commands or routes found.</CommandEmpty>

        {/* Quick Clinical Actions */}
        <CommandGroup heading="⚡ Quick Clinical Actions">
          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/front-desk" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-teal-500/10 text-teal-600">
              <IdCard className="size-3.5" />
            </div>
            <span className="font-semibold text-xs">NIN Patient Intake & Check-In</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/appointments" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
              <Calendar className="size-3.5" />
            </div>
            <span className="font-semibold text-xs">Book / View Outpatient Appointments</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/triage" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
              <Activity className="size-3.5" />
            </div>
            <span className="font-semibold text-xs">Capture Vitals & NEWS2 Assessment</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/consultations" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600">
              <Stethoscope className="size-3.5" />
            </div>
            <span className="font-semibold text-xs">Doctor Clinical Consultation & E-Prescribing</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/admissions" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-purple-500/10 text-purple-600">
              <Bed className="size-3.5" />
            </div>
            <span className="font-semibold text-xs">Inpatient Ward Rounds & MAR Administration</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/radiology" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600">
              <Scan className="size-3.5" />
            </div>
            <span className="font-semibold text-xs">Radiology DICOM Imaging & X-Ray Reports</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/lab" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
              <FlaskConical className="size-3.5" />
            </div>
            <span className="font-semibold text-xs">Laboratory Diagnostics & Panic Values</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/pharmacy" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-rose-500/10 text-rose-600">
              <Pill className="size-3.5" />
            </div>
            <span className="font-semibold text-xs">Pharmacy Dispensary & Barcode POS</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/billing" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
              <CreditCard className="size-3.5" />
            </div>
            <span className="font-semibold text-xs">Generate Invoices & HMO Insurance Claims</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/maternity" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-teal-500/10 text-teal-600">
              <Baby className="size-3.5" />
            </div>
            <span className="font-semibold text-xs">Maternity ANC Register & Labor Partograph</span>
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Clinical & Departmental Routes */}
        <CommandGroup heading="🏥 Clinical Departments & Wards">
          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/dashboard" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <LayoutDashboard className="size-4 text-muted-foreground" />
            <span className="text-xs">Clinical Operations Dashboard</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/patients" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <User className="size-4 text-muted-foreground" />
            <span className="text-xs">Master Patient Index & Medical Records</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/wards" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <Building2 className="size-4 text-muted-foreground" />
            <span className="text-xs">Wards & Bed Capacity Matrix</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/transfers" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <ArrowRightLeft className="size-4 text-muted-foreground" />
            <span className="text-xs">Inter-Facility Patient Transfers & Referrals</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/maternity" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <Baby className="size-4 text-muted-foreground" />
            <span className="text-xs">Maternity, ANC & Child Immunization Register</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/pharmacy/inventory" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <Package className="size-4 text-muted-foreground" />
            <span className="text-xs">Pharmacy Drug Inventory & Batch Control</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Governance, Administration & Analytics */}
        <CommandGroup heading="⚙️ Administration, Audit & Governance">
          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/team" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <Users className="size-4 text-muted-foreground" />
            <span className="text-xs">Staff Roster & MDCN Practitioner Licensing</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/reports" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <FileSpreadsheet className="size-4 text-muted-foreground" />
            <span className="text-xs">HMIS Clinical Reports & Financial Analytics</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/audit" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <ShieldCheck className="size-4 text-muted-foreground" />
            <span className="text-xs">Immutable NDPR Security & Clinical Audit Ledger</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runAction(() => navigate({ to: "/settings" }))}
            className="flex items-center gap-2.5 cursor-pointer py-2"
          >
            <Settings className="size-4 text-muted-foreground" />
            <span className="text-xs">Hospital Facility Configuration & Department Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
