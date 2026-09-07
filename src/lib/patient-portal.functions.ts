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
    name?: string;
    relationship?: string;
    phone?: string;
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
    hospital_id?: string | null;
    accessor_id: string;
    accessor_role: StaffRole | "patient";
    patient_id?: string;
    encounter_id?: string;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null;
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
 * Verifies patient identity (NIN + First Name + Last Name + Date of Birth) and registers their self-service auth account (Prompt 16).
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
      const nin = String(input?.nin ?? "").trim();
      if (!/^[0-9]{11}$/.test(nin)) {
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
  .handler(async ({ data: input }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify that matching patient record exists
    const { data: patientRow, error: pErr } = await (supabaseAdmin as any)
      .from("patients")
      .select("id, nin, first_name, last_name, date_of_birth, user_id, email, phone")
      .eq("nin", input.nin)
      .maybeSingle();

    const genericErrorMsg =
      "Verification failed. The provided NIN, name, or date of birth does not match our hospital records. Please verify your details or register at the front desk.";

    if (pErr || !patientRow) {
      throw new Error(genericErrorMsg);
    }

    // Strict identity match (case-insensitive name & date of birth)
    const matchesFirst = patientRow.first_name.trim().toLowerCase() === input.firstName.toLowerCase();
    const matchesLast = patientRow.last_name.trim().toLowerCase() === input.lastName.toLowerCase();
    const matchesDob = patientRow.date_of_birth === input.dateOfBirth;

    if (!matchesFirst || !matchesLast || !matchesDob) {
      throw new Error(genericErrorMsg);
    }

    // Check if patient already linked to an online user account
    if (patientRow.user_id) {
      throw new Error("This patient record is already linked to an online account. Please sign in instead.");
    }

    // 2. Create Auth User account via Supabase Admin
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
        throw new Error("An account with this email address already exists. Please sign in or use another email.");
      }
      throw new Error(`Account creation error: ${authError?.message || "Failed to create user"}`);
    }

    const newUserId = authData.user.id;

    // 3. Link patients.user_id and update email if not set
    const { error: linkErr } = await (supabaseAdmin as any)
      .from("patients")
      .update({
        user_id: newUserId,
        email: patientRow.email || input.email,
      })
      .eq("id", patientRow.id);

    if (linkErr) {
      throw new Error(`Failed to link patient record: ${linkErr.message}`);
    }

    // 4. Assign patient role in user_roles
    await (supabaseAdmin as any).from("user_roles").insert({
      user_id: newUserId,
      role: "patient",
      is_active: true,
    });

    // 5. Audit Log
    await writeAuditEntry(supabaseAdmin, {
      accessor_id: newUserId,
      accessor_role: "patient",
      patient_id: patientRow.id,
      action: "WRITE",
      justification: `Patient self-service portal account created and verified for NIN ${input.nin.slice(0, 3)}*****${input.nin.slice(-3)}`,
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
