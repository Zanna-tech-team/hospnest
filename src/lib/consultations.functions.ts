import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type DiagnosisItem = {
  code: string;
  name: string;
  category: string;
};

export const COMMON_DIAGNOSES: DiagnosisItem[] = [
  { code: "B50.9", name: "Plasmodium falciparum malaria, unspecified", category: "Infectious Diseases" },
  { code: "B54", name: "Unspecified malaria", category: "Infectious Diseases" },
  { code: "A01.0", name: "Typhoid fever", category: "Infectious Diseases" },
  { code: "A09", name: "Infectious gastroenteritis and colitis, unspecified", category: "Gastrointestinal" },
  { code: "I10", name: "Essential (primary) hypertension", category: "Cardiovascular" },
  { code: "I11.9", name: "Hypertensive heart disease without heart failure", category: "Cardiovascular" },
  { code: "E11.9", name: "Type 2 diabetes mellitus without complications", category: "Endocrine & Metabolic" },
  { code: "E10.9", name: "Type 1 diabetes mellitus without complications", category: "Endocrine & Metabolic" },
  { code: "J00", name: "Acute nasopharyngitis (common cold)", category: "Respiratory" },
  { code: "J02.9", name: "Acute pharyngitis, unspecified", category: "Respiratory" },
  { code: "J06.9", name: "Acute upper respiratory infection, unspecified", category: "Respiratory" },
  { code: "J18.9", name: "Pneumonia, unspecified organism", category: "Respiratory" },
  { code: "J45.909", name: "Unspecified asthma, uncomplicated", category: "Respiratory" },
  { code: "J20.9", name: "Acute bronchitis, unspecified", category: "Respiratory" },
  { code: "N39.0", name: "Urinary tract infection, site not specified", category: "Genitourinary" },
  { code: "D57.1", name: "Sickle-cell disease without crisis", category: "Hematology" },
  { code: "D57.0", name: "Sickle-cell anemia with crisis (vaso-occlusive)", category: "Hematology" },
  { code: "D50.9", name: "Iron deficiency anemia, unspecified", category: "Hematology" },
  { code: "K29.7", name: "Gastritis, unspecified", category: "Gastrointestinal" },
  { code: "K21.9", name: "Gastro-esophageal reflux disease without esophagitis", category: "Gastrointestinal" },
  { code: "K35.80", name: "Unspecified acute appendicitis", category: "Gastrointestinal" },
  { code: "K80.20", name: "Calculus of gallbladder without cholecystitis", category: "Gastrointestinal" },
  { code: "G43.909", name: "Migraine, unspecified, not intractable", category: "Neurological" },
  { code: "G44.209", name: "Tension-type headache, unspecified", category: "Neurological" },
  { code: "M54.5", name: "Low back pain", category: "Musculoskeletal" },
  { code: "M25.50", name: "Pain in unspecified joint", category: "Musculoskeletal" },
  { code: "L30.9", name: "Dermatitis, unspecified", category: "Dermatology" },
  { code: "L03.90", name: "Cellulitis, unspecified", category: "Dermatology" },
  { code: "H10.9", name: "Unspecified conjunctivitis", category: "Ophthalmology" },
  { code: "H66.90", name: "Otitis media, unspecified", category: "ENT" },
  { code: "F32.9", name: "Major depressive disorder, single episode", category: "Mental Health" },
  { code: "F41.1", name: "Generalized anxiety disorder", category: "Mental Health" },
  { code: "O80", name: "Encounter for full-term uncomplicated delivery", category: "Obstetrics" },
  { code: "Z00.00", name: "Encounter for general adult medical examination", category: "General Health" },
];

export type ConsultationQueueItem = {
  encounterId: string;
  patientId: string;
  appointmentId: string | null;
  queueNumber: number | null;
  checkedInAt: string;
  encounterStatus: string;
  chiefComplaint: string | null;
  practitionerId: string | null;
  practitionerName: string | null;
  isClaimedByMe: boolean;
  patient: {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    nin: string;
    isNinMasked: boolean;
    age: string;
    gender: string | null;
    phone: string | null;
    bloodGroup: string | null;
    genotype: string | null;
    allergies: string[];
    chronicConditions: string[];
  };
  latestVitals: {
    id: string;
    bodyTemperature: number | null;
    systolicBp: number | null;
    diastolicBp: number | null;
    pulseRate: number | null;
    respiratoryRate: number | null;
    spo2: number | null;
    weightKg: number | null;
    heightCm: number | null;
    painScore: number | null;
    recordedAt: string;
  } | null;
  departmentName: string | null;
};

export type HospitalLabCatalogItem = {
  id: string;
  testCatalogId: string;
  name: string;
  code: string;
  category: string | null;
  price: number;
  sampleType: string | null;
};

export type DrugCatalogItem = {
  id: string;
  genericName: string;
  brandName: string | null;
  dosageForm: string | null;
  strength: string | null;
};

export type EncounterLabOrderItem = {
  id: string;
  testId: string;
  testName: string;
  testCode: string | null;
  status: string;
  urgency: string;
  clinicalIndication: string | null;
  sampleType: string | null;
  resultValue: string | null;
  units: string | null;
  referenceRange: string | null;
  isOutOfRange: boolean;
  isCritical: boolean;
  interpretation: string | null;
  attachedFileUrl: string | null;
  technicianName: string | null;
  completedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedByName: string | null;
  acknowledgementComment: string | null;
  notes: string | null;
  createdAt: string;
};

export type EncounterPrescriptionItem = {
  id: string;
  prescriptionId: string;
  drugId: string;
  drugName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  quantityPrescribed: number;
  instructions: string | null;
  status: string;
  createdAt: string;
};

export type ClinicalAmendmentItem = {
  id: string;
  encounterId: string;
  amendmentType: "addendum" | "correction" | "late_entry";
  amendmentReason: string;
  previousNotes: string | null;
  amendedNotes: string;
  authorName: string;
  authorRank: string;
  authorLicense: string;
  digitalSignatureHash: string | null;
  createdAt: string;
};

export type SystematicPhysicalExam = {
  general?: string | undefined;
  cardiovascular?: string | undefined;
  respiratory?: string | undefined;
  gastrointestinal?: string | undefined;
  centralNervous?: string | undefined;
  musculoskeletal?: string | undefined;
  genitourinary?: string | undefined;
};

export type ConsultationWorkspaceData = {
  encounter: {
    id: string;
    createdAt: string;
    status: string;
    chiefComplaint: string | null;
    historyOfPresentingIllness?: string | null | undefined;
    pastMedicalHistory?: string | null | undefined;
    drugHistory?: string | null | undefined;
    allergiesNotes?: string | null | undefined;
    reviewOfSystems?: string | null | undefined;
    physicalExamSystematic?: SystematicPhysicalExam | null | undefined;
    diagnosis: string | null;
    icd10Codes: string[];
    clinicalNotes: string | null;
    psychiatricNotes: string | null;
    practitionerId: string | null;
    practitionerName: string | null;
    practitionerRank?: string | null | undefined;
    practitionerLicenseNumber?: string | null | undefined;
    nurseName: string | null;
    isBreakGlass: boolean;
    signedAt: string | null;
    signedBy: string | null;
    digitalSignatureHash: string | null;
    isLocked: boolean;
    aiSummary?: string | null;
    aiPatientSummary?: string | null;
    aiKeyFindings?: string[] | null;
    aiNextSteps?: string[] | null;
    aiDifferentialDiagnoses?: any[] | null;
    aiRedFlags?: string[] | null;
    aiGeneratedAt?: string | null;
  };
  patient: {
    id: string;
    fullName: string;
    nin: string;
    isNinMasked: boolean;
    age: string;
    gender: string | null;
    phone: string | null;
    email: string | null;
    bloodGroup: string | null;
    genotype: string | null;
    allergies: string[];
    chronicConditions: string[];
    emergencyContact: any;
  };
  latestVitals: {
    bodyTemperature: number | null;
    systolicBp: number | null;
    diastolicBp: number | null;
    pulseRate: number | null;
    respiratoryRate: number | null;
    spo2: number | null;
    weightKg: number | null;
    heightCm: number | null;
    painScore: number | null;
    recordedAt: string;
  } | null;
  pastVisits: Array<{
    id: string;
    createdAt: string;
    chiefComplaint: string | null;
    diagnosis: string | null;
    icd10Codes: string[];
    practitionerName: string | null;
    status: string;
  }>;
  availableLabTests: HospitalLabCatalogItem[];
  availableDrugs: DrugCatalogItem[];
  activeLabOrders: EncounterLabOrderItem[];
  activePrescriptions: EncounterPrescriptionItem[];
  amendments: ClinicalAmendmentItem[];
  isDoctor: boolean;
  currentStaffId: string | null;
  currentStaffLicenseNumber: string | null;
  currentStaffRank: string | null;
};

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
 * Loads the consultation queue (Awaiting Doctor & In-Consultation) for the current hospital.
 */
export const getConsultationQueue = createServerFn({ method: "GET" })
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
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, module_permissions, hospitals(id, name)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Hospital membership required.");

    const matchedRole = input?.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const hospitalName = (matchedRole as any)?.hospitals?.name || "Hospital";
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";
    const perms = Array.isArray((matchedRole as any)?.module_permissions) ? (matchedRole as any).module_permissions : [];
    const isDoctor = ["doctor", "super_admin", "hospital_admin"].includes(callerRole) || perms.includes("consultations");

    if (!isDoctor) {
      throw new Error("Access to doctor consultation queue is restricted to clinicians or authorized staff.");
    }

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    const currentStaffId = staffRow?.id || null;

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { data: encounters, error: encError } = await supabase
      .from("encounters")
      .select(`
        id,
        patient_id,
        appointment_id,
        created_at,
        encounter_status,
        chief_complaint,
        practitioner_id,
        department:department_id(name),
        practitioner:practitioner_id(full_name),
        patient:patient_id(
          id, nin, first_name, last_name, date_of_birth, gender, phone, blood_group, genotype, allergies, chronic_conditions
        ),
        appointment:appointment_id(
          queue_number
        )
      `)
      .eq("hospital_id", activeHospitalId)
      .eq("encounter_status", "consultation")
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: true });

    if (encError) throw new Error(encError.message);

    const encounterIds = (encounters ?? []).map((e: any) => e.id);
    let vitalsMap = new Map<string, any>();

    if (encounterIds.length > 0) {
      const { data: vitalsRows } = await supabase
        .from("triage_vitals")
        .select("*")
        .in("encounter_id", encounterIds);

      (vitalsRows ?? []).forEach((v: any) => {
        vitalsMap.set(v.encounter_id, v);
      });
    }

    const queue: ConsultationQueueItem[] = (encounters ?? []).map((e: any) => {
      const p = e.patient;
      const v = vitalsMap.get(e.id);
      const isClaimedByMe = Boolean(currentStaffId && e.practitioner_id === currentStaffId);

      return {
        encounterId: e.id,
        patientId: e.patient_id,
        appointmentId: e.appointment_id,
        queueNumber: e.appointment?.queue_number || null,
        checkedInAt: e.created_at,
        encounterStatus: e.encounter_status,
        chiefComplaint: e.chief_complaint,
        practitionerId: e.practitioner_id,
        practitionerName: e.practitioner?.full_name || null,
        isClaimedByMe,
        patient: {
          id: p.id,
          fullName: `${p.first_name} ${p.last_name}`,
          firstName: p.first_name,
          lastName: p.last_name,
          nin: isDoctor ? p.nin : maskNin(p.nin),
          isNinMasked: !isDoctor,
          age: calculateAge(p.date_of_birth),
          gender: p.gender || "Unknown",
          phone: p.phone,
          bloodGroup: p.blood_group,
          genotype: p.genotype,
          allergies: Array.isArray(p.allergies) ? p.allergies : [],
          chronicConditions: Array.isArray(p.chronic_conditions) ? p.chronic_conditions : [],
        },
        latestVitals: v
          ? {
              id: v.id,
              bodyTemperature: v.body_temperature,
              systolicBp: v.systolic_bp,
              diastolicBp: v.diastolic_bp,
              pulseRate: v.pulse_rate,
              respiratoryRate: v.respiratory_rate,
              spo2: v.spo2,
              weightKg: v.weight_kg,
              heightCm: v.height_cm,
              painScore: v.pain_score,
              recordedAt: v.recorded_at,
            }
          : null,
        departmentName: e.department?.name || null,
      };
    });

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "READ",
      justification: `Accessed consultation queue (${queue.length} waiting/in progress)`,
    });

    return {
      queue,
      hospitalName,
      activeHospitalId,
      currentStaffId,
      callerRole,
      isDoctor,
    };
  });

/**
 * Fetches complete details of an encounter workspace (demographics, triage vitals, past history, active lab orders, prescriptions, and catalogs).
 */
export const getEncounterWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      encounterId: string;
      hospitalId?: string | undefined;
    }) => {
      return {
        encounterId: String(input.encounterId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
      };
    },
  )
  .handler(async ({ context, data: input }): Promise<ConsultationWorkspaceData> => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id, module_permissions")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Unauthorized.");

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";
    const perms = Array.isArray((matchedRole as any)?.module_permissions) ? (matchedRole as any).module_permissions : [];
    const isDoctor = ["doctor", "super_admin", "hospital_admin"].includes(callerRole) || perms.includes("consultations");

    if (!isDoctor) {
      throw new Error("Access to clinical consultation workspace is restricted to clinicians or authorized staff.");
    }

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name, cadre_rank, license_type, license_number")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    const currentStaffId = staffRow?.id || null;
    const currentStaffLicenseNumber = staffRow?.license_number || null;
    const currentStaffRank = staffRow?.cadre_rank || null;

    // 1. Fetch Encounter
    const { data: enc, error: encError } = await supabase
      .from("encounters")
      .select(`
        id, created_at, encounter_status, chief_complaint, diagnosis, icd10_codes, clinical_notes, psychiatric_notes,
        past_medical_history, drug_history, allergies_notes, review_of_systems, physical_exam_systematic,
        signed_at, signed_by, digital_signature_hash, is_locked,
        ai_summary, ai_patient_summary, ai_key_findings, ai_next_steps, ai_differential_diagnoses, ai_red_flags, ai_generated_at,
        is_break_glass, practitioner_id, patient_id,
        practitioner:practitioner_id(full_name, cadre_rank, license_number),
        nurse:nurse_id(full_name),
        patient:patient_id(*)
      `)
      .eq("id", input.encounterId)
      .single();

    if (encError || !enc) throw new Error("Encounter not found.");

    const patientData = enc.patient as any;

    // 2. Fetch latest triage vitals
    const { data: vitalsData } = await supabase
      .from("triage_vitals")
      .select("*")
      .eq("encounter_id", input.encounterId)
      .maybeSingle();

    // 3. Fetch past encounters for this patient
    const { data: pastEncRows } = await supabase
      .from("encounters")
      .select("id, created_at, chief_complaint, diagnosis, icd10_codes, encounter_status, practitioner:practitioner_id(full_name)")
      .eq("patient_id", enc.patient_id)
      .neq("id", input.encounterId)
      .order("created_at", { ascending: false });

    const pastVisits = (pastEncRows ?? []).map((p: any) => ({
      id: p.id,
      createdAt: p.created_at,
      chiefComplaint: p.chief_complaint,
      diagnosis: isDoctor ? p.diagnosis : "Restricted",
      icd10Codes: p.icd10_codes || [],
      practitionerName: p.practitioner?.full_name || null,
      status: p.encounter_status,
    }));

    // 4. Fetch amendments for this encounter
    const { data: amendmentRows } = await supabase
      .from("clinical_note_amendments")
      .select(`
        id, encounter_id, amendment_type, amendment_reason, previous_notes, amended_notes,
        digital_signature_hash, created_at,
        author:author_id(full_name, cadre_rank, license_number)
      `)
      .eq("encounter_id", input.encounterId)
      .order("created_at", { ascending: false });

    const amendments: ClinicalAmendmentItem[] = (amendmentRows ?? []).map((a: any) => ({
      id: a.id,
      encounterId: a.encounter_id,
      amendmentType: a.amendment_type,
      amendmentReason: a.amendment_reason,
      previousNotes: a.previous_notes,
      amendedNotes: a.amended_notes,
      authorName: a.author?.full_name || "Medical Officer",
      authorRank: a.author?.cadre_rank || "Physician",
      authorLicense: a.author?.license_number || "MDCN Registered",
      digitalSignatureHash: a.digital_signature_hash,
      createdAt: a.created_at,
    }));

    // 4. Fetch available lab tests for this hospital
    const { data: labTestsRaw } = await supabase
      .from("hospital_lab_tests")
      .select(`
        id, test_catalog_id, price, is_available,
        test_catalog:test_catalog_id(name, code, category)
      `)
      .eq("hospital_id", activeHospitalId)
      .eq("is_available", true);

    const availableLabTests: HospitalLabCatalogItem[] = (labTestsRaw ?? []).map((t: any) => ({
      id: t.id,
      testCatalogId: t.test_catalog_id,
      name: t.test_catalog?.name || "Lab Investigation",
      code: t.test_catalog?.code || "TEST",
      category: t.test_catalog?.category || "General",
      price: Number(t.price) || 0,
      sampleType: "Blood/Serum",
    }));

    // 5. Fetch available drugs from drug catalog
    const { data: drugsRaw } = await supabase
      .from("drug_catalog")
      .select("id, generic_name, brand_name, dosage_form, strength")
      .order("generic_name", { ascending: true })
      .limit(100);

    const availableDrugs: DrugCatalogItem[] = (drugsRaw ?? []).map((d: any) => ({
      id: d.id,
      genericName: d.generic_name,
      brandName: d.brand_name,
      dosageForm: d.dosage_form,
      strength: d.strength,
    }));

    // 6. Fetch existing lab orders for this encounter
    const { data: existingLabsRaw } = await supabase
      .from("lab_orders")
      .select(`
        id, test_id, status, urgency, clinical_indication, sample_type, result_value,
        units, reference_range, is_out_of_range, is_critical, interpretation,
        attached_file_url, technician_name, completed_at, acknowledged_at,
        acknowledged_by_name, acknowledgement_comment, created_at,
        test:test_id(
          price,
          test_catalog:test_catalog_id(name, code)
        )
      `)
      .eq("encounter_id", input.encounterId)
      .order("created_at", { ascending: false });

    const activeLabOrders: EncounterLabOrderItem[] = (existingLabsRaw ?? []).map((l: any) => ({
      id: l.id,
      testId: l.test_id,
      testName: (l.test as any)?.test_catalog?.name || "Lab Investigation",
      testCode: (l.test as any)?.test_catalog?.code || null,
      status: l.status,
      urgency: l.urgency || "routine",
      clinicalIndication: l.clinical_indication || null,
      sampleType: l.sample_type,
      resultValue: l.result_value || null,
      units: l.units || null,
      referenceRange: l.reference_range || null,
      isOutOfRange: Boolean(l.is_out_of_range),
      isCritical: Boolean(l.is_critical),
      interpretation: l.interpretation || null,
      attachedFileUrl: l.attached_file_url || null,
      technicianName: l.technician_name || null,
      completedAt: l.completed_at || null,
      acknowledgedAt: l.acknowledged_at || null,
      acknowledgedByName: l.acknowledged_by_name || null,
      acknowledgementComment: l.acknowledgement_comment || null,
      notes: null,
      createdAt: l.created_at,
    }));

    // 7. Fetch existing prescriptions for this encounter
    const { data: existingRxRaw } = await supabase
      .from("prescriptions")
      .select(`
        id, status, notes, created_at,
        prescription_items(
          id, drug_id, dosage, frequency, duration, quantity_prescribed,
          drug:drug_id(generic_name, brand_name, strength)
        )
      `)
      .eq("encounter_id", input.encounterId)
      .order("created_at", { ascending: false });

    const activePrescriptions: EncounterPrescriptionItem[] = [];
    (existingRxRaw ?? []).forEach((rx: any) => {
      (rx.prescription_items ?? []).forEach((item: any) => {
        const drugName = item.drug
          ? `${item.drug.brand_name ? item.drug.brand_name + " (" + item.drug.generic_name + ")" : item.drug.generic_name} ${item.drug.strength || ""}`
          : "Medication";
        activePrescriptions.push({
          id: item.id,
          prescriptionId: rx.id,
          drugId: item.drug_id,
          drugName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantityPrescribed: item.quantity_prescribed,
          instructions: rx.notes,
          status: rx.status,
          createdAt: rx.created_at,
        });
      });
    });

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: enc.patient_id,
      encounter_id: input.encounterId,
      action: "READ",
      justification: `Opened doctor consultation workspace for ${patientData.first_name} ${patientData.last_name}`,
    });

    return {
      encounter: {
        id: enc.id,
        createdAt: enc.created_at,
        status: enc.encounter_status,
        chiefComplaint: enc.chief_complaint,
        pastMedicalHistory: enc.past_medical_history || null,
        drugHistory: enc.drug_history || null,
        allergiesNotes: enc.allergies_notes || null,
        reviewOfSystems: enc.review_of_systems || null,
        physicalExamSystematic: (enc.physical_exam_systematic as any) || null,
        diagnosis: enc.diagnosis,
        icd10Codes: enc.icd10_codes || [],
        clinicalNotes: enc.clinical_notes,
        psychiatricNotes: isDoctor ? enc.psychiatric_notes : null,
        practitionerId: enc.practitioner_id,
        practitionerName: (enc.practitioner as any)?.full_name || null,
        practitionerRank: (enc.practitioner as any)?.cadre_rank || null,
        practitionerLicenseNumber: (enc.practitioner as any)?.license_number || null,
        nurseName: (enc.nurse as any)?.full_name || null,
        isBreakGlass: Boolean(enc.is_break_glass),
        signedAt: enc.signed_at || null,
        signedBy: enc.signed_by || null,
        digitalSignatureHash: enc.digital_signature_hash || null,
        isLocked: Boolean(enc.is_locked),
        aiSummary: (enc as any).ai_summary || null,
        aiPatientSummary: (enc as any).ai_patient_summary || null,
        aiKeyFindings: Array.isArray((enc as any).ai_key_findings) ? (enc as any).ai_key_findings : null,
        aiNextSteps: Array.isArray((enc as any).ai_next_steps) ? (enc as any).ai_next_steps : null,
        aiDifferentialDiagnoses: Array.isArray((enc as any).ai_differential_diagnoses) ? (enc as any).ai_differential_diagnoses : null,
        aiRedFlags: Array.isArray((enc as any).ai_red_flags) ? (enc as any).ai_red_flags : null,
        aiGeneratedAt: (enc as any).ai_generated_at || null,
      },
      patient: {
        id: patientData.id,
        fullName: `${patientData.first_name} ${patientData.last_name}`,
        nin: isDoctor ? patientData.nin : maskNin(patientData.nin),
        isNinMasked: !isDoctor,
        age: calculateAge(patientData.date_of_birth),
        gender: patientData.gender,
        phone: patientData.phone,
        email: patientData.email,
        bloodGroup: patientData.blood_group,
        genotype: patientData.genotype,
        allergies: Array.isArray(patientData.allergies) ? patientData.allergies : [],
        chronicConditions: Array.isArray(patientData.chronic_conditions) ? patientData.chronic_conditions : [],
        emergencyContact: patientData.emergency_contact,
      },
      latestVitals: vitalsData
        ? {
            bodyTemperature: vitalsData.body_temperature,
            systolicBp: vitalsData.systolic_bp,
            diastolicBp: vitalsData.diastolic_bp,
            pulseRate: vitalsData.pulse_rate,
            respiratoryRate: vitalsData.respiratory_rate,
            spo2: vitalsData.spo2,
            weightKg: vitalsData.weight_kg,
            heightCm: vitalsData.height_cm,
            painScore: vitalsData.pain_score,
            recordedAt: vitalsData.recorded_at,
          }
        : null,
      pastVisits,
      availableLabTests,
      availableDrugs,
      activeLabOrders,
      activePrescriptions,
      amendments,
      isDoctor,
      currentStaffId,
      currentStaffLicenseNumber,
      currentStaffRank,
    };
  });

/**
 * Claims a patient from the queue.
 */
export const claimEncounter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { encounterId: string; hospitalId?: string | undefined }) => {
      if (!input.encounterId) throw new Error("Missing encounter ID.");
      return {
        encounterId: String(input.encounterId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
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
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    if (!staffRow) throw new Error("Staff profile not found.");

    const { error: updateErr } = await supabase
      .from("encounters")
      .update({
        practitioner_id: staffRow.id,
      })
      .eq("id", input.encounterId);

    if (updateErr) throw new Error(updateErr.message);

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Dr. ${staffRow.full_name} claimed encounter from consultation queue`,
    });

    return { success: true, practitionerName: staffRow.full_name };
  });

/**
 * Saves consultation notes, diagnosis, ICD-10 codes, and clinical plan.
 */
export const saveConsultationNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      encounterId: string;
      patientId: string;
      hospitalId?: string | undefined;
      presentingComplaint: string;
      historyOfPresentingIllness?: string | undefined;
      pastMedicalHistory?: string | undefined;
      drugHistory?: string | undefined;
      allergiesNotes?: string | undefined;
      reviewOfSystems?: string | undefined;
      physicalExamSystematic?: SystematicPhysicalExam | undefined;
      examinationFindings?: string | undefined;
      diagnosis: string;
      icd10Codes?: string[] | undefined;
      planAndOrders?: string | undefined;
      psychiatricNotes?: string | undefined;
    }) => {
      if (!input.encounterId) throw new Error("Missing encounter ID.");
      if (!input.diagnosis) throw new Error("Diagnosis is required.");
      return {
        encounterId: String(input.encounterId).trim(),
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        presentingComplaint: String(input.presentingComplaint).trim(),
        historyOfPresentingIllness: input.historyOfPresentingIllness ? String(input.historyOfPresentingIllness).trim() : undefined,
        pastMedicalHistory: input.pastMedicalHistory ? String(input.pastMedicalHistory).trim() : undefined,
        drugHistory: input.drugHistory ? String(input.drugHistory).trim() : undefined,
        allergiesNotes: input.allergiesNotes ? String(input.allergiesNotes).trim() : undefined,
        reviewOfSystems: input.reviewOfSystems ? String(input.reviewOfSystems).trim() : undefined,
        physicalExamSystematic: input.physicalExamSystematic,
        examinationFindings: input.examinationFindings ? String(input.examinationFindings).trim() : undefined,
        diagnosis: String(input.diagnosis).trim(),
        icd10Codes: input.icd10Codes || [],
        planAndOrders: input.planAndOrders ? String(input.planAndOrders).trim() : undefined,
        psychiatricNotes: input.psychiatricNotes ? String(input.psychiatricNotes).trim() : undefined,
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
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";
    const isDoctor = ["doctor", "super_admin", "hospital_admin"].includes(callerRole);

    if (!isDoctor) {
      throw new Error("Only doctors and medical administrators can save consultation notes.");
    }

    // Check if encounter is already locked
    const { data: existingEnc } = await supabase
      .from("encounters")
      .select("is_locked")
      .eq("id", input.encounterId)
      .maybeSingle();

    if (existingEnc?.is_locked) {
      throw new Error("This consultation is digitally signed and locked. Please use the Add Amendment feature to record addenda or corrections.");
    }

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name, license_number, cadre_rank")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    const structuredSoap = [
      `[SUBJECTIVE / HISTORY]`,
      `Chief Complaint: ${input.presentingComplaint}`,
      input.historyOfPresentingIllness ? `HPI: ${input.historyOfPresentingIllness}` : null,
      input.pastMedicalHistory ? `Past Medical Hx: ${input.pastMedicalHistory}` : null,
      input.drugHistory ? `Drug Hx: ${input.drugHistory}` : null,
      input.allergiesNotes ? `Allergies / Adverse Reactions: ${input.allergiesNotes}` : null,
      input.reviewOfSystems ? `Review of Systems: ${input.reviewOfSystems}` : null,
      "",
      `[OBJECTIVE / EXAMINATION]`,
      input.examinationFindings || "Systemic examination performed.",
      "",
      `[ASSESSMENT / DIAGNOSIS]`,
      `Diagnosis: ${input.diagnosis}`,
      input.icd10Codes.length > 0 ? `ICD-10: ${input.icd10Codes.join(", ")}` : null,
      "",
      `[PLAN]`,
      input.planAndOrders || "Standard outpatient management.",
    ]
      .filter((line) => line !== null)
      .join("\n");

    const { error: updateErr } = await supabase
      .from("encounters")
      .update({
        diagnosis: input.diagnosis,
        icd10_codes: input.icd10Codes,
        clinical_notes: structuredSoap,
        psychiatric_notes: input.psychiatricNotes || null,
        past_medical_history: input.pastMedicalHistory || null,
        drug_history: input.drugHistory || null,
        allergies_notes: input.allergiesNotes || null,
        review_of_systems: input.reviewOfSystems || null,
        physical_exam_systematic: input.physicalExamSystematic || {},
        practitioner_id: staffRow?.id || null,
      })
      .eq("id", input.encounterId);

    if (updateErr) throw new Error(updateErr.message);

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Saved clinical consultation assessment & diagnosis (${input.diagnosis})`,
    });

    return { success: true };
  });

/**
 * Digitally signs and locks consultation documentation.
 */
export const signAndLockConsultationNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      encounterId: string;
      patientId: string;
      hospitalId?: string | undefined;
      diagnosis: string;
      clinicalSummary: string;
    }) => {
      if (!input.encounterId) throw new Error("Missing encounter ID.");
      return {
        encounterId: String(input.encounterId).trim(),
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        diagnosis: String(input.diagnosis || "").trim(),
        clinicalSummary: String(input.clinicalSummary || "").trim(),
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
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";
    const isDoctor = ["doctor", "super_admin", "hospital_admin"].includes(callerRole);

    if (!isDoctor) {
      throw new Error("Only licensed physicians and administrators can sign clinical records.");
    }

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name, license_number, cadre_rank")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    if (!staffRow) throw new Error("Staff record not found.");

    const timestamp = new Date().toISOString();
    const rawSignaturePayload = `${staffRow.id}:${staffRow.license_number || "MDCN"}:${input.encounterId}:${timestamp}:${input.diagnosis}`;
    
    // Deterministic pseudo-hash for verification
    let hash = 0;
    for (let i = 0; i < rawSignaturePayload.length; i++) {
      hash = ((hash << 5) - hash) + rawSignaturePayload.charCodeAt(i);
      hash |= 0;
    }
    const signatureHash = `0x${Math.abs(hash).toString(16).padStart(8, "0")}${input.encounterId.replace(/-/g, "").slice(0, 16)}`;

    const { error: updateErr } = await supabase
      .from("encounters")
      .update({
        signed_at: timestamp,
        signed_by: staffRow.id,
        digital_signature_hash: signatureHash,
        is_locked: true,
      })
      .eq("id", input.encounterId);

    if (updateErr) throw new Error(updateErr.message);

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Digitally signed and locked clinical notes by Dr. ${staffRow.full_name} (${staffRow.license_number || "MDCN"}). Signature Hash: ${signatureHash}`,
    });

    return { success: true, signatureHash, signedAt: timestamp };
  });

/**
 * Logs an append-only clinical note amendment or correction.
 */
export const addClinicalAmendment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      encounterId: string;
      patientId: string;
      hospitalId?: string | undefined;
      amendmentType: "addendum" | "correction" | "late_entry";
      amendmentReason: string;
      amendedNotes: string;
    }) => {
      if (!input.encounterId || !input.amendedNotes.trim() || !input.amendmentReason.trim()) {
        throw new Error("Encounter ID, amendment notes, and reason are required.");
      }
      return {
        encounterId: String(input.encounterId).trim(),
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        amendmentType: input.amendmentType,
        amendmentReason: String(input.amendmentReason).trim(),
        amendedNotes: String(input.amendedNotes).trim(),
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
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";
    const isDoctor = ["doctor", "super_admin", "hospital_admin"].includes(callerRole);

    if (!isDoctor) {
      throw new Error("Only licensed physicians and administrators can record clinical amendments.");
    }

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name, license_number, cadre_rank")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    if (!staffRow) throw new Error("Staff record not found.");

    // Fetch existing encounter notes for audit trail
    const { data: enc } = await supabase
      .from("encounters")
      .select("clinical_notes")
      .eq("id", input.encounterId)
      .single();

    const timestamp = new Date().toISOString();
    const rawSignaturePayload = `${staffRow.id}:${input.encounterId}:${timestamp}:${input.amendmentType}:${input.amendmentReason}`;
    
    let hash = 0;
    for (let i = 0; i < rawSignaturePayload.length; i++) {
      hash = ((hash << 5) - hash) + rawSignaturePayload.charCodeAt(i);
      hash |= 0;
    }
    const signatureHash = `0x${Math.abs(hash).toString(16).padStart(8, "0")}${input.encounterId.replace(/-/g, "").slice(0, 16)}`;

    // 1. Insert into clinical_note_amendments table
    const { error: insertErr } = await supabase
      .from("clinical_note_amendments")
      .insert({
        hospital_id: activeHospitalId,
        encounter_id: input.encounterId,
        patient_id: input.patientId,
        author_id: staffRow.id,
        amendment_type: input.amendmentType,
        amendment_reason: input.amendmentReason,
        previous_notes: enc?.clinical_notes || null,
        amended_notes: input.amendedNotes,
        digital_signature_hash: signatureHash,
      });

    if (insertErr) throw new Error(`Failed to record amendment: ${insertErr.message}`);

    // 2. Append formatted addendum block to clinical_notes
    const formattedAddendum = `\n\n--- [${input.amendmentType.toUpperCase()} — ${new Date().toLocaleString("en-GB")}] ---\nAuthor: Dr. ${staffRow.full_name} (${staffRow.license_number || "MDCN"})\nReason: ${input.amendmentReason}\n${input.amendedNotes}\n[Digital Signature: ${signatureHash}]`;

    const updatedNotes = (enc?.clinical_notes || "") + formattedAddendum;

    await supabase
      .from("encounters")
      .update({
        clinical_notes: updatedNotes,
      })
      .eq("id", input.encounterId);

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Added ${input.amendmentType} to encounter notes by Dr. ${staffRow.full_name}. Reason: ${input.amendmentReason}`,
    });

    return { success: true, signatureHash };
  });

/**
 * Adds a lab order to the encounter.
 */
export const orderLabTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      encounterId: string;
      patientId: string;
      hospitalId?: string | undefined;
      hospitalTestId: string;
      sampleType?: string | undefined;
      clinicalNotes?: string | undefined;
      urgency?: "routine" | "urgent" | "stat" | undefined;
      clinicalIndication?: string | undefined;
    }) => {
      if (!input.encounterId || !input.patientId || !input.hospitalTestId) {
        throw new Error("Missing required lab order information.");
      }
      return {
        encounterId: String(input.encounterId).trim(),
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        hospitalTestId: String(input.hospitalTestId).trim(),
        sampleType: input.sampleType ? String(input.sampleType).trim() : "Blood",
        clinicalNotes: input.clinicalNotes ? String(input.clinicalNotes).trim() : undefined,
        urgency: input.urgency || "routine",
        clinicalIndication: input.clinicalIndication ? String(input.clinicalIndication).trim() : input.clinicalNotes ? String(input.clinicalNotes).trim() : "Routine Investigation",
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
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    const { data: labOrder, error: labErr } = await supabase
      .from("lab_orders")
      .insert({
        encounter_id: input.encounterId,
        patient_id: input.patientId,
        hospital_id: activeHospitalId,
        test_id: input.hospitalTestId,
        sample_type: input.sampleType,
        ordered_by: staffRow?.id || null,
        urgency: input.urgency,
        clinical_indication: input.clinicalIndication,
        status: "ordered",
      })
      .select("id")
      .single();

    if (labErr) throw new Error(labErr.message);

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Doctor placed lab order ${labOrder.id} for diagnostic investigation`,
    });

    return { success: true, labOrderId: labOrder.id };
  });

/**
 * Adds a prescription medication item to the encounter.
 */
export const orderPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      encounterId: string;
      patientId: string;
      hospitalId?: string | undefined;
      drugId: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      instructions?: string | undefined;
    }) => {
      if (!input.encounterId || !input.patientId || !input.drugId) {
        throw new Error("Missing required prescription information.");
      }
      return {
        encounterId: String(input.encounterId).trim(),
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        drugId: String(input.drugId).trim(),
        dosage: String(input.dosage || "").trim(),
        frequency: String(input.frequency || "").trim(),
        duration: String(input.duration || "").trim(),
        quantity: Math.max(1, Number(input.quantity) || 1),
        instructions: input.instructions ? String(input.instructions).trim() : undefined,
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
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    // 1. Find or create prescription record for this encounter
    let prescriptionId: string;
    const { data: existingRx } = await supabase
      .from("prescriptions")
      .select("id")
      .eq("encounter_id", input.encounterId)
      .maybeSingle();

    if (existingRx) {
      prescriptionId = existingRx.id;
    } else {
      const { data: newRx, error: rxErr } = await supabase
        .from("prescriptions")
        .insert({
          encounter_id: input.encounterId,
          patient_id: input.patientId,
          hospital_id: activeHospitalId,
          doctor_id: staffRow?.id || null,
          status: "pending",
          notes: input.instructions || null,
        })
        .select("id")
        .single();

      if (rxErr) throw new Error(rxErr.message);
      prescriptionId = newRx.id;
    }

    // 2. Insert item into prescription_items
    const { data: itemRow, error: itemErr } = await supabase
      .from("prescription_items")
      .insert({
        prescription_id: prescriptionId,
        drug_id: input.drugId,
        dosage: input.dosage,
        frequency: input.frequency,
        duration: input.duration,
        quantity_prescribed: input.quantity,
      })
      .select("id")
      .single();

    if (itemErr) throw new Error(itemErr.message);

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Prescribed medication item ${itemRow.id} (Qty: ${input.quantity})`,
    });

    return { success: true, itemId: itemRow.id };
  });

/**
 * Concludes consultation: moves encounter to "lab_pending" or "pharmacy_pending" if orders exist,
 * or "closed" if no orders are pending.
 */
export const finishConsultation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      encounterId: string;
      patientId: string;
      hospitalId?: string | undefined;
    }) => {
      return {
        encounterId: String(input.encounterId).trim(),
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
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
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";

    // 1. Check if lab orders exist
    const { data: labs } = await supabase
      .from("lab_orders")
      .select("id, status")
      .eq("encounter_id", input.encounterId)
      .neq("status", "completed");

    // 2. Check if prescriptions exist
    const { data: rxs } = await supabase
      .from("prescriptions")
      .select("id, status")
      .eq("encounter_id", input.encounterId)
      .neq("status", "dispensed");

    let nextStatus: "lab_pending" | "pharmacy_pending" | "closed" = "closed";

    if (labs && labs.length > 0) {
      nextStatus = "lab_pending";
    } else if (rxs && rxs.length > 0) {
      nextStatus = "pharmacy_pending";
    }

    const isClosing = nextStatus === "closed";

    const { error: updateErr } = await supabase
      .from("encounters")
      .update({
        encounter_status: nextStatus,
        closed_at: isClosing ? new Date().toISOString() : null,
      })
      .eq("id", input.encounterId);

    if (updateErr) throw new Error(updateErr.message);

    // If closing, also update appointment status to completed
    const { data: encRow } = await supabase
      .from("encounters")
      .select("appointment_id")
      .eq("id", input.encounterId)
      .single();

    if (encRow?.appointment_id && isClosing) {
      await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", encRow.appointment_id);
    }

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Finished doctor consultation. Encounter transitioned to ${nextStatus}.`,
    });

    return { success: true, nextStatus };
  });

export type DoctorLabNotificationItem = {
  id: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  patientNin: string;
  patientAge: string;
  patientGender: string;
  testName: string;
  testCode: string;
  resultValue: string;
  units: string | null;
  referenceRange: string | null;
  abnormalFlag: "normal" | "abnormal" | "critical";
  isCritical: boolean;
  isOutOfRange: boolean;
  interpretation: string | null;
  attachedFileUrl: string | null;
  technicianName: string | null;
  completedAt: string;
  acknowledgedAt: string | null;
  acknowledgedByName: string | null;
};

/**
 * Returns newly completed and critical lab reports for the doctor's hospital
 * so doctors receive immediate alerts with patient details and direct report review.
 */
export const getDoctorReturnedLabNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input?: {
      hospitalId?: string | undefined;
    }) => ({
      hospitalId: input?.hospitalId ? String(input.hospitalId).trim() : undefined,
    })
  )
  .handler(async ({ context, data: input }): Promise<{ notifications: DoctorLabNotificationItem[]; unacknowledgedCount: number }> => {
    const { supabase, userId } = context;

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) return { notifications: [], unacknowledgedCount: 0 };

    const matchedRole = input?.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";

    const { data: labRows, error } = await supabase
      .from("lab_orders")
      .select(`
        id, encounter_id, patient_id, status, result_value, units, reference_range,
        is_out_of_range, is_critical, interpretation, attached_file_url,
        technician_name, completed_at, acknowledged_at, acknowledged_by_name,
        result_metadata,
        test:test_id(
          test_catalog:test_catalog_id(name, code)
        ),
        patient:patient_id(
          id, first_name, last_name, nin, date_of_birth, gender
        )
      `)
      .eq("hospital_id", activeHospitalId)
      .in("status", ["completed", "critical"])
      .order("completed_at", { ascending: false })
      .limit(20);

    if (error) {
      console.warn("Error fetching doctor lab notifications:", error);
      return { notifications: [], unacknowledgedCount: 0 };
    }

    let unacknowledgedCount = 0;
    const notifications: DoctorLabNotificationItem[] = (labRows ?? []).map((row: any) => {
      const p = row.patient;
      const t = row.test?.test_catalog;
      const meta = (row.result_metadata as any) || {};

      if (!row.acknowledged_at) {
        unacknowledgedCount++;
      }

      let age = "Adult";
      if (p?.date_of_birth) {
        const birth = new Date(p.date_of_birth);
        const diff = new Date().getFullYear() - birth.getFullYear();
        age = `${diff} yrs`;
      }

      return {
        id: row.id,
        encounterId: row.encounter_id,
        patientId: row.patient_id,
        patientName: p ? `${p.first_name} ${p.last_name}` : "Patient",
        patientNin: p?.nin || "N/A",
        patientAge: age,
        patientGender: p?.gender || "Unknown",
        testName: t?.name || "Diagnostic Test",
        testCode: t?.code || "LAB",
        resultValue: row.result_value || "Completed",
        units: row.units || meta.unit || null,
        referenceRange: row.reference_range || meta.referenceRange || null,
        abnormalFlag: meta.abnormalFlag || (row.is_critical ? "critical" : row.is_out_of_range ? "abnormal" : "normal"),
        isCritical: Boolean(row.is_critical),
        isOutOfRange: Boolean(row.is_out_of_range),
        interpretation: row.interpretation || meta.interpretation || null,
        attachedFileUrl: row.attached_file_url || meta.attachedFileUrl || null,
        technicianName: row.technician_name || meta.enteredByName || "Lab Technician",
        completedAt: row.completed_at || new Date().toISOString(),
        acknowledgedAt: row.acknowledged_at || null,
        acknowledgedByName: row.acknowledged_by_name || null,
      };
    });

    return { notifications, unacknowledgedCount };
  });

