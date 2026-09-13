import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type AdmissionType = "emergency" | "elective" | "maternity" | "day_case";
export type DischargeCondition = "recovered" | "improved" | "stable" | "transferred" | "deceased" | "against_medical_advice";

export type InpatientCardItem = {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  patientNin: string;
  patientGender: string | null;
  patientAge: string;
  patientPhone: string | null;
  wardId: string;
  wardName: string;
  bedId: string;
  bedNumber: string;
  admissionDate: string;
  admissionType: AdmissionType;
  expectedStayDays: number;
  admittingDoctorId: string | null;
  admittingDoctorName: string | null;
  provisionalDiagnosis: string;
  initialCondition: string | null;
  status: string;
  lengthOfStayDays: number;
  dailyRate: number;
  latestRoundNote?: {
    id: string;
    doctorName: string;
    assessment: string | null;
    plan: string;
    createdAt: string;
  };
  latestVitals?: {
    temperature: number | null;
    bloodPressure: string | null;
    heartRate: number | null;
    respiratoryRate: number | null;
    spo2: number | null;
    news2Score?: number;
    recordedAt: string;
  };
  outstandingLabsCount: number;
};

export type WardRoundNoteItem = {
  id: string;
  admissionId: string;
  hospitalId: string;
  doctorId: string | null;
  doctorName: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string;
  vitalsSnapshot: any;
  createdAt: string;
};

export type NursingObservationItem = {
  id: string;
  admissionId: string;
  hospitalId: string;
  nurseId: string | null;
  nurseName: string;
  observationType: "vitals" | "mar" | "fluid_balance" | "wound_care";
  details: any;
  notes: string | null;
  createdAt: string;
};

async function writeAuditEntry(
  supabase: { from: (t: string) => any },
  entry: {
    hospital_id: string;
    accessor_id: string;
    accessor_role: StaffRole;
    patient_id?: string;
    encounter_id?: string;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT" | "SIGN";
    justification: string;
  }
) {
  try {
    await supabase.from("audit_log_entries").insert(entry);
  } catch (e) {
    console.warn("Audit log insertion failed:", e);
  }
}

// 1. GET INPATIENTS DASHBOARD & WARD BOARD
export const getInpatientsDashboardData = createServerFn({ method: "GET" })
  .validator((d: {
    hospitalId?: string;
    wardFilter?: string;
    admissionTypeFilter?: string;
    searchQuery?: string;
  }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin, userId } = await requireSupabaseAuth();

    let targetHospitalId = data.hospitalId;
    if (!targetHospitalId) {
      const { data: staffRow } = await supabaseAdmin
        .from("staff")
        .select("hospital_id")
        .eq("user_id", userId)
        .maybeSingle();
      targetHospitalId = staffRow?.hospital_id;
    }

    if (!targetHospitalId) {
      throw new Error("Hospital context required.");
    }

    // A. Query Wards
    const { data: wardsData } = await supabaseAdmin
      .from("wards")
      .select(`
        id,
        name,
        type,
        total_beds,
        is_active,
        beds (
          id,
          bed_number,
          status,
          daily_rate
        )
      `)
      .eq("hospital_id", targetHospitalId)
      .eq("is_active", true);

    const wardsList = (wardsData || []).map((w: any) => {
      const beds = w.beds || [];
      const occupied = beds.filter((b: any) => b.status === "occupied").length;
      const available = beds.filter((b: any) => b.status === "available").length;
      return {
        id: w.id,
        name: w.name,
        type: w.type,
        totalBeds: beds.length,
        occupiedBeds: occupied,
        availableBeds: available,
        occupancyRate: beds.length > 0 ? Math.round((occupied / beds.length) * 100) : 0,
        beds: beds.map((b: any) => ({
          id: b.id,
          bedNumber: b.bed_number,
          status: b.status,
          dailyRate: Number(b.daily_rate || 0),
        })),
      };
    });

    // B. Query Active Admissions
    let admQuery = supabaseAdmin
      .from("admissions")
      .select(`
        id,
        hospital_id,
        patient_id,
        ward_id,
        bed_id,
        admission_date,
        admission_type,
        expected_stay_days,
        admitting_doctor_id,
        admission_reason,
        initial_condition,
        status,
        encounter_id,
        patient:patient_id (
          id,
          first_name,
          last_name,
          nin,
          phone,
          gender,
          date_of_birth
        ),
        ward:ward_id (
          id,
          name
        ),
        bed:bed_id (
          id,
          bed_number,
          daily_rate
        ),
        doctor:admitting_doctor_id (
          id,
          user_id
        )
      `)
      .eq("hospital_id", targetHospitalId)
      .eq("status", "admitted");

    if (data.wardFilter && data.wardFilter !== "all") {
      admQuery = admQuery.eq("ward_id", data.wardFilter);
    }
    if (data.admissionTypeFilter && data.admissionTypeFilter !== "all") {
      admQuery = admQuery.eq("admission_type", data.admissionTypeFilter);
    }

    const { data: admissionsRows, error } = await admQuery.order("admission_date", { ascending: false });

    if (error) throw new Error(`Failed to load admissions: ${error.message}`);

    // Doctor profile map
    const doctorUserIds = (admissionsRows || []).map((r: any) => r.doctor?.user_id).filter(Boolean);
    let doctorNameMap = new Map<string, string>();
    if (doctorUserIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", doctorUserIds);
      (profs || []).forEach((p: any) => doctorNameMap.set(p.id, p.full_name));
    }

    const calcAge = (dob: string | null) => {
      if (!dob) return "N/A";
      const diff = Date.now() - new Date(dob).getTime();
      return `${Math.abs(new Date(diff).getUTCFullYear() - 1970)}y`;
    };

    const admissions: InpatientCardItem[] = (admissionsRows || []).map((row: any) => {
      const pat = row.patient || {};
      const docName = row.doctor?.user_id ? doctorNameMap.get(row.doctor.user_id) || "Dr. Attending" : null;

      const admTime = new Date(row.admission_date).getTime();
      const stayDays = Math.max(1, Math.ceil((Date.now() - admTime) / (1000 * 60 * 60 * 24)));

      return {
        id: row.id,
        hospitalId: row.hospital_id,
        patientId: row.patient_id,
        patientName: pat.first_name ? `${pat.first_name} ${pat.last_name || ""}`.trim() : "Patient",
        patientNin: pat.nin || "N/A",
        patientGender: pat.gender || null,
        patientAge: calcAge(pat.date_of_birth),
        patientPhone: pat.phone || null,
        wardId: row.ward_id,
        wardName: row.ward?.name || "General Ward",
        bedId: row.bed_id,
        bedNumber: row.bed?.bed_number || "Bed",
        admissionDate: row.admission_date,
        admissionType: (row.admission_type as AdmissionType) || "emergency",
        expectedStayDays: row.expected_stay_days || 3,
        admittingDoctorId: row.admitting_doctor_id,
        admittingDoctorName: docName,
        provisionalDiagnosis: row.admission_reason || "Inpatient Care",
        initialCondition: row.initial_condition || "Stable",
        status: row.status,
        lengthOfStayDays: stayDays,
        dailyRate: Number(row.bed?.daily_rate || 5000),
        outstandingLabsCount: 0,
      };
    });

    // Compute Metrics
    const totalAdmitted = admissions.length;
    const avgStay = totalAdmitted > 0
      ? (admissions.reduce((acc, a) => acc + a.lengthOfStayDays, 0) / totalAdmitted).toFixed(1)
      : "0";

    const totalCapacity = wardsList.reduce((acc, w) => acc + w.totalBeds, 0);
    const totalOccupiedBeds = wardsList.reduce((acc, w) => acc + w.occupiedBeds, 0);
    const overallOccupancy = totalCapacity > 0 ? Math.round((totalOccupiedBeds / totalCapacity) * 100) : 0;

    return {
      admissions,
      wards: wardsList,
      metrics: {
        totalAdmitted,
        averageLengthOfStayDays: Number(avgStay),
        totalCapacity,
        totalOccupiedBeds,
        overallOccupancyRate: overallOccupancy,
        emergencyCount: admissions.filter((a) => a.admissionType === "emergency").length,
        electiveCount: admissions.filter((a) => a.admissionType === "elective").length,
        maternityCount: admissions.filter((a) => a.admissionType === "maternity").length,
      },
    };
  });

// 2. GET INPATIENT CLINICAL DETAIL (SOAP NOTES & NURSING OBSERVATIONS)
export const getInpatientClinicalDetail = createServerFn({ method: "GET" })
  .validator((d: { admissionId: string; hospitalId?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin, userId } = await requireSupabaseAuth();

    // A. Admission & Patient Detail
    const { data: adm, error: admError } = await supabaseAdmin
      .from("admissions")
      .select(`
        id,
        hospital_id,
        patient_id,
        ward_id,
        bed_id,
        admission_date,
        admission_type,
        expected_stay_days,
        admitting_doctor_id,
        admission_reason,
        initial_condition,
        status,
        encounter_id,
        patient:patient_id (
          id,
          first_name,
          last_name,
          nin,
          gender,
          date_of_birth,
          blood_group,
          genotype,
          allergies,
          chronic_conditions,
          insurance_provider,
          insurance_policy_number
        ),
        ward:ward_id (
          id,
          name,
          type
        ),
        bed:bed_id (
          id,
          bed_number,
          daily_rate
        )
      `)
      .eq("id", data.admissionId)
      .single();

    if (admError || !adm) throw new Error("Inpatient admission not found.");

    // B. Ward Round Notes
    const { data: roundRows } = await supabaseAdmin
      .from("ward_round_notes")
      .select(`
        id,
        admission_id,
        hospital_id,
        doctor_id,
        subjective,
        objective,
        assessment,
        plan,
        vitals_snapshot,
        created_at,
        doctor:doctor_id (
          user_id
        )
      `)
      .eq("admission_id", data.admissionId)
      .order("created_at", { ascending: false });

    // Doctor profile map
    const roundDocUserIds = (roundRows || []).map((r: any) => r.doctor?.user_id).filter(Boolean);
    let roundDocMap = new Map<string, string>();
    if (roundDocUserIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", roundDocUserIds);
      (profs || []).forEach((p: any) => roundDocMap.set(p.id, p.full_name));
    }

    const roundNotes: WardRoundNoteItem[] = (roundRows || []).map((r: any) => ({
      id: r.id,
      admissionId: r.admission_id,
      hospitalId: r.hospital_id,
      doctorId: r.doctor_id,
      doctorName: r.doctor?.user_id ? roundDocMap.get(r.doctor.user_id) || "Dr. Staff Clinician" : "Attending Doctor",
      subjective: r.subjective,
      objective: r.objective,
      assessment: r.assessment,
      plan: r.plan,
      vitalsSnapshot: r.vitals_snapshot,
      createdAt: r.created_at,
    }));

    // C. Nursing Care Observations
    const { data: obsRows } = await supabaseAdmin
      .from("nursing_care_observations")
      .select(`
        id,
        admission_id,
        hospital_id,
        nurse_id,
        observation_type,
        details,
        notes,
        created_at,
        nurse:nurse_id (
          user_id
        )
      `)
      .eq("admission_id", data.admissionId)
      .order("created_at", { ascending: false });

    const nurseUserIds = (obsRows || []).map((o: any) => o.nurse?.user_id).filter(Boolean);
    let nurseMap = new Map<string, string>();
    if (nurseUserIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", nurseUserIds);
      (profs || []).forEach((p: any) => nurseMap.set(p.id, p.full_name));
    }

    const nursingObservations: NursingObservationItem[] = (obsRows || []).map((o: any) => ({
      id: o.id,
      admissionId: o.admission_id,
      hospitalId: o.hospital_id,
      nurseId: o.nurse_id,
      nurseName: o.nurse?.user_id ? nurseMap.get(o.nurse.user_id) || "Staff Nurse" : "Duty Nurse",
      observationType: o.observation_type,
      details: o.details,
      notes: o.notes,
      createdAt: o.created_at,
    }));

    return {
      admission: adm,
      roundNotes,
      nursingObservations,
    };
  });

// 3. RECORD WARD ROUND SOAP NOTE
export const recordWardRoundNote = createServerFn({ method: "POST" })
  .validator((d: {
    admissionId: string;
    hospitalId: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan: string;
    vitalsSnapshot?: any;
  }) => d)
  .handler(async ({ data }) => {
    const { supabase, supabaseAdmin, userId, role } = await requireSupabaseAuth();

    const { data: staffRow } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("user_id", userId)
      .eq("hospital_id", data.hospitalId)
      .maybeSingle();

    const { data: note, error } = await supabaseAdmin
      .from("ward_round_notes")
      .insert({
        admission_id: data.admissionId,
        hospital_id: data.hospitalId,
        doctor_id: staffRow?.id || null,
        subjective: data.subjective || null,
        objective: data.objective || null,
        assessment: data.assessment || null,
        plan: data.plan,
        vitals_snapshot: data.vitalsSnapshot || null,
      })
      .select("id")
      .single();

    if (error || !note) throw new Error(`Failed to save round note: ${error?.message}`);

    await writeAuditEntry(supabase, {
      hospital_id: data.hospitalId,
      accessor_id: userId,
      accessor_role: role,
      action: "WRITE",
      justification: `Logged ward round SOAP note for inpatient admission #${data.admissionId.slice(0, 8)}`,
    });

    return { success: true, noteId: note.id };
  });

// 4. RECORD NURSING CARE OBSERVATION (MAR, VITALS, FLUID BALANCE)
export const recordNursingCareObservation = createServerFn({ method: "POST" })
  .validator((d: {
    admissionId: string;
    hospitalId: string;
    observationType: "vitals" | "mar" | "fluid_balance" | "wound_care";
    details: any;
    notes?: string;
  }) => d)
  .handler(async ({ data }) => {
    const { supabase, supabaseAdmin, userId, role } = await requireSupabaseAuth();

    const { data: staffRow } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("user_id", userId)
      .eq("hospital_id", data.hospitalId)
      .maybeSingle();

    const { data: obs, error } = await supabaseAdmin
      .from("nursing_care_observations")
      .insert({
        admission_id: data.admissionId,
        hospital_id: data.hospitalId,
        nurse_id: staffRow?.id || null,
        observation_type: data.observationType,
        details: data.details || {},
        notes: data.notes || null,
      })
      .select("id")
      .single();

    if (error || !obs) throw new Error(`Failed to save nursing observation: ${error?.message}`);

    await writeAuditEntry(supabase, {
      hospital_id: data.hospitalId,
      accessor_id: userId,
      accessor_role: role,
      action: "WRITE",
      justification: `Recorded nursing observation (${data.observationType}) for admission #${data.admissionId.slice(0, 8)}`,
    });

    return { success: true, observationId: obs.id };
  });

// 5. FINALIZE DISCHARGE WITH MEDICATION & FOLLOW-UP APPOINTMENT AUTO-BOOKING
export const finalizeInpatientDischargeLifecycle = createServerFn({ method: "POST" })
  .validator((d: {
    admissionId: string;
    hospitalId: string;
    dischargeCondition: DischargeCondition;
    dischargeSummary: string;
    dischargeInstructions: string;
    followUpDate?: string;
    takeHomeMedications?: Array<{
      drugName: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
  }) => d)
  .handler(async ({ data }) => {
    const { supabase, supabaseAdmin, userId, role } = await requireSupabaseAuth();

    const { data: adm, error: admErr } = await supabaseAdmin
      .from("admissions")
      .select("id, bed_id, patient_id, encounter_id")
      .eq("id", data.admissionId)
      .eq("hospital_id", data.hospitalId)
      .single();

    if (admErr || !adm) throw new Error("Admission record not found.");

    // Auto-book follow-up appointment if requested
    let followUpAppointmentId: string | null = null;
    if (data.followUpDate) {
      const { data: appt } = await supabaseAdmin
        .from("appointments")
        .insert({
          hospital_id: data.hospitalId,
          patient_id: adm.patient_id,
          appointment_date: new Date(data.followUpDate).toISOString(),
          symptoms_summary: `Post-inpatient follow-up consultation (${data.dischargeCondition})`,
          notes: data.dischargeInstructions,
          priority: "routine",
          previous_encounter_id: adm.encounter_id,
          status: "booked",
        })
        .select("id")
        .single();
      followUpAppointmentId = appt?.id || null;
    }

    // Update admission record
    await supabaseAdmin
      .from("admissions")
      .update({
        status: "discharged",
        discharge_date: new Date().toISOString(),
        discharge_condition: data.dischargeCondition,
        discharge_summary: data.dischargeSummary,
        discharge_instructions: data.dischargeInstructions,
        take_home_prescriptions: data.takeHomeMedications || [],
        follow_up_appointment_id: followUpAppointmentId,
      })
      .eq("id", data.admissionId);

    // Free bed and flag for cleaning/turnover
    if (adm.bed_id) {
      await supabaseAdmin
        .from("beds")
        .update({
          status: "available",
          current_patient_id: null,
        })
        .eq("id", adm.bed_id);
    }

    // Close / discharge encounter
    if (adm.encounter_id) {
      await supabaseAdmin
        .from("encounters")
        .update({
          encounter_status: "discharged",
          closed_at: new Date().toISOString(),
        })
        .eq("id", adm.encounter_id);
    }

    await writeAuditEntry(supabase, {
      hospital_id: data.hospitalId,
      accessor_id: userId,
      accessor_role: role,
      patient_id: adm.patient_id,
      encounter_id: adm.encounter_id,
      action: "WRITE",
      justification: `Finalized inpatient discharge (${data.dischargeCondition}). Bed freed for turnover.`,
    });

    return { success: true, followUpAppointmentId };
  });
