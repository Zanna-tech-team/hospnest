import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type BillingLineItem = {
  id: string;
  invoiceId: string;
  serviceType: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
};

export type BillingPaymentItem = {
  id: string;
  invoiceId: string;
  amountPaid: number;
  paymentMethod: "cash" | "card" | "bank_transfer" | "insurance" | "ussd";
  transactionReference: string | null;
  recordedByName: string | null;
  paidAt: string;
};

export type BillingClaimItem = {
  id: string;
  invoiceId: string;
  providerName: string;
  policyNumber: string | null;
  claimAmount: number;
  status: "draft" | "submitted" | "approved" | "rejected" | "paid";
  submittedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type BillingInvoice = {
  id: string;
  invoiceNumber: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  patientNin: string | null;
  patientAge: number | null;
  patientGender: string | null;
  patientPhone: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insurancePlanType: string | null;
  insuranceExpiryDate: string | null;
  totalAmount: number;
  insuranceCoverageAmount: number;
  patientPayableAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: "pending" | "partially_paid" | "paid" | "waived" | "cancelled";
  notes: string | null;
  createdAt: string;
  dueDate: string | null;
  encounterDate: string;
  queueNumber: number | null;
  doctorName: string | null;
  lineItems: BillingLineItem[];
  payments: BillingPaymentItem[];
  claim: BillingClaimItem | null;
};

export type HospitalServiceItem = {
  id: string;
  serviceCode: string;
  serviceName: string;
  serviceCategory: "consultation" | "triage" | "nursing" | "procedure" | "admission" | "administrative" | "other";
  price: number;
  isActive: boolean;
  createdAt: string;
};

export type DailyCollectionsSummary = {
  todayTotal: number;
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  insuranceTotal: number;
  ussdTotal: number;
  transactionCount: number;
};

export type HmoProviderOutstandingSummary = {
  providerName: string;
  totalClaimCount: number;
  pendingCount: number;
  totalClaimAmount: number;
  outstandingAmount: number;
  settledAmount: number;
};

export type BillingWorkbenchResponse = {
  invoices: BillingInvoice[];
  servicesCatalog: HospitalServiceItem[];
  dailyCollections: DailyCollectionsSummary;
  hmoOutstanding: HmoProviderOutstandingSummary[];
  counts: {
    total: number;
    pending: number;
    partiallyPaid: number;
    paid: number;
    waived: number;
    claimsCount: number;
  };
  activeHospitalId: string;
  hospitalName: string;
  callerRole: StaffRole;
  canManageBilling: boolean;
};

async function writeAuditEntry(
  supabase: { from: (t: string) => any },
  entry: {
    hospital_id: string;
    accessor_id: string;
    accessor_role: StaffRole;
    patient_id?: string | undefined;
    encounter_id?: string | undefined;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null | undefined;
  },
) {
  try {
    await supabase.from("record_audit_logs").insert({
      hospital_id: entry.hospital_id,
      accessor_id: entry.accessor_id,
      accessor_role: entry.accessor_role,
      patient_id: entry.patient_id || "00000000-0000-0000-0000-000000000000",
      encounter_id: entry.encounter_id || null,
      action: entry.action,
      justification: entry.justification || null,
    });
  } catch (err) {
    console.warn("Audit log notice:", err);
  }
}

function maskNin(nin: string | null): string | null {
  if (!nin) return null;
  if (nin.length <= 4) return "****";
  return `${nin.slice(0, 3)}*****${nin.slice(-3)}`;
}

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Loads complete billing workbench data: Invoices, Daily Collections KPI, HMO Claims, and Services Catalog.
 */
export const getBillingWorkbenchData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input?: {
      hospitalId?: string | undefined;
    }) => {
      return {
        hospitalId: input?.hospitalId ? String(input.hospitalId).trim() : undefined,
      };
    },
  )
  .handler(async ({ context, data: input }): Promise<BillingWorkbenchResponse> => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Hospital staff access required.");

    const matchedRole = input?.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const hospitalName = (matchedRole as any)?.hospitals?.name || "Hospital";
    const callerRole = (matchedRole?.role as StaffRole) || "hospital_admin";
    const isClinical = ["doctor", "nurse", "pharmacist", "hospital_admin", "super_admin"].includes(callerRole);
    const canManageBilling = ["hospital_admin", "super_admin", "front_desk", "doctor"].includes(callerRole);

    // 1. Fetch Invoices with all relations
    const { data: invoiceRows, error: invError } = await (supabase as any)
      .from("invoices")
      .select(`
        id, encounter_id, patient_id, total_amount, insurance_coverage_amount,
        patient_payable_amount, status, due_date, created_at,
        encounter:encounter_id (
          id, encounter_status, created_at,
          appointment:appointment_id (queue_number),
          practitioner:practitioner_id (full_name)
        ),
        patient:patient_id (
          id, first_name, last_name, nin, date_of_birth, gender, phone,
          insurance_provider, insurance_policy_number, insurance_plan_type, insurance_expiry_date
        ),
        billing_line_items (
          id, invoice_id, service_type, description, quantity, unit_price, total_price, created_at
        ),
        payments (
          id, invoice_id, amount_paid, payment_method, transaction_reference, recorded_by, paid_at
        ),
        insurance_claims (
          id, invoice_id, provider_name, policy_number, claim_amount, status, submitted_at, resolved_at, created_at
        )
      `)
      .eq("hospital_id", activeHospitalId)
      .order("created_at", { ascending: false });

    if (invError) throw new Error(invError.message);

    // 2. Fetch hospital services price list
    const { data: serviceRows } = await (supabase as any)
      .from("hospital_services")
      .select("id, service_code, service_name, service_category, price, is_active, created_at")
      .eq("hospital_id", activeHospitalId)
      .order("service_category", { ascending: true });

    const servicesCatalog: HospitalServiceItem[] = (serviceRows ?? []).map((s: any) => ({
      id: s.id,
      serviceCode: s.service_code,
      serviceName: s.service_name,
      serviceCategory: s.service_category,
      price: Number(s.price || 0),
      isActive: Boolean(s.is_active),
      createdAt: s.created_at,
    }));

    // 3. Process Invoices and Calculate Daily Collections & HMO summaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let todayTotal = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let transferTotal = 0;
    let insuranceTotal = 0;
    let ussdTotal = 0;
    let transactionCount = 0;

    let pendingCount = 0;
    let partiallyPaidCount = 0;
    let paidCount = 0;
    let waivedCount = 0;
    let totalClaimsCount = 0;

    const hmoMap: Record<string, HmoProviderOutstandingSummary> = {};

    const invoices: BillingInvoice[] = (invoiceRows ?? []).map((inv: any) => {
      const patient = inv.patient || {};
      const encounter = inv.encounter || {};
      const doctor = encounter.practitioner || {};
      const rawLines = inv.billing_line_items ?? [];
      const rawPayments = inv.payments ?? [];
      const rawClaims = inv.insurance_claims ?? [];

      const lineItems: BillingLineItem[] = rawLines.map((l: any) => ({
        id: l.id,
        invoiceId: l.invoice_id,
        serviceType: l.service_type || "general",
        description: l.description || null,
        quantity: Number(l.quantity || 1),
        unitPrice: Number(l.unit_price || 0),
        totalPrice: Number(l.total_price || 0),
        createdAt: l.created_at,
      }));

      let totalPaidOnInvoice = 0;
      const payments: BillingPaymentItem[] = rawPayments.map((p: any) => {
        const amt = Number(p.amount_paid || 0);
        totalPaidOnInvoice += amt;

        const paidDate = new Date(p.paid_at);
        if (paidDate >= todayStart) {
          todayTotal += amt;
          transactionCount++;
          if (p.payment_method === "cash") cashTotal += amt;
          else if (p.payment_method === "card") cardTotal += amt;
          else if (p.payment_method === "bank_transfer") transferTotal += amt;
          else if (p.payment_method === "insurance") insuranceTotal += amt;
          else if (p.payment_method === "ussd") ussdTotal += amt;
        }

        return {
          id: p.id,
          invoiceId: p.invoice_id,
          amountPaid: amt,
          paymentMethod: p.payment_method,
          transactionReference: p.transaction_reference || null,
          recordedByName: null,
          paidAt: p.paid_at,
        };
      });

      let claim: BillingClaimItem | null = null;
      if (rawClaims.length > 0) {
        const c = rawClaims[0];
        claim = {
          id: c.id,
          invoiceId: c.invoice_id,
          providerName: c.provider_name || "HMO Provider",
          policyNumber: c.policy_number || null,
          claimAmount: Number(c.claim_amount || 0),
          status: c.status || "draft",
          submittedAt: c.submitted_at || null,
          resolvedAt: c.resolved_at || null,
          createdAt: c.created_at,
        };

        totalClaimsCount++;

        // HMO Outstanding grouping
        const pName = claim.providerName;
        if (!hmoMap[pName]) {
          hmoMap[pName] = {
            providerName: pName,
            totalClaimCount: 0,
            pendingCount: 0,
            totalClaimAmount: 0,
            outstandingAmount: 0,
            settledAmount: 0,
          };
        }
        hmoMap[pName]!.totalClaimCount++;
        hmoMap[pName]!.totalClaimAmount += claim.claimAmount;
        if (claim.status === "paid") {
          hmoMap[pName]!.settledAmount += claim.claimAmount;
        } else if (claim.status !== "rejected") {
          hmoMap[pName]!.pendingCount++;
          hmoMap[pName]!.outstandingAmount += claim.claimAmount;
        }
      }

      const totalAmt = Number(inv.total_amount || 0);
      const insCovAmt = Number(inv.insurance_coverage_amount || 0);
      const patPayable = Number(inv.patient_payable_amount ?? Math.max(0, totalAmt - insCovAmt));
      const balanceDue = Math.max(0, patPayable - totalPaidOnInvoice);

      const invStatus = inv.status as "pending" | "partially_paid" | "paid" | "waived" | "cancelled";
      if (invStatus === "pending") pendingCount++;
      else if (invStatus === "partially_paid") partiallyPaidCount++;
      else if (invStatus === "paid") paidCount++;
      else if (invStatus === "waived" || invStatus === "cancelled") waivedCount++;

      const formattedInvNumber =
        inv.invoice_number || `INV-${inv.created_at.slice(0, 4)}-${inv.id.slice(0, 6).toUpperCase()}`;

      return {
        id: inv.id,
        invoiceNumber: formattedInvNumber,
        encounterId: inv.encounter_id,
        patientId: inv.patient_id,
        patientName: `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "Unknown Patient",
        patientNin: isClinical ? patient.nin || null : maskNin(patient.nin || null),
        patientAge: calculateAge(patient.date_of_birth),
        patientGender: patient.gender || null,
        patientPhone: patient.phone || null,
        insuranceProvider: patient.insurance_provider || null,
        insurancePolicyNumber: patient.insurance_policy_number || null,
        insurancePlanType: patient.insurance_plan_type || null,
        insuranceExpiryDate: patient.insurance_expiry_date || null,
        totalAmount: totalAmt,
        insuranceCoverageAmount: insCovAmt,
        patientPayableAmount: patPayable,
        amountPaid: totalPaidOnInvoice,
        balanceDue,
        status: invStatus,
        notes: inv.notes || null,
        createdAt: inv.created_at,
        dueDate: inv.due_date || null,
        encounterDate: encounter.created_at || inv.created_at,
        queueNumber: (encounter.appointment as any)?.queue_number ?? null,
        doctorName: doctor.full_name || null,
        lineItems,
        payments,
        claim,
      };
    });

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "READ",
      justification: `Accessed billing workbench (${invoices.length} invoices, daily total: ₦${todayTotal.toLocaleString()}).`,
    });

    return {
      invoices,
      servicesCatalog,
      dailyCollections: {
        todayTotal,
        cashTotal,
        cardTotal,
        transferTotal,
        insuranceTotal,
        ussdTotal,
        transactionCount,
      },
      hmoOutstanding: Object.values(hmoMap),
      counts: {
        total: invoices.length,
        pending: pendingCount,
        partiallyPaid: partiallyPaidCount,
        paid: paidCount,
        waived: waivedCount,
        claimsCount: totalClaimsCount,
      },
      activeHospitalId,
      hospitalName,
      callerRole,
      canManageBilling,
    };
  });

/**
 * Records a payment against an invoice (Prompt 14).
 */
export const recordInvoicePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId?: string | undefined;
      invoiceId: string;
      patientId: string;
      amountPaid: number;
      paymentMethod: "cash" | "card" | "bank_transfer" | "insurance" | "ussd";
      transactionReference?: string | undefined;
      notes?: string | undefined;
    }) => {
      if (!input.invoiceId) throw new Error("Invoice ID is required.");
      if (!input.patientId) throw new Error("Patient ID is required.");
      if (input.amountPaid <= 0) throw new Error("Payment amount must be greater than zero.");
      return {
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        invoiceId: String(input.invoiceId).trim(),
        patientId: String(input.patientId).trim(),
        amountPaid: Number(input.amountPaid),
        paymentMethod: input.paymentMethod || "cash",
        transactionReference: input.transactionReference ? String(input.transactionReference).trim() : undefined,
        notes: input.notes ? String(input.notes).trim() : undefined,
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Unauthorized.");

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "front_desk";

    // 1. Fetch current invoice details
    const { data: invRow, error: invFetchErr } = await (supabase as any)
      .from("invoices")
      .select("id, total_amount, insurance_coverage_amount, patient_payable_amount, status, encounter_id")
      .eq("id", input.invoiceId)
      .single();

    if (invFetchErr || !invRow) throw new Error("Invoice not found.");

    // 2. Fetch existing payments on this invoice
    const { data: existingPayments } = await (supabase as any)
      .from("payments")
      .select("amount_paid")
      .eq("invoice_id", input.invoiceId);

    const previousTotalPaid = (existingPayments ?? []).reduce(
      (acc: number, p: any) => acc + Number(p.amount_paid || 0),
      0
    );

    const newTotalPaid = previousTotalPaid + input.amountPaid;
    const payableTarget = Number(invRow.patient_payable_amount || invRow.total_amount || 0);

    // 3. Insert new payment record
    const ref =
      input.transactionReference ||
      `PAY-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: paymentRow, error: payErr } = await (supabase as any)
      .from("payments")
      .insert({
        invoice_id: input.invoiceId,
        hospital_id: activeHospitalId,
        patient_id: input.patientId,
        amount_paid: input.amountPaid,
        payment_method: input.paymentMethod,
        transaction_reference: ref,
        recorded_by: userId,
      })
      .select("id")
      .single();

    if (payErr) throw new Error(payErr.message);

    // 4. Update invoice status
    const newStatus = newTotalPaid >= payableTarget ? "paid" : "partially_paid";
    await (supabase as any)
      .from("invoices")
      .update({
        status: newStatus,
      })
      .eq("id", input.invoiceId);

    // 5. Write audit log
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: invRow.encounter_id,
      action: "WRITE",
      justification: `Recorded payment of ₦${input.amountPaid.toLocaleString()} (${input.paymentMethod.toUpperCase()}) for Invoice #${input.invoiceId.slice(0, 8)}. Status updated to ${newStatus}.`,
    });

    return {
      success: true,
      paymentId: paymentRow.id,
      newStatus,
      totalPaid: newTotalPaid,
      remainingBalance: Math.max(0, payableTarget - newTotalPaid),
    };
  });

/**
 * Submits an insurance/HMO claim for an invoice (Prompt 15).
 */
export const submitInsuranceClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId?: string | undefined;
      invoiceId: string;
      patientId: string;
      providerName: string;
      policyNumber: string;
      claimAmount: number;
    }) => {
      if (!input.invoiceId) throw new Error("Invoice ID is required.");
      if (!input.providerName) throw new Error("HMO/Insurance provider name is required.");
      if (input.claimAmount <= 0) throw new Error("Claim amount must be greater than zero.");
      return {
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        invoiceId: String(input.invoiceId).trim(),
        patientId: String(input.patientId).trim(),
        providerName: String(input.providerName).trim(),
        policyNumber: String(input.policyNumber || "").trim(),
        claimAmount: Number(input.claimAmount),
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Unauthorized.");

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "hospital_admin";

    // 1. Fetch invoice
    const { data: invRow, error: invFetchErr } = await (supabase as any)
      .from("invoices")
      .select("id, total_amount, encounter_id")
      .eq("id", input.invoiceId)
      .single();

    if (invFetchErr || !invRow) throw new Error("Invoice not found.");

    const totalAmt = Number(invRow.total_amount || 0);
    const claimAmt = Math.min(input.claimAmount, totalAmt);
    const patPayable = Math.max(0, totalAmt - claimAmt);

    // 2. Update invoice coverage amounts
    await (supabase as any)
      .from("invoices")
      .update({
        insurance_coverage_amount: claimAmt,
        patient_payable_amount: patPayable,
      })
      .eq("id", input.invoiceId);

    // 3. Upsert insurance claim record
    const { data: existingClaim } = await (supabase as any)
      .from("insurance_claims")
      .select("id")
      .eq("invoice_id", input.invoiceId)
      .maybeSingle();

    if (existingClaim) {
      await (supabase as any)
        .from("insurance_claims")
        .update({
          provider_name: input.providerName,
          policy_number: input.policyNumber || null,
          claim_amount: claimAmt,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", existingClaim.id);
    } else {
      await (supabase as any).from("insurance_claims").insert({
        invoice_id: input.invoiceId,
        hospital_id: activeHospitalId,
        patient_id: input.patientId,
        provider_name: input.providerName,
        policy_number: input.policyNumber || null,
        claim_amount: claimAmt,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });
    }

    // 4. Update patient HMO profile if not set
    await (supabase as any)
      .from("patients")
      .update({
        insurance_provider: input.providerName,
        insurance_policy_number: input.policyNumber || null,
      })
      .eq("id", input.patientId);

    // 5. Audit log
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: invRow.encounter_id,
      action: "WRITE",
      justification: `Submitted insurance claim of ₦${claimAmt.toLocaleString()} to ${input.providerName} for Invoice #${input.invoiceId.slice(0, 8)}. Patient co-pay: ₦${patPayable.toLocaleString()}.`,
    });

    return {
      success: true,
      claimAmount: claimAmt,
      patientPayable: patPayable,
    };
  });

/**
 * Updates status of an insurance claim (Prompt 15: approved, rejected, paid).
 */
export const updateInsuranceClaimStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId?: string | undefined;
      claimId: string;
      invoiceId: string;
      patientId: string;
      newStatus: "submitted" | "approved" | "rejected" | "paid";
    }) => {
      if (!input.claimId) throw new Error("Claim ID is required.");
      if (!input.invoiceId) throw new Error("Invoice ID is required.");
      return {
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        claimId: String(input.claimId).trim(),
        invoiceId: String(input.invoiceId).trim(),
        patientId: String(input.patientId).trim(),
        newStatus: input.newStatus,
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Unauthorized.");

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "hospital_admin";

    // 1. Fetch claim
    const { data: claimRow, error: claimErr } = await (supabase as any)
      .from("insurance_claims")
      .select("id, claim_amount, provider_name")
      .eq("id", input.claimId)
      .single();

    if (claimErr || !claimRow) throw new Error("Claim not found.");

    // 2. Update claim status
    const resolvedAt = ["approved", "rejected", "paid"].includes(input.newStatus) ? new Date().toISOString() : null;
    await (supabase as any)
      .from("insurance_claims")
      .update({
        status: input.newStatus,
        resolved_at: resolvedAt,
      })
      .eq("id", input.claimId);

    // 3. If marked as paid by HMO, record insurance payment on invoice
    if (input.newStatus === "paid") {
      const claimAmt = Number(claimRow.claim_amount || 0);
      const ref = `HMO-SETTLE-${claimRow.provider_name.replace(/\s+/g, "").slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      await (supabase as any).from("payments").insert({
        invoice_id: input.invoiceId,
        hospital_id: activeHospitalId,
        patient_id: input.patientId,
        amount_paid: claimAmt,
        payment_method: "insurance",
        transaction_reference: ref,
        recorded_by: userId,
      });

      // Update invoice status if completely settled
      const { data: allPay } = await (supabase as any)
        .from("payments")
        .select("amount_paid")
        .eq("invoice_id", input.invoiceId);

      const totalPaid = (allPay ?? []).reduce((acc: number, p: any) => acc + Number(p.amount_paid || 0), 0);

      const { data: inv } = await (supabase as any)
        .from("invoices")
        .select("total_amount")
        .eq("id", input.invoiceId)
        .single();

      if (totalPaid >= Number(inv?.total_amount || 0)) {
        await (supabase as any).from("invoices").update({ status: "paid" }).eq("id", input.invoiceId);
      }
    }

    // 4. Audit log
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      action: "WRITE",
      justification: `Updated HMO claim #${input.claimId.slice(0, 8)} (${claimRow.provider_name}) status to ${input.newStatus.toUpperCase()}.`,
    });

    return {
      success: true,
      newStatus: input.newStatus,
    };
  });

/**
 * Updates a hospital tariff service price (Prompt 13).
 */
export const updateHospitalServicePrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId?: string | undefined;
      serviceId: string;
      newPrice: number;
      isActive?: boolean | undefined;
    }) => {
      if (!input.serviceId) throw new Error("Service ID is required.");
      if (input.newPrice < 0) throw new Error("Price cannot be negative.");
      return {
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        serviceId: String(input.serviceId).trim(),
        newPrice: Number(input.newPrice),
        isActive: input.isActive,
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Unauthorized.");

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "hospital_admin";

    if (!["hospital_admin", "super_admin"].includes(callerRole)) {
      throw new Error("Only hospital administrators can modify service prices.");
    }

    const updates: Record<string, any> = {
      price: input.newPrice,
    };
    if (input.isActive !== undefined) {
      updates["is_active"] = input.isActive;
    }

    const { error: updErr } = await (supabase as any)
      .from("hospital_services")
      .update(updates)
      .eq("id", input.serviceId)
      .eq("hospital_id", activeHospitalId);

    if (updErr) throw new Error(updErr.message);

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "WRITE",
      justification: `Updated service tariff price to ₦${input.newPrice.toLocaleString()}`,
    });

    return {
      success: true,
      newPrice: input.newPrice,
    };
  });
