import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type AppointmentPriority = "routine" | "urgent" | "emergency";
export type AppointmentStatus =
  | "booked"
  | "checked_in"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show";

export type CalendarAppointmentItem = {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  patientNin: string;
  patientPhone: string | null;
  patientGender: string | null;
  patientAge: string;
  doctorId: string | null;
  doctorName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  appointmentDate: string;
  slotDurationMinutes: number;
  priority: AppointmentPriority;
  status: AppointmentStatus;
  queueNumber: number | null;
  symptomsSummary: string | null;
  notes: string | null;
  isWalkIn: boolean;
  isExternalBooking: boolean;
  previousEncounterId: string | null;
  checkedInAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
};

export type DoctorScheduleSlot = {
  time: string; // e.g. "09:00"
  isoDateTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  isBlocked: boolean;
  bookedAppointmentId?: string;
  bookedPatientName?: string;
};

export type DoctorAvailability = {
  doctorId: string;
  doctorName: string;
  departmentId: string | null;
  departmentName: string | null;
  role: string;
  shiftStart: string;
  shiftEnd: string;
  slots: DoctorScheduleSlot[];
};

export type AppointmentsCalendarData = {
  appointments: CalendarAppointmentItem[];
  doctors: Array<{
    id: string;
    fullName: string;
    role: string;
    departmentId: string | null;
    departmentName: string | null;
  }>;
  departments: Array<{
    id: string;
    name: string;
    slotDurationMinutes: number;
  }>;
  stats: {
    total: number;
    booked: number;
    checkedIn: number;
    inConsultation: number;
    completed: number;
    cancelled: number;
    noShow: number;
    urgentOrEmergency: number;
  };
};

export type LiveQueueTicket = {
  appointmentId: string;
  queueNumber: number;
  patientName: string;
  patientNin: string;
  doctorName: string | null;
  departmentName: string | null;
  status: AppointmentStatus;
  checkedInAt: string | null;
  estimatedWaitMinutes: number;
};

export type LiveQueueBoardData = {
  hospitalName: string;
  currentlyServing: LiveQueueTicket | null;
  nextInLine: LiveQueueTicket[];
  departmentQueues: Array<{
    departmentId: string;
    departmentName: string;
    currentNumber: number | null;
    waitingCount: number;
  }>;
  totalWaitingToday: number;
  lastUpdated: string;
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

// 1. GET CALENDAR APPOINTMENTS WITH AGGREGATIONS
export const getHospitalAppointmentsCalendar = createServerFn({ method: "GET" })
  .validator((d: {
    hospitalId?: string;
    startDate: string; // ISO date string e.g. 2026-09-13T00:00:00.000Z
    endDate: string;   // ISO date string e.g. 2026-09-13T23:59:59.999Z
    departmentId?: string;
    doctorId?: string;
    statusFilter?: string;
  }) => d)
  .handler(async ({ data }) => {
    const { supabase, supabaseAdmin, userId, role } = await requireSupabaseAuth();

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
      throw new Error("Hospital context required for appointment calendar.");
    }

    // A. Fetch Departments
    const { data: depts } = await supabaseAdmin
      .from("departments")
      .select("id, name, appointment_slot_duration_minutes")
      .eq("hospital_id", targetHospitalId)
      .eq("is_active", true)
      .order("name");

    const departmentsList = (depts || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      slotDurationMinutes: d.appointment_slot_duration_minutes || 20,
    }));

    // B. Fetch Doctors / Clinical Staff
    const { data: doctorsData } = await supabaseAdmin
      .from("staff")
      .select(`
        id,
        role,
        department_id,
        user_id,
        departments:department_id(name)
      `)
      .eq("hospital_id", targetHospitalId)
      .in("role", ["doctor", "super_admin", "hospital_admin"]);

    // Fetch user profiles for doctor names
    const doctorUserIds = (doctorsData || []).map((d: any) => d.user_id).filter(Boolean);
    let doctorProfileMap = new Map<string, string>();
    if (doctorUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", doctorUserIds);
      (profiles || []).forEach((p: any) => doctorProfileMap.set(p.id, p.full_name));
    }

    const doctorsList = (doctorsData || []).map((d: any) => ({
      id: d.id,
      fullName: doctorProfileMap.get(d.user_id) || "Dr. Staff Clinician",
      role: d.role,
      departmentId: d.department_id,
      departmentName: d.departments?.name || null,
    }));

    // C. Fetch Appointments
    let query = supabaseAdmin
      .from("appointments")
      .select(`
        id,
        hospital_id,
        patient_id,
        doctor_id,
        department_id,
        appointment_date,
        slot_duration_minutes,
        priority,
        status,
        queue_number,
        symptoms_summary,
        notes,
        is_walk_in,
        is_external_booking,
        previous_encounter_id,
        checked_in_at,
        cancelled_at,
        cancellation_reason,
        created_at,
        patient:patient_id (
          id,
          first_name,
          last_name,
          nin,
          phone,
          gender,
          date_of_birth
        ),
        doctor:doctor_id (
          id,
          user_id
        ),
        department:department_id (
          id,
          name
        )
      `)
      .eq("hospital_id", targetHospitalId)
      .gte("appointment_date", data.startDate)
      .lte("appointment_date", data.endDate);

    if (data.departmentId && data.departmentId !== "all") {
      query = query.eq("department_id", data.departmentId);
    }
    if (data.doctorId && data.doctorId !== "all") {
      query = query.eq("doctor_id", data.doctorId);
    }
    if (data.statusFilter && data.statusFilter !== "all") {
      query = query.eq("status", data.statusFilter);
    }

    const { data: rows, error } = await query.order("appointment_date", { ascending: true });

    if (error) {
      console.error("Failed to query appointments:", error);
      throw new Error(`Failed to load appointments: ${error.message}`);
    }

    // Helper to calculate age
    const calcAge = (dob: string | null) => {
      if (!dob) return "N/A";
      const diff = Date.now() - new Date(dob).getTime();
      const ageDate = new Date(diff);
      return `${Math.abs(ageDate.getUTCFullYear() - 1970)}y`;
    };

    const appointments: CalendarAppointmentItem[] = (rows || []).map((row: any) => {
      const pat = row.patient || {};
      const docUserId = row.doctor?.user_id;
      const docName = docUserId ? doctorProfileMap.get(docUserId) || "Attending Doctor" : null;

      return {
        id: row.id,
        hospitalId: row.hospital_id,
        patientId: row.patient_id,
        patientName: pat.first_name ? `${pat.first_name} ${pat.last_name || ""}`.trim() : "Patient",
        patientNin: pat.nin || "N/A",
        patientPhone: pat.phone || null,
        patientGender: pat.gender || null,
        patientAge: calcAge(pat.date_of_birth),
        doctorId: row.doctor_id,
        doctorName: docName,
        departmentId: row.department_id,
        departmentName: row.department?.name || null,
        appointmentDate: row.appointment_date,
        slotDurationMinutes: row.slot_duration_minutes || 20,
        priority: (row.priority as AppointmentPriority) || "routine",
        status: (row.status as AppointmentStatus) || "booked",
        queueNumber: row.queue_number,
        symptomsSummary: row.symptoms_summary,
        notes: row.notes,
        isWalkIn: Boolean(row.is_walk_in),
        isExternalBooking: Boolean(row.is_external_booking),
        previousEncounterId: row.previous_encounter_id,
        checkedInAt: row.checked_in_at,
        cancelledAt: row.cancelled_at,
        cancellationReason: row.cancellation_reason,
        createdAt: row.created_at,
      };
    });

    // Compute Stats
    const stats = {
      total: appointments.length,
      booked: appointments.filter((a) => a.status === "booked").length,
      checkedIn: appointments.filter((a) => a.status === "checked_in").length,
      inConsultation: appointments.filter((a) => a.status === "in_consultation").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
      noShow: appointments.filter((a) => a.status === "no_show").length,
      urgentOrEmergency: appointments.filter(
        (a) => a.priority === "urgent" || a.priority === "emergency"
      ).length,
    };

    return {
      appointments,
      doctors: doctorsList,
      departments: departmentsList,
      stats,
    };
  });

// 2. GET AVAILABLE DOCTOR SLOTS
export const getAvailableDoctorSlots = createServerFn({ method: "GET" })
  .validator((d: {
    hospitalId?: string;
    date: string; // YYYY-MM-DD
    departmentId?: string;
    doctorId?: string;
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

    const selectedDate = new Date(`${data.date}T00:00:00.000Z`);
    const dayOfWeek = selectedDate.getUTCDay(); // 0=Sunday, 1=Monday... 6=Saturday

    const startOfDay = `${data.date}T00:00:00.000Z`;
    const endOfDay = `${data.date}T23:59:59.999Z`;

    // A. Query doctors
    let docQuery = supabaseAdmin
      .from("staff")
      .select(`
        id,
        user_id,
        role,
        department_id,
        departments:department_id(name, appointment_slot_duration_minutes)
      `)
      .eq("hospital_id", targetHospitalId)
      .in("role", ["doctor", "super_admin", "hospital_admin"]);

    if (data.doctorId) {
      docQuery = docQuery.eq("id", data.doctorId);
    }
    if (data.departmentId && data.departmentId !== "all") {
      docQuery = docQuery.eq("department_id", data.departmentId);
    }

    const { data: doctorsData } = await docQuery;
    const docUserIds = (doctorsData || []).map((d: any) => d.user_id).filter(Boolean);

    let docNameMap = new Map<string, string>();
    if (docUserIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", docUserIds);
      (profs || []).forEach((p: any) => docNameMap.set(p.id, p.full_name));
    }

    // B. Query existing appointments on that date
    const { data: existingAppts } = await supabaseAdmin
      .from("appointments")
      .select("id, doctor_id, appointment_date, slot_duration_minutes, status, patient:patient_id(first_name, last_name)")
      .eq("hospital_id", targetHospitalId)
      .gte("appointment_date", startOfDay)
      .lte("appointment_date", endOfDay)
      .not("status", "eq", "cancelled");

    // C. Query recurring weekly shifts & specific date schedules
    const { data: weeklyShifts } = await supabaseAdmin
      .from("staff_weekly_shifts")
      .select("staff_id, start_time_str, end_time_str, is_active")
      .eq("hospital_id", targetHospitalId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true);

    const { data: dateSchedules } = await supabaseAdmin
      .from("staff_schedules")
      .select("staff_id, start_time, end_time")
      .eq("hospital_id", targetHospitalId)
      .gte("start_time", startOfDay)
      .lte("end_time", endOfDay);

    const results: DoctorAvailability[] = [];

    for (const doc of doctorsData || []) {
      const docName = docNameMap.get(doc.user_id) || "Dr. Staff Clinician";
      const slotDuration = (doc.departments as any)?.appointment_slot_duration_minutes || 20;

      // Find doctor shift: prioritize specific schedule, fallback to weekly shift, default to 08:00 - 17:00
      let shiftStartHour = 8;
      let shiftStartMinute = 0;
      let shiftEndHour = 17;
      let shiftEndMinute = 0;

      const specific = (dateSchedules || []).find((s: any) => s.staff_id === doc.id);
      const weekly = (weeklyShifts || []).find((w: any) => w.staff_id === doc.id);

      if (specific) {
        const sDate = new Date(specific.start_time);
        const eDate = new Date(specific.end_time);
        shiftStartHour = sDate.getUTCHours();
        shiftStartMinute = sDate.getUTCMinutes();
        shiftEndHour = eDate.getUTCHours();
        shiftEndMinute = eDate.getUTCMinutes();
      } else if (weekly) {
        const [sh, sm] = (weekly.start_time_str || "08:00").split(":").map(Number);
        const [eh, em] = (weekly.end_time_str || "17:00").split(":").map(Number);
        shiftStartHour = sh || 8;
        shiftStartMinute = sm || 0;
        shiftEndHour = eh || 17;
        shiftEndMinute = em || 0;
      }

      // Generate slots
      const slots: DoctorScheduleSlot[] = [];
      const currentSlotTime = new Date(`${data.date}T00:00:00.000Z`);
      currentSlotTime.setUTCHours(shiftStartHour, shiftStartMinute, 0, 0);

      const endSlotTime = new Date(`${data.date}T00:00:00.000Z`);
      endSlotTime.setUTCHours(shiftEndHour, shiftEndMinute, 0, 0);

      while (currentSlotTime < endSlotTime) {
        const slotIso = currentSlotTime.toISOString();
        const timeStr = currentSlotTime.toISOString().slice(11, 16); // "08:00"

        // Check if booked
        const booked = (existingAppts || []).find((a: any) => {
          if (a.doctor_id !== doc.id) return false;
          const aTime = new Date(a.appointment_date).getTime();
          const sTime = currentSlotTime.getTime();
          const durationMs = (a.slot_duration_minutes || slotDuration) * 60000;
          return sTime >= aTime && sTime < aTime + durationMs;
        });

        slots.push({
          time: timeStr,
          isoDateTime: slotIso,
          isAvailable: !booked,
          isBooked: Boolean(booked),
          isBlocked: false,
          bookedAppointmentId: booked?.id,
          bookedPatientName: booked?.patient
            ? `${(booked.patient as any).first_name} ${(booked.patient as any).last_name || ""}`.trim()
            : undefined,
        });

        // Advance by slot duration
        currentSlotTime.setUTCMinutes(currentSlotTime.getUTCMinutes() + slotDuration);
      }

      results.push({
        doctorId: doc.id,
        doctorName: docName,
        departmentId: doc.department_id,
        departmentName: (doc.departments as any)?.name || null,
        role: doc.role,
        shiftStart: `${String(shiftStartHour).padStart(2, "0")}:${String(shiftStartMinute).padStart(2, "0")}`,
        shiftEnd: `${String(shiftEndHour).padStart(2, "0")}:${String(shiftEndMinute).padStart(2, "0")}`,
        slots,
      });
    }

    return { availabilities: results };
  });

// 3. CREATE APPOINTMENT WITH SERVER-SIDE DOUBLE-BOOKING CHECK
export const createStaffAppointment = createServerFn({ method: "POST" })
  .validator((d: {
    hospitalId: string;
    patientId: string;
    departmentId?: string | null;
    doctorId?: string | null;
    appointmentDate: string; // ISO string
    slotDurationMinutes?: number;
    priority?: AppointmentPriority;
    symptomsSummary: string;
    notes?: string;
    isWalkIn?: boolean;
    previousEncounterId?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const { supabase, supabaseAdmin, userId, role } = await requireSupabaseAuth();

    const slotDuration = data.slotDurationMinutes || 20;
    const apptDate = new Date(data.appointmentDate);
    const apptEndTime = new Date(apptDate.getTime() + slotDuration * 60000);

    // Server-side double booking concurrency guard for doctor
    if (data.doctorId) {
      const { data: overlapping } = await supabaseAdmin
        .from("appointments")
        .select("id, appointment_date, slot_duration_minutes")
        .eq("hospital_id", data.hospitalId)
        .eq("doctor_id", data.doctorId)
        .not("status", "in", "(cancelled,completed)")
        .gte("appointment_date", new Date(apptDate.getTime() - 60 * 60000).toISOString())
        .lte("appointment_date", apptEndTime.toISOString());

      const hasOverlap = (overlapping || []).some((ex: any) => {
        const exStart = new Date(ex.appointment_date).getTime();
        const exEnd = exStart + (ex.slot_duration_minutes || slotDuration) * 60000;
        const newStart = apptDate.getTime();
        const newEnd = apptEndTime.getTime();
        return (newStart >= exStart && newStart < exEnd) || (newEnd > exStart && newEnd <= exEnd);
      });

      if (hasOverlap) {
        throw new Error("This doctor already has a booked appointment at the selected time slot.");
      }
    }

    // Insert appointment
    const { data: newAppt, error: insError } = await supabaseAdmin
      .from("appointments")
      .insert({
        hospital_id: data.hospitalId,
        patient_id: data.patientId,
        department_id: data.departmentId || null,
        doctor_id: data.doctorId || null,
        appointment_date: data.appointmentDate,
        slot_duration_minutes: slotDuration,
        priority: data.priority || "routine",
        symptoms_summary: data.symptomsSummary,
        notes: data.notes || null,
        is_walk_in: Boolean(data.isWalkIn),
        is_external_booking: false,
        previous_encounter_id: data.previousEncounterId || null,
        status: "booked",
      })
      .select("id")
      .single();

    if (insError || !newAppt) {
      throw new Error(`Failed to book appointment: ${insError?.message}`);
    }

    await writeAuditEntry(supabase, {
      hospital_id: data.hospitalId,
      accessor_id: userId,
      accessor_role: role,
      patient_id: data.patientId,
      action: "WRITE",
      justification: `Booked clinic appointment for ${data.appointmentDate} (Priority: ${data.priority || "routine"})`,
    });

    return { success: true, appointmentId: newAppt.id };
  });

// 4. CHECK IN APPOINTMENT & CREATE TRIAGE ENCOUNTER
export const checkInClinicAppointment = createServerFn({ method: "POST" })
  .validator((d: { appointmentId: string; hospitalId: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, supabaseAdmin, userId, role } = await requireSupabaseAuth();

    const { data: appt, error: apptError } = await supabaseAdmin
      .from("appointments")
      .select("id, patient_id, department_id, doctor_id, symptoms_summary, priority, status")
      .eq("id", data.appointmentId)
      .eq("hospital_id", data.hospitalId)
      .single();

    if (apptError || !appt) {
      throw new Error("Appointment record not found.");
    }

    // Check for open active encounter
    const { data: openVisit } = await supabaseAdmin
      .from("encounters")
      .select("id")
      .eq("patient_id", appt.patient_id)
      .eq("hospital_id", data.hospitalId)
      .not("encounter_status", "in", "(discharged,closed)")
      .maybeSingle();

    if (openVisit) {
      if (appt.status !== "checked_in") {
        await supabaseAdmin
          .from("appointments")
          .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
          .eq("id", data.appointmentId);
      }
      return { encounterId: openVisit.id as string, alreadyOpen: true as const, queueNumber: null };
    }

    // Calculate daily queue number
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count: checkedInCount } = await supabaseAdmin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", data.hospitalId)
      .gte("appointment_date", startOfDay.toISOString())
      .eq("status", "checked_in");

    const queueNumber = (checkedInCount ?? 0) + 1;

    // Update appointment to checked_in
    await supabaseAdmin
      .from("appointments")
      .update({
        status: "checked_in",
        queue_number: queueNumber,
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", data.appointmentId);

    // Grant or activate patient consent
    const { data: consentRow } = await supabaseAdmin
      .from("patient_consents")
      .select("id")
      .eq("patient_id", appt.patient_id)
      .eq("hospital_id", data.hospitalId)
      .maybeSingle();

    if (consentRow) {
      await supabaseAdmin
        .from("patient_consents")
        .update({ is_active: true, expires_at: null, granted_by: userId })
        .eq("id", consentRow.id);
    } else {
      await supabaseAdmin.from("patient_consents").insert({
        patient_id: appt.patient_id,
        hospital_id: data.hospitalId,
        granted_by: userId,
        scope: "full_record",
      });
    }

    // Create encounter in triage
    const { data: encounter, error: encError } = await supabaseAdmin
      .from("encounters")
      .insert({
        hospital_id: data.hospitalId,
        patient_id: appt.patient_id,
        appointment_id: data.appointmentId,
        department_id: appt.department_id,
        practitioner_id: appt.doctor_id,
        encounter_status: "triage",
        chief_complaint: appt.symptoms_summary || "Clinic consultation check-in",
      })
      .select("id")
      .single();

    if (encError || !encounter) {
      throw new Error(`Failed to create triage encounter: ${encError?.message}`);
    }

    await writeAuditEntry(supabase, {
      hospital_id: data.hospitalId,
      accessor_id: userId,
      accessor_role: role,
      patient_id: appt.patient_id,
      encounter_id: encounter.id,
      action: "WRITE",
      justification: `Patient checked in for appointment. Queue #${queueNumber} issued, triage encounter opened.`,
    });

    return { encounterId: encounter.id as string, alreadyOpen: false as const, queueNumber };
  });

// 5. RESCHEDULE APPOINTMENT
export const rescheduleClinicAppointment = createServerFn({ method: "POST" })
  .validator((d: {
    appointmentId: string;
    hospitalId: string;
    newAppointmentDate: string; // ISO string
    doctorId?: string | null;
    reason?: string;
  }) => d)
  .handler(async ({ data }) => {
    const { supabase, supabaseAdmin, userId, role } = await requireSupabaseAuth();

    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, patient_id, doctor_id, slot_duration_minutes")
      .eq("id", data.appointmentId)
      .eq("hospital_id", data.hospitalId)
      .single();

    if (!appt) {
      throw new Error("Appointment not found.");
    }

    const targetDoctorId = data.doctorId !== undefined ? data.doctorId : appt.doctor_id;

    // Double-booking check
    if (targetDoctorId) {
      const newStart = new Date(data.newAppointmentDate).getTime();
      const newEnd = newStart + (appt.slot_duration_minutes || 20) * 60000;

      const { data: overlapping } = await supabaseAdmin
        .from("appointments")
        .select("id, appointment_date, slot_duration_minutes")
        .eq("hospital_id", data.hospitalId)
        .eq("doctor_id", targetDoctorId)
        .neq("id", data.appointmentId)
        .not("status", "in", "(cancelled,completed)")
        .gte("appointment_date", new Date(newStart - 60 * 60000).toISOString())
        .lte("appointment_date", new Date(newEnd).toISOString());

      const hasOverlap = (overlapping || []).some((ex: any) => {
        const exStart = new Date(ex.appointment_date).getTime();
        const exEnd = exStart + (ex.slot_duration_minutes || 20) * 60000;
        return (newStart >= exStart && newStart < exEnd) || (newEnd > exStart && newEnd <= exEnd);
      });

      if (hasOverlap) {
        throw new Error("Target time slot conflicts with an existing booking for this doctor.");
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({
        appointment_date: data.newAppointmentDate,
        doctor_id: targetDoctorId,
        status: "booked",
        notes: data.reason ? `Rescheduled: ${data.reason}` : undefined,
      })
      .eq("id", data.appointmentId);

    if (updateError) {
      throw new Error(`Failed to reschedule appointment: ${updateError.message}`);
    }

    await writeAuditEntry(supabase, {
      hospital_id: data.hospitalId,
      accessor_id: userId,
      accessor_role: role,
      patient_id: appt.patient_id,
      action: "WRITE",
      justification: `Appointment rescheduled to ${data.newAppointmentDate}. Reason: ${data.reason || "Staff adjustment"}`,
    });

    return { success: true };
  });

// 6. CANCEL APPOINTMENT
export const cancelClinicAppointment = createServerFn({ method: "POST" })
  .validator((d: { appointmentId: string; hospitalId: string; reason: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, supabaseAdmin, userId, role } = await requireSupabaseAuth();

    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, patient_id")
      .eq("id", data.appointmentId)
      .eq("hospital_id", data.hospitalId)
      .single();

    if (!appt) throw new Error("Appointment not found.");

    const { error } = await supabaseAdmin
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: data.reason,
      })
      .eq("id", data.appointmentId);

    if (error) throw new Error(`Cancellation failed: ${error.message}`);

    await writeAuditEntry(supabase, {
      hospital_id: data.hospitalId,
      accessor_id: userId,
      accessor_role: role,
      patient_id: appt.patient_id,
      action: "WRITE",
      justification: `Appointment cancelled. Reason: ${data.reason}`,
    });

    return { success: true };
  });

// 7. GET LIVE QUEUE BOARD DATA
export const getLiveQueueBoardData = createServerFn({ method: "GET" })
  .validator((d: { hospitalId?: string; departmentId?: string }) => d)
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
      throw new Error("Hospital context required for queue board.");
    }

    // Hospital Name
    const { data: hosp } = await supabaseAdmin
      .from("hospitals")
      .select("name")
      .eq("id", targetHospitalId)
      .single();

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    // Query today's active tickets (in_consultation or checked_in)
    let query = supabaseAdmin
      .from("appointments")
      .select(`
        id,
        queue_number,
        status,
        checked_in_at,
        patient:patient_id (
          first_name,
          last_name,
          nin
        ),
        doctor:doctor_id (
          user_id
        ),
        department:department_id (
          id,
          name
        )
      `)
      .eq("hospital_id", targetHospitalId)
      .gte("appointment_date", startOfDay.toISOString())
      .in("status", ["in_consultation", "checked_in"])
      .order("queue_number", { ascending: true });

    if (data.departmentId && data.departmentId !== "all") {
      query = query.eq("department_id", data.departmentId);
    }

    const { data: activeRows } = await query;

    // Doctor profile map
    const docUserIds = (activeRows || []).map((r: any) => r.doctor?.user_id).filter(Boolean);
    let docMap = new Map<string, string>();
    if (docUserIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", docUserIds);
      (profs || []).forEach((p: any) => docMap.set(p.id, p.full_name));
    }

    const tickets: LiveQueueTicket[] = (activeRows || []).map((row: any, idx: number) => {
      const pat = row.patient || {};
      const docName = row.doctor?.user_id ? docMap.get(row.doctor.user_id) || "Clinician" : null;
      return {
        appointmentId: row.id,
        queueNumber: row.queue_number || idx + 1,
        patientName: pat.first_name ? `${pat.first_name} ${pat.last_name ? pat.last_name[0] + "." : ""}` : "Patient",
        patientNin: pat.nin ? `•••${pat.nin.slice(-4)}` : "•••",
        doctorName: docName,
        departmentName: row.department?.name || "General Outpatient",
        status: row.status,
        checkedInAt: row.checked_in_at,
        estimatedWaitMinutes: Math.max(5, idx * 15),
      };
    });

    const currentlyServing = tickets.find((t) => t.status === "in_consultation") || tickets[0] || null;
    const nextInLine = tickets.filter((t) => t.appointmentId !== currentlyServing?.appointmentId).slice(0, 4);

    // Department summary aggregation
    const { data: depts } = await supabaseAdmin
      .from("departments")
      .select("id, name")
      .eq("hospital_id", targetHospitalId)
      .eq("is_active", true);

    const departmentQueues = (depts || []).map((d: any) => {
      const deptTickets = tickets.filter((t) => (activeRows || []).find((r: any) => r.id === t.appointmentId)?.department?.id === d.id);
      const current = deptTickets.find((t) => t.status === "in_consultation") || deptTickets[0];
      return {
        departmentId: d.id,
        departmentName: d.name,
        currentNumber: current?.queueNumber || null,
        waitingCount: deptTickets.length,
      };
    });

    return {
      hospitalName: hosp?.name || "HospNest Medical Center",
      currentlyServing,
      nextInLine,
      departmentQueues,
      totalWaitingToday: tickets.length,
      lastUpdated: new Date().toISOString(),
    };
  });

// 8. AUTO-MARK NO SHOWS
export const markPastAppointmentsNoShow = createServerFn({ method: "POST" })
  .validator((d: { hospitalId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await requireSupabaseAuth();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from("appointments")
      .update({ status: "no_show" })
      .eq("hospital_id", data.hospitalId)
      .eq("status", "booked")
      .lte("appointment_date", twoHoursAgo)
      .select("id");

    return { count: updated?.length || 0, error: error?.message };
  });
