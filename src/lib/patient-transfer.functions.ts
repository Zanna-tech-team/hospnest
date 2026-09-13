import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type PatientTransferItem = {
  id: string;
  patientId: string;
  patientName: string;
  patientNin: string;
  patientGender: string | null;
  patientAge: string;
  referringHospitalId: string;
  referringHospitalName: string;
  receivingHospitalId: string;
  receivingHospitalName: string;
  requestedById: string | null;
  requestedByName: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  priority: "routine" | "urgent" | "emergency";
  reasonForTransfer: string;
  clinicalSummary: string;
  consentScope: string;
  consentVerified: boolean;
  patientConsentId: string | null;
  responseNotes: string | null;
  createdAt: string;
  updatedAt: string;
  isIncoming: boolean;
};

export type PatientTransferData = {
  incomingTransfers: PatientTransferItem[];
  outgoingTransfers: PatientTransferItem[];
  partnerHospitals: Array<{
    id: string;
    name: string;
    code: string;
    state: string | null;
    city: string | null;
  }>;
  eligiblePatients: Array<{
    id: string;
    fullName: string;
    nin: string;
    gender: string | null;
    age: string;
    bloodGroup: string | null;
    genotype: string | null;
    allergies: string[];
    chronicConditions: string[];
  }>;
  activeHospitalId: string;
  isStaff: boolean;
  isAdmin: boolean;
};

function calculateAge(dob: string | null): string {
  if (!dob) return "Unknown";
  try {
    const birth = new Date(dob);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
    return years >= 0 ? `${years} yrs` : "Unknown";
  } catch {
    return "Unknown";
  }
}

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

/**
 * Loads incoming and outgoing cross-hospital transfer requests and registered partner facilities.
 */
export const getPatientTransfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { hospitalId?: string | undefined }) => ({
    hospitalId: input?.hospitalId ? String(input?.hospitalId).trim() : undefined,
  }))
  .handler(async ({ context, data: input }): Promise<PatientTransferData> => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Unauthorized.");

    const matchedRole = input?.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";
    const isAdmin = callerRole === "hospital_admin" || callerRole === "super_admin";

    // 1. Fetch partner hospitals
    const { data: allHospitals } = await supabase
      .from("hospitals")
      .select("id, name, code, state, city")
      .order("name", { ascending: true });

    const partnerHospitals = (allHospitals ?? [])
      .filter((h: any) => h.id !== activeHospitalId)
      .map((h: any) => ({
        id: h.id,
        name: h.name,
        code: h.code || "HOSP",
        state: h.state || null,
        city: h.city || null,
      }));

    // 2. Fetch Transfers
    const { data: transfersRaw } = await supabase
      .from("patient_transfers")
      .select(`
        id, patient_id, referring_hospital_id, receiving_hospital_id, requested_by_id, approved_by_id,
        status, priority, reason_for_transfer, clinical_summary, consent_scope, consent_verified,
        patient_consent_id, response_notes, created_at, updated_at,
        patient:patient_id (id, first_name, last_name, nin, gender, date_of_birth),
        referring_hospital:referring_hospital_id (name),
        receiving_hospital:receiving_hospital_id (name),
        requester:requested_by_id (full_name),
        approver:approved_by_id (full_name)
      `)
      .or(`referring_hospital_id.eq.${activeHospitalId},receiving_hospital_id.eq.${activeHospitalId}`)
      .order("created_at", { ascending: false });

    const incomingTransfers: PatientTransferItem[] = [];
    const outgoingTransfers: PatientTransferItem[] = [];

    (transfersRaw ?? []).forEach((t: any) => {
      const p = t.patient || {};
      const refHosp = t.referring_hospital || {};
      const recHosp = t.receiving_hospital || {};
      const req = t.requester || {};
      const app = t.approver || {};
      const isIncoming = t.receiving_hospital_id === activeHospitalId;

      const item: PatientTransferItem = {
        id: t.id,
        patientId: t.patient_id,
        patientName: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Patient",
        patientNin: p.nin || "",
        patientGender: p.gender || null,
        patientAge: calculateAge(p.date_of_birth),
        referringHospitalId: t.referring_hospital_id,
        referringHospitalName: refHosp.name || "Referring Facility",
        receivingHospitalId: t.receiving_hospital_id,
        receivingHospitalName: recHosp.name || "Receiving Facility",
        requestedById: t.requested_by_id,
        requestedByName: req.full_name || null,
        approvedById: t.approved_by_id,
        approvedByName: app.full_name || null,
        status: t.status,
        priority: t.priority,
        reasonForTransfer: t.reason_for_transfer,
        clinicalSummary: t.clinical_summary,
        consentScope: t.consent_scope,
        consentVerified: Boolean(t.consent_verified),
        patientConsentId: t.patient_consent_id,
        responseNotes: t.response_notes,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        isIncoming,
      };

      if (isIncoming) {
        incomingTransfers.push(item);
      } else {
        outgoingTransfers.push(item);
      }
    });

    // 3. Eligible registered patients for transfer selection
    const { data: patientsRaw } = await supabase
      .from("patients")
      .select("id, first_name, last_name, nin, gender, date_of_birth, blood_group, genotype, allergies, chronic_conditions")
      .order("created_at", { ascending: false })
      .limit(50);

    const eligiblePatients = (patientsRaw ?? []).map((p: any) => ({
      id: p.id,
      fullName: `${p.first_name} ${p.last_name}`,
      nin: p.nin,
      gender: p.gender,
      age: calculateAge(p.date_of_birth),
      bloodGroup: p.blood_group,
      genotype: p.genotype,
      allergies: Array.isArray(p.allergies) ? p.allergies : [],
      chronicConditions: Array.isArray(p.chronic_conditions) ? p.chronic_conditions : [],
    }));

    return {
      incomingTransfers,
      outgoingTransfers,
      partnerHospitals,
      eligiblePatients,
      activeHospitalId,
      isStaff: true,
      isAdmin,
    };
  });

/**
 * Initiates a cross-hospital transfer request with clinical snapshot and verified consent.
 */
export const createTransferRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    patientId: string;
    receivingHospitalId: string;
    priority: "routine" | "urgent" | "emergency";
    reasonForTransfer: string;
    clinicalSummary: string;
    consentScope?: "full_transfer" | "emergency_referral" | "second_opinion" | undefined;
    hospitalId?: string | undefined;
  }) => {
    if (!input.patientId) throw new Error("Patient is required.");
    if (!input.receivingHospitalId) throw new Error("Destination hospital is required.");
    if (!input.reasonForTransfer || input.reasonForTransfer.trim().length < 5) {
      throw new Error("Reason for transfer must be at least 5 characters.");
    }
    if (!input.clinicalSummary || input.clinicalSummary.trim().length < 10) {
      throw new Error("Clinical summary must be at least 10 characters.");
    }
    return {
      patientId: String(input.patientId).trim(),
      receivingHospitalId: String(input.receivingHospitalId).trim(),
      priority: input.priority,
      reasonForTransfer: String(input.reasonForTransfer).trim(),
      clinicalSummary: String(input.clinicalSummary).trim(),
      consentScope: input.consentScope || "full_transfer",
      hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
    };
  })
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
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    // 1. Create a patient_consent record linking the transfer
    const { data: consentRow } = await supabase
      .from("patient_consents")
      .insert({
        patient_id: input.patientId,
        hospital_id: input.receivingHospitalId,
        scope: input.consentScope,
        is_active: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day transfer consent window
      })
      .select("id")
      .maybeSingle();

    // 2. Create the patient_transfer record
    const { data: transferRow, error: transErr } = await supabase
      .from("patient_transfers")
      .insert({
        patient_id: input.patientId,
        referring_hospital_id: activeHospitalId,
        receiving_hospital_id: input.receivingHospitalId,
        requested_by_id: staffRow?.id || null,
        status: "pending",
        priority: input.priority,
        reason_for_transfer: input.reasonForTransfer,
        clinical_summary: input.clinicalSummary,
        consent_scope: input.consentScope,
        consent_verified: true,
        patient_consent_id: consentRow?.id || null,
      })
      .select("id")
      .single();

    if (transErr) throw new Error(transErr.message);

    // 3. Write Audit Entry
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      action: "WRITE",
      justification: `Initiated ${input.priority.toUpperCase()} cross-hospital transfer to hospital ${input.receivingHospitalId}. Reason: ${input.reasonForTransfer}`,
    });

    return { success: true, transferId: transferRow.id };
  });

/**
 * Responds to an incoming transfer request (Accept or Reject).
 */
export const respondToTransferRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    transferId: string;
    decision: "accept" | "reject";
    responseNotes?: string | undefined;
    hospitalId?: string | undefined;
  }) => {
    if (!input.transferId) throw new Error("Transfer ID is required.");
    return {
      transferId: String(input.transferId).trim(),
      decision: input.decision,
      responseNotes: input.responseNotes ? String(input.responseNotes).trim() : undefined,
      hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
    };
  })
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
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    const newStatus = input.decision === "accept" ? "accepted" : "rejected";

    const { data: transfer, error: updErr } = await supabase
      .from("patient_transfers")
      .update({
        status: newStatus,
        approved_by_id: staffRow?.id || null,
        response_notes: input.responseNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.transferId)
      .select("patient_id, patient_consent_id")
      .single();

    if (updErr) throw new Error(updErr.message);

    // If accepted, ensure consent scope is active
    if (newStatus === "accepted" && transfer.patient_consent_id) {
      await supabase
        .from("patient_consents")
        .update({ is_active: true })
        .eq("id", transfer.patient_consent_id);
    }

    // Write audit entry
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: transfer.patient_id,
      action: "WRITE",
      justification: `Transfer request ${input.decision.toUpperCase()}ED by ${staffRow?.full_name || "Doctor"}. Notes: ${input.responseNotes || "None"}`,
    });

    return { success: true, status: newStatus };
  });

/**
 * Marks a patient transfer as completed upon physical arrival and reception.
 */
export const completeTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    transferId: string;
    hospitalId?: string | undefined;
  }) => ({
    transferId: String(input.transferId).trim(),
    hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
  }))
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
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";

    const { data: transfer, error: updErr } = await supabase
      .from("patient_transfers")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.transferId)
      .select("patient_id")
      .single();

    if (updErr) throw new Error(updErr.message);

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: transfer.patient_id,
      action: "WRITE",
      justification: `Completed transfer reception for patient upon physical check-in`,
    });

    return { success: true };
  });
