import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type PatientDemographics = {
  id: string;
  nin: string;
  isNinMasked: boolean;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string | null;
  age: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  allergies: string[];
  chronicConditions: string[];
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insurancePlanType: string | null;
  insuranceExpiryDate: string | null;
  emergencyContact: {
    name?: string | undefined;
    relationship?: string | undefined;
    phone?: string | undefined;
  } | null;
  createdAt: string;
};

export type PatientEncounterItem = {
  id: string;
  createdAt: string;
  closedAt: string | null;
  status: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  clinicalNotes: string | null;
  psychiatricNotes: string | null;
  practitionerName: string | null;
  nurseName: string | null;
  departmentName: string | null;
  wardName: string | null;
  isBreakGlass: boolean;
};

export type PatientVitalItem = {
  id: string;
  encounterId: string;
  recordedAt: string;
  systolicBp: number | null;
  diastolicBp: number | null;
  pulseRate: number | null;
  bodyTemperature: number | null;
  respiratoryRate: number | null;
  spo2: number | null;
  weightKg: number | null;
  heightCm: number | null;
  painScore: number | null;
  recordedByName: string | null;
};

export type PatientLabOrderItem = {
  id: string;
  encounterId: string;
  testName: string;
  testCode: string | null;
  sampleType: string | null;
  status: string;
  resultValue: string | null;
  isCritical: boolean;
  resultFileUrl: string | null;
  orderedByName: string | null;
  technicianName: string | null;
  createdAt: string;
};

export type PatientPrescriptionItem = {
  id: string;
  encounterId: string;
  doctorName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    drugName: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    quantityPrescribed: number;
    quantityDispensed: number;
    dispensedAt: string | null;
    dispensedByName: string | null;
    dispenseNotes: string | null;
  }>;
};

export type PatientInvoiceItem = {
  id: string;
  invoiceNumber: string;
  encounterId: string;
  totalAmount: number;
  insuranceCoverageAmount: number;
  patientPayableAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
  lineItems: Array<{
    id: string;
    serviceType: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  payments: Array<{
    id: string;
    amountPaid: number;
    paymentMethod: string;
    transactionReference: string | null;
    paidAt: string;
  }>;
};

export type PatientConsentStatus = {
  id: string | null;
  isActive: boolean;
  expiresAt: string | null;
  scope: string;
  isBreakGlass?: boolean | undefined;
};

export type PatientProfileData = {
  patient: PatientDemographics;
  consent: PatientConsentStatus;
  encounters: PatientEncounterItem[];
  vitals: PatientVitalItem[];
  labOrders: PatientLabOrderItem[];
  prescriptions: PatientPrescriptionItem[];
  invoices: PatientInvoiceItem[];
  isClinical: boolean;
  callerRole: StaffRole;
  activeHospitalId: string;
  hospitalName: string;
};

const SYSTEM_AUDIT_PATIENT_ID = "00000000-0000-0000-0000-000000000000";

function maskNin(nin: string): string {
  if (!nin || nin.length < 11) return nin;
  return `${nin.slice(0, 3)}*****${nin.slice(8)}`;
}

function calculateAge(dob: string | null): string {
  if (!dob) return "Unknown";
  try {
    const birth = new Date(dob);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      years--;
    }
    if (years < 1) {
      const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      return months <= 1 ? "1 month" : `${months} mos`;
    }
    return `${years} yrs`;
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
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null | undefined;
  },
) {
  try {
    await supabase.from("record_audit_logs").insert({
      hospital_id: entry.hospital_id,
      accessor_id: entry.accessor_id,
      accessor_role: entry.accessor_role,
      patient_id: entry.patient_id || SYSTEM_AUDIT_PATIENT_ID,
      action: entry.action,
      justification: entry.justification || null,
    });
  } catch (err) {
    console.warn("Audit log notice:", err);
  }
}

/**
 * Fetches comprehensive patient profile with clinical privacy masking, consent, and audit logging.
 */
export const getPatientProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      patientId: string;
      hospitalId?: string | undefined;
    }) => {
      return {
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
      };
    },
  )
  .handler(async ({ context, data: input }): Promise<PatientProfileData> => {
    const { supabase, userId } = context;

    // 1. Get caller's active hospital roles
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) {
      throw new Error("You do not have access to any hospital.");
    }

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const hospitalName = (matchedRole as any)?.hospitals?.name || "Hospital";
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";
    const isSuper = roles.some((r: any) => r.role === "super_admin");
    const isClinical =
      isSuper || ["doctor", "nurse", "lab_tech", "pharmacist", "hospital_admin"].includes(callerRole);

    // 2. Query patient record
    const { data: patientData, error: patientError } = await supabase
      .from("patients")
      .select("*")
      .eq("id", input.patientId)
      .single();

    if (patientError || !patientData) {
      throw new Error("Patient record not found.");
    }

    // 3. Query consent for this hospital
    const { data: consentData } = await supabase
      .from("patient_consents")
      .select("*")
      .eq("hospital_id", activeHospitalId)
      .eq("patient_id", input.patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isBreakGlassActive =
      Boolean(consentData?.is_active) &&
      consentData?.scope === "emergency_break_glass" &&
      (!consentData?.expires_at || new Date(consentData.expires_at).getTime() > Date.now());

    const consentStatus: PatientConsentStatus = {
      id: consentData?.id || null,
      isActive: Boolean(consentData?.is_active),
      expiresAt: consentData?.expires_at || null,
      scope: consentData?.scope || "full_access",
      isBreakGlass: isBreakGlassActive,
    };

    // 4. Query encounters for this hospital
    const { data: encountersRaw } = await supabase
      .from("encounters")
      .select(`
        id, created_at, closed_at, encounter_status, chief_complaint, diagnosis, clinical_notes, psychiatric_notes, is_break_glass,
        practitioner:practitioner_id(full_name),
        nurse:nurse_id(full_name),
        department:department_id(name),
        ward:ward_id(name)
      `)
      .eq("hospital_id", activeHospitalId)
      .eq("patient_id", input.patientId)
      .order("created_at", { ascending: false });

    const encounterIds = (encountersRaw ?? []).map((e: any) => e.id);

    // 5. Query triage vitals
    let vitalsList: PatientVitalItem[] = [];
    if (encounterIds.length > 0) {
      const { data: vitalsRaw } = await supabase
        .from("triage_vitals")
        .select(`
          id, encounter_id, recorded_at, systolic_bp, diastolic_bp, pulse_rate, body_temperature,
          respiratory_rate, spo2, weight_kg, height_cm, pain_score,
          recorder:recorded_by(full_name)
        `)
        .in("encounter_id", encounterIds)
        .order("recorded_at", { ascending: false });

      vitalsList = (vitalsRaw ?? []).map((v: any) => ({
        id: v.id,
        encounterId: v.encounter_id,
        recordedAt: v.recorded_at,
        systolicBp: v.systolic_bp,
        diastolicBp: v.diastolic_bp,
        pulseRate: v.pulse_rate,
        bodyTemperature: v.body_temperature,
        respiratoryRate: v.respiratory_rate,
        spo2: v.spo2,
        weightKg: v.weight_kg,
        heightCm: v.height_cm,
        painScore: v.pain_score,
        recordedByName: v.recorder?.full_name || null,
      }));
    }

    // 6. Query lab orders
    let labOrdersList: PatientLabOrderItem[] = [];
    if (encounterIds.length > 0) {
      const { data: labsRaw } = await supabase
        .from("lab_orders")
        .select(`
          id, encounter_id, created_at, status, result_value, is_critical, result_file_url, sample_type,
          test:test_id(name, test_code),
          ordered_by_staff:ordered_by(full_name),
          tech:technician_id(full_name)
        `)
        .in("encounter_id", encounterIds)
        .order("created_at", { ascending: false });

      labOrdersList = (labsRaw ?? []).map((l: any) => ({
        id: l.id,
        encounterId: l.encounter_id,
        testName: l.test?.name || "Diagnostic Lab Test",
        testCode: l.test?.test_code || null,
        sampleType: l.sample_type,
        status: l.status,
        resultValue: isClinical ? l.result_value : null,
        isCritical: Boolean(l.is_critical),
        resultFileUrl: isClinical ? l.result_file_url : null,
        orderedByName: l.ordered_by_staff?.full_name || null,
        technicianName: l.tech?.full_name || null,
        createdAt: l.created_at,
      }));
    }

    // 7. Query prescriptions
    let prescriptionsList: PatientPrescriptionItem[] = [];
    if (encounterIds.length > 0) {
      const { data: rxRaw } = await supabase
        .from("prescriptions")
        .select(`
          id, encounter_id, status, notes, created_at,
          doctor:doctor_id(full_name),
          prescription_items(
            id, dosage, frequency, duration, quantity_prescribed, quantity_dispensed, dispensed_at, dispense_notes,
            dispensed_by_staff:dispensed_by(full_name),
            drug:drug_id(brand_name, generic_name)
          )
        `)
        .in("encounter_id", encounterIds)
        .order("created_at", { ascending: false });

      prescriptionsList = (rxRaw ?? []).map((rx: any) => ({
        id: rx.id,
        encounterId: rx.encounter_id,
        doctorName: rx.doctor?.full_name || null,
        status: rx.status,
        notes: isClinical ? rx.notes : null,
        createdAt: rx.created_at,
        items: (rx.prescription_items ?? []).map((item: any) => ({
          id: item.id,
          drugName: item.drug ? `${item.drug.brand_name} (${item.drug.generic_name})` : "Prescribed Medication",
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantityPrescribed: item.quantity_prescribed,
          quantityDispensed: item.quantity_dispensed,
          dispensedAt: item.dispensed_at,
          dispensedByName: item.dispensed_by_staff?.full_name || null,
          dispenseNotes: item.dispense_notes || null,
        })),
      }));
    }

    // 8. Query Invoices
    let invoicesList: PatientInvoiceItem[] = [];
    if (encounterIds.length > 0) {
      const { data: invRaw } = await (supabase as any)
        .from("invoices")
        .select(`
          id, invoice_number, encounter_id, total_amount, insurance_coverage_amount, patient_payable_amount,
          status, due_date, created_at,
          billing_line_items (id, service_type, description, quantity, unit_price, total_price),
          payments (id, amount_paid, payment_method, transaction_reference, paid_at)
        `)
        .in("encounter_id", encounterIds)
        .order("created_at", { ascending: false });

      invoicesList = (invRaw ?? []).map((inv: any) => {
        const lines = (inv.billing_line_items ?? []).map((l: any) => ({
          id: l.id,
          serviceType: l.service_type || "general",
          description: l.description || null,
          quantity: Number(l.quantity || 1),
          unitPrice: Number(l.unit_price || 0),
          totalPrice: Number(l.total_price || 0),
        }));

        const payments = (inv.payments ?? []).map((p: any) => ({
          id: p.id,
          amountPaid: Number(p.amount_paid || 0),
          paymentMethod: p.payment_method || "cash",
          transactionReference: p.transaction_reference || null,
          paidAt: p.paid_at,
        }));

        const totalPaid = payments.reduce((acc: number, p: any) => acc + p.amountPaid, 0);
        const totalAmt = Number(inv.total_amount || 0);
        const insCov = Number(inv.insurance_coverage_amount || 0);
        const patPayable = Number(inv.patient_payable_amount || Math.max(0, totalAmt - insCov));
        const balanceDue = Math.max(0, patPayable - totalPaid);

        return {
          id: inv.id,
          invoiceNumber: inv.invoice_number || `INV-${inv.created_at.slice(0, 4)}-${inv.id.slice(0, 6).toUpperCase()}`,
          encounterId: inv.encounter_id,
          totalAmount: totalAmt,
          insuranceCoverageAmount: insCov,
          patientPayableAmount: patPayable,
          amountPaid: totalPaid,
          balanceDue,
          status: inv.status,
          dueDate: inv.due_date,
          createdAt: inv.created_at,
          lineItems: lines,
          payments,
        };
      });
    }

    // Format encounters with clinical masking
    const encountersList: PatientEncounterItem[] = (encountersRaw ?? []).map((e: any) => ({
      id: e.id,
      createdAt: e.created_at,
      closedAt: e.closed_at,
      status: e.encounter_status,
      chiefComplaint: e.chief_complaint,
      diagnosis: isClinical ? e.diagnosis : "Restricted to clinical staff",
      clinicalNotes: isClinical ? e.clinical_notes : null,
      psychiatricNotes: isClinical ? e.psychiatric_notes : null,
      practitionerName: e.practitioner?.full_name || null,
      nurseName: e.nurse?.full_name || null,
      departmentName: e.department?.name || null,
      wardName: e.ward?.name || null,
      isBreakGlass: Boolean(e.is_break_glass),
    }));

    // Demographics formatting
    const demographics: PatientDemographics = {
      id: patientData.id,
      nin: isClinical ? patientData.nin : maskNin(patientData.nin),
      isNinMasked: !isClinical,
      firstName: patientData.first_name,
      lastName: patientData.last_name,
      fullName: `${patientData.first_name} ${patientData.last_name}`,
      dateOfBirth: patientData.date_of_birth,
      age: calculateAge(patientData.date_of_birth),
      gender: patientData.gender,
      phone: patientData.phone,
      email: patientData.email,
      bloodGroup: patientData.blood_group,
      genotype: patientData.genotype,
      allergies: Array.isArray(patientData.allergies) ? patientData.allergies : [],
      chronicConditions: Array.isArray(patientData.chronic_conditions) ? patientData.chronic_conditions : [],
      insuranceProvider: (patientData as any).insurance_provider || null,
      insurancePolicyNumber: (patientData as any).insurance_policy_number || null,
      insurancePlanType: (patientData as any).insurance_plan_type || null,
      insuranceExpiryDate: (patientData as any).insurance_expiry_date || null,
      emergencyContact: (patientData.emergency_contact as any) || null,
      createdAt: patientData.created_at,
    };

    // 9. Write audit log entry
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      action: "READ",
      justification: `Accessed patient profile for ${demographics.fullName} (NIN: ${isClinical ? patientData.nin : maskNin(patientData.nin)})`,
    });

    return {
      patient: demographics,
      consent: consentStatus,
      encounters: encountersList,
      vitals: vitalsList,
      labOrders: labOrdersList,
      prescriptions: prescriptionsList,
      invoices: invoicesList,
      isClinical,
      callerRole,
      activeHospitalId,
      hospitalName,
    };
  });

/**
 * Updates patient demographics, emergency contact, allergies, and blood group.
 * Allowed for front desk, hospital admins, super admins, and clinical staff.
 */
export const updatePatientDemographics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      patientId: string;
      hospitalId?: string | undefined;
      phone?: string | undefined;
      email?: string | undefined;
      bloodGroup?: string | undefined;
      genotype?: string | undefined;
      allergies?: string[] | undefined;
      chronicConditions?: string[] | undefined;
      insuranceProvider?: string | undefined;
      insurancePolicyNumber?: string | undefined;
      insurancePlanType?: string | undefined;
      insuranceExpiryDate?: string | undefined;
      emergencyContact?: {
        name?: string | undefined;
        relationship?: string | undefined;
        phone?: string | undefined;
      } | undefined;
    }) => {
      return {
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        phone: input.phone ? String(input.phone).trim() : null,
        email: input.email ? String(input.email).trim() : null,
        bloodGroup: input.bloodGroup ? String(input.bloodGroup).trim() : null,
        genotype: input.genotype ? String(input.genotype).trim() : null,
        allergies: input.allergies || [],
        chronicConditions: input.chronicConditions || [],
        insuranceProvider: input.insuranceProvider ? String(input.insuranceProvider).trim() : null,
        insurancePolicyNumber: input.insurancePolicyNumber ? String(input.insurancePolicyNumber).trim() : null,
        insurancePlanType: input.insurancePlanType ? String(input.insurancePlanType).trim() : null,
        insuranceExpiryDate: input.insuranceExpiryDate ? String(input.insuranceExpiryDate).trim() : null,
        emergencyContact: input.emergencyContact || null,
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
    if (roles.length === 0) {
      throw new Error("Unauthorized to edit patient data.");
    }

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "front_desk";

    // Update patient table
    const { error: updateError } = await (supabase as any)
      .from("patients")
      .update({
        phone: input.phone,
        email: input.email,
        blood_group: input.bloodGroup,
        genotype: input.genotype,
        allergies: input.allergies,
        chronic_conditions: input.chronicConditions,
        insurance_provider: input.insuranceProvider,
        insurance_policy_number: input.insurancePolicyNumber,
        insurance_plan_type: input.insurancePlanType,
        insurance_expiry_date: input.insuranceExpiryDate,
        emergency_contact: input.emergencyContact,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.patientId);

    if (updateError) {
      throw new Error(`Failed to update patient: ${updateError.message}`);
    }

    // Write audit log
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      action: "WRITE",
      justification: "Updated patient demographics and clinical profile alerts",
    });

    return { success: true };
  });

/**
 * Grants or revokes patient consent for this hospital (audited).
 */
export const togglePatientConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      patientId: string;
      hospitalId?: string | undefined;
      isActive: boolean;
      expiresAt?: string | undefined;
    }) => {
      return {
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        isActive: Boolean(input.isActive),
        expiresAt: input.expiresAt ? String(input.expiresAt).trim() : null,
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
    if (roles.length === 0) {
      throw new Error("Unauthorized.");
    }

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "front_desk";

    // Check existing consent row
    const { data: existingConsent } = await supabase
      .from("patient_consents")
      .select("id")
      .eq("hospital_id", activeHospitalId)
      .eq("patient_id", input.patientId)
      .maybeSingle();

    if (existingConsent) {
      const { error: updateErr } = await supabase
        .from("patient_consents")
        .update({
          is_active: input.isActive,
          expires_at: input.expiresAt,
          granted_by: userId,
        })
        .eq("id", existingConsent.id);

      if (updateErr) throw new Error(updateErr.message);
    } else {
      const { error: insertErr } = await supabase
        .from("patient_consents")
        .insert({
          hospital_id: activeHospitalId,
          patient_id: input.patientId,
          is_active: input.isActive,
          expires_at: input.expiresAt,
          granted_by: userId,
          scope: "full_access",
        });

      if (insertErr) throw new Error(insertErr.message);
    }

    // Write audit log
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      action: "WRITE",
      justification: input.isActive
        ? "Granted patient medical record sharing consent to this hospital"
        : "Revoked patient medical record consent for this hospital",
    });

    return { success: true, isActive: input.isActive };
  });

/**
 * Grants emergency break-glass access to a patient record for 4 hours (Prompt 24).
 * Enforces a minimum 6-character clinical justification and records an immutable BREAK_GLASS_OVERRIDE audit event.
 */
export const requestBreakGlassAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      patientId: string;
      hospitalId?: string | undefined;
      justification: string;
    }) => {
      const justification = String(input.justification || "").trim();
      if (justification.length < 6) {
        throw new Error("Emergency justification is required and must be at least 6 characters.");
      }
      return {
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        justification,
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) {
      throw new Error("You must be an active hospital staff member to execute break-glass access.");
    }

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Grant 4 hours of emergency break glass
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    const { data: existingConsent } = await supabaseAdmin
      .from("patient_consents")
      .select("id")
      .eq("hospital_id", activeHospitalId)
      .eq("patient_id", input.patientId)
      .maybeSingle();

    if (existingConsent) {
      await supabaseAdmin
        .from("patient_consents")
        .update({
          is_active: true,
          expires_at: expiresAt,
          granted_by: userId,
          scope: "emergency_break_glass",
        })
        .eq("id", existingConsent.id);
    } else {
      await supabaseAdmin.from("patient_consents").insert({
        hospital_id: activeHospitalId,
        patient_id: input.patientId,
        is_active: true,
        expires_at: expiresAt,
        granted_by: userId,
        scope: "emergency_break_glass",
      });
    }

    // Write immutable BREAK_GLASS_OVERRIDE audit log
    await writeAuditEntry(supabaseAdmin, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      action: "BREAK_GLASS_OVERRIDE",
      justification: `[EMERGENCY BREAK-GLASS OVERRIDE] ${input.justification}`,
    });

    return {
      success: true,
      grantedUntil: expiresAt,
      message: "Emergency access granted. All record interactions are being audited.",
    };
  });
