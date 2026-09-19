import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  IdCard,
  Lock,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  Users,
} from "lucide-react";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAppShell } from "@/components/layout/AppShell";
import {
  getPatientsDirectory,
  type PatientDirectoryItem,
} from "@/lib/patients.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const title = "Patient Directory — HospNest";
const description =
  "Search and access national patient records, visit histories, and active consents.";

export const Route = createFileRoute("/_authenticated/patients/")({
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
  component: PatientsDirectoryPage,
});

function PatientsDirectoryPage() {
  const { activeHospitalId } = useAppShell();
  const getPatientsFn = useServerFn(getPatientsDirectory);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "visited" | "consent" | "open_visit">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["patients-directory", activeHospitalId, search, filter, page],
    queryFn: () =>
      getPatientsFn({
        data: {
          hospitalId: activeHospitalId || undefined,
          search: search || undefined,
          filter,
          page,
          pageSize,
        },
      }),
    enabled: Boolean(activeHospitalId),
  });

  return (
    <RoleGuard
      allowedRoles={["doctor", "nurse", "hospital_admin", "super_admin"]}
      requiredPermission="patients"
      fallbackTitle="Patient Directory Restricted"
      fallbackMessage="Patient health directories, electronic medical records, and national histories are restricted to licensed clinical staff and hospital administrators."
    >
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Patient Directory
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Search universal NIN-linked patient files across consultations, admissions, and consents.
          </p>
        </div>

        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link to="/front-desk">
            <IdCard className="mr-2 size-4" /> Enrol New Walk-In
          </Link>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name, 11-digit NIN, or phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-card"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="size-4 text-muted-foreground" />
          <Select
            value={filter}
            onValueChange={(v: "all" | "visited" | "consent" | "open_visit") => {
              setFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48 bg-card text-xs font-medium">
              <SelectValue placeholder="Filter Patients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Linked Patients</SelectItem>
              <SelectItem value="open_visit">Active Open Visits</SelectItem>
              <SelectItem value="visited">Visited This Hospital</SelectItem>
              <SelectItem value="consent">Active Consents</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <span className="size-2 animate-ping rounded-full bg-primary" />
              Loading patient records…
            </div>
          </div>
        ) : !data || data.patients.length === 0 ? (
          <div className="p-16 text-center">
            <User className="mx-auto size-12 text-muted-foreground/40" />
            <h3 className="mt-3 font-display text-base font-semibold text-foreground">
              No patient records found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || filter !== "all"
                ? "Try adjusting your search criteria or filter."
                : "Look up and check in patients from the Front Desk to link them to this hospital."}
            </p>
            <Button asChild variant="outline" className="mt-4 text-xs">
              <Link to="/front-desk">Go to Front Desk Intake</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5">Patient Name</th>
                  <th className="px-6 py-3.5">Universal NIN</th>
                  <th className="px-6 py-3.5">Age & Gender</th>
                  <th className="px-6 py-3.5">Contact Phone</th>
                  <th className="px-6 py-3.5">Visit History</th>
                  <th className="px-6 py-3.5">Status / Consent</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.patients.map((p: PatientDirectoryItem) => (
                  <tr
                    key={p.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        <Link to="/patients/$patientId" params={{ patientId: p.id }}>
                          {p.fullName}
                        </Link>
                      </div>
                      {p.bloodGroup && (
                        <span className="text-xs text-muted-foreground">
                          Blood Group: {p.bloodGroup}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        {p.isNinMasked ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground" title="NIN partially masked for non-clinical role">
                            <Lock className="size-3 text-amber-500" /> {p.nin}
                          </span>
                        ) : (
                          <span className="text-foreground">{p.nin}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{p.age}</span> • {p.gender}
                    </td>

                    <td className="px-6 py-4 text-xs text-muted-foreground font-mono">
                      {p.phone || "—"}
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-foreground">
                        {p.visitCount} {p.visitCount === 1 ? "visit" : "visits"}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Last: {p.lastVisitDate ? new Date(p.lastVisitDate).toLocaleDateString() : "—"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {p.hasOpenVisit ? (
                          <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 text-[11px]">
                            <span className="mr-1.5 size-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Open Visit ({p.openVisitStatus || "Active"})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[11px]">
                            No active visit
                          </Badge>
                        )}

                        {p.hasConsent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal">
                            <ShieldCheck className="size-3" /> Active Consent
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs">
                        <Link to="/patients/$patientId" params={{ patientId: p.id }}>
                          View Profile
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4 text-xs text-muted-foreground">
            <div>
              Showing page <span className="font-bold text-foreground">{data.page}</span> of{" "}
              <span className="font-bold text-foreground">{data.totalPages}</span> (
              {data.totalCount} total patients)
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="mr-1 size-3.5" /> Previous
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={page >= data.totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                className="h-8 px-2.5"
              >
                Next <ChevronRight className="ml-1 size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </RoleGuard>
  );
}
