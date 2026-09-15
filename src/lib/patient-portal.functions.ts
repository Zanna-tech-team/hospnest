import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type PatientPortalProfile = {
  id: string;
  nin: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string | null;
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

export type PatientPortalAppointment = {
  id: string;
  hospitalId: string;
  hospitalName: string;
  departmentName: string | null;
  doctorName: string | null;
  appointmentDate: string;
  status: string;
  queueNumber: number | null;
  symptomsSummary: string | null;
  createdAt: string;
};

export type PatientPortalEncounter = {
  id: string;
  hospitalName: string;
  doctorName: string | null;
  createdAt: string;
  closedAt: string | null;
  chiefComplaint: string | null;
  diagnosis: string | null;
  status: string;
};

export type PatientPortalLabResult = {
  id: string;
  hospitalName: string;
  testName: string;
  testCode: string | null;
  sampleType: string | null;
  status: string;
  resultValue: string | null;
  isCritical: boolean;
  orderedByName: string | null;
  technicianName: string | null;
  createdAt: string;
};

export type PatientPortalPrescription = {
  id: string;
  hospitalName: string;
  doctorName: string | null;
  status: string;
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
    dispenseNotes: string | null;
  }>;
};

export type PatientPortalInvoice = {
  id: string;
  invoiceNumber: string;
  hospitalName: string;
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

export type HospitalBookingOption = {
  id: string;
  name: string;
  departments: Array<{ id: string; name: string }>;
  doctors: Array<{ id: string; fullName: string; specialization: string | null; departmentId: string | null }>;
};

export type PatientPortalDashboardResponse = {
  patient: PatientPortalProfile;
  upcomingAppointments: PatientPortalAppointment[];
  recentEncounters: PatientPortalEncounter[];
  recentLabResults: PatientPortalLabResult[];
  activePrescriptions: PatientPortalPrescription[];
  invoices: PatientPortalInvoice[];
  availableHospitals: HospitalBookingOption[];
  counts: {
    appointments: number;
    visits: number;
    labs: number;
    prescriptions: number;
    unpaidBills: number;
    totalUnpaidAmount: number;
  };
};

async function writeAuditEntry(
  supabase: { from: (t: string) => any },
  entry: {
    hospital_id?: string | null | undefined;
    accessor_id: string;
    accessor_role: StaffRole | "patient";
    patient_id?: string | undefined;
    encounter_id?: string | undefined;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null | undefined;
  },
) {
  try {
    await supabase.from("record_audit_logs").insert({
      hospital_id: entry.hospital_id || null,
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
 * Self-service registration for new patients (Prompt 39).
 * Allows members of the public to create an account without pre-existing hospital records.
 * If NIN matches an unlinked record (e.g. registered at front desk previously), links it.
 * If NIN matches an already-linked record, shows a friendly sign-in message.
 */
export const selfRegisterNewPatientAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      nin: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender?: string;
      phone?: string;
      email: string;
      password: string;
      bloodGroup?: string;
      genotype?: string;
      allergies?: string[];
      chronicConditions?: string[];
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelation?: string;
    }) => {
      const nin = String(input?.nin ?? "").trim().replace(/\D/g, "");
      if (nin.length !== 11) {
        throw new Error("A valid 11-digit National Identity Number (NIN) is required.");
      }
      const firstName = String(input?.firstName ?? "").trim();
      const lastName = String(input?.lastName ?? "").trim();
      if (!firstName || !lastName) {
        throw new Error("First name and last name are required.");
      }
      const dateOfBirth = String(input?.dateOfBirth ?? "").trim();
      if (!dateOfBirth) {
        throw new Error("Date of birth is required.");
      }
      const email = String(input?.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) {
        throw new Error("A valid email address is required.");
      }
      const password = String(input?.password ?? "");
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }
      return {
        nin,
        firstName,
        lastName,
        dateOfBirth,
        gender: input.gender ? String(input.gender).trim() : "other",
        phone: input.phone ? String(input.phone).trim() : "",
        email,
        password,
        bloodGroup: input.bloodGroup ? String(input.bloodGroup).trim() : null,
        genotype: input.genotype ? String(input.genotype).trim() : null,
        allergies: Array.isArray(input.allergies) ? input.allergies : [],
        chronicConditions: Array.isArray(input.chronicConditions) ? input.chronicConditions : [],
        emergencyContactName: input.emergencyContactName ? String(input.emergencyContactName).trim() : "",
        emergencyContactPhone: input.emergencyContactPhone ? String(input.emergencyContactPhone).trim() : "",
        emergencyContactRelation: input.emergencyContactRelation ? String(input.emergencyContactRelation).trim() : "",
      };
    },
  )
  .handler(async ({ data: input }): Promise<{
    success: boolean;
    error?: string;
    patientId?: string;
    email?: string;
    userId?: string;
  }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check if patient record with this NIN already exists
    const { data: existingPatient, error: searchErr } = await (supabaseAdmin as any)
      .from("patients")
      .select("id, nin, first_name, last_name, user_id, email, phone")
      .eq("nin", input.nin)
      .maybeSingle();

    if (searchErr) {
      console.error("NIN search error:", searchErr);
    }

    if (existingPatient && existingPatient.user_id) {
      // NIN already linked to an account -> never expose other person's details
      return {
        success: false,
        error: "An account is already linked with this NIN. Please sign in or reset your password.",
      };
    }

    // 2. Create Supabase Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: `${input.firstName} ${input.lastName}`,
        nin: input.nin,
        is_patient: true,
      },
    });

    if (authError || !authData.user) {
      if (authError?.message?.toLowerCase().includes("already registered") || authError?.message?.toLowerCase().includes("already been registered")) {
        return {
          success: false,
          error: "An account with this email address already exists. Please sign in or use a different email.",
        };
      }
      return {
        success: false,
        error: authError?.message || "Failed to create user account. Please try again.",
      };
    }

    const newUserId = authData.user.id;
    let patientId = "";

    const emergencyContactObj = input.emergencyContactName ? {
      name: input.emergencyContactName,
      phone: input.emergencyContactPhone,
      relationship: input.emergencyContactRelation || "Next of Kin",
    } : null;

    if (existingPatient) {
      // Link existing front-desk patient record to new auth account
      patientId = existingPatient.id;
      const { error: linkErr } = await (supabaseAdmin as any)
        .from("patients")
        .update({
          user_id: newUserId,
          email: input.email,
          phone: input.phone || existingPatient.phone,
          gender: input.gender || "other",
          blood_group: input.bloodGroup,
          genotype: input.genotype,
          allergies: input.allergies,
          chronic_conditions: input.chronicConditions,
          emergency_contact: emergencyContactObj,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPatient.id);

      if (linkErr) {
        console.error("Link patient error:", linkErr);
      }
    } else {
      // Create brand new patient record
      const { data: newPatient, error: createPatErr } = await (supabaseAdmin as any)
        .from("patients")
        .insert({
          user_id: newUserId,
          nin: input.nin,
          first_name: input.firstName,
          last_name: input.lastName,
          date_of_birth: input.dateOfBirth,
          gender: input.gender,
          phone: input.phone || null,
          email: input.email,
          blood_group: input.bloodGroup,
          genotype: input.genotype,
          allergies: input.allergies,
          chronic_conditions: input.chronicConditions,
          emergency_contact: emergencyContactObj,
          is_active: true,
        })
        .select("id")
        .single();

      if (createPatErr || !newPatient) {
        return {
          success: false,
          error: `Could not save patient profile: ${createPatErr?.message || "Database error"}`,
        };
      }
      patientId = newPatient.id;
    }

    // 3. Assign role 'patient' in user_roles
    await (supabaseAdmin as any).from("user_roles").upsert({
      user_id: newUserId,
      role: "patient",
      is_active: true,
    }, { onConflict: "user_id,role" });

    // 4. Audit Log
    await writeAuditEntry(supabaseAdmin, {
      accessor_id: newUserId,
      accessor_role: "patient",
      patient_id: patientId,
      action: "WRITE",
      justification: `Patient self-registered public account for NIN ${input.nin.slice(0, 3)}*****${input.nin.slice(-3)}`,
    });

    return {
      success: true,
      patientId,
      userId: newUserId,
      email: input.email,
    };
  });

/**
 * Legacy/Existing Hospital Patient Verification (Prompt 16 path).
 */
export const verifyAndRegisterPatientAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      nin: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      email: string;
      password: string;
    }) => {
      const nin = String(input?.nin ?? "").trim().replace(/\D/g, "");
      if (nin.length !== 11) {
        throw new Error("A valid 11-digit National Identity Number (NIN) is required.");
      }
      const firstName = String(input?.firstName ?? "").trim();
      const lastName = String(input?.lastName ?? "").trim();
      if (!firstName || !lastName) {
        throw new Error("First name and last name are required.");
      }
      const dateOfBirth = String(input?.dateOfBirth ?? "").trim();
      if (!dateOfBirth) {
        throw new Error("Date of birth is required.");
      }
      const email = String(input?.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) {
        throw new Error("A valid email address is required.");
      }
      const password = String(input?.password ?? "");
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }
      return {
        nin,
        firstName,
        lastName,
        dateOfBirth,
        email,
        password,
      };
    },
  )
  .handler(async ({ data: input }): Promise<{
    success: boolean;
    error?: string | undefined;
    patientId?: string | undefined;
    email?: string | undefined;
  }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify that matching patient record exists
    const { data: patientRow, error: pErr } = await (supabaseAdmin as any)
      .from("patients")
      .select("id, nin, first_name, last_name, date_of_birth, user_id, email, phone")
      .eq("nin", input.nin)
      .maybeSingle();

    const genericErrorMsg =
      "Verification failed. The provided NIN, name, or date of birth does not match hospital records. You can choose 'I am a new patient' to register freshly.";

    if (pErr || !patientRow) {
      return { success: false, error: genericErrorMsg };
    }

    const matchesFirst = String(patientRow.first_name ?? "").trim().toLowerCase() === input.firstName.toLowerCase();
    const matchesLast = String(patientRow.last_name ?? "").trim().toLowerCase() === input.lastName.toLowerCase();
    const matchesDob = String(patientRow.date_of_birth ?? "").slice(0, 10) === input.dateOfBirth.slice(0, 10);

    if (!matchesFirst || !matchesLast || !matchesDob) {
      return { success: false, error: genericErrorMsg };
    }

    if (patientRow.user_id) {
      return {
        success: false,
        error: "This patient record is already linked to an online account. Please sign in instead.",
      };
    }

    // 2. Create Auth User account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: `${input.firstName} ${input.lastName}`,
        nin: input.nin,
        is_patient: true,
      },
    });

    if (authError || !authData.user) {
      if (authError?.message?.includes("already been registered")) {
        return {
          success: false,
          error: "An account with this email address already exists. Please sign in or use another email.",
        };
      }
      return {
        success: false,
        error: `Account creation error: ${authError?.message || "Failed to create user"}`,
      };
    }

    const newUserId = authData.user.id;

    // 3. Link patients.user_id
    await (supabaseAdmin as any)
      .from("patients")
      .update({
        user_id: newUserId,
        email: patientRow.email || input.email,
      })
      .eq("id", patientRow.id);

    // 4. Assign patient role in user_roles
    await (supabaseAdmin as any).from("user_roles").upsert({
      user_id: newUserId,
      role: "patient",
      is_active: true,
    }, { onConflict: "user_id,role" });

    // 5. Audit Log
    await writeAuditEntry(supabaseAdmin, {
      accessor_id: newUserId,
      accessor_role: "patient",
      patient_id: patientRow.id,
      action: "WRITE",
      justification: `Patient verified hospital identity and created portal account for NIN ${input.nin.slice(0, 3)}*****${input.nin.slice(-3)}`,
    });

    return {
      success: true,
      patientId: patientRow.id,
      email: input.email,
    };
  });


/**
 * Returns the appropriate redirect route for a logged-in user based on their roles.
 */
export const getAuthUserRoleRedirect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = roleRows ?? [];
    const isPatientOnly = roles.length > 0 && roles.every((r: any) => r.role === "patient");

    if (isPatientOnly) {
      return { redirectPath: "/portal", isPatient: true };
    }

    return { redirectPath: "/front-desk", isPatient: false };
  });

/**
 * Fetches all personal medical records, visits, lab results, prescriptions, invoices, and bookings for the signed-in patient (Prompt 17).
 */
export const getPatientPortalDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PatientPortalDashboardResponse> => {
    const { supabase, userId } = context;

    // 1. Fetch Patient Record for signed-in user
    const { data: patientRow, error: pErr } = await (supabase as any)
      .from("patients")
      .select(`
        id, nin, first_name, last_name, date_of_birth, gender, phone, email,
        blood_group, genotype, allergies, chronic_conditions, emergency_contact,
        insurance_provider, insurance_policy_number, insurance_plan_type, insurance_expiry_date,
        created_at
      `)
      .eq("user_id", userId)
      .maybeSingle();

    if (pErr || !patientRow) {
      throw new Error("No linked patient record found for this account. Please verify your NIN at registration.");
    }

    const patientId = patientRow.id;

    // 2. Fetch Patient Appointments
    const { data: apptRows } = await (supabase as any)
      .from("appointments")
      .select(`
        id, hospital_id, appointment_date, status, queue_number, symptoms_summary, created_at,
        hospital:hospital_id (name),
        department:department_id (name),
        doctor:doctor_id (full_name)
      `)
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: false });

    const appointments: PatientPortalAppointment[] = (apptRows ?? []).map((a: any) => ({
      id: a.id,
      hospitalId: a.hospital_id,
      hospitalName: a.hospital?.name || "Hospital",
      departmentName: a.department?.name || null,
      doctorName: a.doctor?.full_name || null,
      appointmentDate: a.appointment_date,
      status: a.status,
      queueNumber: a.queue_number,
      symptomsSummary: a.symptoms_summary,
      createdAt: a.created_at,
    }));

    // 3. Fetch Closed Encounters (Visit History with diagnoses)
    const { data: encRows } = await (supabase as any)
      .from("encounters")
      .select(`
        id, encounter_status, chief_complaint, diagnosis, created_at, closed_at,
        hospital:hospital_id (name),
        practitioner:practitioner_id (full_name)
      `)
      .eq("patient_id", patientId)
      .in("encounter_status", ["closed", "discharged"])
      .order("created_at", { ascending: false });

    const recentEncounters: PatientPortalEncounter[] = (encRows ?? []).map((e: any) => ({
      id: e.id,
      hospitalName: e.hospital?.name || "Hospital",
      doctorName: e.practitioner?.full_name || null,
      createdAt: e.created_at,
      closedAt: e.closed_at,
      chiefComplaint: e.chief_complaint,
      diagnosis: e.diagnosis,
      status: e.encounter_status,
    }));

    // 4. Fetch Completed Lab Results
    const { data: labRows } = await (supabase as any)
      .from("lab_orders")
      .select(`
        id, test_name, test_code, sample_type, status, result_value, is_critical, created_at,
        hospital:hospital_id (name),
        ordered_by_staff:ordered_by (full_name),
        tech:technician_id (full_name)
      `)
      .eq("patient_id", patientId)
      .in("status", ["completed", "critical"])
      .order("created_at", { ascending: false });

    const recentLabResults: PatientPortalLabResult[] = (labRows ?? []).map((l: any) => ({
      id: l.id,
      hospitalName: l.hospital?.name || "Hospital",
      testName: l.test_name,
      testCode: l.test_code,
      sampleType: l.sample_type,
      status: l.status,
      resultValue: l.result_value,
      isCritical: Boolean(l.is_critical),
      orderedByName: l.ordered_by_staff?.full_name || null,
      technicianName: l.tech?.full_name || null,
      createdAt: l.created_at,
    }));

    // 5. Fetch Prescriptions
    const { data: rxRows } = await (supabase as any)
      .from("prescriptions")
      .select(`
        id, status, notes, created_at,
        hospital:hospital_id (name),
        doctor:doctor_id (full_name),
        prescription_items (
          id, dosage, frequency, duration, quantity_prescribed, quantity_dispensed,
          dispensed_at, dispense_notes,
          drug:drug_id (generic_name, brand_name)
        )
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    const activePrescriptions: PatientPortalPrescription[] = (rxRows ?? []).map((rx: any) => ({
      id: rx.id,
      hospitalName: rx.hospital?.name || "Hospital",
      doctorName: rx.doctor?.full_name || null,
      status: rx.status,
      createdAt: rx.created_at,
      items: (rx.prescription_items ?? []).map((i: any) => ({
        id: i.id,
        drugName: i.drug?.brand_name ? `${i.drug.brand_name} (${i.drug.generic_name})` : i.drug?.generic_name || "Medication",
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        quantityPrescribed: Number(i.quantity_prescribed || 0),
        quantityDispensed: Number(i.quantity_dispensed || 0),
        dispensedAt: i.dispensed_at,
        dispenseNotes: i.dispense_notes,
      })),
    }));

    // 6. Fetch Invoices & Payment History
    const { data: invRows } = await (supabase as any)
      .from("invoices")
      .select(`
        id, invoice_number, total_amount, insurance_coverage_amount, patient_payable_amount,
        status, due_date, created_at,
        hospital:hospital_id (name),
        billing_line_items (id, service_type, description, quantity, unit_price, total_price),
        payments (id, amount_paid, payment_method, transaction_reference, paid_at)
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    let unpaidBillsCount = 0;
    let totalUnpaidAmount = 0;

    const invoices: PatientPortalInvoice[] = (invRows ?? []).map((inv: any) => {
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

      if (balanceDue > 0 && inv.status !== "paid" && inv.status !== "waived") {
        unpaidBillsCount++;
        totalUnpaidAmount += balanceDue;
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number || `INV-${inv.created_at.slice(0, 4)}-${inv.id.slice(0, 6).toUpperCase()}`,
        hospitalName: inv.hospital?.name || "Hospital",
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

    // 7. Fetch Available Hospitals & Departments for Booking Options
    const { data: hospitalRows } = await (supabase as any)
      .from("hospitals")
      .select(`
        id, name,
        departments (id, name),
        staff (id, full_name, specialization, department_id, is_active)
      `)
      .order("name", { ascending: true });

    const availableHospitals: HospitalBookingOption[] = (hospitalRows ?? []).map((h: any) => ({
      id: h.id,
      name: h.name,
      departments: (h.departments ?? []).map((d: any) => ({ id: d.id, name: d.name })),
      doctors: (h.staff ?? [])
        .filter((s: any) => s.is_active)
        .map((s: any) => ({
          id: s.id,
          fullName: s.full_name,
          specialization: s.specialization,
          departmentId: s.department_id,
        })),
    }));

    // 8. Audit Log
    await writeAuditEntry(supabase, {
      accessor_id: userId,
      accessor_role: "patient",
      patient_id: patientId,
      action: "READ",
      justification: "Patient accessed self-service medical portal dashboard",
    });

    return {
      patient: {
        id: patientRow.id,
        nin: patientRow.nin,
        firstName: patientRow.first_name,
        lastName: patientRow.last_name,
        fullName: `${patientRow.first_name} ${patientRow.last_name}`,
        dateOfBirth: patientRow.date_of_birth,
        gender: patientRow.gender,
        phone: patientRow.phone,
        email: patientRow.email,
        bloodGroup: patientRow.blood_group,
        genotype: patientRow.genotype,
        allergies: Array.isArray(patientRow.allergies) ? patientRow.allergies : [],
        chronicConditions: Array.isArray(patientRow.chronic_conditions) ? patientRow.chronic_conditions : [],
        insuranceProvider: patientRow.insurance_provider,
        insurancePolicyNumber: patientRow.insurance_policy_number,
        insurancePlanType: patientRow.insurance_plan_type,
        insuranceExpiryDate: patientRow.insurance_expiry_date,
        emergencyContact: patientRow.emergency_contact || null,
        createdAt: patientRow.created_at,
      },
      upcomingAppointments: appointments,
      recentEncounters,
      recentLabResults,
      activePrescriptions,
      invoices,
      availableHospitals,
      counts: {
        appointments: appointments.length,
        visits: recentEncounters.length,
        labs: recentLabResults.length,
        prescriptions: activePrescriptions.length,
        unpaidBills: unpaidBillsCount,
        totalUnpaidAmount,
      },
    };
  });

/**
 * Books an online appointment from the patient portal (Prompt 18).
 */
export const bookPatientAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      departmentId?: string | undefined;
      doctorId?: string | undefined;
      appointmentDate: string;
      symptomsSummary: string;
    }) => {
      if (!input.hospitalId) throw new Error("Please select a hospital.");
      if (!input.appointmentDate) throw new Error("Please choose an appointment date and time.");
      if (!input.symptomsSummary || input.symptomsSummary.trim().length < 3) {
        throw new Error("Please provide a brief reason or summary of symptoms for your visit.");
      }
      return {
        hospitalId: String(input.hospitalId).trim(),
        departmentId: input.departmentId ? String(input.departmentId).trim() : undefined,
        doctorId: input.doctorId ? String(input.doctorId).trim() : undefined,
        appointmentDate: String(input.appointmentDate).trim(),
        symptomsSummary: String(input.symptomsSummary).trim(),
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    // 1. Fetch patient
    const { data: patientRow, error: pErr } = await (supabase as any)
      .from("patients")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (pErr || !patientRow) throw new Error("Patient profile not found.");

    // 2. Insert Appointment
    const { data: newAppt, error: apptErr } = await (supabase as any)
      .from("appointments")
      .insert({
        hospital_id: input.hospitalId,
        patient_id: patientRow.id,
        department_id: input.departmentId || null,
        doctor_id: input.doctorId || null,
        appointment_date: input.appointmentDate,
        symptoms_summary: input.symptomsSummary,
        status: "booked",
        is_external_booking: true,
        is_walk_in: false,
      })
      .select("id")
      .single();

    if (apptErr) throw new Error(apptErr.message);

    // 3. Write Audit Log
    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: "patient",
      patient_id: patientRow.id,
      action: "WRITE",
      justification: `Patient booked online appointment for ${new Date(input.appointmentDate).toLocaleDateString()}`,
    });

    return {
      success: true,
      appointmentId: newAppt.id,
    };
  });

/**
 * Updates patient editable contact info from the portal (phone, email, emergency contact).
 */
export const updatePatientSelfProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      phone?: string | undefined;
      email?: string | undefined;
      emergencyContact?: {
        name?: string | undefined;
        relationship?: string | undefined;
        phone?: string | undefined;
      } | undefined;
    }) => {
      return {
        phone: input.phone ? String(input.phone).trim() : null,
        email: input.email ? String(input.email).trim().toLowerCase() : null,
        emergencyContact: input.emergencyContact || null,
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { error: updErr } = await (supabase as any)
      .from("patients")
      .update({
        phone: input.phone,
        email: input.email,
        emergency_contact: input.emergencyContact,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updErr) throw new Error(updErr.message);

    return { success: true };
  });

/**
 * Lists verified, active hospitals for self-service signup & booking directory (Prompt 39).
 */
export const getVerifiedHospitalsDirectory = createServerFn({ method: "GET" })
  .validator((input?: { state?: string; search?: string }) => ({
    state: input?.state ? String(input.state).trim() : undefined,
    search: input?.search ? String(input.search).trim() : undefined,
  }))
  .handler(async ({ data: input }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = (supabaseAdmin as any)
      .from("hospitals")
      .select(`
        id, name, hospital_type, state, lga, address, phone, email, is_active,
        departments (id, name, description),
        staff (id, full_name, specialization, department_id, is_active)
      `)
      .order("name", { ascending: true });

    if (input?.state && input.state !== "all") {
      query = query.ilike("state", `%${input.state}%`);
    }

    if (input?.search) {
      query = query.or(`name.ilike.%${input.search}%,address.ilike.%${input.search}%,lga.ilike.%${input.search}%`);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("Error fetching hospitals directory:", error);
      return [];
    }

    return (rows ?? []).map((h: any) => ({
      id: h.id,
      name: h.name,
      type: h.hospital_type || "General Hospital",
      state: h.state || "Federal",
      lga: h.lga || "",
      address: h.address || "Medical District",
      phone: h.phone || "0800-HOSP-NEST",
      email: h.email || "info@hospital.gov.ng",
      departments: (h.departments ?? []).map((d: any) => ({ id: d.id, name: d.name })),
      doctors: (h.staff ?? [])
        .filter((s: any) => s.is_active)
        .map((s: any) => ({
          id: s.id,
          fullName: s.full_name,
          specialization: s.specialization || "General Practitioner",
          departmentId: s.department_id,
        })),
    }));
  });

/**
 * Saves or updates patient consents for selected hospitals (Prompt 39 & 43).
 */
export const savePatientHospitalConsents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalIds: string[];
      scopeType?: string;
      isGlobalShare?: boolean;
    }) => ({
      hospitalIds: Array.isArray(input.hospitalIds) ? input.hospitalIds : [],
      scopeType: input.scopeType || "full",
      isGlobalShare: Boolean(input.isGlobalShare),
    })
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: patientRow } = await (supabase as any)
      .from("patients")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!patientRow) throw new Error("Patient record not found.");

    const patientId = patientRow.id;

    for (const hospitalId of input.hospitalIds) {
      await (supabase as any).from("patient_consents").upsert({
        patient_id: patientId,
        hospital_id: hospitalId,
        scope_type: input.scopeType,
        is_global_share: input.isGlobalShare,
        allow_labs: true,
        allow_prescriptions: true,
        allow_imaging: true,
        allow_clinical_notes: true,
        allow_psychiatric_notes: false,
        allow_sexual_health_notes: false,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }, { onConflict: "patient_id,hospital_id" });
    }

    return { success: true };
  });

/**
 * Calculates doctor booking slots based on weekly shifts or falls back to generic slots (Prompt 39).
 */
export const getHospitalBookingSlots = createServerFn({ method: "GET" })
  .validator((input: { hospitalId: string; doctorId?: string; date: string }) => ({
    hospitalId: String(input.hospitalId),
    doctorId: input.doctorId ? String(input.doctorId) : undefined,
    date: String(input.date),
  }))
  .handler(async ({ data: input }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Standard fallback slots
    const standardSlots = [
      "08:30", "09:00", "09:30", "10:00", "10:30",
      "11:00", "11:30", "13:00", "13:30", "14:00",
      "14:30", "15:00", "15:30", "16:00"
    ];

    try {
      const selectedDate = new Date(input.date);
      const dayOfWeek = selectedDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

      // Check if doctor has a weekly shift for this day
      if (input.doctorId) {
        const { data: shift } = await (supabaseAdmin as any)
          .from("staff_weekly_shifts")
          .select("start_time, end_time, is_off")
          .eq("hospital_id", input.hospitalId)
          .eq("staff_id", input.doctorId)
          .eq("day_of_week", dayOfWeek)
          .maybeSingle();

        if (shift && !shift.is_off && shift.start_time && shift.end_time) {
          // Generate 30 min intervals between shift start and end
          const startHour = parseInt(shift.start_time.split(":")[0], 10);
          const endHour = parseInt(shift.end_time.split(":")[0], 10);
          const generatedSlots: string[] = [];
          for (let h = startHour; h < endHour; h++) {
            generatedSlots.push(`${String(h).padStart(2, "0")}:00`);
            generatedSlots.push(`${String(h).padStart(2, "0")}:30`);
          }
          if (generatedSlots.length > 0) {
            return { slots: generatedSlots, source: "staff_shift" };
          }
        }
      }
    } catch (e) {
      console.warn("Slot calculation warning:", e);
    }

    return { slots: standardSlots, source: "generic_schedule" };
  });

/**
 * Direct Appointment Booking with Reference and Printable Voucher details (Prompt 39).
 */
export const bookDirectOnlineAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      departmentId?: string | undefined;
      doctorId?: string | undefined;
      date: string;
      timeSlot: string;
      symptomsSummary: string;
    }) => {
      if (!input.hospitalId) throw new Error("Please select a hospital.");
      if (!input.date || !input.timeSlot) throw new Error("Please select an appointment date and time slot.");
      if (!input.symptomsSummary || input.symptomsSummary.trim().length < 3) {
        throw new Error("Please provide a short description of your symptoms or visit reason.");
      }
      return {
        hospitalId: String(input.hospitalId).trim(),
        departmentId: input.departmentId ? String(input.departmentId).trim() : null,
        doctorId: input.doctorId ? String(input.doctorId).trim() : null,
        date: String(input.date).trim(),
        timeSlot: String(input.timeSlot).trim(),
        symptomsSummary: String(input.symptomsSummary).trim(),
      };
    }
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: patientRow } = await (supabase as any)
      .from("patients")
      .select("id, first_name, last_name, phone, email, nin")
      .eq("user_id", userId)
      .single();

    if (!patientRow) throw new Error("Patient profile not found. Please complete registration.");

    // Fetch hospital details
    const { data: hospitalRow } = await (supabase as any)
      .from("hospitals")
      .select("id, name, address, phone, state, lga")
      .eq("id", input.hospitalId)
      .single();

    const hospitalName = hospitalRow?.name || "HospNest Partner Hospital";
    const bookingReference = `HN-APT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullAppointmentTimestamp = `${input.date}T${input.timeSlot}:00`;

    // 1. Create appointment
    const { data: newAppt, error: apptErr } = await (supabase as any)
      .from("appointments")
      .insert({
        hospital_id: input.hospitalId,
        patient_id: patientRow.id,
        department_id: input.departmentId,
        doctor_id: input.doctorId,
        appointment_date: fullAppointmentTimestamp,
        symptoms_summary: input.symptomsSummary,
        status: "booked",
        is_external_booking: true,
        booking_reference: bookingReference,
        booking_source: "patient_portal",
        is_walk_in: false,
      })
      .select("id, created_at")
      .single();

    if (apptErr) throw new Error(apptErr.message);

    // 2. Ensure patient consent exists for this hospital
    await (supabase as any).from("patient_consents").upsert({
      patient_id: patientRow.id,
      hospital_id: input.hospitalId,
      scope_type: "full",
      allow_labs: true,
      allow_prescriptions: true,
      allow_imaging: true,
      allow_clinical_notes: true,
      allow_psychiatric_notes: false,
      allow_sexual_health_notes: false,
      revoked_at: null,
      created_at: new Date().toISOString(),
    }, { onConflict: "patient_id,hospital_id" });

    // 3. Audit log
    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: "patient",
      patient_id: patientRow.id,
      action: "WRITE",
      justification: `Direct online appointment booked with reference ${bookingReference}`,
    });

    return {
      success: true,
      appointmentId: newAppt.id,
      bookingReference,
      hospitalName,
      hospitalAddress: hospitalRow?.address || "Hospital Address",
      hospitalPhone: hospitalRow?.phone || "0800-HOSP-NEST",
      appointmentDate: input.date,
      timeSlot: input.timeSlot,
      patientName: `${patientRow.first_name} ${patientRow.last_name}`,
      symptomsSummary: input.symptomsSummary,
      createdAt: newAppt.created_at,
    };
  });

/**
 * Updates Patient Privacy & Record Sharing toggles (Prompt 43).
 */
export const updatePatientSharingConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      isSharingActive: boolean;
      allowLabs?: boolean;
      allowPrescriptions?: boolean;
      allowImaging?: boolean;
      allowClinicalNotes?: boolean;
      allowPsychiatricNotes?: boolean;
      allowSexualHealthNotes?: boolean;
      scopeType?: string;
    }) => input
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: patientRow } = await (supabase as any)
      .from("patients")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!patientRow) throw new Error("Patient not found.");

    await (supabase as any).from("patient_consents").upsert({
      patient_id: patientRow.id,
      hospital_id: input.hospitalId,
      revoked_at: input.isSharingActive ? null : new Date().toISOString(),
      allow_labs: input.allowLabs ?? true,
      allow_prescriptions: input.allowPrescriptions ?? true,
      allow_imaging: input.allowImaging ?? true,
      allow_clinical_notes: input.allowClinicalNotes ?? true,
      allow_psychiatric_notes: Boolean(input.allowPsychiatricNotes),
      allow_sexual_health_notes: Boolean(input.allowSexualHealthNotes),
      scope_type: input.scopeType || "full",
      updated_at: new Date().toISOString(),
    }, { onConflict: "patient_id,hospital_id" });

    // Write audit log
    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: "patient",
      patient_id: patientRow.id,
      action: "WRITE",
      justification: `Patient updated record sharing consent for hospital ${input.hospitalId}: Sharing = ${input.isSharingActive}`,
    });

    return { success: true };
  });

/**
 * Access Transparency Log for Patient Portal (Prompt 43).
 */
export const getPatientAccessLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: patientRow } = await (supabase as any)
      .from("patients")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!patientRow) return [];

    const { data: logs } = await (supabase as any)
      .from("record_audit_logs")
      .select(`
        id, action, justification, created_at, accessor_role,
        hospital:hospital_id (name)
      `)
      .eq("patient_id", patientRow.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return (logs ?? []).map((l: any) => ({
      id: l.id,
      action: l.action,
      role: l.accessor_role || "Staff",
      hospitalName: l.hospital?.name || "HospNest Network",
      justification: l.justification || "Clinical review",
      timestamp: l.created_at,
      isBreakGlass: l.action === "BREAK_GLASS_OVERRIDE" || (l.justification && l.justification.toLowerCase().includes("break-glass")),
    }));
  });

/**
 * Returns comprehensive privacy and record sharing configuration for the signed-in patient.
 */
export const getPatientPrivacySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: patientRow } = await (supabase as any)
      .from("patients")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!patientRow) throw new Error("Patient record not found.");

    // Fetch all hospitals where patient has encounters or appointments
    const [{ data: encHospitals }, { data: apptHospitals }, { data: allHospitals }, { data: consents }] =
      await Promise.all([
        (supabase as any).from("encounters").select("hospital_id, hospitals(id, name, state)").eq("patient_id", patientRow.id),
        (supabase as any).from("appointments").select("hospital_id, hospitals(id, name, state)").eq("patient_id", patientRow.id),
        (supabase as any).from("hospitals").select("id, name, state").eq("is_verified", true).limit(20),
        (supabase as any).from("patient_consents").select("*").eq("patient_id", patientRow.id),
      ]);

    const hospitalMap = new Map<string, { id: string; name: string; state: string }>();

    (allHospitals ?? []).forEach((h: any) => {
      if (h.id) hospitalMap.set(h.id, { id: h.id, name: h.name, state: h.state || "Nigeria" });
    });
    (encHospitals ?? []).forEach((e: any) => {
      if (e.hospitals?.id) hospitalMap.set(e.hospitals.id, { id: e.hospitals.id, name: e.hospitals.name, state: e.hospitals.state || "Nigeria" });
    });
    (apptHospitals ?? []).forEach((a: any) => {
      if (a.hospitals?.id) hospitalMap.set(a.hospitals.id, { id: a.hospitals.id, name: a.hospitals.name, state: a.hospitals.state || "Nigeria" });
    });

    const consentMap = new Map<string, any>();
    let globalShare = true;

    (consents ?? []).forEach((c: any) => {
      if (c.hospital_id) {
        consentMap.set(c.hospital_id, c);
      }
      if (c.is_global_share !== undefined && c.is_global_share !== null) {
        globalShare = Boolean(c.is_global_share);
      }
    });

    const hospitalConsents = Array.from(hospitalMap.values()).map((h) => {
      const c = consentMap.get(h.id);
      const isRevoked = Boolean(c?.revoked_at) || c?.status === "revoked";
      return {
        hospitalId: h.id,
        hospitalName: h.name,
        state: h.state,
        isSharingActive: c ? !isRevoked : true,
        allowLabs: c?.allow_labs ?? true,
        allowPrescriptions: c?.allow_prescriptions ?? true,
        allowImaging: c?.allow_imaging ?? true,
        allowClinicalNotes: c?.allow_clinical_notes ?? true,
        allowMaternity: c?.allow_maternity ?? true,
        allowSurgeries: c?.allow_surgeries ?? true,
        allowPsychiatricNotes: Boolean(c?.allow_psychiatric_notes),
        allowSexualHealthNotes: Boolean(c?.allow_sexual_health_notes),
        scopeType: c?.scope_type || "full",
        updatedAt: c?.updated_at || null,
      };
    });

    // Access logs
    const { data: logs } = await (supabase as any)
      .from("record_audit_logs")
      .select(`
        id, action, justification, created_at, accessor_role,
        hospital:hospital_id (name)
      `)
      .eq("patient_id", patientRow.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const accessLogs = (logs ?? []).map((l: any) => ({
      id: l.id,
      action: l.action,
      role: l.accessor_role || "Staff",
      hospitalName: l.hospital?.name || "HospNest Network",
      justification: l.justification || "Clinical examination",
      timestamp: l.created_at,
      isBreakGlass: l.action === "BREAK_GLASS_OVERRIDE" || (l.justification && l.justification.toLowerCase().includes("break-glass")),
    }));

    return {
      isGlobalShare: globalShare,
      hospitals: hospitalConsents,
      accessLogs,
    };
  });

/**
 * Updates the master switch for Global Health Record Sharing.
 */
export const updateGlobalSharingConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { isGlobalShare: boolean }) => ({
    isGlobalShare: Boolean(input.isGlobalShare),
  }))
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context;

    const { data: patientRow } = await (supabase as any)
      .from("patients")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!patientRow) throw new Error("Patient record not found.");

    await (supabase as any)
      .from("patient_consents")
      .update({ is_global_share: input.isGlobalShare })
      .eq("patient_id", patientRow.id);

    await writeAuditEntry(supabase, {
      accessor_id: userId,
      accessor_role: "patient",
      patient_id: patientRow.id,
      action: "WRITE",
      justification: `Patient changed Global Health Record Sharing to: ${input.isGlobalShare ? "ENABLED" : "DISABLED"}`,
    });

    return { success: true };
  });

