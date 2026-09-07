import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  Filter,
  History,
  Layers,
  Loader2,
  Package,
  PackageCheck,
  PackagePlus,
  Pill,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPharmacyInventory,
  addOrRestockMedication,
  adjustInventoryStock,
  type PharmacyInventoryItem,
} from "@/lib/pharmacy.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pharmacy/inventory")({
  head: () => ({
    meta: [
      { title: "Pharmacy Inventory Management — HospNest" },
      { name: "description", content: "Hospital drug formulary, stock levels, reorder thresholds, near-expiry alerts, and stock movement logs." },
    ],
  }),
  component: PharmacyInventoryPage,
});

type FilterTab = "all" | "low_stock" | "near_expiry" | "expired" | "movements";

function PharmacyInventoryPage() {
  const { activeHospitalId } = useAppShell();
  const getInventoryFn = useServerFn(getPharmacyInventory);
  const restockFn = useServerFn(addOrRestockMedication);
  const adjustFn = useServerFn(adjustInventoryStock);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Restock / Add Modal State
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedDrugId, setSelectedDrugId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantityToAdd, setQuantityToAdd] = useState("50");
  const [reorderLevel, setReorderLevel] = useState("20");
  const [expiryDate, setExpiryDate] = useState("");
  const [restockReason, setRestockReason] = useState("Routine pharmacy stock replenishment");

  // Stock Adjustment Modal State
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<PharmacyInventoryItem | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [adjustType, setAdjustType] = useState<"adjustment" | "expired" | "return">("adjustment");
  const [adjustReason, setAdjustReason] = useState("");

  const [isPending, startTransition] = useTransition();

  const {
    data: pharmacyData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["pharmacy-inventory", activeHospitalId],
    queryFn: () => getInventoryFn({ data: { hospitalId: activeHospitalId || undefined } }),
    refetchInterval: 15000,
  });

  // Open Restock Modal (prepopulate if restocking existing item)
  const handleOpenRestock = (item?: PharmacyInventoryItem) => {
    if (item) {
      setSelectedDrugId(item.drugId);
      setBatchNumber(item.batchNumber);
      setUnitPrice(item.unitPrice.toString());
      setReorderLevel(item.reorderLevel.toString());
      setExpiryDate(item.expiryDate || "");
      setQuantityToAdd("50");
      setRestockReason("Restock received for batch " + item.batchNumber);
    } else {
      setSelectedDrugId("");
      setBatchNumber("BATCH-" + Math.floor(100000 + Math.random() * 900000));
      setUnitPrice("1500");
      setQuantityToAdd("50");
      setReorderLevel("20");
      setExpiryDate("");
      setRestockReason("New medication batch received");
    }
    setIsRestockOpen(true);
  };

  // Open Adjust Modal
  const handleOpenAdjust = (item: PharmacyInventoryItem) => {
    setAdjustItem(item);
    setNewQuantity(item.quantityInStock.toString());
    setAdjustType("adjustment");
    setAdjustReason("");
    setIsAdjustOpen(true);
  };

  // Submit Restock
  const handleSaveRestock = () => {
    if (!selectedDrugId) {
      toast.error("Please select a drug from the formulary.");
      return;
    }
    if (!batchNumber.trim()) {
      toast.error("Batch number is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await restockFn({
          data: {
            hospitalId: activeHospitalId || undefined,
            drugId: selectedDrugId,
            batchNumber,
            unitPrice: parseFloat(unitPrice) || 0,
            quantityToAdd: parseInt(quantityToAdd, 10) || 1,
            reorderLevel: parseInt(reorderLevel, 10) || 20,
            expiryDate: expiryDate || undefined,
            reason: restockReason || undefined,
          },
        });

        if (res.success) {
          toast.success("Medication inventory updated successfully.");
          setIsRestockOpen(false);
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to update inventory.");
      }
    });
  };

  // Submit Stock Adjustment
  const handleSaveAdjust = () => {
    if (!adjustItem) return;
    if (!adjustReason.trim()) {
      toast.error("Please provide a reason for stock adjustment.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await adjustFn({
          data: {
            hospitalId: activeHospitalId || undefined,
            inventoryId: adjustItem.id,
            drugId: adjustItem.drugId,
            newQuantity: parseInt(newQuantity, 10) || 0,
            movementType: adjustType,
            reason: adjustReason,
          },
        });

        if (res.success) {
          toast.success("Stock count adjusted and movement logged.");
          setIsAdjustOpen(false);
          refetch();
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to adjust stock.");
      }
    });
  };

  // Filtered medication inventory list
  const filteredList = useMemo(() => {
    if (!pharmacyData?.inventory) return [];
    let list = pharmacyData.inventory;

    if (activeTab === "low_stock") {
      list = list.filter((item) => item.isLowStock);
    } else if (activeTab === "near_expiry") {
      list = list.filter((item) => item.isNearExpiry);
    } else if (activeTab === "expired") {
      list = list.filter((item) => item.isExpired);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.genericName.toLowerCase().includes(q) ||
          (item.brandName && item.brandName.toLowerCase().includes(q)) ||
          item.batchNumber.toLowerCase().includes(q) ||
          (item.dosageForm && item.dosageForm.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [pharmacyData?.inventory, activeTab, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Pill className="size-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Pharmacy Drug Inventory
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage hospital medications, real-time stock levels, reorder alerts, near-expiry monitoring, and movement audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 border-border"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Stock
          </Button>

          {pharmacyData?.canManagePharmacy && (
            <Button
              size="sm"
              onClick={() => handleOpenRestock()}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            >
              <PackagePlus className="size-3.5" />
              Restock / Add Drug
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div
          onClick={() => setActiveTab("all")}
          className={`cursor-pointer rounded-xl border p-4 shadow-soft transition-all ${
            activeTab === "all"
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Medications
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-foreground">
              {pharmacyData?.counts.totalDrugs ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">({pharmacyData?.counts.totalUnits ?? 0} units)</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("low_stock")}
          className={`cursor-pointer rounded-xl border p-4 shadow-soft transition-all ${
            activeTab === "low_stock"
              ? "border-amber-500 bg-amber-500/15"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingDown className="size-3.5" /> Low Stock Alert
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pharmacyData?.counts.lowStock ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">reorder now</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("near_expiry")}
          className={`cursor-pointer rounded-xl border p-4 shadow-soft transition-all ${
            activeTab === "near_expiry"
              ? "border-rose-500 bg-rose-500/15"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="size-3.5" /> Near Expiry (≤90d)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-rose-600 dark:text-rose-400">
              {pharmacyData?.counts.nearExpiry ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">batches</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("expired")}
          className={`cursor-pointer rounded-xl border p-4 shadow-soft transition-all ${
            activeTab === "expired"
              ? "border-red-600 bg-red-600/15"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
            <AlertOctagon className="size-3.5" /> Expired
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-red-600 dark:text-red-400">
              {pharmacyData?.counts.expired ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">dispose</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("movements")}
          className={`cursor-pointer rounded-xl border p-4 shadow-soft transition-all ${
            activeTab === "movements"
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <History className="size-3.5" /> Stock Movements
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-primary">
              {pharmacyData?.recentMovements.length ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">audited logs</span>
          </div>
        </div>
      </div>

      {/* Tab Filter & Search Toolbar */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: `All Drugs (${pharmacyData?.counts.totalDrugs ?? 0})` },
              { id: "low_stock", label: `Low Stock (${pharmacyData?.counts.lowStock ?? 0})` },
              { id: "near_expiry", label: `Near Expiry (${pharmacyData?.counts.nearExpiry ?? 0})` },
              { id: "expired", label: `Expired (${pharmacyData?.counts.expired ?? 0})` },
              { id: "movements", label: "Stock Movement Audit Log" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab !== "movements" && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by drug name, batch, form..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          )}
        </div>

        {/* Inventory Table or Stock Movements Log */}
        {isLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading pharmacy inventory...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-destructive">
            <AlertTriangle className="mx-auto size-8" />
            <p className="mt-2 text-sm">{(error as any)?.message || "Failed to load inventory"}</p>
          </div>
        ) : activeTab === "movements" ? (
          /* Stock Movements Audit Table */
          <div className="divide-y divide-border">
            {pharmacyData?.recentMovements.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs">
                No stock movement logs recorded yet.
              </div>
            ) : (
              pharmacyData?.recentMovements.map((move) => (
                <div key={move.id} className="flex flex-col gap-2 p-4 text-xs sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.2 font-mono text-[10px] font-bold uppercase ${
                          move.movementType === "restock"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : move.movementType === "dispense"
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {move.movementType}
                      </span>
                      <span className="font-bold text-foreground">{move.drugName}</span>
                    </div>
                    <p className="text-muted-foreground">
                      Reason: {move.reason || "Standard pharmacy operation"} • Performed by {move.performedByName || "Staff"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className={`font-mono font-bold text-sm ${move.quantityChange > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        {move.quantityChange > 0 ? `+${move.quantityChange}` : move.quantityChange} units
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Stock: {move.previousStock} → {move.newStock}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(move.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500/70" />
            <h3 className="mt-3 font-display text-base font-bold text-foreground">
              No medications matching this filter
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              All stock levels are optimal or try clearing the search query.
            </p>
          </div>
        ) : (
          /* Medications Inventory Table */
          <div className="divide-y divide-border">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 p-4.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Drug Details */}
                <div className="flex items-start gap-3.5">
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                    <Pill className="size-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-sm font-bold text-foreground">
                        {item.brandName ? `${item.brandName} (${item.genericName})` : item.genericName}
                      </h3>
                      {item.strength && (
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.2 rounded font-semibold text-muted-foreground">
                          {item.strength}
                        </span>
                      )}
                      {item.dosageForm && (
                        <span className="text-[11px] text-muted-foreground">
                          • {item.dosageForm}
                        </span>
                      )}

                      {/* Warnings & Badges */}
                      {item.isExpired ? (
                        <span className="rounded-full bg-red-600/20 px-2 py-0.2 text-[10px] font-extrabold text-red-600 animate-pulse">
                          EXPIRED ({item.daysToExpiry ? `${Math.abs(item.daysToExpiry)}d ago` : "Expired"})
                        </span>
                      ) : item.isNearExpiry ? (
                        <span className="rounded-full bg-rose-500/15 px-2 py-0.2 text-[10px] font-bold text-rose-700 dark:text-rose-400">
                          NEAR EXPIRY ({item.daysToExpiry}d remaining)
                        </span>
                      ) : null}

                      {item.isLowStock && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          LOW STOCK (≤{item.reorderLevel})
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                      <span>Batch: <span className="font-semibold text-foreground">{item.batchNumber}</span></span>
                      <span>Unit Price: <span className="font-semibold text-foreground">₦{item.unitPrice.toLocaleString()}</span></span>
                      {item.expiryDate && (
                        <span>Expiry: <span className="font-semibold text-foreground">{new Date(item.expiryDate).toLocaleDateString()}</span></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock Level & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className={`font-mono text-xl font-bold ${item.isLowStock ? "text-amber-600" : "text-foreground"}`}>
                        {item.quantityInStock}
                      </span>
                      <span className="text-xs text-muted-foreground">in stock</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Reorder at {item.reorderLevel} units</span>
                  </div>

                  {pharmacyData?.canManagePharmacy && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenRestock(item)}
                        className="h-8 text-xs gap-1 border-emerald-600/30 text-emerald-700 dark:text-emerald-300"
                      >
                        <Plus className="size-3.5" /> Restock
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenAdjust(item)}
                        className="h-8 text-xs gap-1 text-muted-foreground"
                      >
                        <Edit className="size-3.5" /> Adjust
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restock / Add Medication Modal */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <PackagePlus className="size-4" />
              </div>
              <DialogTitle className="font-display text-lg font-bold">
                Restock Medication Batch
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Add new inventory stock, set batch numbers, unit pricing, and expiry dates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Drug Formulary Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Select Drug Formulary *</Label>
              <Select value={selectedDrugId} onValueChange={setSelectedDrugId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose medicine from catalog..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {pharmacyData?.availableFormulary.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      {f.genericName} {f.strength ? `(${f.strength})` : ""} {f.brandName ? `• ${f.brandName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="batch-no" className="text-xs font-bold">Batch Number *</Label>
                <Input
                  id="batch-no"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="BATCH-10928"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unit-price" className="text-xs font-bold">Unit Price (₦) *</Label>
                <Input
                  id="unit-price"
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="1500"
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Quantity to Add & Reorder Threshold */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="qty-add" className="text-xs font-bold">Quantity Received *</Label>
                <Input
                  id="qty-add"
                  type="number"
                  value={quantityToAdd}
                  onChange={(e) => setQuantityToAdd(e.target.value)}
                  placeholder="50"
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reorder-lvl" className="text-xs font-bold">Reorder Level Alert</Label>
                <Input
                  id="reorder-lvl"
                  type="number"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  placeholder="20"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Expiry Date */}
            <div className="space-y-1">
              <Label htmlFor="exp-date" className="text-xs font-bold">Batch Expiry Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <Label htmlFor="restock-reason" className="text-xs">Reason / Invoice Reference</Label>
              <Input
                id="restock-reason"
                value={restockReason}
                onChange={(e) => setRestockReason(e.target.value)}
                placeholder="Supplier delivery PO #9021"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRestockOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveRestock}
              disabled={isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PackagePlus className="size-3.5" />}
              Confirm Restock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">
              Adjust Medication Stock Level
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Item: <span className="font-bold text-foreground">{adjustItem?.brandName || adjustItem?.genericName}</span> (Current stock: {adjustItem?.quantityInStock})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="adj-qty" className="text-xs font-bold">New Exact Quantity in Stock</Label>
              <Input
                id="adj-qty"
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="h-9 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Adjustment Type</Label>
              <Select value={adjustType} onValueChange={(v: any) => setAdjustType(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment" className="text-xs">Physical Inventory Count Correction</SelectItem>
                  <SelectItem value="expired" className="text-xs">Expired / Damaged Disposal</SelectItem>
                  <SelectItem value="return" className="text-xs">Supplier Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="adj-reason" className="text-xs font-bold">Audited Justification Reason *</Label>
              <Textarea
                id="adj-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Reason for stock correction or disposal batch..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdjustOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAdjust}
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
