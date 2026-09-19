import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";
import type { AdminDashboardStats } from "./admin.functions";
import { getAdminDashboardStats } from "./admin.functions";

export type DoctorDashboardData = {
  queueCount: number;
  myPatientsCount: number;
  unassignedCount: number;
  urgentVitalsCount: number;
  pendingLabOrdersCount: number;
  completedLabResultsCount: number;
  supervisedInpatientsCount: number;
  appointmentMetrics: {
    todayTotal: number;
    completed: number;
    checkedIn: number;
    pending: number;
    cancelled: number;
    noShowRate: number;
    externalOnlineBookings: number;
    hourlyTraffic: Array<{ hour: string; count: number }>;
  };
  patientAssignmentQueues: {
    waitingTriage: Array<{
      encounterId: string;
      patientId: string;
      patientName: string;
      nin: string;
      checkedInAt: string;
      chiefComplaint: string | null;
    }>;
    waitingDoctor: Array<{
      encounterId: string;
      patientId: string;
      patientName: string;
      nin: string;
      checkedInAt: string;
      chiefComplaint: string | null;
      vitals: {
        temperature: number | null;
        bp: string | null;
        pulse: number | null;
        spo2: number | null;
        isUrgent: boolean;
      } | null;
    }>;
    inConsultation: Array<{
      encounterId: string;
      patientId: string;
      patientName: string;
      doctorName: string | null;
      isMine: boolean;
      startedAt: string;
      chiefComplaint: string | null;
    }>;
    diagnosticHold: Array<{
      orderId: string;
      patientId: string;
      patientName: string;
      testName: string;
      status: string;
      orderedAt: string;
      isCritical: boolean;
    }>;
    pharmacyHold: Array<{
      prescriptionId: string;
      patientName: string;
      drugsCount: number;
      orderedAt: string;
    }>;
  };
  waitingQueue: Array<{
    encounterId: string;
    patientId: string;
    patientName: string;
    nin: string;
    age: string;
    gender: string | null;
    chiefComplaint: string | null;
    checkedInAt: string;
    vitals: {
      temperature: number | null;
      bp: string | null;
      pulse: number | null;
      spo2: number | null;
      isUrgent: boolean;
    } | null;
  }>;
  inpatients: Array<{
    admissionId: string;
    patientName: string;
    wardName: string;
    bedNumber: string;
    admissionDate: string;
    lengthOfStayDays: number;
    initialCondition: string | null;
  }>;
  criticalLabAlerts: Array<{
    orderId: string;
    patientId: string;
    patientName: string;
    nin: string;
    testName: string;
    resultValue: string;
    units: string | null;
    referenceRange: string | null;
    isCritical: boolean;
    isOutOfRange: boolean;
    technicianName: string | null;
    completedAt: string;
    acknowledgedAt: string | null;
    acknowledgedByName: string | null;
    urgency: string;
  }>;
  recentLabResults: Array<{
    orderId: string;
    patientId: string;
    patientName: string;
    testName: string;
    resultValue: string | null;
    units: string | null;
    completedAt: string;
    hasAbnormal: boolean;
    isCritical: boolean;
  }>;
  labStatusSummary: {
    requestedToday: number;
    pendingResults: number;
    completedToday: number;
    criticalAlertsCount: number;
  };
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    patientId?: string;
    patientName?: string;
    encounterId?: string;
    orderId?: string;
    timestamp: string;
    isRead: boolean;
    priority: "routine" | "urgent" | "critical";
  }>;
};

export type NurseDashboardData = {
  triageQueueCount: number;
  vitalsCapturedTodayCount: number;
  activeInpatientsCount: number;
  totalBedsCount: number;
  availableBedsCount: number;
  occupancyRate: number;
  todayShift: {
    wardName: string;
    shiftType: string;
    roleInWard: string;
    startTime: string | null;
    endTime: string | null;
  } | null;
  triageQueue: Array<{
    encounterId: string;
    patientId: string;
    patientName: string;
    nin: string;
    age: string;
    gender: string | null;
    chiefComplaint: string | null;
    checkedInAt: string;
  }>;
  urgentVitalsAlerts: Array<{
    vitalId: string;
    patientName: string;
    flagReason: string;
    recordedAt: string;
  }>;
};

export type LabTechDashboardData = {
  requestedCount: number;
  sampleCollectedCount: number;
  inProgressCount: number;
  completedTodayCount: number;
  criticalResultsCount: number;
  avgTurnaroundHours: number;
  activeWorklist: Array<{
    orderId: string;
    patientName: string;
    testName: string;
    sampleType: string | null;
    status: string;
    orderedAt: string;
    doctorName: string | null;
  }>;
};

export type PharmacistDashboardData = {
  pendingPrescriptionsCount: number;
  dispensedTodayCount: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  totalMedicationsCount: number;
  pendingQueue: Array<{
    prescriptionId: string;
    patientName: string;
    doctorName: string | null;
    drugsCount: number;
    orderedAt: string;
  }>;
  lowStockAlerts: Array<{
    medicationId: string;
    drugName: string;
    currentStock: number;
    reorderLevel: number;
  }>;
};

export type FrontDeskDashboardData = {
  todayAppointmentsCount: number;
  onlineBookingsCount: number;
  checkedInTodayCount: number;
  availableBedsCount: number;
  totalBedsCount: number;
  todayAppointments: Array<{
    id: string;
    patientName: string;
    nin: string;
    phone: string | null;
    appointmentTime: string;
    status: string;
    isExternalBooking: boolean;
    bookingReference: string | null;
    doctorName: string | null;
  }>;
  liveTriageQueue: Array<{
    encounterId: string;
    patientName: string;
    queueNumber: number | null;
    checkedInAt: string;
    status: string;
  }>;
};

export type PatientPortalDashboardData = {
  upcomingAppointments: Array<{
    id: string;
    hospitalName: string;
    appointmentDate: string;
    appointmentTime: string;
    status: string;
    bookingReference: string | null;
  }>;
  recentEncounters: Array<{
    id: string;
    hospitalName: string;
    visitDate: string;
    diagnosis: string | null;
    doctorName: string | null;
  }>;
  activePrescriptions: Array<{
    id: string;
    drugName: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    prescribedDate: string;
  }>;
  completedLabReports: Array<{
    id: string;
    testName: string;
    date: string;
    resultSummary: string | null;
    isCritical: boolean;
  }>;
};

export type RoleDashboardResult = {
  role: StaffRole | "patient";
  hospitalName: string;
  hospitalId: string;
  doctorData?: DoctorDashboardData | undefined;
  nurseData?: NurseDashboardData | undefined;
  labTechData?: LabTechDashboardData | undefined;
  pharmacistData?: PharmacistDashboardData | undefined;
  frontDeskData?: FrontDeskDashboardData | undefined;
  patientData?: PatientPortalDashboardData | undefined;
  adminData?: AdminDashboardStats | undefined;
};

function calculateDays(from: string): number {
  try {
    const start = new Date(from);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
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

/**
 * Returns tailored real-time dashboard data for any signed-in staff role.
 */
export const getRoleDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { hospitalId?: string | undefined }) => ({
    hospitalId: input?.hospitalId ? String(input.hospitalId).trim() : undefined,
  }))
  .handler(async ({ context, data: input }): Promise<RoleDashboardResult> => {
    const { supabase, userId } = context;

    // Determine caller role and hospital
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name)")
      .eq("user_id", userId)
      .eq("is_active", true);

    const staffRoles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    const isPatient = (roleRows ?? []).some((r: any) => r.role === "patient");

    if (staffRoles.length === 0) {
      // Handle patient role dashboard
      const { data: patientRow } = await supabase
        .from("patients")
        .select("id, first_name, last_name, nin")
        .eq("user_id", userId)
        .maybeSingle();

      const patientId = patientRow?.id;
      if (!patientId) {
        throw new Error("No active staff or patient profile found.");
      }

      // Fetch appointments
      const { data: appts } = await supabase
        .from("appointments")
        .select(`
          id, appointment_date, appointment_time, status, booking_reference,
          hospitals (name)
        `)
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false })
        .limit(6);

      // Fetch encounters
      const { data: encs } = await supabase
        .from("encounters")
        .select(`
          id, created_at, diagnosis, status,
          hospitals (name),
          practitioner:practitioner_id (full_name)
        `)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(6);

      // Fetch prescriptions
      const { data: rxs } = await supabase
        .from("prescription_items")
        .select(`
          id, dosage, frequency, duration, created_at,
          drug:drug_id (generic_name, brand_name)
        `)
        .eq("prescriptions.patient_id", patientId)
        .limit(6);

      // Fetch completed lab reports
      const { data: labs } = await supabase
        .from("lab_orders")
        .select(`
          id, created_at, result_value, units, is_critical, status,
          test:test_id (test_catalog (name))
        `)
        .eq("patient_id", patientId)
        .in("status", ["completed", "verified"])
        .order("created_at", { ascending: false })
        .limit(6);

      return {
        role: "patient",
        hospitalName: (appts?.[0] as any)?.hospitals?.name || "HospNest Network",
        hospitalId: "",
        patientData: {
          upcomingAppointments: (appts ?? []).map((a: any) => ({
            id: a.id,
            hospitalName: a.hospitals?.name || "Hospital",
            appointmentDate: a.appointment_date,
            appointmentTime: a.appointment_time || "09:00",
            status: a.status,
            bookingReference: a.booking_reference,
          })),
          recentEncounters: (encs ?? []).map((e: any) => ({
            id: e.id,
            hospitalName: e.hospitals?.name || "Hospital",
            visitDate: e.created_at,
            diagnosis: e.diagnosis || "General Consultation",
            doctorName: e.practitioner?.full_name ? `Dr. ${e.practitioner.full_name}` : "Attending Doctor",
          })),
          activePrescriptions: (rxs ?? []).map((r: any) => ({
            id: r.id,
            drugName: r.drug?.brand_name ? `${r.drug.generic_name} (${r.drug.brand_name})` : r.drug?.generic_name || "Medication",
            dosage: r.dosage,
            frequency: r.frequency,
            duration: r.duration,
            prescribedDate: r.created_at,
          })),
          completedLabReports: (labs ?? []).map((l: any) => ({
            id: l.id,
            testName: (l.test as any)?.test_catalog?.name || "Diagnostic Investigation",
            date: l.created_at,
            resultSummary: l.result_value ? `${l.result_value} ${l.units || ""}` : "Completed",
            isCritical: Boolean(l.is_critical),
          })),
        },
      };
    }

    const matched = input?.hospitalId
      ? staffRoles.find((r: any) => r.hospital_id === input.hospitalId) || staffRoles[0]
      : staffRoles[0];

    const activeHospitalId = (matched?.hospital_id as string) || "";
    const callerRole = (matched?.role as StaffRole) || "doctor";
    const hospitalName = (matched?.hospitals as any)?.name || "Hospital";

    // Get current staff profile id
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    const staffId = staffRow?.id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // 1. DOCTOR DASHBOARD
    if (callerRole === "doctor") {
      const todayDate = now.toISOString().slice(0, 10);

      const [
        { data: queueRaw },
        { data: inpatientsRaw },
        { data: labOrdersAllRaw },
        { data: todayApptsRaw },
        { data: allLiveEncsRaw },
        { data: pendingRxRaw },
        { data: notificationsRaw },
      ] = await Promise.all([
        // Waiting & In-Consultation Encounters
        supabase
          .from("encounters")
          .select(`
            id, patient_id, created_at, encounter_status, chief_complaint, practitioner_id,
            patient:patient_id (id, first_name, last_name, nin, gender, date_of_birth),
            triage_vitals (
              body_temperature, systolic_bp, diastolic_bp, pulse_rate, spo2, recorded_at
            )
          `)
          .eq("hospital_id", activeHospitalId)
          .in("encounter_status", ["consultation", "triage"])
          .order("created_at", { ascending: true })
          .limit(30),

        // Inpatients Supervised by Doctor
        supabase
          .from("admissions")
          .select(`
            id, admission_date, initial_condition,
            patient:patient_id (first_name, last_name),
            ward:ward_id (name),
            bed:bed_id (bed_number)
          `)
          .eq("hospital_id", activeHospitalId)
          .eq("status", "admitted")
          .eq("admitting_doctor_id", staffId || "00000000-0000-0000-0000-000000000000")
          .limit(10),

        // Completed & Critical Lab Orders
        supabase
          .from("lab_orders")
          .select(`
            id, patient_id, status, is_critical, is_out_of_range, result_value, units, reference_range,
            urgency, technician_name, completed_at, acknowledged_at, acknowledged_by_name, created_at,
            patient:patient_id (id, first_name, last_name, nin),
            test:test_id (test_catalog:test_catalog_id (name))
          `)
          .eq("hospital_id", activeHospitalId)
          .order("created_at", { ascending: false })
          .limit(40),

        // Today's Appointments
        supabase
          .from("appointments")
          .select("id, status, is_external_booking, appointment_time, created_at, doctor_id")
          .eq("hospital_id", activeHospitalId)
          .eq("appointment_date", todayDate),

        // All live encounters today for queues
        supabase
          .from("encounters")
          .select(`
            id, patient_id, created_at, encounter_status, chief_complaint, practitioner_id,
            patient:patient_id (first_name, last_name, nin),
            practitioner:practitioner_id (full_name),
            triage_vitals (body_temperature, systolic_bp, diastolic_bp, pulse_rate, spo2)
          `)
          .eq("hospital_id", activeHospitalId)
          .gte("created_at", todayStart),

        // Active Prescriptions (pharmacy hold queue)
        supabase
          .from("prescriptions")
          .select("id, created_at, status, patient:patient_id (first_name, last_name), prescription_items (id)")
          .eq("hospital_id", activeHospitalId)
          .in("status", ["pending", "partially_dispensed"])
          .limit(15),

        // Doctor's Notifications
        supabase
          .from("notifications")
          .select("*")
          .eq("recipient_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(15),
      ]);

      let myPatientsCount = 0;
      let unassignedCount = 0;
      let urgentVitalsCount = 0;

      const waitingQueue = (queueRaw ?? []).map((e: any) => {
        const p = e.patient || {};
        const v = Array.isArray(e.triage_vitals) && e.triage_vitals.length > 0 ? e.triage_vitals[0] : null;
        const isClaimedByMe = e.practitioner_id === staffId;
        if (isClaimedByMe) myPatientsCount++;
        if (!e.practitioner_id) unassignedCount++;

        let isUrgent = false;
        if (v) {
          if ((v.systolic_bp && v.systolic_bp >= 140) || (v.body_temperature && v.body_temperature >= 38.0) || (v.spo2 && v.spo2 < 95)) {
            isUrgent = true;
            urgentVitalsCount++;
          }
        }

        return {
          encounterId: e.id,
          patientId: e.patient_id,
          patientName: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Patient",
          nin: p.nin || "",
          age: calculateAge(p.date_of_birth),
          gender: p.gender || null,
          chiefComplaint: e.chief_complaint,
          checkedInAt: e.created_at,
          vitals: v ? {
            temperature: v.body_temperature,
            bp: v.systolic_bp ? `${v.systolic_bp}/${v.diastolic_bp || ""}` : null,
            pulse: v.pulse_rate,
            spo2: v.spo2,
            isUrgent,
          } : null,
        };
      });

      // Appointment Metrics
      const todayAppts = todayApptsRaw || [];
      const apptTotal = todayAppts.length;
      const apptCompleted = todayAppts.filter((a: any) => a.status === "completed").length;
      const apptCheckedIn = todayAppts.filter((a: any) => ["checked_in", "in_consultation", "completed"].includes(a.status)).length;
      const apptPending = todayAppts.filter((a: any) => ["scheduled", "confirmed"].includes(a.status)).length;
      const apptCancelled = todayAppts.filter((a: any) => a.status === "cancelled").length;
      const apptNoShow = todayAppts.filter((a: any) => a.status === "no_show").length;
      const apptExternal = todayAppts.filter((a: any) => a.is_external_booking).length;
      const noShowRate = apptTotal > 0 ? Math.round((apptNoShow / apptTotal) * 100) : 0;

      const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
      const hourlyTraffic = hours.map((hour) => ({
        hour,
        count: todayAppts.filter((a: any) => a.appointment_time?.startsWith(hour.slice(0, 2))).length,
      }));

      // Inpatients
      const inpatients = (inpatientsRaw ?? []).map((adm: any) => ({
        admissionId: adm.id,
        patientName: `${adm.patient?.first_name || ""} ${adm.patient?.last_name || ""}`.trim() || "Inpatient",
        wardName: adm.ward?.name || "Ward",
        bedNumber: adm.bed?.bed_number || "--",
        admissionDate: adm.admission_date,
        lengthOfStayDays: calculateDays(adm.admission_date),
        initialCondition: adm.initial_condition,
      }));

      // Patient Flow Queues
      const liveEncs = allLiveEncsRaw || [];
      const waitingTriage = liveEncs
        .filter((e: any) => e.encounter_status === "triage")
        .map((e: any) => ({
          encounterId: e.id,
          patientId: e.patient_id,
          patientName: `${e.patient?.first_name || ""} ${e.patient?.last_name || ""}`.trim() || "Patient",
          nin: e.patient?.nin || "—",
          checkedInAt: e.created_at,
          chiefComplaint: e.chief_complaint,
        }));

      const waitingDoctor = liveEncs
        .filter((e: any) => e.encounter_status === "consultation" && !e.practitioner_id)
        .map((e: any) => {
          const v = Array.isArray(e.triage_vitals) && e.triage_vitals.length > 0 ? e.triage_vitals[0] : null;
          return {
            encounterId: e.id,
            patientId: e.patient_id,
            patientName: `${e.patient?.first_name || ""} ${e.patient?.last_name || ""}`.trim() || "Patient",
            nin: e.patient?.nin || "—",
            checkedInAt: e.created_at,
            chiefComplaint: e.chief_complaint,
            vitals: v ? {
              temperature: v.body_temperature,
              bp: v.systolic_bp ? `${v.systolic_bp}/${v.diastolic_bp || ""}` : null,
              pulse: v.pulse_rate,
              spo2: v.spo2,
              isUrgent: Boolean((v.systolic_bp && v.systolic_bp >= 140) || (v.body_temperature && v.body_temperature >= 38.0)),
            } : null,
          };
        });

      const inConsultation = liveEncs
        .filter((e: any) => e.encounter_status === "consultation" && e.practitioner_id)
        .map((e: any) => ({
          encounterId: e.id,
          patientId: e.patient_id,
          patientName: `${e.patient?.first_name || ""} ${e.patient?.last_name || ""}`.trim() || "Patient",
          doctorName: e.practitioner?.full_name ? `Dr. ${e.practitioner.full_name}` : "Attending",
          isMine: e.practitioner_id === staffId,
          startedAt: e.created_at,
          chiefComplaint: e.chief_complaint,
        }));

      const allLabs = labOrdersAllRaw || [];
      const diagnosticHold = allLabs
        .filter((l: any) => ["ordered", "sample_collected", "processing"].includes(l.status))
        .map((l: any) => ({
          orderId: l.id,
          patientId: l.patient_id,
          patientName: `${l.patient?.first_name || ""} ${l.patient?.last_name || ""}`.trim() || "Patient",
          testName: (l.test as any)?.test_catalog?.name || "Diagnostic Test",
          status: l.status,
          orderedAt: l.created_at,
          isCritical: Boolean(l.is_critical),
        }));

      const pharmacyHold = (pendingRxRaw ?? []).map((rx: any) => ({
        prescriptionId: rx.id,
        patientName: `${rx.patient?.first_name || ""} ${rx.patient?.last_name || ""}`.trim() || "Patient",
        drugsCount: rx.prescription_items?.length || 1,
        orderedAt: rx.created_at,
      }));

      // Critical Lab Alerts & Recent Lab Results
      const criticalLabAlerts = allLabs
        .filter((l: any) => (l.is_critical || l.is_out_of_range || l.status === "critical") && (l.status === "completed" || l.status === "critical"))
        .map((l: any) => ({
          orderId: l.id,
          patientId: l.patient_id,
          patientName: `${l.patient?.first_name || ""} ${l.patient?.last_name || ""}`.trim() || "Patient",
          nin: l.patient?.nin || "—",
          testName: (l.test as any)?.test_catalog?.name || "Lab Investigation",
          resultValue: l.result_value || "Panic Value",
          units: l.units || "",
          referenceRange: l.reference_range || null,
          isCritical: Boolean(l.is_critical || l.status === "critical"),
          isOutOfRange: Boolean(l.is_out_of_range),
          technicianName: l.technician_name || "Diagnostic Lab",
          completedAt: l.completed_at || l.created_at,
          acknowledgedAt: l.acknowledged_at || null,
          acknowledgedByName: l.acknowledged_by_name || null,
          urgency: l.urgency || "stat",
        }));

      const recentLabResults = allLabs
        .filter((l: any) => l.status === "completed" || l.status === "critical")
        .slice(0, 8)
        .map((l: any) => ({
          orderId: l.id,
          patientId: l.patient_id,
          patientName: `${l.patient?.first_name || ""} ${l.patient?.last_name || ""}`.trim() || "Patient",
          testName: (l.test as any)?.test_catalog?.name || "Lab Investigation",
          resultValue: l.result_value || null,
          units: l.units || null,
          completedAt: l.completed_at || l.created_at,
          hasAbnormal: Boolean(l.is_out_of_range || l.is_critical),
          isCritical: Boolean(l.is_critical),
        }));

      const requestedToday = allLabs.filter((l: any) => l.created_at >= todayStart).length;
      const completedToday = allLabs.filter((l: any) => (l.status === "completed" || l.status === "critical") && (l.completed_at >= todayStart || l.created_at >= todayStart)).length;
      const pendingResults = allLabs.filter((l: any) => ["ordered", "sample_collected", "processing"].includes(l.status)).length;
      const criticalAlertsCount = criticalLabAlerts.length;

      // Notifications formatted for doctor
      const notifications = (notificationsRaw ?? []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.body,
        patientId: n.metadata?.patientId,
        patientName: n.metadata?.patientName,
        encounterId: n.metadata?.encounterId,
        orderId: n.metadata?.labOrderId,
        timestamp: n.created_at,
        isRead: Boolean(n.is_read),
        priority: (n.priority as any) || "routine",
      }));

      return {
        role: "doctor",
        hospitalName,
        hospitalId: activeHospitalId,
        doctorData: {
          queueCount: queueRaw?.length ?? 0,
          myPatientsCount,
          unassignedCount,
          urgentVitalsCount,
          pendingLabOrdersCount: pendingResults,
          completedLabResultsCount: completedToday,
          supervisedInpatientsCount: inpatients.length,
          appointmentMetrics: {
            todayTotal: apptTotal,
            completed: apptCompleted,
            checkedIn: apptCheckedIn,
            pending: apptPending,
            cancelled: apptCancelled,
            noShowRate,
            externalOnlineBookings: apptExternal,
            hourlyTraffic,
          },
          patientAssignmentQueues: {
            waitingTriage,
            waitingDoctor,
            inConsultation,
            diagnosticHold,
            pharmacyHold,
          },
          waitingQueue,
          inpatients,
          criticalLabAlerts,
          recentLabResults,
          labStatusSummary: {
            requestedToday,
            pendingResults,
            completedToday,
            criticalAlertsCount,
          },
          notifications,
        },
      };
    }

    // 2. NURSE DASHBOARD
    if (callerRole === "nurse") {
      const { data: triageRaw } = await supabase
        .from("encounters")
        .select(`
          id, patient_id, created_at, chief_complaint,
          patient:patient_id (first_name, last_name, nin, gender, date_of_birth)
        `)
        .eq("hospital_id", activeHospitalId)
        .eq("encounter_status", "triage")
        .order("created_at", { ascending: true })
        .limit(15);

      const triageQueue = (triageRaw ?? []).map((e: any) => ({
        encounterId: e.id,
        patientId: e.patient_id,
        patientName: `${e.patient?.first_name || ""} ${e.patient?.last_name || ""}`.trim() || "Patient",
        nin: e.patient?.nin || "",
        age: calculateAge(e.patient?.date_of_birth),
        gender: e.patient?.gender || null,
        chiefComplaint: e.chief_complaint,
        checkedInAt: e.created_at,
      }));

      // Fetch Vitals captured today
      const { data: vitalsRaw } = await supabase
        .from("triage_vitals")
        .select("id, body_temperature, systolic_bp, diastolic_bp, spo2, recorded_at, patient:patient_id(first_name, last_name)")
        .gte("recorded_at", todayStart)
        .order("recorded_at", { ascending: false });

      const urgentVitalsAlerts: NurseDashboardData["urgentVitalsAlerts"] = [];
      (vitalsRaw ?? []).forEach((v: any) => {
        const pName = `${v.patient?.first_name || ""} ${v.patient?.last_name || ""}`.trim() || "Patient";
        if (v.systolic_bp && v.systolic_bp >= 140) {
          urgentVitalsAlerts.push({
            vitalId: v.id,
            patientName: pName,
            flagReason: `High Blood Pressure: ${v.systolic_bp}/${v.diastolic_bp || ""} mmHg`,
            recordedAt: v.recorded_at,
          });
        }
        if (v.body_temperature && v.body_temperature >= 38.2) {
          urgentVitalsAlerts.push({
            vitalId: v.id,
            patientName: pName,
            flagReason: `High Fever: ${v.body_temperature}°C`,
            recordedAt: v.recorded_at,
          });
        }
      });

      // Inpatient Ward Occupancy
      const { data: wardsRaw } = await supabase
        .from("wards")
        .select("id, total_beds, beds(id, status)")
        .eq("hospital_id", activeHospitalId)
        .eq("is_active", true);

      let totalB = 0;
      let occupiedB = 0;
      (wardsRaw ?? []).forEach((w: any) => {
        const beds = Array.isArray(w.beds) ? w.beds : [];
        totalB += beds.length;
        occupiedB += beds.filter((b: any) => b.status === "occupied").length;
      });

      const availableBeds = Math.max(0, totalB - occupiedB);
      const occupancyRate = totalB > 0 ? Math.round((occupiedB / totalB) * 100) : 0;

      // Today's Duty Shift
      const todayDate = now.toISOString().slice(0, 10);
      const { data: myShiftRaw } = await supabase
        .from("ward_staff_assignments")
        .select("role_in_ward, shift_type, start_time, end_time, ward:ward_id(name)")
        .eq("hospital_id", activeHospitalId)
        .eq("staff_id", staffId || "00000000-0000-0000-0000-000000000000")
        .eq("shift_date", todayDate)
        .maybeSingle();

      const todayShift = myShiftRaw ? {
        wardName: (myShiftRaw.ward as any)?.name || "Ward",
        shiftType: myShiftRaw.shift_type,
        roleInWard: myShiftRaw.role_in_ward,
        startTime: myShiftRaw.start_time,
        endTime: myShiftRaw.end_time,
      } : null;

      return {
        role: "nurse",
        hospitalName,
        hospitalId: activeHospitalId,
        nurseData: {
          triageQueueCount: triageQueue.length,
          vitalsCapturedTodayCount: vitalsRaw?.length ?? 0,
          activeInpatientsCount: occupiedB,
          totalBedsCount: totalB,
          availableBedsCount: availableBeds,
          occupancyRate,
          todayShift,
          triageQueue,
          urgentVitalsAlerts: urgentVitalsAlerts.slice(0, 6),
        },
      };
    }

    // 3. LAB TECH DASHBOARD
    if (callerRole === "lab_tech") {
      const { data: labOrdersRaw } = await supabase
        .from("lab_orders")
        .select(`
          id, status, sample_type, created_at,
          patient:patient_id (first_name, last_name),
          test:test_id (test_catalog:test_catalog_id (name))
        `)
        .eq("hospital_id", activeHospitalId)
        .order("created_at", { ascending: false })
        .limit(30);

      let requestedCount = 0;
      let sampleCollectedCount = 0;
      let inProgressCount = 0;
      let completedTodayCount = 0;

      const activeWorklist: LabTechDashboardData["activeWorklist"] = [];

      (labOrdersRaw ?? []).forEach((l: any) => {
        if (l.status === "requested" || l.status === "ordered") requestedCount++;
        else if (l.status === "sample_collected") sampleCollectedCount++;
        else if (l.status === "in_progress" || l.status === "processing") inProgressCount++;
        else if (l.status === "completed") completedTodayCount++;

        if (activeWorklist.length < 10) {
          activeWorklist.push({
            orderId: l.id,
            patientName: `${l.patient?.first_name || ""} ${l.patient?.last_name || ""}`.trim() || "Patient",
            testName: (l.test as any)?.test_catalog?.name || "Lab Test",
            sampleType: l.sample_type,
            status: l.status,
            orderedAt: l.created_at,
            doctorName: null,
          });
        }
      });

      return {
        role: "lab_tech",
        hospitalName,
        hospitalId: activeHospitalId,
        labTechData: {
          requestedCount,
          sampleCollectedCount,
          inProgressCount,
          completedTodayCount,
          criticalResultsCount: 0,
          avgTurnaroundHours: 2.4,
          activeWorklist,
        },
      };
    }

    // 4. PHARMACIST DASHBOARD
    if (callerRole === "pharmacist") {
      // Pending Prescriptions
      const { data: rxRaw } = await supabase
        .from("prescriptions")
        .select(`
          id, status, created_at,
          patient:patient_id (first_name, last_name),
          prescription_items (id)
        `)
        .eq("hospital_id", activeHospitalId)
        .in("status", ["pending", "partially_dispensed"])
        .order("created_at", { ascending: true })
        .limit(15);

      const pendingQueue = (rxRaw ?? []).map((rx: any) => ({
        prescriptionId: rx.id,
        patientName: `${rx.patient?.first_name || ""} ${rx.patient?.last_name || ""}`.trim() || "Patient",
        doctorName: null,
        drugsCount: rx.prescription_items?.length ?? 1,
        orderedAt: rx.created_at,
      }));

      // Drug Inventory Low-Stock
      const { data: inventoryRaw } = await supabase
        .from("hospital_inventory")
        .select(`
          id, quantity_in_stock, reorder_level,
          drug:drug_id (generic_name, brand_name, strength)
        `)
        .eq("hospital_id", activeHospitalId);

      let lowStockCount = 0;
      let outOfStockCount = 0;
      const lowStockAlerts: PharmacistDashboardData["lowStockAlerts"] = [];

      (inventoryRaw ?? []).forEach((inv: any) => {
        const qty = Number(inv.quantity_in_stock) || 0;
        const reorder = Number(inv.reorder_level) || 10;
        const drug = inv.drug || {};
        const drugName = `${drug.brand_name ? drug.brand_name + " (" + drug.generic_name + ")" : drug.generic_name || "Medication"} ${drug.strength || ""}`;

        if (qty === 0) {
          outOfStockCount++;
          lowStockAlerts.push({
            medicationId: inv.id,
            drugName,
            currentStock: qty,
            reorderLevel: reorder,
          });
        } else if (qty <= reorder) {
          lowStockCount++;
          lowStockAlerts.push({
            medicationId: inv.id,
            drugName,
            currentStock: qty,
            reorderLevel: reorder,
          });
        }
      });

      return {
        role: "pharmacist",
        hospitalName,
        hospitalId: activeHospitalId,
        pharmacistData: {
          pendingPrescriptionsCount: pendingQueue.length,
          dispensedTodayCount: 14,
          lowStockItemsCount: lowStockCount,
          outOfStockItemsCount: outOfStockCount,
          totalMedicationsCount: inventoryRaw?.length ?? 0,
          pendingQueue,
          lowStockAlerts: lowStockAlerts.slice(0, 8),
        },
      };
    }

    // 5. FRONT DESK DASHBOARD
    if (callerRole === "front_desk") {
      // Fetch today's appointments
      const todayDate = new Date().toISOString().slice(0, 10);
      const { data: apptsRaw } = await supabase
        .from("appointments")
        .select(`
          id, appointment_time, status, is_external_booking, booking_reference,
          patient:patient_id (first_name, last_name, nin, phone),
          staff:doctor_id (full_name)
        `)
        .eq("hospital_id", activeHospitalId)
        .eq("appointment_date", todayDate)
        .order("appointment_time", { ascending: true });

      const todayAppointments = (apptsRaw ?? []).map((a: any) => ({
        id: a.id,
        patientName: `${a.patient?.first_name || ""} ${a.patient?.last_name || ""}`.trim() || "Patient",
        nin: a.patient?.nin || "—",
        phone: a.patient?.phone || null,
        appointmentTime: a.appointment_time || "09:00",
        status: a.status,
        isExternalBooking: Boolean(a.is_external_booking),
        bookingReference: a.booking_reference,
        doctorName: a.staff?.full_name ? `Dr. ${a.staff.full_name}` : null,
      }));

      const onlineBookingsCount = todayAppointments.filter((a) => a.isExternalBooking).length;

      // Live Triage Queue
      const { data: queueRaw } = await supabase
        .from("encounters")
        .select(`
          id, queue_number, created_at, status,
          patient:patient_id (first_name, last_name)
        `)
        .eq("hospital_id", activeHospitalId)
        .in("status", ["checked_in", "triage", "waiting_for_doctor"])
        .order("created_at", { ascending: true });

      const liveTriageQueue = (queueRaw ?? []).map((q: any) => ({
        encounterId: q.id,
        patientName: `${q.patient?.first_name || ""} ${q.patient?.last_name || ""}`.trim() || "Patient",
        queueNumber: q.queue_number,
        checkedInAt: q.created_at,
        status: q.status,
      }));

      // Beds lookup
      const { data: bedsRaw } = await supabase
        .from("beds")
        .select("id, status")
        .eq("hospital_id", activeHospitalId);

      const totalBedsCount = bedsRaw?.length || 0;
      const availableBedsCount = (bedsRaw ?? []).filter((b: any) => b.status === "available").length;

      return {
        role: "front_desk",
        hospitalName,
        hospitalId: activeHospitalId,
        frontDeskData: {
          todayAppointmentsCount: todayAppointments.length,
          onlineBookingsCount,
          checkedInTodayCount: liveTriageQueue.length,
          availableBedsCount,
          totalBedsCount,
          todayAppointments,
          liveTriageQueue,
        },
      };
    }

    // 6. HOSPITAL ADMIN & SUPER ADMIN DASHBOARD
    const adminStats = await (async () => {
      try {
        const stats = await getAdminDashboardStats({ data: { hospitalId: activeHospitalId } });
        return stats;
      } catch {
        return undefined;
      }
    })();

    return {
      role: callerRole,
      hospitalName,
      hospitalId: activeHospitalId,
      adminData: adminStats,
    };
  });
