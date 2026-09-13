import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export interface AntenatalEnrollmentItem {
  id: string;
  ancNumber: string;
  patientId: string;
  patientName: string;
  patientNin: string;
  patientAge: number;
  patientPhone?: string | undefined;
  gravida: number;
  para: number;
  alive: number;
  miscarriages: number;
  lmp: string;
  edd: string;
  gestationalAgeWeeks: number;
  bloodGroup?: string | undefined;
  genotype?: string | undefined;
  rhesus?: string | undefined;
  hivStatus: string;
  hepatitisBStatus: string;
  riskFactors: string[];
  status: "active" | "delivered" | "transferred" | "completed";
  visitsCount: number;
  lastVisitDate?: string | undefined;
}

export interface AntenatalVisitItem {
  id: string;
  enrollmentId: string;
  visitNumber: number;
  visitDate: string;
  gestationalAgeWeeks: number;
  fundalHeightCm?: number | undefined;
  fetalHeartRateBpm?: number | undefined;
  fetalPresentation?: string | undefined;
  fetalLie?: string | undefined;
  maternalBpSystolic?: number | undefined;
  maternalBpDiastolic?: number | undefined;
  maternalWeightKg?: number | undefined;
  urinalysisProtein: string;
  urinalysisGlucose: string;
  clinicalNotes?: string | undefined;
  nextVisitDate?: string | undefined;
  practitionerName?: string | undefined;
}

export interface LaborDeliveryItem {
  id: string;
  patientId: string;
  patientName: string;
  patientNin: string;
  laborStartTime: string;
  deliveryTime?: string | undefined;
  deliveryMode: string;
  cervicalDilationCm: number;
  contractionsPer10min: number;
  membranesStatus: string;
  babyGender?: string | undefined;
  birthWeightKg?: number | undefined;
  apgar1min?: number | undefined;
  apgar5min?: number | undefined;
  estimatedBloodLossMl?: number | undefined;
  attendingObstetrician?: string | undefined;
  attendingMidwife?: string | undefined;
  notes?: string | undefined;
}

export interface ImmunizationRecordItem {
  id: string;
  childName: string;
  patientId?: string | undefined;
  dateOfBirth: string;
  gender: string;
  vaccineName: string;
  targetAgeWeeks: number;
  doseNumber: number;
  administeredAt?: string | undefined;
  batchNumber?: string | undefined;
  nurseName?: string | undefined;
  status: "given" | "pending" | "overdue" | "missed";
}

// Calculate EDD via Naegele's rule: LMP + 280 days
export function calculateEddFromLmp(lmpDateStr: string): string {
  const lmp = new Date(lmpDateStr);
  if (isNaN(lmp.getTime())) return "";
  const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
  return edd.toISOString().split("T")[0]!;
}

// Calculate Gestational Age in weeks from LMP
export function calculateGestationalAgeWeeks(lmpDateStr: string): number {
  const lmp = new Date(lmpDateStr);
  if (isNaN(lmp.getTime())) return 0;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - lmp.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, Math.round((diffDays / 7) * 10) / 10);
}

export const getMaternityDashboardData = createServerFn({ method: "GET" })
  .validator(
    z.object({
      hospitalId: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      const hospitalId = data.hospitalId;
      if (!hospitalId) {
        return {
          enrollments: [] as AntenatalEnrollmentItem[],
          activeLabors: [] as LaborDeliveryItem[],
          immunizations: [] as ImmunizationRecordItem[],
          patientsList: [] as { id: string; fullName: string; nin: string; age: number }[],
          metrics: {
            totalAncActive: 0,
            dueThisMonth: 0,
            deliveriesThisMonth: 0,
            immunizationsGiven: 0,
          },
        };
      }

      // 1. Fetch ANC Enrollments
      const { data: enrollmentsRaw } = await supabase
        .from("antenatal_enrollments")
        .select(`
          id, anc_number, patient_id, gravida, para, alive, miscarriages,
          lmp, edd, gestational_age_at_booking_weeks, blood_group, genotype,
          rhesus, hiv_status, hepatitis_b_status, risk_factors, status, created_at,
          patients (id, full_name, nin, date_of_birth, phone_number)
        `)
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });

      const enrollments: AntenatalEnrollmentItem[] = (enrollmentsRaw || []).map((e: any) => {
        const p = e.patients;
        let age = 25;
        if (p?.date_of_birth) {
          const dob = new Date(p.date_of_birth);
          age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }

        const ga = calculateGestationalAgeWeeks(e.lmp);

        return {
          id: e.id,
          ancNumber: e.anc_number,
          patientId: e.patient_id,
          patientName: p?.full_name || "Unknown Patient",
          patientNin: p?.nin || "N/A",
          patientAge: age,
          patientPhone: p?.phone_number,
          gravida: e.gravida || 1,
          para: e.para || 0,
          alive: e.alive || 0,
          miscarriages: e.miscarriages || 0,
          lmp: e.lmp,
          edd: e.edd,
          gestationalAgeWeeks: ga,
          bloodGroup: e.blood_group,
          genotype: e.genotype,
          rhesus: e.rhesus,
          hivStatus: e.hiv_status || "non-reactive",
          hepatitisBStatus: e.hepatitis_b_status || "negative",
          riskFactors: e.risk_factors || [],
          status: e.status,
          visitsCount: 0,
        };
      });

      // 2. Fetch Active Labors & Deliveries
      const { data: laborRaw } = await supabase
        .from("labor_and_delivery_records")
        .select(`
          id, patient_id, labor_start_time, delivery_time, delivery_mode,
          cervical_dilation_cm, contractions_per_10min, membranes_status,
          baby_gender, birth_weight_kg, apgar_1min, apgar_5min, estimated_blood_loss_ml,
          attending_obstetrician, attending_midwife, notes,
          patients (full_name, nin)
        `)
        .eq("hospital_id", hospitalId)
        .order("labor_start_time", { ascending: false })
        .limit(20);

      const activeLabors: LaborDeliveryItem[] = (laborRaw || []).map((l: any) => ({
        id: l.id,
        patientId: l.patient_id,
        patientName: l.patients?.full_name || "In Labor",
        patientNin: l.patients?.nin || "N/A",
        laborStartTime: l.labor_start_time,
        deliveryTime: l.delivery_time,
        deliveryMode: l.delivery_mode,
        cervicalDilationCm: l.cervical_dilation_cm || 4.0,
        contractionsPer10min: l.contractions_per_10min || 3,
        membranesStatus: l.membranes_status || "intact",
        babyGender: l.baby_gender,
        birthWeightKg: l.birth_weight_kg,
        apgar1min: l.apgar_1min,
        apgar5min: l.apgar_5min,
        estimatedBloodLossMl: l.estimated_blood_loss_ml,
        attendingObstetrician: l.attending_obstetrician,
        attendingMidwife: l.attending_midwife,
        notes: l.notes,
      }));

      // 3. Fetch Immunization Register
      const { data: immunizationsRaw } = await supabase
        .from("child_immunization_records")
        .select("id, child_name, patient_id, date_of_birth, gender, vaccine_name, target_age_weeks, dose_number, administered_at, batch_number, nurse_name, status")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false })
        .limit(30);

      const immunizations: ImmunizationRecordItem[] = (immunizationsRaw || []).map((i: any) => ({
        id: i.id,
        childName: i.child_name,
        patientId: i.patient_id,
        dateOfBirth: i.date_of_birth,
        gender: i.gender,
        vaccineName: i.vaccine_name,
        targetAgeWeeks: i.target_age_weeks,
        doseNumber: i.dose_number,
        administeredAt: i.administered_at,
        batchNumber: i.batch_number,
        nurseName: i.nurse_name,
        status: i.status,
      }));

      // 4. Fetch Eligible Female Patients for Enrollment
      const { data: rawPatients } = await supabase
        .from("patients")
        .select("id, first_name, last_name, nin, date_of_birth")
        .order("last_name", { ascending: true })
        .limit(100);

      const patientsList = (rawPatients || []).map((p: any) => {
        let age = 25;
        if (p.date_of_birth) {
          const dob = new Date(p.date_of_birth);
          age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }
        return {
          id: p.id,
          fullName: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
          nin: p.nin,
          age,
        };
      });

      // Compute statistics
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const dueThisMonth = enrollments.filter((e) => {
        const d = new Date(e.edd);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.status === "active";
      }).length;

      const deliveriesThisMonth = activeLabors.filter((l) => {
        if (!l.deliveryTime) return false;
        const d = new Date(l.deliveryTime);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      const immunizationsGiven = immunizations.filter((i) => i.status === "given").length;

      return {
        enrollments,
        activeLabors,
        immunizations,
        patientsList,
        metrics: {
          totalAncActive: enrollments.filter((e) => e.status === "active").length,
          dueThisMonth,
          deliveriesThisMonth,
          immunizationsGiven,
        },
      };
    } catch (err: any) {
      console.error("[getMaternityDashboardData] error:", err);
      return {
        enrollments: [],
        activeLabors: [],
        immunizations: [],
        patientsList: [],
        metrics: {
          totalAncActive: 0,
          dueThisMonth: 0,
          deliveriesThisMonth: 0,
          immunizationsGiven: 0,
        },
      };
    }
  });

export const enrollAntenatalPatient = createServerFn({ method: "POST" })
  .validator(
    z.object({
      hospitalId: z.string(),
      patientId: z.string(),
      lmp: z.string(),
      gravida: z.number().default(1),
      para: z.number().default(0),
      alive: z.number().default(0),
      miscarriages: z.number().default(0),
      bloodGroup: z.string().optional(),
      genotype: z.string().optional(),
      rhesus: z.string().optional(),
      hivStatus: z.string().default("non-reactive"),
      hepatitisBStatus: z.string().default("negative"),
      riskFactors: z.array(z.string()).default([]),
    })
  )
  .handler(async ({ data }) => {
    const edd = calculateEddFromLmp(data.lmp);
    const gaWeeks = Math.floor(calculateGestationalAgeWeeks(data.lmp));
    const ancNumber = `ANC-${Date.now().toString().slice(-6)}`;

    const { data: newEnrollment, error } = await supabase
      .from("antenatal_enrollments")
      .insert({
        hospital_id: data.hospitalId,
        patient_id: data.patientId,
        anc_number: ancNumber,
        lmp: data.lmp,
        edd: edd,
        gestational_age_at_booking_weeks: gaWeeks,
        gravida: data.gravida,
        para: data.para,
        alive: data.alive,
        miscarriages: data.miscarriages,
        blood_group: data.bloodGroup || null,
        genotype: data.genotype || null,
        rhesus: data.rhesus || null,
        hiv_status: data.hivStatus,
        hepatitis_b_status: data.hepatitisBStatus,
        risk_factors: data.riskFactors,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to enroll patient in ANC: ${error.message}`);
    }

    return { success: true, enrollment: newEnrollment };
  });

export const recordAntenatalVisit = createServerFn({ method: "POST" })
  .validator(
    z.object({
      enrollmentId: z.string(),
      hospitalId: z.string(),
      gestationalAgeWeeks: z.number(),
      fundalHeightCm: z.number().optional(),
      fetalHeartRateBpm: z.number().optional(),
      fetalPresentation: z.string().default("cephalic"),
      fetalLie: z.string().default("longitudinal"),
      maternalBpSystolic: z.number().optional(),
      maternalBpDiastolic: z.number().optional(),
      maternalWeightKg: z.number().optional(),
      urinalysisProtein: z.string().default("nil"),
      urinalysisGlucose: z.string().default("nil"),
      clinicalNotes: z.string().optional(),
      nextVisitDate: z.string().optional(),
      practitionerName: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { error } = await supabase.from("antenatal_visits").insert({
      enrollment_id: data.enrollmentId,
      hospital_id: data.hospitalId,
      gestational_age_weeks: data.gestationalAgeWeeks,
      fundal_height_cm: data.fundalHeightCm || null,
      fetal_heart_rate_bpm: data.fetalHeartRateBpm || null,
      fetal_presentation: data.fetalPresentation,
      fetal_lie: data.fetalLie,
      maternal_bp_systolic: data.maternalBpSystolic || null,
      maternal_bp_diastolic: data.maternalBpDiastolic || null,
      maternal_weight_kg: data.maternalWeightKg || null,
      urinalysis_protein: data.urinalysisProtein,
      urinalysis_glucose: data.urinalysisGlucose,
      clinical_notes: data.clinicalNotes || null,
      next_visit_date: data.nextVisitDate || null,
      practitioner_name: data.practitionerName || null,
    });

    if (error) {
      throw new Error(`Failed to record ANC visit: ${error.message}`);
    }

    return { success: true };
  });

export const recordLaborAndDelivery = createServerFn({ method: "POST" })
  .validator(
    z.object({
      hospitalId: z.string(),
      patientId: z.string(),
      enrollmentId: z.string().optional(),
      laborStartTime: z.string(),
      deliveryTime: z.string().optional(),
      deliveryMode: z.string().default("spontaneous_vaginal"),
      cervicalDilationCm: z.number().default(4.0),
      contractionsPer10min: z.number().default(3),
      membranesStatus: z.string().default("intact"),
      babyGender: z.string().default("female"),
      birthWeightKg: z.number().optional(),
      apgar1min: z.number().default(8),
      apgar5min: z.number().default(10),
      estimatedBloodLossMl: z.number().default(200),
      attendingObstetrician: z.string().optional(),
      attendingMidwife: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { error } = await supabase.from("labor_and_delivery_records").insert({
      hospital_id: data.hospitalId,
      patient_id: data.patientId,
      enrollment_id: data.enrollmentId || null,
      labor_start_time: data.laborStartTime,
      delivery_time: data.deliveryTime || null,
      delivery_mode: data.deliveryMode,
      cervical_dilation_cm: data.cervicalDilationCm,
      contractions_per_10min: data.contractionsPer10min,
      membranes_status: data.membranesStatus,
      baby_gender: data.babyGender,
      birth_weight_kg: data.birthWeightKg || null,
      apgar_1min: data.apgar1min,
      apgar_5min: data.apgar5min,
      estimated_blood_loss_ml: data.estimatedBloodLossMl,
      attending_obstetrician: data.attendingObstetrician || null,
      attending_midwife: data.attendingMidwife || null,
      notes: data.notes || null,
    });

    if (error) {
      throw new Error(`Failed to record labor & delivery: ${error.message}`);
    }

    // If delivery is completed and linked to an ANC enrollment, update enrollment status to delivered
    if (data.deliveryTime && data.enrollmentId) {
      await supabase
        .from("antenatal_enrollments")
        .update({ status: "delivered", updated_at: new Date().toISOString() })
        .eq("id", data.enrollmentId);
    }

    return { success: true };
  });

export const recordChildImmunization = createServerFn({ method: "POST" })
  .validator(
    z.object({
      hospitalId: z.string(),
      childName: z.string(),
      patientId: z.string().optional(),
      dateOfBirth: z.string(),
      gender: z.string().default("female"),
      vaccineName: z.string(),
      targetAgeWeeks: z.number().default(0),
      doseNumber: z.number().default(1),
      administeredAt: z.string().optional(),
      batchNumber: z.string().optional(),
      nurseName: z.string().optional(),
      status: z.enum(["given", "pending", "overdue", "missed"]).default("given"),
    })
  )
  .handler(async ({ data }) => {
    const { error } = await supabase.from("child_immunization_records").insert({
      hospital_id: data.hospitalId,
      child_name: data.childName,
      patient_id: data.patientId || null,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      vaccine_name: data.vaccineName,
      target_age_weeks: data.targetAgeWeeks,
      dose_number: data.doseNumber,
      administered_at: data.administeredAt || new Date().toISOString(),
      batch_number: data.batchNumber || null,
      nurse_name: data.nurseName || null,
      status: data.status,
    });

    if (error) {
      throw new Error(`Failed to log child immunization: ${error.message}`);
    }

    return { success: true };
  });
