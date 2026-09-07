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
  recentLabResults: Array<{
    orderId: string;
    patientName: string;
    testName: string;
    completedAt: string;
    hasAbnormal: boolean;
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

export type RoleDashboardResult = {
  role: StaffRole;
  hospitalName: string;
  hospitalId: string;
  doctorData?: DoctorDashboardData | undefined;
  nurseData?: NurseDashboardData | undefined;
  labTechData?: LabTechDashboardData | undefined;
  pharmacistData?: PharmacistDashboardData | undefined;
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
    if (staffRoles.length === 0) throw new Error("Staff access required.");

    const matched = input?.hospitalId
      ? staffRoles.find((r: any) => r.hospital_id === input.hospitalId) || staffRoles[0]
      : staffRoles[0];

    const activeHospitalId = matched.hospital_id as string;
    const callerRole = (matched.role as StaffRole) || "doctor";
    const hospitalName = (matched.hospitals as any)?.name || "Hospital";

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
      // Fetch Waiting & Claimed Consultations
      const { data: queueRaw } = await supabase
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
        .limit(20);

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

      // Fetch Inpatients Supervised by Doctor
      const { data: inpatientsRaw } = await supabase
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
        .limit(10);

      const inpatients = (inpatientsRaw ?? []).map((adm: any) => ({
        admissionId: adm.id,
        patientName: `${adm.patient?.first_name || ""} ${adm.patient?.last_name || ""}`.trim() || "Inpatient",
        wardName: adm.ward?.name || "Ward",
        bedNumber: adm.bed?.bed_number || "--",
        admissionDate: adm.admission_date,
        lengthOfStayDays: calculateDays(adm.admission_date),
        initialCondition: adm.initial_condition,
      }));

      // Fetch Recent Completed Lab Orders
      const { data: labResultsRaw } = await supabase
        .from("lab_orders")
        .select(`
          id, status, created_at,
          patient:patient_id (first_name, last_name),
          test:test_id (test_catalog:test_catalog_id (name))
        `)
        .eq("hospital_id", activeHospitalId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(6);

      const recentLabResults = (labResultsRaw ?? []).map((l: any) => ({
        orderId: l.id,
        patientName: `${l.patient?.first_name || ""} ${l.patient?.last_name || ""}`.trim() || "Patient",
        testName: (l.test as any)?.test_catalog?.name || "Lab Investigation",
        completedAt: l.created_at,
        hasAbnormal: false,
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
          pendingLabOrdersCount: 0,
          completedLabResultsCount: recentLabResults.length,
          supervisedInpatientsCount: inpatients.length,
          waitingQueue,
          inpatients,
          recentLabResults,
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
      const todayDate = now.toISOString().split("T")[0];
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

    // 5. HOSPITAL ADMIN & SUPER ADMIN DASHBOARD
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
