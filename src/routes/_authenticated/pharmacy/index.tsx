import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Pill,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  Receipt,
  User,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getPharmacyDispensingQueue,
  dispensePrescriptionOrder,
  type PharmacyDispensingPrescription,
  type PharmacyPrescriptionItem,
} from "@/lib/pharmacy.functions";

export const Route = createFileRoute("/_authenticated/pharmacy/")({
  component: PharmacyDispensingPage,
});

type FilterStatus = "all" | "pending" | "partially_dispensed" | "dispensed";

export function PharmacyDispensingPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("pending");
  const [onlyOutOfStock, setOnlyOutOfStock] = useState(false);

  // Active prescription modal state
  const [selectedRx, setSelectedRx] = useState<PharmacyDispensingPrescription | null>(null);
  const [isDispenseDialogOpen, setIsDispenseDialogOpen] = useState(false);
  const [dispenseItemsState, setDispenseItemsState] = useState<
    Record<
      string,
      {
        quantityToDispense: number;
        dispenseNotes: string;
      }
    >
  >({});

  const fetchQueueFn = useServerFn(getPharmacyDispensingQueue);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["pharmacy-dispensing-queue"],
    queryFn: () => fetchQueueFn({ data: {} }),
    refetchInterval: 15000, // live queue polling every 15s
  });

  const dispenseMutationFn = useServerFn(dispensePrescriptionOrder);
  const dispenseMutation = useMutation({
    mutationFn: (payload: {
      prescriptionId: string;
      encounterId: string;
      patientId: string;
      items: Array<{
        itemId: string;
        drugId: string;
        quantityToDispense: number;
        dispenseNotes?: string;
      }>;
    }) => dispenseMutationFn({ data: payload }),
    onSuccess: (res) => {
      toast.success("Medications dispensed successfully!", {
        description: `Prescription marked as ${res.prescriptionStatus}. Added ₦${res.chargesAdded.toLocaleString()} to patient billing.`,
      });
      setIsDispenseDialogOpen(false);
      setSelectedRx(null);
      queryClient.invalidateQueries({ queryKey: ["pharmacy-dispensing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
    },
    onError: (err: any) => {
      toast.error("Dispensing failed", {
        description: err?.message || "Could not complete medication dispensing.",
      });
    },
  });

  const prescriptions = data?.prescriptions ?? [];
  const counts = data?.counts ?? {
    pending: 0,
    partiallyDispensed: 0,
    dispensedToday: 0,
    outOfStockCount: 0,
    total: 0,
  };

  // Open Dispense Dialog and initialize item inputs
  const handleOpenDispenseModal = (rx: PharmacyDispensingPrescription) => {
    setSelectedRx(rx);
    const initialMap: Record<string, { quantityToDispense: number; dispenseNotes: string }> = {};

    rx.items.forEach((item) => {
      const remainingPrescribed = Math.max(0, item.quantityPrescribed - item.quantityDispensed);
      const maxAvailableToDispense = Math.min(remainingPrescribed, Math.max(0, item.stockAvailable));

      initialMap[item.id] = {
        quantityToDispense: maxAvailableToDispense,
        dispenseNotes: item.dispenseNotes || "",
      };
    });

    setDispenseItemsState(initialMap);
    setIsDispenseDialogOpen(true);
  };

  // Calculate total billing charges for current dispensing dialog
  const calculatedModalBilling = useMemo(() => {
    if (!selectedRx) return 0;
    let sum = 0;
    selectedRx.items.forEach((item) => {
      const state = dispenseItemsState[item.id];
      if (state && state.quantityToDispense > 0) {
        sum += state.quantityToDispense * item.unitPrice;
      }
    });
    return sum;
  }, [selectedRx, dispenseItemsState]);

  // Submit Dispense Action
  const handleConfirmDispense = () => {
    if (!selectedRx) return;

    const payloadItems: Array<{
      itemId: string;
      drugId: string;
      quantityToDispense: number;
      dispenseNotes?: string;
    }> = selectedRx.items.map((item) => {
      const state = dispenseItemsState[item.id] || { quantityToDispense: 0, dispenseNotes: "" };
      const trimmedNotes = state.dispenseNotes.trim();
      const itemObj: {
        itemId: string;
        drugId: string;
        quantityToDispense: number;
        dispenseNotes?: string;
      } = {
        itemId: item.id,
        drugId: item.drugId,
        quantityToDispense: state.quantityToDispense,
      };
      if (trimmedNotes) {
        itemObj.dispenseNotes = trimmedNotes;
      }
      return itemObj;
    });

    const hasAnyDispensed = payloadItems.some((i) => i.quantityToDispense > 0);
    if (!hasAnyDispensed) {
      toast.error("Quantity required", {
        description: "Please specify a quantity greater than 0 for at least one medication.",
      });
      return;
    }

    dispenseMutation.mutate({
      prescriptionId: selectedRx.id,
      encounterId: selectedRx.encounterId,
      patientId: selectedRx.patientId,
      items: payloadItems,
    });
  };

  // Filter queue
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((rx) => {
      // Status filter
      if (statusFilter !== "all" && rx.status !== statusFilter) {
        return false;
      }

      // Out of stock filter
      if (onlyOutOfStock && !rx.hasOutOfStockItem) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesPatient = rx.patientName.toLowerCase().includes(term);
        const matchesNin = rx.patientNin?.toLowerCase().includes(term);
        const matchesDoctor = rx.doctorName?.toLowerCase().includes(term);
        const matchesRxId = rx.id.toLowerCase().includes(term);
        const matchesDrug = rx.items.some(
          (i) =>
            i.genericName.toLowerCase().includes(term) ||
            i.brandName?.toLowerCase().includes(term) ||
            i.drugName.toLowerCase().includes(term)
        );
        return matchesPatient || matchesNin || matchesDoctor || matchesRxId || matchesDrug;
      }

      return true;
    });
  }, [prescriptions, statusFilter, onlyOutOfStock, searchTerm]);

  return (
    <RoleGuard
      allowedRoles={["pharmacist", "hospital_admin", "super_admin"]}
      requiredPermission="pharmacy"
      fallbackTitle="Pharmacy Dispensary Restricted"
      fallbackMessage="Access to outpatient and inpatient medication dispensing queues, stock verification, and drug batch fulfillment is restricted to licensed Pharmacists and Pharmacy Technicians."
    >
      <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              Phase 5: Pharmacy
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Dispensing Queue
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Pharmacy Dispensing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fulfill doctor prescriptions, verify stock levels, record partial dispensing reasons, and post medication charges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-border text-foreground hover:bg-muted"
          >
            <RefreshCw className={`mr-2 size-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
            Refresh Queue
          </Button>

          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Link to="/pharmacy/inventory">
              <Package className="mr-2 size-4" />
              Drug Inventory Catalog
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Pending Dispense */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("pending");
            setOnlyOutOfStock(false);
          }}
          className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
            statusFilter === "pending" && !onlyOutOfStock
              ? "border-amber-500 bg-amber-500/10 shadow-soft"
              : "border-border bg-card hover:border-amber-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Dispense
            </span>
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">
            {counts.pending}
          </div>
          <span className="text-xs text-muted-foreground">Awaiting pharmacist action</span>
        </button>

        {/* Partially Dispensed */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("partially_dispensed");
            setOnlyOutOfStock(false);
          }}
          className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
            statusFilter === "partially_dispensed" && !onlyOutOfStock
              ? "border-blue-500 bg-blue-500/10 shadow-soft"
              : "border-border bg-card hover:border-blue-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Partially Dispensed
            </span>
            <div className="rounded-lg bg-blue-500/20 p-2 text-blue-600 dark:text-blue-400">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">
            {counts.partiallyDispensed}
          </div>
          <span className="text-xs text-muted-foreground">Some items pending supply</span>
        </button>

        {/* Dispensed Today */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("dispensed");
            setOnlyOutOfStock(false);
          }}
          className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
            statusFilter === "dispensed" && !onlyOutOfStock
              ? "border-emerald-500 bg-emerald-500/10 shadow-soft"
              : "border-border bg-card hover:border-emerald-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Dispensed Today
            </span>
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">
            {counts.dispensedToday}
          </div>
          <span className="text-xs text-muted-foreground">Completed patient orders</span>
        </button>

        {/* Out of Stock Alert */}
        <button
          type="button"
          onClick={() => {
            setOnlyOutOfStock(!onlyOutOfStock);
          }}
          className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
            onlyOutOfStock
              ? "border-rose-500 bg-rose-500/10 shadow-soft"
              : "border-border bg-card hover:border-rose-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Stock Alerts
            </span>
            <div className="rounded-lg bg-rose-500/20 p-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">
            {counts.outOfStockCount}
          </div>
          <span className="text-xs text-muted-foreground">
            {onlyOutOfStock ? "Showing stock alerts" : "Filter out-of-stock orders"}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/60">
          <button
            onClick={() => setStatusFilter("pending")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === "pending"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => setStatusFilter("partially_dispensed")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === "partially_dispensed"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Partial ({counts.partiallyDispensed})
          </button>
          <button
            onClick={() => setStatusFilter("dispensed")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === "dispensed"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dispensed
          </button>
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === "all"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({counts.total})
          </button>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient, NIN, drug, doctor..."
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Prescriptions Worklist */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-16">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium text-foreground">Loading pharmacy dispensing queue...</p>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center">
          <Pill className="mx-auto size-12 text-muted-foreground/60" />
          <h3 className="mt-3 font-display text-base font-semibold text-foreground">
            No prescriptions found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            {searchTerm || statusFilter !== "all" || onlyOutOfStock
              ? "No prescriptions match your active search and filter criteria."
              : "All prescriptions for today have been fully dispensed. New doctor orders will appear here automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((rx) => {
            const hasPendingItems = rx.items.some((i) => i.quantityDispensed < i.quantityPrescribed);

            return (
              <div
                key={rx.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:border-primary/40"
              >
                {/* Prescription Card Header */}
                <div className="border-b border-border/60 bg-muted/20 px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                      {rx.queueNumber ? `#${rx.queueNumber}` : <User className="size-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: rx.patientId }}
                          className="font-display font-bold text-foreground hover:text-primary transition-colors text-base"
                        >
                          {rx.patientName}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          ({rx.patientAge ? `${rx.patientAge}y` : "Age N/A"} • {rx.patientGender || "N/A"})
                        </span>
                        {rx.patientNin && (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            NIN: {rx.patientNin}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Stethoscope className="size-3.5" />
                          Prescribed by: {rx.doctorName || "Doctor"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {new Date(rx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (
                          {new Date(rx.createdAt).toLocaleDateString()})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Action */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                        rx.status === "dispensed"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : rx.status === "partially_dispensed"
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {rx.status.replace("_", " ")}
                    </span>

                    {data?.canDispense && hasPendingItems && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenDispenseModal(rx)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                      >
                        <Pill className="mr-1.5 size-4" />
                        Dispense Items
                      </Button>
                    )}

                    {rx.status === "dispensed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDispenseModal(rx)}
                        className="text-muted-foreground"
                      >
                        <CheckCircle2 className="mr-1.5 size-4 text-emerald-500" />
                        View Record
                      </Button>
                    )}
                  </div>
                </div>

                {/* Patient Clinical Alerts Banner */}
                {(rx.allergies.length > 0 || rx.chronicConditions.length > 0) && (
                  <div className="border-b border-border/40 bg-rose-500/5 px-5 py-2 flex flex-wrap items-center gap-3 text-xs">
                    {rx.allergies.length > 0 && (
                      <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="size-3.5" />
                        <span>Allergies: {rx.allergies.join(", ")}</span>
                      </div>
                    )}
                    {rx.chronicConditions.length > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>• Chronic: {rx.chronicConditions.join(", ")}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Prescribed Items Table */}
                <div className="divide-y divide-border/40 px-5 py-3">
                  {rx.items.map((item) => {
                    const remaining = Math.max(0, item.quantityPrescribed - item.quantityDispensed);
                    const isFullyDispensed = remaining === 0;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 py-2.5 md:flex-row md:items-center md:justify-between text-xs"
                      >
                        {/* Drug Info */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{item.drugName}</span>
                            {item.dosageForm && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase">
                                {item.dosageForm}
                              </span>
                            )}
                            {item.strength && (
                              <span className="text-[11px] font-semibold text-primary">
                                {item.strength}
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground">
                            Instructions: <span className="text-foreground font-medium">{item.dosage || "Standard"}</span> •{" "}
                            {item.frequency ? `${item.frequency}` : ""} {item.duration ? `(${item.duration})` : ""}
                          </p>
                          {item.dispenseNotes && (
                            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 italic">
                              Dispense Note: {item.dispenseNotes}
                            </p>
                          )}
                        </div>

                        {/* Stock & Dispensed Metrics */}
                        <div className="flex flex-wrap items-center gap-3 md:justify-end">
                          {/* Stock status badge */}
                          {item.isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                              <AlertCircle className="size-3.5" />
                              Out of Stock (0 units)
                            </span>
                          ) : item.isLowStock ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                              Low Stock ({item.stockAvailable} units)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              In Stock ({item.stockAvailable} units)
                            </span>
                          )}

                          {/* Unit price */}
                          <span className="font-mono text-xs font-medium text-foreground">
                            ₦{item.unitPrice.toLocaleString()} / unit
                          </span>

                          {/* Quantity Progress */}
                          <div className="rounded-lg bg-muted/50 px-3 py-1 text-right font-mono">
                            <span className="font-bold text-foreground">
                              {item.quantityDispensed} / {item.quantityPrescribed}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-1">dispensed</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispensing Action Dialog */}
      <Dialog open={isDispenseDialogOpen} onOpenChange={setIsDispenseDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Pill className="size-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-xl font-bold text-foreground">
                  Dispense Prescription
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Prescription #{selectedRx?.id.slice(0, 8)} • Patient: {selectedRx?.patientName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedRx && (
            <div className="space-y-5 py-2">
              {/* Patient Banner */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-foreground">{selectedRx.patientName}</span>
                    <span className="text-muted-foreground ml-2">
                      Age: {selectedRx.patientAge || "N/A"} • Gender: {selectedRx.patientGender || "N/A"}
                    </span>
                    {selectedRx.patientNin && (
                      <span className="ml-2 font-mono text-muted-foreground">NIN: {selectedRx.patientNin}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    Doctor: <span className="font-semibold text-foreground">{selectedRx.doctorName || "Staff"}</span>
                  </span>
                </div>

                {/* Allergies Highlight */}
                {selectedRx.allergies.length > 0 && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-200 dark:border-rose-900 p-2.5 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                    <span>Patient Allergies: {selectedRx.allergies.join(", ")} — Verify compatibility before dispensing!</span>
                  </div>
                )}

                {selectedRx.notes && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Doctor's Clinical Notes:</span> {selectedRx.notes}
                  </div>
                )}
              </div>

              {/* Items Dispense Form */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Prescribed Medications to Dispense
                </h4>

                <div className="space-y-3">
                  {selectedRx.items.map((item) => {
                    const itemState = dispenseItemsState[item.id] || { quantityToDispense: 0, dispenseNotes: "" };
                    const remainingPrescribed = Math.max(0, item.quantityPrescribed - item.quantityDispensed);
                    const isPartial =
                      itemState.quantityToDispense > 0 && itemState.quantityToDispense < remainingPrescribed;

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs"
                      >
                        {/* Drug Title and Details */}
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between text-xs">
                          <div>
                            <span className="font-bold text-foreground text-sm">{item.drugName}</span>
                            <span className="text-muted-foreground ml-2">
                              {item.dosage || ""} {item.frequency ? `• ${item.frequency}` : ""} {item.duration ? `(${item.duration})` : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-muted-foreground">
                              Prescribed: <span className="font-bold text-foreground">{item.quantityPrescribed}</span>
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              Prev Dispensed: <span className="font-bold text-foreground">{item.quantityDispensed}</span>
                            </span>
                          </div>
                        </div>

                        {/* Stock status bar */}
                        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            {item.isOutOfStock ? (
                              <span className="font-bold text-rose-600 flex items-center gap-1">
                                <AlertCircle className="size-3.5" /> Out of stock (0 available)
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                Stock available: <span className="font-bold text-foreground">{item.stockAvailable} units</span>
                              </span>
                            )}
                            {item.batchNumber && (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                (Batch: {item.batchNumber})
                              </span>
                            )}
                          </div>

                          <span className="font-mono font-medium text-foreground">
                            ₦{item.unitPrice.toLocaleString()} / unit
                          </span>
                        </div>

                        {/* Dispense Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Qty to Dispense */}
                          <div>
                            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between mb-1">
                              <span>Quantity to Dispense Now</span>
                              <span className="text-muted-foreground font-mono">
                                Max: {Math.min(remainingPrescribed, Math.max(0, item.stockAvailable))}
                              </span>
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={Math.min(remainingPrescribed, Math.max(0, item.stockAvailable))}
                                value={itemState.quantityToDispense}
                                onChange={(e) => {
                                  const val = Math.max(
                                    0,
                                    Math.min(
                                      Number(e.target.value) || 0,
                                      Math.min(remainingPrescribed, Math.max(0, item.stockAvailable))
                                    )
                                  );
                                  setDispenseItemsState((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id]!,
                                      quantityToDispense: val,
                                    },
                                  }));
                                }}
                                className="h-9 font-mono text-sm font-bold"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const maxVal = Math.min(remainingPrescribed, Math.max(0, item.stockAvailable));
                                  setDispenseItemsState((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id]!,
                                      quantityToDispense: maxVal,
                                    },
                                  }));
                                }}
                                className="h-9 px-2.5 text-xs whitespace-nowrap"
                              >
                                Max Qty
                              </Button>
                            </div>
                          </div>

                          {/* Dispense Notes / Partial Reason */}
                          <div>
                            <label className="text-[11px] font-semibold text-foreground mb-1 block">
                              <span>Dispense Notes / Reason {isPartial && <span className="text-amber-500">*</span>}</span>
                            </label>
                            <Input
                              placeholder={isPartial ? "Reason for partial dispense (required)" : "Optional notes for patient"}
                              value={itemState.dispenseNotes}
                              onChange={(e) => {
                                const notesVal = e.target.value;
                                setDispenseItemsState((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id]!,
                                    dispenseNotes: notesVal,
                                  },
                                }));
                              }}
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>

                        {/* Calculated Line Charge */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 text-muted-foreground">
                          <span>
                            Dispensing <span className="font-bold text-foreground">{itemState.quantityToDispense}</span> units
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            Subtotal: ₦{(itemState.quantityToDispense * item.unitPrice).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Billing Summary Banner */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="size-5 text-primary" />
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Medication Charges to Invoice</h5>
                    <p className="text-[11px] text-muted-foreground">
                      Charges are automatically posted to encounter invoice #{selectedRx.encounterId.slice(0, 8)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Total Dispense Amount</span>
                  <div className="font-mono text-xl font-bold text-primary">
                    ₦{calculatedModalBilling.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDispenseDialogOpen(false)}
              disabled={dispenseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDispense}
              disabled={dispenseMutation.isPending || calculatedModalBilling === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
            >
              {dispenseMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                  Dispensing & Billing...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 size-4" />
                  Confirm & Dispense (₦{calculatedModalBilling.toLocaleString()})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </RoleGuard>
  );
}
