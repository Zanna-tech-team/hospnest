import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Receipt,
  Printer,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Building2,
  User,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  FileText,
  Tag,
  Edit2,
  Calendar,
  Layers,
  ArrowUpRight,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  getBillingWorkbenchData,
  recordInvoicePayment,
  submitInsuranceClaim,
  updateInsuranceClaimStatus,
  updateHospitalServicePrice,
  type BillingInvoice,
  type HospitalServiceItem,
  type BillingClaimItem,
} from "@/lib/billing.functions";
import { PrintableDocumentModal } from "@/components/clinical-docs/PrintableDocumentModal";
import { PaymentReceiptDocument } from "@/components/clinical-docs/PaymentReceiptDocument";
import { RoleGuard } from "@/components/auth/RoleGuard";

export const Route = createFileRoute("/_authenticated/billing/")({
  component: BillingPage,
});

type ActiveTab = "invoices" | "claims" | "tariffs";
type InvoiceFilterStatus = "all" | "pending" | "partially_paid" | "paid" | "waived";

export function BillingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>("invoices");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceFilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<HospitalServiceItem | null>(null);
  const [newTariffPrice, setNewTariffPrice] = useState<number>(0);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer" | "insurance" | "ussd">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Claim Form State
  const [claimProvider, setClaimProvider] = useState("");
  const [claimPolicyNumber, setClaimPolicyNumber] = useState("");
  const [claimAmount, setClaimAmount] = useState<number>(0);

  // Data fetching
  const getBillingDataFn = useServerFn(getBillingWorkbenchData);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["billing-workbench-data"],
    queryFn: () => getBillingDataFn({ data: {} }),
    refetchInterval: 20000,
  });

  // Mutations
  const recordPaymentFn = useServerFn(recordInvoicePayment);
  const paymentMutation = useMutation({
    mutationFn: (payload: {
      invoiceId: string;
      patientId: string;
      amountPaid: number;
      paymentMethod: "cash" | "card" | "bank_transfer" | "insurance" | "ussd";
      transactionReference?: string | undefined;
      notes?: string | undefined;
    }) => recordPaymentFn({ data: payload }),
    onSuccess: (res) => {
      toast.success("Payment recorded successfully!", {
        description: `Status updated to ${res.newStatus}. Remaining balance: ₦${res.remainingBalance.toLocaleString()}`,
      });
      setIsPaymentModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["billing-workbench-data"] });
    },
    onError: (err: any) => {
      toast.error("Payment failed", {
        description: err?.message || "Could not record payment.",
      });
    },
  });

  const submitClaimFn = useServerFn(submitInsuranceClaim);
  const claimMutation = useMutation({
    mutationFn: (payload: {
      invoiceId: string;
      patientId: string;
      providerName: string;
      policyNumber: string;
      claimAmount: number;
    }) => submitClaimFn({ data: payload }),
    onSuccess: (res) => {
      toast.success("Insurance claim submitted!", {
        description: `Claim for ₦${res.claimAmount.toLocaleString()} recorded. Patient co-pay: ₦${res.patientPayable.toLocaleString()}`,
      });
      setIsClaimModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["billing-workbench-data"] });
    },
    onError: (err: any) => {
      toast.error("Claim submission failed", {
        description: err?.message || "Could not submit insurance claim.",
      });
    },
  });

  const updateClaimStatusFn = useServerFn(updateInsuranceClaimStatus);
  const claimStatusMutation = useMutation({
    mutationFn: (payload: {
      claimId: string;
      invoiceId: string;
      patientId: string;
      newStatus: "submitted" | "approved" | "rejected" | "paid";
    }) => updateClaimStatusFn({ data: payload }),
    onSuccess: (res) => {
      toast.success(`Claim status updated to ${res.newStatus.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ["billing-workbench-data"] });
    },
    onError: (err: any) => {
      toast.error("Status update failed", {
        description: err?.message || "Could not update claim status.",
      });
    },
  });

  const updateTariffFn = useServerFn(updateHospitalServicePrice);
  const tariffMutation = useMutation({
    mutationFn: (payload: {
      serviceId: string;
      newPrice: number;
      isActive?: boolean | undefined;
    }) => updateTariffFn({ data: payload }),
    onSuccess: () => {
      toast.success("Service price updated successfully!");
      setIsTariffModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["billing-workbench-data"] });
    },
    onError: (err: any) => {
      toast.error("Price update failed", {
        description: err?.message || "Could not update service price.",
      });
    },
  });

  const invoices = data?.invoices ?? [];
  const servicesCatalog = data?.servicesCatalog ?? [];
  const dailyCollections = data?.dailyCollections ?? {
    todayTotal: 0,
    cashTotal: 0,
    cardTotal: 0,
    transferTotal: 0,
    insuranceTotal: 0,
    ussdTotal: 0,
    transactionCount: 0,
  };
  const hmoOutstanding = data?.hmoOutstanding ?? [];
  const counts = data?.counts ?? {
    total: 0,
    pending: 0,
    partiallyPaid: 0,
    paid: 0,
    waived: 0,
    claimsCount: 0,
  };

  // Open Payment Dialog
  const handleOpenPayment = (inv: BillingInvoice) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.balanceDue > 0 ? inv.balanceDue : inv.patientPayableAmount);
    setPaymentMethod("cash");
    setPaymentReference("");
    setPaymentNotes("");
    setIsPaymentModalOpen(true);
  };

  // Open Receipt Dialog
  const handleOpenReceipt = (inv: BillingInvoice) => {
    setSelectedInvoice(inv);
    setIsReceiptModalOpen(true);
  };

  // Open Claim Dialog
  const handleOpenClaim = (inv: BillingInvoice) => {
    setSelectedInvoice(inv);
    setClaimProvider(inv.insuranceProvider || "");
    setClaimPolicyNumber(inv.insurancePolicyNumber || "");
    setClaimAmount(inv.totalAmount);
    setIsClaimModalOpen(true);
  };

  // Open Tariff Edit Dialog
  const handleOpenTariffEdit = (item: HospitalServiceItem) => {
    setSelectedTariff(item);
    setNewTariffPrice(item.price);
    setIsTariffModalOpen(true);
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (invoiceStatusFilter !== "all" && inv.status !== invoiceStatusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesPatient = inv.patientName.toLowerCase().includes(term);
        const matchesNin = inv.patientNin?.toLowerCase().includes(term);
        const matchesInvNumber = inv.invoiceNumber.toLowerCase().includes(term);
        const matchesDoctor = inv.doctorName?.toLowerCase().includes(term);
        const matchesHmo = inv.insuranceProvider?.toLowerCase().includes(term);
        return matchesPatient || matchesNin || matchesInvNumber || matchesDoctor || matchesHmo;
      }
      return true;
    });
  }, [invoices, invoiceStatusFilter, searchTerm]);

  // Printable receipt trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <RoleGuard
      allowedRoles={["hospital_admin", "super_admin"]}
      requiredPermission="billing"
      fallbackTitle="Billing & Revenue Restricted"
      fallbackMessage="Only hospital administrators, finance officers, or staff with billing privileges can access the hospital billing ledger and financial tariffs."
    >
      <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              Phase 6: Billing & Revenue
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Automated Hospital Tariff Engine
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Billing & Revenue Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage patient invoices, collect payments, print receipts, track HMO insurance claims, and configure hospital tariffs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-border text-foreground hover:bg-muted"
          >
            <RefreshCw className={`mr-2 size-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Today's Collections */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Today's Collections
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl font-mono">
            ₦{dailyCollections.todayTotal.toLocaleString()}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span>Cash: ₦{dailyCollections.cashTotal.toLocaleString()}</span>
            <span>•</span>
            <span>Card/POS: ₦{dailyCollections.cardTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Total Invoiced */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Total Invoiced
            </span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Receipt className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl font-mono">
            {counts.total}
          </div>
          <span className="text-xs text-muted-foreground">
            {counts.paid} Paid • {counts.partiallyPaid} Partial
          </span>
        </div>

        {/* Pending Patient Balance */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Awaiting Payment
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl font-mono">
            {counts.pending}
          </div>
          <span className="text-xs text-muted-foreground">Unsettled patient invoices</span>
        </div>

        {/* Active HMO Claims */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              HMO Claims
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl font-mono">
            {counts.claimsCount}
          </div>
          <span className="text-xs text-muted-foreground">
            {hmoOutstanding.length} HMO Providers Tracked
          </span>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-4" aria-label="Tabs">
          {[
            { id: "invoices", label: "Invoices & Payments", icon: Receipt, count: counts.total },
            { id: "claims", label: "Insurance & HMO Claims", icon: ShieldCheck, count: counts.claimsCount },
            { id: "tariffs", label: "Hospital Services Tariff", icon: Tag, count: servicesCatalog.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-mono ${
                      isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: INVOICES & PAYMENTS */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/60">
              <button
                onClick={() => setInvoiceStatusFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  invoiceStatusFilter === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({counts.total})
              </button>
              <button
                onClick={() => setInvoiceStatusFilter("pending")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  invoiceStatusFilter === "pending" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pending ({counts.pending})
              </button>
              <button
                onClick={() => setInvoiceStatusFilter("partially_paid")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  invoiceStatusFilter === "partially_paid" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Partial ({counts.partiallyPaid})
              </button>
              <button
                onClick={() => setInvoiceStatusFilter("paid")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  invoiceStatusFilter === "paid" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Paid ({counts.paid})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient, NIN, invoice #, doctor..."
                className="pl-9 text-sm"
              />
            </div>
          </div>

          {/* Invoices List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-16">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">Loading hospital invoices & billing ledger...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center">
              <Receipt className="mx-auto size-12 text-muted-foreground/60" />
              <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                No invoices found
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                No invoices match your selected filter. Invoices generated by consultations, laboratory, and pharmacy will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:border-primary/40"
                >
                  {/* Card Header */}
                  <div className="border-b border-border/60 bg-muted/20 px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-mono font-bold text-xs">
                        {inv.queueNumber ? `#${inv.queueNumber}` : <Receipt className="size-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to="/patients/$patientId"
                            params={{ patientId: inv.patientId }}
                            className="font-display font-bold text-foreground hover:text-primary transition-colors text-base"
                          >
                            {inv.patientName}
                          </Link>
                          <span className="font-mono text-xs text-muted-foreground">({inv.invoiceNumber})</span>
                          {inv.insuranceProvider && (
                            <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                              <ShieldCheck className="size-3" /> {inv.insuranceProvider}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>Doctor: {inv.doctorName || "Staff"}</span>
                          <span>•</span>
                          <span>Issued: {new Date(inv.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                          inv.status === "paid"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : inv.status === "partially_paid"
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {inv.status.replace("_", " ")}
                      </span>

                      {inv.status !== "paid" && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenPayment(inv)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                        >
                          <DollarSign className="mr-1.5 size-4" />
                          Record Payment
                        </Button>
                      )}

                      {!inv.claim && inv.status !== "paid" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenClaim(inv)}
                          className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                        >
                          <ShieldCheck className="mr-1.5 size-4" />
                          HMO Claim
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReceipt(inv)}
                        className="text-muted-foreground"
                      >
                        <Printer className="mr-1.5 size-4" />
                        Print Receipt
                      </Button>
                    </div>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/10 px-5 py-3 border-b border-border/40 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold">Total Gross</span>
                      <div className="font-mono font-bold text-foreground text-sm">
                        ₦{inv.totalAmount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold">HMO Coverage</span>
                      <div className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-sm">
                        ₦{inv.insuranceCoverageAmount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold">Total Paid</span>
                      <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₦{inv.amountPaid.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-semibold">Balance Due</span>
                      <div className={`font-mono font-bold text-sm ${inv.balanceDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}`}>
                        ₦{inv.balanceDue.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Line Items Accordion */}
                  <div className="divide-y divide-border/40 px-5 py-2.5">
                    {inv.lineItems.map((line) => (
                      <div key={line.id} className="flex items-center justify-between py-1.5 text-xs">
                        <div>
                          <span className="font-medium text-foreground">{line.description || "Medical Service"}</span>
                          <span className="text-muted-foreground ml-2 text-[10px] uppercase">({line.serviceType})</span>
                        </div>
                        <div className="font-mono text-muted-foreground">
                          {line.quantity} × ₦{line.unitPrice.toLocaleString()} = <span className="font-bold text-foreground">₦{line.totalPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INSURANCE & HMO CLAIMS */}
      {activeTab === "claims" && (
        <div className="space-y-6">
          {/* HMO Outstanding Summary Cards */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Outstanding Balances by HMO Provider
            </h3>
            {hmoOutstanding.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-xs text-muted-foreground">
                No active HMO provider claims registered yet. Claims submitted on patient invoices will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hmoOutstanding.map((hmo) => (
                  <div key={hmo.providerName} className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">{hmo.providerName}</span>
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                        {hmo.totalClaimCount} Claims
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Billed: <span className="font-mono font-bold text-foreground">₦{hmo.totalClaimAmount.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-amber-600 font-medium">Pending: ₦{hmo.outstandingAmount.toLocaleString()}</span>
                      <span className="text-emerald-600 font-medium">Settled: ₦{hmo.settledAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Claims List Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
            <div className="border-b border-border bg-muted/20 px-5 py-3">
              <h4 className="font-bold text-foreground text-sm">All Submitted Insurance Claims</h4>
            </div>
            <div className="divide-y divide-border/40">
              {invoices.filter((i) => i.claim).length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No claims currently on record.
                </div>
              ) : (
                invoices
                  .filter((i) => i.claim)
                  .map((inv) => {
                    const claim = inv.claim!;
                    return (
                      <div key={claim.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{claim.providerName}</span>
                            <span className="font-mono text-muted-foreground">Policy: {claim.policyNumber || "N/A"}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                claim.status === "paid"
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : claim.status === "approved"
                                  ? "bg-blue-500/15 text-blue-600"
                                  : claim.status === "rejected"
                                  ? "bg-rose-500/15 text-rose-600"
                                  : "bg-amber-500/15 text-amber-600"
                              }`}
                            >
                              {claim.status}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5">
                            Patient: <span className="font-medium text-foreground">{inv.patientName}</span> • Invoice: {inv.invoiceNumber}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="font-mono text-right">
                            <div className="font-bold text-foreground text-sm">₦{claim.claimAmount.toLocaleString()}</div>
                            <span className="text-[10px] text-muted-foreground">Claim Amount</span>
                          </div>

                          {/* Claim Status Progression Actions */}
                          {claim.status === "submitted" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                claimStatusMutation.mutate({
                                  claimId: claim.id,
                                  invoiceId: inv.id,
                                  patientId: inv.patientId,
                                  newStatus: "approved",
                                })
                              }
                              className="text-blue-600 border-blue-200"
                            >
                              <Check className="mr-1 size-3.5" /> Approve Claim
                            </Button>
                          )}

                          {claim.status === "approved" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                claimStatusMutation.mutate({
                                  claimId: claim.id,
                                  invoiceId: inv.id,
                                  patientId: inv.patientId,
                                  newStatus: "paid",
                                })
                              }
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <DollarSign className="mr-1 size-3.5" /> Mark Settled & Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HOSPITAL SERVICES TARIFF PRICE LIST */}
      {activeTab === "tariffs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-foreground text-lg">Hospital Services & Standard Tariffs</h3>
              <p className="text-xs text-muted-foreground">
                Configured service fees for OPD, specialist consultations, emergency triage, nursing care, and procedures.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
            <div className="divide-y divide-border/40">
              {servicesCatalog.map((service) => (
                <div key={service.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{service.serviceName}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {service.serviceCode}
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                        {service.serviceCategory}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-mono text-sm font-bold text-foreground">
                      ₦{service.price.toLocaleString()}
                    </div>
                    {data?.canManageBilling && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTariffEdit(service)}
                        className="h-8 text-xs"
                      >
                        <Edit2 className="mr-1 size-3.5" /> Edit Price
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT DIALOG */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">Record Invoice Payment</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Invoice #{selectedInvoice?.invoiceNumber} • Patient: {selectedInvoice?.patientName}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-xl bg-muted/20 p-3 border border-border space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Invoiced Amount:</span>
                  <span className="font-mono font-bold">₦{selectedInvoice.totalAmount.toLocaleString()}</span>
                </div>
                {selectedInvoice.insuranceCoverageAmount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>HMO Coverage Portion:</span>
                    <span className="font-mono font-semibold">-₦{selectedInvoice.insuranceCoverageAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-mono text-emerald-600">₦{selectedInvoice.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
                  <span>Current Balance Due:</span>
                  <span className="font-mono text-rose-600">₦{selectedInvoice.balanceDue.toLocaleString()}</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Payment Amount (₦)</Label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(selectedInvoice.balanceDue)}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Pay Full Balance (₦{selectedInvoice.balanceDue.toLocaleString()})
                  </button>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={selectedInvoice.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  className="font-mono font-bold text-base h-10"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val: any) => setPaymentMethod(val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Payment</SelectItem>
                    <SelectItem value="card">Point of Sale (Card / POS)</SelectItem>
                    <SelectItem value="bank_transfer">Direct Bank Transfer</SelectItem>
                    <SelectItem value="insurance">Insurance / HMO Settlement</SelectItem>
                    <SelectItem value="ussd">USSD Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Reference */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Transaction Reference / Receipt #</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. POS-849201 or Transfer Ref"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!selectedInvoice) return;
                paymentMutation.mutate({
                  invoiceId: selectedInvoice.id,
                  patientId: selectedInvoice.patientId,
                  amountPaid: paymentAmount,
                  paymentMethod,
                  transactionReference: paymentReference.trim() || undefined,
                  notes: paymentNotes.trim() || undefined,
                });
              }}
              disabled={paymentMutation.isPending || paymentAmount <= 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {paymentMutation.isPending ? "Processing..." : `Confirm Payment (₦${paymentAmount.toLocaleString()})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUBMIT HMO CLAIM DIALOG */}
      <Dialog open={isClaimModalOpen} onOpenChange={setIsClaimModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">Submit HMO Insurance Claim</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Invoice #{selectedInvoice?.invoiceNumber} • Patient: {selectedInvoice?.patientName}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">HMO Provider Name</Label>
                <Input
                  value={claimProvider}
                  onChange={(e) => setClaimProvider(e.target.value)}
                  placeholder="e.g. Reliance HMO, AXA Mansard, NHIS"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Enrollee / Policy ID</Label>
                <Input
                  value={claimPolicyNumber}
                  onChange={(e) => setClaimPolicyNumber(e.target.value)}
                  placeholder="e.g. REL-982104"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Claim Amount (₦)</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedInvoice.totalAmount}
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(Number(e.target.value) || 0)}
                  className="font-mono font-bold text-base h-10"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsClaimModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!selectedInvoice) return;
                claimMutation.mutate({
                  invoiceId: selectedInvoice.id,
                  patientId: selectedInvoice.patientId,
                  providerName: claimProvider,
                  policyNumber: claimPolicyNumber,
                  claimAmount,
                });
              }}
              disabled={claimMutation.isPending || !claimProvider.trim() || claimAmount <= 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {claimMutation.isPending ? "Submitting..." : `Submit Claim (₦${claimAmount.toLocaleString()})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT TARIFF PRICE DIALOG */}
      <Dialog open={isTariffModalOpen} onOpenChange={setIsTariffModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Edit Standard Service Tariff</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedTariff?.serviceName} ({selectedTariff?.serviceCode})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Standard Rate (₦)</Label>
              <Input
                type="number"
                min={0}
                value={newTariffPrice}
                onChange={(e) => setNewTariffPrice(Number(e.target.value) || 0)}
                className="font-mono font-bold text-base h-10"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsTariffModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!selectedTariff) return;
                tariffMutation.mutate({
                  serviceId: selectedTariff.id,
                  newPrice: newTariffPrice,
                });
              }}
              disabled={tariffMutation.isPending || newTariffPrice < 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Save New Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINTABLE OFFICIAL PAYMENT RECEIPT MODAL */}
      {selectedInvoice && (
        <PrintableDocumentModal
          open={isReceiptModalOpen}
          onOpenChange={setIsReceiptModalOpen}
          title="Official Hospital Payment Receipt"
          documentRefCode={selectedInvoice.invoiceNumber}
        >
          <PaymentReceiptDocument
            hospital={{
              name: data?.hospitalName || "HospNest Hospital",
              address: "Revenue & Finance Billing Directorate",
              state: "Nigeria",
              contactPhone: "+234 800 000 9999",
              licenseNumber: "FMOH-REV-001",
            }}
            patient={{
              fullName: selectedInvoice.patientName,
              nin: selectedInvoice.patientNin,
              phone: selectedInvoice.patientPhone,
              insuranceProvider: selectedInvoice.insuranceProvider,
              policyNumber: selectedInvoice.insurancePolicyNumber,
            }}
            receipt={{
              receiptNumber: `RCPT-${selectedInvoice.invoiceNumber.replace("INV-", "")}`,
              invoiceNumber: selectedInvoice.invoiceNumber,
              paymentDate:
                selectedInvoice.payments.length > 0
                  ? selectedInvoice.payments[0]!.paidAt
                  : selectedInvoice.createdAt,
              paymentMethod:
                selectedInvoice.payments.length > 0
                  ? selectedInvoice.payments[0]!.paymentMethod
                  : "cash",
              transactionReference:
                selectedInvoice.payments.length > 0
                  ? selectedInvoice.payments[0]!.transactionReference || "DIRECT-SETTLE"
                  : `TXN-${selectedInvoice.id.slice(0, 8).toUpperCase()}`,
              recordedBy: selectedInvoice.doctorName
                ? `Cashier (Signed by ${selectedInvoice.doctorName})`
                : "Authorized Revenue Officer",
              lineItems: selectedInvoice.lineItems.map((l) => ({
                description: l.description || "Hospital Healthcare Service",
                serviceType: l.serviceType,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                totalPrice: l.totalPrice,
              })),
              subtotal: selectedInvoice.totalAmount,
              insuranceCoverage: selectedInvoice.insuranceCoverageAmount,
              patientPayable: selectedInvoice.patientPayableAmount,
              amountPaid: selectedInvoice.amountPaid,
              balanceRemaining: selectedInvoice.balanceDue,
              amountInWords:
                selectedInvoice.amountPaid > 0
                  ? `Payment of standard hospital fees fulfilled in Nigerian Naira (NGN)`
                  : undefined,
            }}
          />
        </PrintableDocumentModal>
      )}
    </div>
    </RoleGuard>
  );
}
