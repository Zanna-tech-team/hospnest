import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

/**
 * Standard Clinical Thresholds for adult vital signs
 */
export const VITAL_THRESHOLDS = {
  temperature: {
    low: 35.5,
    high: 37.5,
    criticalLow: 35.0,
    criticalHigh: 38.5,
    unit: "°C",
  },
  systolicBp: {
    low: 90,
    high: 139,
    criticalLow: 80,
    criticalHigh: 180,
    unit: "mmHg",
  },
  diastolicBp: {
    low: 60,
    high: 89,
    criticalLow: 50,
    criticalHigh: 120,
    unit: "mmHg",
  },
  pulseRate: {
    low: 60,
    high: 100,
    criticalLow: 45,
    criticalHigh: 130,
    unit: "bpm",
  },
  respiratoryRate: {
    low: 12,
    high: 20,
    criticalLow: 8,
    criticalHigh: 30,
    unit: "bpm",
  },
  spo2: {
    low: 95,
    criticalLow: 90,
    unit: "%",
  },
} as const;

export type TriageQueueItem = {
  encounterId: string;
  patientId: string;
  appointmentId: string | null;
  queueNumber: number | null;
  checkedInAt: string;
  status: string;
  chiefComplaint: string | null;
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
  departmentName: string | null;
  existingVitals: {
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
};

export type TriageQueueResponse = {
  queue: TriageQueueItem[];
  completedTodayCount: number;
  totalWaitingCount: number;
  activeHospitalId: string;
  hospitalName: string;
  isStaff: boolean;
  canRecordVitals: boolean;
  callerRole: StaffRole;
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
    console.warn("Audit logging notice:", err);
  }
}

/**
 * Loads the active triage queue for today in the selected hospital.
 */
export const getTriageQueue = createServerFn({ method: "GET" })
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
  .handler(async ({ context, data: input }): Promise<TriageQueueResponse> => {
    const { supabase, userId } = context;

    // 1. Check user roles
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) {
      throw new Error("You must belong to a hospital team to access triage.");
    }

    const matchedRole = input?.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const hospitalName = (matchedRole as any)?.hospitals?.name || "Hospital";
    const callerRole = (matchedRole?.role as StaffRole) || "nurse";
    const isSuper = roles.some((r: any) => r.role === "super_admin");
    const isClinical =
      isSuper || ["nurse", "doctor", "hospital_admin"].includes(callerRole);

    // 2. Fetch today's start timestamp in UTC
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    // 3. Fetch active encounters in "triage" status
    const { data: encounters, error: encError } = await supabase
      .from("encounters")
      .select(`
        id,
        patient_id,
        appointment_id,
        created_at,
        encounter_status,
        chief_complaint,
        department:department_id(name),
        patient:patient_id(
          id, nin, first_name, last_name, date_of_birth, gender, phone, blood_group, genotype, allergies, chronic_conditions
        ),
        appointment:appointment_id(
          queue_number
        )
      `)
      .eq("hospital_id", activeHospitalId)
      .eq("encounter_status", "triage")
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: true });

    if (encError) throw new Error(encError.message);

    // 4. Fetch triage vitals recorded today for count & display
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

    // 5. Fetch count of completed triages today (consultation, lab_pending, etc.)
    const { count: completedCount } = await supabase
      .from("encounters")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", activeHospitalId)
      .neq("encounter_status", "triage")
      .gte("created_at", startOfDay.toISOString());

    // 6. Build response queue
    const queue: TriageQueueItem[] = (encounters ?? []).map((e: any) => {
      const p = e.patient;
      const v = vitalsMap.get(e.id);
      const queueNumber = e.appointment?.queue_number || null;

      return {
        encounterId: e.id,
        patientId: e.patient_id,
        appointmentId: e.appointment_id,
        queueNumber,
        checkedInAt: e.created_at,
        status: e.encounter_status,
        chiefComplaint: e.chief_complaint,
        patient: {
          id: p.id,
          fullName: `${p.first_name} ${p.last_name}`,
          firstName: p.first_name,
          lastName: p.last_name,
          nin: isClinical ? p.nin : maskNin(p.nin),
          isNinMasked: !isClinical,
          age: calculateAge(p.date_of_birth),
          gender: p.gender || "Unknown",
          phone: p.phone,
          bloodGroup: p.blood_group,
          genotype: p.genotype,
          allergies: Array.isArray(p.allergies) ? p.allergies : [],
          chronicConditions: Array.isArray(p.chronic_conditions) ? p.chronic_conditions : [],
        },
        departmentName: e.department?.name || null,
        existingVitals: v
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
      };
    });

    // Sort queue by queueNumber ascending (if present), else by check-in time
    queue.sort((a, b) => {
      if (a.queueNumber !== null && b.queueNumber !== null) {
        return a.queueNumber - b.queueNumber;
      }
      return new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
    });

    // Log audit read
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "READ",
      justification: `Accessed live triage queue (${queue.length} waiting)`,
    });

    return {
      queue,
      completedTodayCount: completedCount ?? 0,
      totalWaitingCount: queue.length,
      activeHospitalId,
      hospitalName,
      isStaff: true,
      canRecordVitals: isClinical,
      callerRole,
    };
  });

export type RecordVitalsInput = {
  encounterId: string;
  patientId: string;
  hospitalId?: string | undefined;
  bodyTemperature?: number | undefined;
  systolicBp?: number | undefined;
  diastolicBp?: number | undefined;
  pulseRate?: number | undefined;
  respiratoryRate?: number | undefined;
  spo2?: number | undefined;
  weightKg?: number | undefined;
  heightCm?: number | undefined;
  painScore?: number | undefined;
  priority: "emergency" | "urgent" | "normal";
  notes?: string | undefined;
};

/**
 * Records vital signs for a patient, attaches to triage_vitals,
 * transitions encounter status to "consultation", and logs an audit entry.
 */
export const recordTriageVitals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      encounterId: string;
      patientId: string;
      hospitalId?: string | undefined;
      bodyTemperature?: number | undefined;
      systolicBp?: number | undefined;
      diastolicBp?: number | undefined;
      pulseRate?: number | undefined;
      respiratoryRate?: number | undefined;
      spo2?: number | undefined;
      weightKg?: number | undefined;
      heightCm?: number | undefined;
      painScore?: number | undefined;
      priority: "emergency" | "urgent" | "normal";
      notes?: string | undefined;
    }) => {
      if (!input.encounterId) throw new Error("Missing encounter ID.");
      if (!input.patientId) throw new Error("Missing patient ID.");
      return {
        encounterId: String(input.encounterId).trim(),
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        bodyTemperature: input.bodyTemperature !== undefined ? Number(input.bodyTemperature) : undefined,
        systolicBp: input.systolicBp !== undefined ? Number(input.systolicBp) : undefined,
        diastolicBp: input.diastolicBp !== undefined ? Number(input.diastolicBp) : undefined,
        pulseRate: input.pulseRate !== undefined ? Number(input.pulseRate) : undefined,
        respiratoryRate: input.respiratoryRate !== undefined ? Number(input.respiratoryRate) : undefined,
        spo2: input.spo2 !== undefined ? Number(input.spo2) : undefined,
        weightKg: input.weightKg !== undefined ? Number(input.weightKg) : undefined,
        heightCm: input.heightCm !== undefined ? Number(input.heightCm) : undefined,
        painScore: input.painScore !== undefined ? Number(input.painScore) : undefined,
        priority: input.priority || "normal",
        notes: input.notes ? String(input.notes).trim() : undefined,
      };
    },
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    // 1. Verify user role & hospital
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) {
      throw new Error("Unauthorized to record vitals.");
    }

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "nurse";
    const isSuper = roles.some((r: any) => r.role === "super_admin");
    const isClinical =
      isSuper || ["nurse", "doctor", "hospital_admin"].includes(callerRole);

    if (!isClinical) {
      throw new Error("Only clinical staff (Nurses & Doctors) can record triage vitals.");
    }

    // 2. Fetch staff record for recorded_by
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    const staffId = staffRow?.id || null;

    // 3. Upsert into triage_vitals
    const { data: existingVitals } = await supabase
      .from("triage_vitals")
      .select("id")
      .eq("encounter_id", input.encounterId)
      .maybeSingle();

    if (existingVitals) {
      const { error: updateErr } = await supabase
        .from("triage_vitals")
        .update({
          body_temperature: input.bodyTemperature ?? null,
          systolic_bp: input.systolicBp ?? null,
          diastolic_bp: input.diastolicBp ?? null,
          pulse_rate: input.pulseRate ?? null,
          respiratory_rate: input.respiratoryRate ?? null,
          spo2: input.spo2 ?? null,
          weight_kg: input.weightKg ?? null,
          height_cm: input.heightCm ?? null,
          pain_score: input.painScore ?? null,
          recorded_by: staffId,
          recorded_at: new Date().toISOString(),
        })
        .eq("id", existingVitals.id);

      if (updateErr) throw new Error(`Failed to update vitals: ${updateErr.message}`);
    } else {
      const { error: insertErr } = await supabase
        .from("triage_vitals")
        .insert({
          encounter_id: input.encounterId,
          patient_id: input.patientId,
          hospital_id: activeHospitalId,
          body_temperature: input.bodyTemperature ?? null,
          systolic_bp: input.systolicBp ?? null,
          diastolic_bp: input.diastolicBp ?? null,
          pulse_rate: input.pulseRate ?? null,
          respiratory_rate: input.respiratoryRate ?? null,
          spo2: input.spo2 ?? null,
          weight_kg: input.weightKg ?? null,
          height_cm: input.heightCm ?? null,
          pain_score: input.painScore ?? null,
          recorded_by: staffId,
        });

      if (insertErr) throw new Error(`Failed to record vitals: ${insertErr.message}`);
    }

    // 4. Update encounter: set status to "consultation" (Awaiting Doctor), record triage notes and nurse ID
    const triageNoteText = input.notes
      ? `[Triage Priority: ${input.priority.toUpperCase()}]\n${input.notes}`
      : `[Triage Priority: ${input.priority.toUpperCase()}]`;

    const { error: encUpdateErr } = await supabase
      .from("encounters")
      .update({
        encounter_status: "consultation",
        nurse_id: staffId,
        clinical_notes: triageNoteText,
      })
      .eq("id", input.encounterId);

    if (encUpdateErr) throw new Error(`Failed to advance encounter: ${encUpdateErr.message}`);

    // 5. Update appointment status to "in_consultation"
    const { data: encRow } = await supabase
      .from("encounters")
      .select("appointment_id")
      .eq("id", input.encounterId)
      .single();

    if (encRow?.appointment_id) {
      await supabase
        .from("appointments")
        .update({ status: "in_consultation" })
        .eq("id", encRow.appointment_id);
    }

    // 6. Write audit log
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Recorded triage vitals & priority ${input.priority.toUpperCase()}. Moved encounter to awaiting_doctor / consultation.`,
    });

    return { success: true };
  });
