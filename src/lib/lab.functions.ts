import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type LabWorklistItem = {
  id: string;
  encounterId: string;
  patientId: string;
  status: "ordered" | "sample_collected" | "processing" | "completed" | "critical" | "cancelled";
  sampleType: string | null;
  resultValue: string | null;
  isCritical: boolean;
  resultMetadata: {
    unit?: string | undefined;
    referenceRange?: string | undefined;
    abnormalFlag?: "normal" | "abnormal" | "critical" | undefined;
    comments?: string | undefined;
    enteredAt?: string | undefined;
  } | null;
  sampleCollectedAt: string | null;
  createdAt: string;
  test: {
    id: string;
    name: string;
    code: string;
    category: string | null;
    price: number;
    standardRange: any;
  };
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
  };
  orderedByDoctor: {
    id: string | null;
    fullName: string | null;
  };
  technician: {
    id: string | null;
    fullName: string | null;
  };
};

export type LabWorkbenchResponse = {
  worklist: LabWorklistItem[];
  counts: {
    total: number;
    ordered: number;
    sampleCollected: number;
    processing: number;
    completed: number;
    critical: number;
  };
  activeHospitalId: string;
  hospitalName: string;
  callerRole: StaffRole;
  isTechOrClinical: boolean;
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
 * Loads the laboratory workbench worklist for the current hospital.
 */
export const getLabWorkbench = createServerFn({ method: "GET" })
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
  .handler(async ({ context, data: input }): Promise<LabWorkbenchResponse> => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Hospital staff membership required.");

    const matchedRole = input?.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const hospitalName = (matchedRole as any)?.hospitals?.name || "Hospital";
    const callerRole = (matchedRole?.role as StaffRole) || "lab_tech";
    const isTechOrClinical = ["lab_tech", "doctor", "hospital_admin", "super_admin", "nurse"].includes(callerRole);

    // Fetch all lab orders for this hospital
    const { data: labRows, error: labError } = await supabase
      .from("lab_orders")
      .select(`
        id, encounter_id, patient_id, status, sample_type, result_value, is_critical,
        result_metadata, sample_collected_at, created_at,
        test:test_id(
          id, price,
          test_catalog:test_catalog_id(name, code, category, standard_reference_range)
        ),
        patient:patient_id(
          id, first_name, last_name, nin, date_of_birth, gender, phone, blood_group, genotype
        ),
        ordered_by_doctor:ordered_by(id, full_name),
        technician:technician_id(id, full_name)
      `)
      .eq("hospital_id", activeHospitalId)
      .order("created_at", { ascending: false });

    if (labError) throw new Error(labError.message);

    const counts = {
      total: 0,
      ordered: 0,
      sampleCollected: 0,
      processing: 0,
      completed: 0,
      critical: 0,
    };

    const worklist: LabWorklistItem[] = (labRows ?? []).map((row: any) => {
      const p = row.patient;
      const t = row.test;
      const tc = t?.test_catalog;

      const status = row.status as LabWorklistItem["status"];
      counts.total++;
      if (status === "ordered") counts.ordered++;
      else if (status === "sample_collected") counts.sampleCollected++;
      else if (status === "processing") counts.processing++;
      else if (status === "completed") counts.completed++;
      else if (status === "critical") counts.critical++;

      return {
        id: row.id,
        encounterId: row.encounter_id,
        patientId: row.patient_id,
        status,
        sampleType: row.sample_type,
        resultValue: row.result_value,
        isCritical: Boolean(row.is_critical),
        resultMetadata: (row.result_metadata as any) || null,
        sampleCollectedAt: row.sample_collected_at,
        createdAt: row.created_at,
        test: {
          id: t?.id || row.test_id,
          name: tc?.name || "Diagnostic Test",
          code: tc?.code || "TEST",
          category: tc?.category || "General",
          price: Number(t?.price) || 0,
          standardRange: tc?.standard_reference_range || {},
        },
        patient: {
          id: p?.id || row.patient_id,
          fullName: p ? `${p.first_name} ${p.last_name}` : "Unknown Patient",
          firstName: p?.first_name || "",
          lastName: p?.last_name || "",
          nin: isTechOrClinical && p?.nin ? p.nin : maskNin(p?.nin || ""),
          isNinMasked: !isTechOrClinical,
          age: calculateAge(p?.date_of_birth),
          gender: p?.gender || "Unknown",
          phone: p?.phone || null,
          bloodGroup: p?.blood_group || null,
          genotype: p?.genotype || null,
        },
        orderedByDoctor: {
          id: row.ordered_by_doctor?.id || null,
          fullName: row.ordered_by_doctor?.full_name || null,
        },
        technician: {
          id: row.technician?.id || null,
          fullName: row.technician?.full_name || null,
        },
      };
    });

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "READ",
      justification: `Accessed laboratory workbench (${worklist.length} orders total)`,
    });

    return {
      worklist,
      counts,
      activeHospitalId,
      hospitalName,
      callerRole,
      isTechOrClinical,
    };
  });

/**
 * Advances the status of a lab order (sample_collected -> processing -> completed/critical).
 */
export const advanceLabOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      labOrderId: string;
      encounterId: string;
      patientId: string;
      hospitalId?: string | undefined;
      nextStatus: "ordered" | "sample_collected" | "processing" | "completed" | "critical" | "cancelled";
      sampleType?: string | undefined;
    }) => {
      return {
        labOrderId: String(input.labOrderId).trim(),
        encounterId: String(input.encounterId).trim(),
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        nextStatus: input.nextStatus,
        sampleType: input.sampleType ? String(input.sampleType).trim() : undefined,
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
    const callerRole = (matchedRole?.role as StaffRole) || "lab_tech";

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    const updates: any = {
      status: input.nextStatus,
      technician_id: staffRow?.id || null,
    };

    if (input.nextStatus === "sample_collected") {
      updates.sample_collected_at = new Date().toISOString();
      if (input.sampleType) updates.sample_type = input.sampleType;
    }

    if (input.nextStatus === "critical") {
      updates.is_critical = true;
      updates.critical_flagged_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from("lab_orders")
      .update(updates)
      .eq("id", input.labOrderId);

    if (updateErr) throw new Error(updateErr.message);

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Updated lab order ${input.labOrderId} status to "${input.nextStatus}"`,
    });

    return { success: true };
  });

export type RecordLabResultInput = {
  labOrderId: string;
  encounterId: string;
  patientId: string;
  hospitalId?: string | undefined;
  resultValue: string;
  unit?: string | undefined;
  referenceRange?: string | undefined;
  abnormalFlag: "normal" | "abnormal" | "critical";
  isOutOfRange?: boolean | undefined;
  interpretation?: string | undefined;
  attachedFileUrl?: string | undefined;
  comments?: string | undefined;
};

/**
 * Records structured lab test results, stamps technician, marks order completed (or critical),
 * and triggers closed-loop real-time notifications to the ordering doctor (Prompt 40).
 */
export const recordLabResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      labOrderId: string;
      encounterId: string;
      patientId: string;
      hospitalId?: string | undefined;
      resultValue: string;
      unit?: string | undefined;
      referenceRange?: string | undefined;
      abnormalFlag: "normal" | "abnormal" | "critical";
      isOutOfRange?: boolean | undefined;
      interpretation?: string | undefined;
      attachedFileUrl?: string | undefined;
      comments?: string | undefined;
    }) => {
      if (!input.labOrderId) throw new Error("Missing lab order ID.");
      if (!input.resultValue) throw new Error("Result value is required.");
      return {
        labOrderId: String(input.labOrderId).trim(),
        encounterId: String(input.encounterId).trim(),
        patientId: String(input.patientId).trim(),
        hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
        resultValue: String(input.resultValue).trim(),
        unit: input.unit ? String(input.unit).trim() : undefined,
        referenceRange: input.referenceRange ? String(input.referenceRange).trim() : undefined,
        abnormalFlag: input.abnormalFlag || "normal",
        isOutOfRange: Boolean(input.isOutOfRange || input.abnormalFlag !== "normal"),
        interpretation: input.interpretation ? String(input.interpretation).trim() : undefined,
        attachedFileUrl: input.attachedFileUrl ? String(input.attachedFileUrl).trim() : undefined,
        comments: input.comments ? String(input.comments).trim() : undefined,
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
    const callerRole = (matchedRole?.role as StaffRole) || "lab_tech";

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("user_id", userId)
      .eq("hospital_id", activeHospitalId)
      .maybeSingle();

    const isCritical = input.abnormalFlag === "critical";
    const status = isCritical ? "critical" : "completed";
    const completedAt = new Date().toISOString();

    const resultMetadata = {
      unit: input.unit || "",
      referenceRange: input.referenceRange || "",
      abnormalFlag: input.abnormalFlag,
      isOutOfRange: input.isOutOfRange,
      interpretation: input.interpretation || "",
      attachedFileUrl: input.attachedFileUrl || null,
      comments: input.comments || "",
      enteredAt: completedAt,
      enteredByName: staffRow?.full_name || "Lab Staff",
    };

    // 1. Fetch current lab order to get test name, patient name, and ordering doctor
    const { data: currentOrder } = await supabase
      .from("lab_orders")
      .select(`
        id, ordered_by,
        test:test_id(test_catalog:test_catalog_id(name, code)),
        patient:patient_id(first_name, last_name),
        ordered_by_staff:ordered_by(user_id, full_name)
      `)
      .eq("id", input.labOrderId)
      .single();

    const testName = (currentOrder?.test as any)?.test_catalog?.name || "Lab Test";
    const patientName = currentOrder?.patient ? `${(currentOrder.patient as any).first_name} ${(currentOrder.patient as any).last_name}` : "Patient";
    const doctorUserId = (currentOrder?.ordered_by_staff as any)?.user_id;

    // 2. Update lab order
    const { error: updateErr } = await supabase
      .from("lab_orders")
      .update({
        result_value: input.resultValue,
        units: input.unit || null,
        reference_range: input.referenceRange || null,
        is_out_of_range: input.isOutOfRange,
        interpretation: input.interpretation || input.comments || null,
        attached_file_url: input.attachedFileUrl || null,
        result_metadata: resultMetadata,
        status,
        is_critical: isCritical,
        completed_at: completedAt,
        critical_flagged_at: isCritical ? completedAt : null,
        technician_id: staffRow?.id || null,
        technician_name: staffRow?.full_name || "Lab Staff",
        verified_at: completedAt,
      })
      .eq("id", input.labOrderId);

    if (updateErr) throw new Error(updateErr.message);

    // 3. Create Doctor & Hospital Notifications (Prompt 40)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createNotificationRecord } = await import("./notifications.functions");

    if (doctorUserId) {
      await createNotificationRecord(supabaseAdmin, {
        recipientUserId: doctorUserId,
        hospitalId: activeHospitalId,
        type: isCritical ? "lab_result_critical" : "lab_result_completed",
        priority: isCritical ? "critical" : "routine",
        title: isCritical ? `⚠️ CRITICAL LAB ALERT: ${testName}` : `Lab Result Ready: ${testName}`,
        body: `${patientName} — Result: ${input.resultValue} ${input.unit || ""}. Flag: ${input.abnormalFlag.toUpperCase()}`,
        linkTarget: `/consultations?encounterId=${input.encounterId}&orderId=${input.labOrderId}`,
        entityReference: input.labOrderId,
        metadata: {
          labOrderId: input.labOrderId,
          encounterId: input.encounterId,
          patientName,
          testName,
          isCritical,
          resultValue: input.resultValue,
        },
      });
    }

    // If critical, also notify hospital admins and on-duty staff
    if (isCritical) {
      const { data: adminRoles } = await (supabaseAdmin as any)
        .from("user_roles")
        .select("user_id")
        .eq("hospital_id", activeHospitalId)
        .in("role", ["hospital_admin", "nurse"]);

      for (const adm of adminRoles ?? []) {
        if (adm.user_id !== doctorUserId && adm.user_id !== userId) {
          await createNotificationRecord(supabaseAdmin, {
            recipientUserId: adm.user_id,
            hospitalId: activeHospitalId,
            type: "lab_result_critical",
            priority: "critical",
            title: `⚠️ CRITICAL LAB ALERT: ${testName} (${patientName})`,
            body: `Critical panic value recorded: ${input.resultValue} ${input.unit || ""}. Immediate clinical review required.`,
            linkTarget: `/consultations?encounterId=${input.encounterId}`,
            entityReference: input.labOrderId,
          });
        }
      }
    }

    // Check if all lab orders for this encounter are completed
    const { data: remainingLabs } = await supabase
      .from("lab_orders")
      .select("id")
      .eq("encounter_id", input.encounterId)
      .in("status", ["ordered", "sample_collected", "processing"]);

    if (!remainingLabs || remainingLabs.length === 0) {
      const { data: pendingRx } = await supabase
        .from("prescriptions")
        .select("id")
        .eq("encounter_id", input.encounterId)
        .neq("status", "dispensed");

      const nextEncounterStatus = pendingRx && pendingRx.length > 0 ? "pharmacy_pending" : "consultation";
      await supabase
        .from("encounters")
        .update({ encounter_status: nextEncounterStatus })
        .eq("id", input.encounterId);
    }

    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "WRITE",
      justification: `Recorded lab test result "${input.resultValue}" (Flag: ${input.abnormalFlag.toUpperCase()}) for order ${input.labOrderId}`,
    });

    return { success: true, status };
  });

/**
 * Acknowledges / Reviews a lab result from doctor workstation (Prompt 40).
 */
export const acknowledgeDoctorLabResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      labOrderId: string;
      comment?: string | undefined;
      hospitalId?: string | undefined;
    }) => ({
      labOrderId: String(input.labOrderId).trim(),
      comment: input.comment ? String(input.comment).trim() : undefined,
      hospitalId: input.hospitalId ? String(input.hospitalId).trim() : undefined,
    })
  )
  .handler(async ({ context, data: input }) => {
    const { supabase, userId } = context;

    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, full_name, hospital_id")
      .eq("user_id", userId)
      .maybeSingle();

    const timestamp = new Date().toISOString();

    const { error: updErr } = await supabase
      .from("lab_orders")
      .update({
        acknowledged_at: timestamp,
        acknowledged_by: staffRow?.id || null,
        acknowledged_by_name: staffRow?.full_name || "Physician",
        acknowledgement_comment: input.comment || "Reviewed and clinically managed.",
      })
      .eq("id", input.labOrderId);

    if (updErr) throw new Error(updErr.message);

    return { success: true, acknowledgedAt: timestamp, acknowledgedByName: staffRow?.full_name || "Physician" };
  });

/**
 * Fetches historical trend comparison for a patient test (Prompt 40).
 */
export const getPatientLabTrends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { patientId: string; testName: string }) => ({
    patientId: String(input.patientId),
    testName: String(input.testName),
  }))
  .handler(async ({ context, data: input }) => {
    const { supabase } = context;

    const { data: rows } = await supabase
      .from("lab_orders")
      .select(`
        id, result_value, units, reference_range, is_critical, is_out_of_range, completed_at, created_at,
        test:test_id(test_catalog:test_catalog_id(name, code))
      `)
      .eq("patient_id", input.patientId)
      .in("status", ["completed", "critical"])
      .order("completed_at", { ascending: true });

    const filtered = (rows ?? []).filter((r: any) => {
      const name = (r.test as any)?.test_catalog?.name || "";
      return name.toLowerCase().includes(input.testName.toLowerCase()) || input.testName.toLowerCase().includes(name.toLowerCase());
    });

    return filtered.map((r: any) => ({
      id: r.id,
      date: r.completed_at || r.created_at,
      value: r.result_value,
      units: r.units || "",
      referenceRange: r.reference_range || "",
      isCritical: Boolean(r.is_critical),
      isOutOfRange: Boolean(r.is_out_of_range),
    }));
  });

