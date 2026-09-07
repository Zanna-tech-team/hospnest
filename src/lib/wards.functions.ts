import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type WardBedItem = {
  id: string;
  wardId: string;
  bedNumber: string;
  status: "available" | "occupied" | "maintenance" | "reserved";
  dailyRate: number;
  notes: string | null;
  currentAdmission?: {
    admissionId: string;
    patientId: string;
    patientName: string;
    nin: string;
    admissionDate: string;
    admittingDoctor: string | null;
    admissionReason: string;
    lengthOfStayDays: number;
  } | undefined;
};

export type WardItem = {
  id: string;
  hospitalId: string;
  name: string;
  type: string;
  totalBeds: number;
  genderRestriction: string;
  floorLocation: string | null;
  isActive: boolean;
  beds: WardBedItem[];
  availableCount: number;
  occupiedCount: number;
  occupancyRate: number;
};

export type ActiveAdmissionItem = {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  patientNin: string;
  gender: string | null;
  age: string;
  encounterId: string | null;
  wardId: string;
  wardName: string;
  bedId: string;
  bedNumber: string;
  dailyRate: number;
  admissionDate: string;
  admittingDoctorId: string | null;
  admittingDoctorName: string | null;
  admissionReason: string;
  initialCondition: string | null;
  status: string;
  lengthOfStayDays: number;
  estimatedTotalCharge: number;
};

export type DischargeArchiveItem = {
  id: string;
  patientId: string;
  patientName: string;
  wardName: string;
  bedNumber: string;
  admissionDate: string;
  dischargeDate: string;
  admittingDoctorName: string | null;
  admissionReason: string;
  dischargeCondition: string;
  dischargeSummary: string;
  dischargeInstructions: string | null;
  lengthOfStayDays: number;
};

export type WardStaffScheduleItem = {
  id: string;
  wardId: string;
  wardName: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  roleInWard: "supervising_doctor" | "primary_nurse" | "assisting_nurse" | "intern" | "resident";
  shiftDate: string;
  shiftType: "morning" | "afternoon" | "night" | "full_day";
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
};

export type WardManagementData = {
  wards: WardItem[];
  totalBeds: number;
  totalOccupied: number;
  totalAvailable: number;
  overallOccupancyRate: number;
  activeAdmissions: ActiveAdmissionItem[];
  recentDischarges: DischargeArchiveItem[];
  staffSchedules: WardStaffScheduleItem[];
  availableStaff: Array<{
    id: string;
    fullName: string;
    role: StaffRole;
    department: string | null;
  }>;
  eligiblePatients: Array<{
    id: string;
    fullName: string;
    nin: string;
    gender: string | null;
    age: string;
    latestEncounterId: string | null;
    latestComplaint: string | null;
  }>;
  isStaff: boolean;
  isAdmin: boolean;
};

function calculateDays(from: string, to?: string | null): number {
  try {
    const start = new Date(from);
    const end = to ? new Date(to) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  } catch {
    return 1;
  }
}

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
    patient_id?: string;
    encounter_id?: string;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null;
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
 * Loads Ward management data including bed matrix, active admissions, discharges, and staff rosters.
 */
export const getWardManagementData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { hospitalId?: string | undefined }) => ({
    hospitalId: input?.hospitalId ? String(input.hospitalId).trim() : undefined,
  }))
  .handler(async ({ context, data: input }): Promise<WardManagementData> => {
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

    // 1. Fetch Wards and Beds
    const { data: wardsRaw } = await supabase
      .from("wards")
      .select(`
        id, hospital_id, name, type, total_beds, gender_restriction, floor_location, is_active,
        beds (
          id, ward_id, bed_number, status, daily_rate, notes
        )
      `)
      .eq("hospital_id", activeHospitalId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    // 2. Fetch Active Admissions
    const { data: activeAdmissionsRaw } = await supabase
      .from("admissions")
      .select(`
        id, hospital_id, patient_id, encounter_id, ward_id, bed_id, admission_date,
        admitting_doctor_id, admission_reason, initial_condition, status,
        patient:patient_id (id, first_name, last_name, nin, gender, date_of_birth),
        ward:ward_id (name),
        bed:bed_id (bed_number, daily_rate),
        admitting_doctor:admitting_doctor_id (full_name)
      `)
      .eq("hospital_id", activeHospitalId)
      .eq("status", "admitted")
      .order("admission_date", { ascending: false });

    // Map active admissions by bed_id
    const admissionByBedMap = new Map<string, any>();
    const activeAdmissions: ActiveAdmissionItem[] = (activeAdmissionsRaw ?? []).map((a: any) => {
      const patient = a.patient || {};
      const ward = a.ward || {};
      const bed = a.bed || {};
      const doc = a.admitting_doctor || {};
      const los = calculateDays(a.admission_date);
      const dailyRate = Number(bed.daily_rate) || 5000;

      const mappedItem: ActiveAdmissionItem = {
        id: a.id,
        hospitalId: a.hospital_id,
        patientId: a.patient_id,
        patientName: `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "Patient",
        patientNin: patient.nin || "",
        gender: patient.gender || null,
        age: calculateAge(patient.date_of_birth),
        encounterId: a.encounter_id,
        wardId: a.ward_id,
        wardName: ward.name || "Ward",
        bedId: a.bed_id,
        bedNumber: bed.bed_number || "--",
        dailyRate,
        admissionDate: a.admission_date,
        admittingDoctorId: a.admitting_doctor_id,
        admittingDoctorName: doc.full_name || null,
        admissionReason: a.admission_reason,
        initialCondition: a.initial_condition,
        status: a.status,
        lengthOfStayDays: los,
        estimatedTotalCharge: los * dailyRate,
      };

      admissionByBedMap.set(a.bed_id, {
        admissionId: a.id,
        patientId: a.patient_id,
        patientName: mappedItem.patientName,
        nin: mappedItem.patientNin,
        admissionDate: a.admission_date,
        admittingDoctor: doc.full_name || null,
        admissionReason: a.admission_reason,
        lengthOfStayDays: los,
      });

      return mappedItem;
    });

    // 3. Process Wards with Beds
    let totalBedsCount = 0;
    let totalOccupiedCount = 0;

    const wards: WardItem[] = (wardsRaw ?? []).map((w: any) => {
      const rawBeds = Array.isArray(w.beds) ? w.beds : [];
      let wardOccupied = 0;

      const beds: WardBedItem[] = rawBeds.map((b: any) => {
        const isOccupied = b.status === "occupied" || admissionByBedMap.has(b.id);
        if (isOccupied) wardOccupied++;
        const currentAdmission = admissionByBedMap.get(b.id);

        return {
          id: b.id,
          wardId: b.ward_id,
          bedNumber: b.bed_number,
          status: isOccupied ? "occupied" : (b.status || "available"),
          dailyRate: Number(b.daily_rate) || 5000,
          notes: b.notes || null,
          currentAdmission: currentAdmission || undefined,
        };
      });

      // Sort beds alphabetically by bed number
      beds.sort((a, b) => a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true }));

      const totalB = beds.length;
      const availableCount = Math.max(0, totalB - wardOccupied);
      const occupancyRate = totalB > 0 ? Math.round((wardOccupied / totalB) * 100) : 0;

      totalBedsCount += totalB;
      totalOccupiedCount += wardOccupied;

      return {
        id: w.id,
        hospitalId: w.hospital_id,
        name: w.name,
        type: w.type,
        totalBeds: totalB,
        genderRestriction: w.gender_restriction || "none",
        floorLocation: w.floor_location || null,
        isActive: Boolean(w.is_active),
        beds,
        availableCount,
        occupiedCount: wardOccupied,
        occupancyRate,
      };
    });

    const totalAvailable = Math.max(0, totalBedsCount - totalOccupiedCount);
    const overallOccupancyRate = totalBedsCount > 0 ? Math.round((totalOccupiedCount / totalBedsCount) * 100) : 0;

    // 4. Fetch Recent Discharges Archive
    const { data: dischargesRaw } = await supabase
      .from("admissions")
      .select(`
        id, patient_id, admission_date, discharge_date, admission_reason, discharge_condition,
        discharge_summary, discharge_instructions,
        patient:patient_id (first_name, last_name),
        ward:ward_id (name),
        bed:bed_id (bed_number),
        admitting_doctor:admitting_doctor_id (full_name)
      `)
      .eq("hospital_id", activeHospitalId)
      .eq("status", "discharged")
      .order("discharge_date", { ascending: false })
      .limit(30);

    const recentDischarges: DischargeArchiveItem[] = (dischargesRaw ?? []).map((d: any) => {
      const p = d.patient || {};
      const w = d.ward || {};
      const b = d.bed || {};
      const doc = d.admitting_doctor || {};
      return {
        id: d.id,
        patientId: d.patient_id,
        patientName: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Patient",
        wardName: w.name || "Ward",
        bedNumber: b.bed_number || "--",
        admissionDate: d.admission_date,
        dischargeDate: d.discharge_date || d.admission_date,
        admittingDoctorName: doc.full_name || null,
        admissionReason: d.admission_reason || "Inpatient Care",
        dischargeCondition: d.discharge_condition || "improved",
        dischargeSummary: d.discharge_summary || "Patient discharged following completion of treatment regimen.",
        dischargeInstructions: d.discharge_instructions || null,
        lengthOfStayDays: calculateDays(d.admission_date, d.discharge_date),
      };
    });

    // 5. Fetch Ward Staff Duty Schedules
    const { data: rostersRaw } = await supabase
      .from("ward_staff_assignments")
      .select(`
        id, ward_id, staff_id, role_in_ward, shift_date, shift_type, start_time, end_time, notes,
        ward:ward_id (name),
        staff:staff_id (full_name, role)
      `)
      .eq("hospital_id", activeHospitalId)
      .order("shift_date", { ascending: false })
      .limit(50);

    const staffSchedules: WardStaffScheduleItem[] = (rostersRaw ?? []).map((r: any) => ({
      id: r.id,
      wardId: r.ward_id,
      wardName: (r.ward as any)?.name || "Ward",
      staffId: r.staff_id,
      staffName: (r.staff as any)?.full_name || "Staff Member",
      staffRole: (r.staff as any)?.role || "Staff",
      roleInWard: r.role_in_ward,
      shiftDate: r.shift_date,
      shiftType: r.shift_type,
      startTime: r.start_time,
      endTime: r.end_time,
      notes: r.notes,
    }));

    // 6. Fetch Available Staff for Scheduling
    const { data: staffListRaw } = await supabase
      .from("staff")
      .select("id, full_name, role, department:department_id(name)")
      .eq("hospital_id", activeHospitalId)
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    const availableStaff = (staffListRaw ?? []).map((s: any) => ({
      id: s.id,
      fullName: s.full_name,
      role: s.role as StaffRole,
      department: (s.department as any)?.name || null,
    }));

    // 7. Fetch eligible patients (outpatients currently in clinic or registered)
    const { data: patientsRaw } = await supabase
      .from("patients")
      .select("id, first_name, last_name, nin, gender, date_of_birth")
      .order("created_at", { ascending: false })
      .limit(40);

    const eligiblePatients = (patientsRaw ?? []).map((p: any) => ({
      id: p.id,
      fullName: `${p.first_name} ${p.last_name}`,
      nin: p.nin,
      gender: p.gender,
      age: calculateAge(p.date_of_birth),
      latestEncounterId: null,
      latestComplaint: null,
    }));

    return {
      wards,
      totalBeds: totalBedsCount,
      totalOccupied: totalOccupiedCount,
      totalAvailable,
      overallOccupancyRate,
      activeAdmissions,
      recentDischarges,
      staffSchedules,
      availableStaff,
      eligiblePatients,
      isStaff: true,
      isAdmin,
    };
  });

/**
 * Admits a patient to a ward and assigns an available bed.
 */
export const admitPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    hospitalId?: string | undefined;
    patientId: string;
    encounterId?: string | undefined;
    wardId: string;
    bedId: string;
    admissionReason: string;
    initialCondition?: string | undefined;
  }) => {
    if (!input.patientId) throw new Error("Patient is required.");
    if (!input.wardId) throw new Error("Ward is required.");
    if (!input.bedId) throw new Error("Bed assignment is required.");
    if (!input.admissionReason || input.admissionReason.trim().length < 3) {
      throw new Error("Admission reason must be at least 3 characters.");
    }
    return {
      hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
      patientId: String(input.patientId).trim(),
      encounterId: input.encounterId ? String(input.encounterId).trim() : undefined,
      wardId: String(input.wardId).trim(),
      bedId: String(input.bedId).trim(),
      admissionReason: String(input.admissionReason).trim(),
      initialCondition: input.initialCondition ? String(input.initialCondition).trim() : undefined,
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

    // Check if bed is available
    const { data: bedRow } = await supabase
      .from("beds")
      .select("id, bed_number, status, ward_id")
      .eq("id", input.bedId)
      .single();

    if (!bedRow) throw new Error("Selected bed not found.");
    if (bedRow.status === "occupied") throw new Error(`Bed ${bedRow.bed_number} is already occupied.`);

    // Check if patient already has an active admission
    const { data: existingAdm } = await supabase
      .from("admissions")
      .select("id")
      .eq("patient_id", input.patientId)
      .eq("status", "admitted")
      .maybeSingle();

    if (existingAdm) throw new Error("This patient is already currently admitted to a ward.");

    // Create admission record
    const { data: newAdm, error: admErr } = await supabase
      .from("admissions")
      .insert({
        hospital_id: activeHospitalId,
        patient_id: input.patientId,
        encounter_id: input.encounterId || null,
        ward_id: input.wardId,
        bed_id: input.bedId,
        admission_date: new Date().toISOString(),
        admitting_doctor_id: staffRow?.id || null,
        admission_reason: input.admissionReason,
        initial_condition: input.initialCondition || "Stable",
        status: "admitted",
      })
      .select("id")
      .single();

    if (admErr) throw new Error(admErr.message);

    // Update bed status to occupied
    await supabase
      .from("beds")
      .update({ status: "occupied" })
      .eq("id", input.bedId);

    // Write audit log
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Admitted patient to ward bed ${bedRow.bed_number}. Reason: ${input.admissionReason}`,
    });

    return { success: true, admissionId: newAdm.id };
  });

/**
 * Transfers an admitted patient to another bed / ward.
 */
export const transferBed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    admissionId: string;
    newWardId: string;
    newBedId: string;
    transferReason: string;
    hospitalId?: string | undefined;
  }) => {
    if (!input.admissionId) throw new Error("Admission ID is required.");
    if (!input.newBedId) throw new Error("Target bed is required.");
    return {
      admissionId: String(input.admissionId).trim(),
      newWardId: String(input.newWardId).trim(),
      newBedId: String(input.newBedId).trim(),
      transferReason: String(input.transferReason || "Clinical bed transfer").trim(),
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

    const { data: currentAdm } = await supabase
      .from("admissions")
      .select("id, bed_id, patient_id, hospital_id")
      .eq("id", input.admissionId)
      .single();

    if (!currentAdm) throw new Error("Admission record not found.");

    // Check new bed availability
    const { data: targetBed } = await supabase
      .from("beds")
      .select("id, bed_number, status")
      .eq("id", input.newBedId)
      .single();

    if (!targetBed) throw new Error("Target bed not found.");
    if (targetBed.status === "occupied" && targetBed.id !== currentAdm.bed_id) {
      throw new Error(`Bed ${targetBed.bed_number} is already occupied.`);
    }

    // Free old bed
    await supabase
      .from("beds")
      .update({ status: "available" })
      .eq("id", currentAdm.bed_id);

    // Occupy new bed
    await supabase
      .from("beds")
      .update({ status: "occupied" })
      .eq("id", input.newBedId);

    // Update admission record
    const { error: updErr } = await supabase
      .from("admissions")
      .update({
        ward_id: input.newWardId,
        bed_id: input.newBedId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.admissionId);

    if (updErr) throw new Error(updErr.message);

    // Audit transfer
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: currentAdm.patient_id,
      action: "WRITE",
      justification: `Transferred patient to bed ${targetBed.bed_number}. Reason: ${input.transferReason}`,
    });

    return { success: true };
  });

/**
 * Discharges an admitted patient, generates structured discharge summary, and frees bed.
 */
export const dischargePatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    admissionId: string;
    dischargeCondition: "recovered" | "improved" | "stable" | "transferred" | "deceased" | "against_medical_advice";
    dischargeSummary: string;
    dischargeInstructions?: string | undefined;
    hospitalId?: string | undefined;
  }) => {
    if (!input.admissionId) throw new Error("Admission ID is required.");
    if (!input.dischargeSummary || input.dischargeSummary.trim().length < 5) {
      throw new Error("Discharge summary must be at least 5 characters.");
    }
    return {
      admissionId: String(input.admissionId).trim(),
      dischargeCondition: input.dischargeCondition,
      dischargeSummary: String(input.dischargeSummary).trim(),
      dischargeInstructions: input.dischargeInstructions ? String(input.dischargeInstructions).trim() : undefined,
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

    const { data: adm } = await supabase
      .from("admissions")
      .select("id, bed_id, patient_id, hospital_id, admission_date")
      .eq("id", input.admissionId)
      .single();

    if (!adm) throw new Error("Admission not found.");

    const dischargeDate = new Date().toISOString();

    // 1. Update admission status to discharged
    const { error: admErr } = await supabase
      .from("admissions")
      .update({
        status: "discharged",
        discharge_date: dischargeDate,
        discharge_condition: input.dischargeCondition,
        discharge_summary: input.dischargeSummary,
        discharge_instructions: input.dischargeInstructions || null,
        updated_at: dischargeDate,
      })
      .eq("id", input.admissionId);

    if (admErr) throw new Error(admErr.message);

    // 2. Free bed back to available
    if (adm.bed_id) {
      await supabase
        .from("beds")
        .update({ status: "available" })
        .eq("id", adm.bed_id);
    }

    // 3. Write Audit Entry
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: adm.patient_id,
      action: "WRITE",
      justification: `Discharged patient with condition "${input.dischargeCondition}". Summary: ${input.dischargeSummary.slice(0, 100)}...`,
    });

    return { success: true, dischargeDate };
  });

/**
 * Assigns staff (Doctor overseeing, Primary Nurse, Intern) to a ward duty schedule.
 */
export const assignWardStaffDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    wardId: string;
    staffId: string;
    roleInWard: "supervising_doctor" | "primary_nurse" | "assisting_nurse" | "intern" | "resident";
    shiftDate: string;
    shiftType: "morning" | "afternoon" | "night" | "full_day";
    startTime?: string | undefined;
    endTime?: string | undefined;
    notes?: string | undefined;
    hospitalId?: string | undefined;
  }) => {
    if (!input.wardId) throw new Error("Ward is required.");
    if (!input.staffId) throw new Error("Staff member is required.");
    if (!input.shiftDate) throw new Error("Shift date is required.");
    return {
      wardId: String(input.wardId).trim(),
      staffId: String(input.staffId).trim(),
      roleInWard: input.roleInWard,
      shiftDate: String(input.shiftDate).trim(),
      shiftType: input.shiftType,
      startTime: input.startTime ? String(input.startTime).trim() : undefined,
      endTime: input.endTime ? String(input.endTime).trim() : undefined,
      notes: input.notes ? String(input.notes).trim() : undefined,
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

    const { error: insErr } = await supabase
      .from("ward_staff_assignments")
      .insert({
        hospital_id: activeHospitalId,
        ward_id: input.wardId,
        staff_id: input.staffId,
        role_in_ward: input.roleInWard,
        shift_date: input.shiftDate,
        shift_type: input.shiftType,
        start_time: input.startTime || (input.shiftType === "night" ? "20:00" : input.shiftType === "afternoon" ? "14:00" : "08:00"),
        end_time: input.endTime || (input.shiftType === "night" ? "08:00" : input.shiftType === "afternoon" ? "20:00" : "14:00"),
        notes: input.notes || null,
      });

    if (insErr) throw new Error(insErr.message);

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "WRITE",
      justification: `Assigned ward duty schedule for staff ${input.staffId} on ${input.shiftDate} (${input.roleInWard})`,
    });

    return { success: true };
  });
