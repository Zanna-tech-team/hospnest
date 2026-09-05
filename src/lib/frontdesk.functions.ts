import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type StaffRole =
  | "super_admin"
  | "hospital_admin"
  | "doctor"
  | "nurse"
  | "lab_tech"
  | "pharmacist";

const NIN_RE = /^[0-9]{11}$/;

/** Confirms the caller works at this hospital and returns the role they act with. */
async function assertHospitalStaff(
  supabase: { from: (t: string) => any },
  userId: string,
  hospitalId: string,
): Promise<StaffRole> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, hospital_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { role: StaffRole | "patient"; hospital_id: string | null }[];
  const superAdmin = rows.find((r) => r.role === "super_admin");
  if (superAdmin) return "super_admin";

  const match = rows.find((r) => r.hospital_id === hospitalId && r.role !== "patient");
  if (!match) throw new Error("You are not assigned to this hospital.");
  return match.role as StaffRole;
}

async function writeAuditEntry(
  supabase: { from: (t: string) => any },
  entry: {
    hospital_id: string;
    accessor_id: string;
    accessor_role: StaffRole;
    patient_id: string;
    encounter_id?: string | null;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null;
  },
) {
  await supabase.from("record_audit_logs").insert(entry);
}

/** Hospitals the signed-in person can work in, plus their departments. */
export const getFrontDeskContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name, slug)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const workplaces = (roleRows ?? [])
      .filter((r: any) => r.hospital_id && r.role !== "patient")
      .map((r: any) => ({
        hospitalId: r.hospital_id as string,
        name: (r.hospitals?.name as string) ?? "Hospital",
        role: r.role as StaffRole,
      }));

    if (workplaces.length === 0) {
      return { workplaces: [], departments: [] as { id: string; name: string }[] };
    }

    const { data: depts } = await supabase
      .from("departments")
      .select("id, name, hospital_id")
      .in("hospital_id", workplaces.map((w: { hospitalId: string }) => w.hospitalId));

    return {
      workplaces,
      departments: (depts ?? []) as { id: string; name: string; hospital_id: string }[],
    };
  });

/**
 * National NIN lookup. Front desk must be able to find a patient who has never
 * been to this hospital, so the identity read is privileged and always audited.
 */
export const lookupPatientByNin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nin: string; hospitalId: string }) => {
    const nin = String(input?.nin ?? "").trim();
    if (!NIN_RE.test(nin)) throw new Error("A NIN must be exactly 11 digits.");
    if (!input?.hospitalId) throw new Error("Choose a hospital first.");
    return { nin, hospitalId: input.hospitalId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const role = await assertHospitalStaff(supabase, userId, data.hospitalId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: patient, error } = await supabaseAdmin
      .from("patients")
      .select(
        "id, nin, first_name, last_name, date_of_birth, gender, phone, blood_group, genotype, allergies, chronic_conditions",
      )
      .eq("nin", data.nin)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!patient) return { found: false as const };

    const [{ count: visitsHere }, { data: consent }] = await Promise.all([
      supabaseAdmin
        .from("encounters")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patient.id)
        .eq("hospital_id", data.hospitalId),
      supabaseAdmin
        .from("patient_consents")
        .select("id, expires_at")
        .eq("patient_id", patient.id)
        .eq("hospital_id", data.hospitalId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    await writeAuditEntry(supabase, {
      hospital_id: data.hospitalId,
      accessor_id: userId,
      accessor_role: role,
      patient_id: patient.id,
      action: "READ",
      justification: "Front desk NIN lookup",
    });

    return {
      found: true as const,
      patient,
      visitsHere: visitsHere ?? 0,
      hasConsent: Boolean(consent),
    };
  });

/** Creates the universal patient record for a walk-in who has no NIN record yet. */
export const registerPatientByNin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      nin: string;
      hospitalId: string;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      gender?: string;
      phone?: string;
      bloodGroup?: string;
    }) => {
      const nin = String(input?.nin ?? "").trim();
      if (!NIN_RE.test(nin)) throw new Error("A NIN must be exactly 11 digits.");
      if (!input?.hospitalId) throw new Error("Choose a hospital first.");
      const firstName = String(input?.firstName ?? "").trim();
      const lastName = String(input?.lastName ?? "").trim();
      if (!firstName || !lastName) throw new Error("First and last name are required.");
      return {
        nin,
        hospitalId: input.hospitalId,
        firstName,
        lastName,
        dateOfBirth: input.dateOfBirth?.trim() || null,
        gender: input.gender?.trim() || null,
        phone: input.phone?.trim() || null,
        bloodGroup: input.bloodGroup?.trim() || null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const role = await assertHospitalStaff(supabase, userId, data.hospitalId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("patients")
      .select("id")
      .eq("nin", data.nin)
      .maybeSingle();

    if (existing) {
      throw new Error("That NIN already has a record. Search for it instead of creating a new one.");
    }

    const { data: created, error } = await supabaseAdmin
      .from("patients")
      .insert({
        nin: data.nin,
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        phone: data.phone,
        blood_group: data.bloodGroup,
      })
      .select("id, nin, first_name, last_name, date_of_birth, gender, phone, blood_group")
      .single();

    if (error) throw new Error(error.message);

    await writeAuditEntry(supabase, {
      hospital_id: data.hospitalId,
      accessor_id: userId,
      accessor_role: role,
      patient_id: created.id,
      action: "WRITE",
      justification: "Front desk enrolment of a new NIN record",
    });

    return { patient: created };
  });

/** Checks the patient in: records consent, a walk-in booking and an open visit. */
export const openEncounterForPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      patientId: string;
      hospitalId: string;
      departmentId?: string;
      chiefComplaint: string;
      consentGiven: boolean;
    }) => {
      if (!input?.patientId) throw new Error("Select a patient first.");
      if (!input?.hospitalId) throw new Error("Choose a hospital first.");
      const chiefComplaint = String(input?.chiefComplaint ?? "").trim();
      if (chiefComplaint.length < 3) throw new Error("Describe why the patient is here.");
      if (!input.consentGiven) throw new Error("The patient must consent before check-in.");
      return {
        patientId: input.patientId,
        hospitalId: input.hospitalId,
        departmentId: input.departmentId || null,
        chiefComplaint,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const role = await assertHospitalStaff(supabase, userId, data.hospitalId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: openVisit } = await supabaseAdmin
      .from("encounters")
      .select("id")
      .eq("patient_id", data.patientId)
      .eq("hospital_id", data.hospitalId)
      .not("encounter_status", "in", "(discharged,closed)")
      .maybeSingle();

    if (openVisit) {
      return { encounterId: openVisit.id as string, alreadyOpen: true as const, queueNumber: null };
    }

    const { data: consentRow } = await supabaseAdmin
      .from("patient_consents")
      .select("id")
      .eq("patient_id", data.patientId)
      .eq("hospital_id", data.hospitalId)
      .maybeSingle();

    if (consentRow) {
      await supabaseAdmin
        .from("patient_consents")
        .update({ is_active: true, expires_at: null, granted_by: userId })
        .eq("id", consentRow.id);
    } else {
      await supabaseAdmin.from("patient_consents").insert({
        patient_id: data.patientId,
        hospital_id: data.hospitalId,
        granted_by: userId,
        scope: "full_record",
      });
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: todaysVisits } = await supabaseAdmin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", data.hospitalId)
      .gte("appointment_date", startOfDay.toISOString());

    const queueNumber = (todaysVisits ?? 0) + 1;

    const { data: appointment, error: apptError } = await supabaseAdmin
      .from("appointments")
      .insert({
        hospital_id: data.hospitalId,
        patient_id: data.patientId,
        department_id: data.departmentId,
        appointment_date: new Date().toISOString(),
        status: "checked_in",
        is_walk_in: true,
        queue_number: queueNumber,
        symptoms_summary: data.chiefComplaint,
      })
      .select("id")
      .single();

    if (apptError) throw new Error(apptError.message);

    const { data: encounter, error: encError } = await supabaseAdmin
      .from("encounters")
      .insert({
        hospital_id: data.hospitalId,
        patient_id: data.patientId,
        appointment_id: appointment.id,
        department_id: data.departmentId,
        encounter_status: "triage",
        chief_complaint: data.chiefComplaint,
      })
      .select("id")
      .single();

    if (encError) throw new Error(encError.message);

    await writeAuditEntry(supabase, {
      hospital_id: data.hospitalId,
      accessor_id: userId,
      accessor_role: role,
      patient_id: data.patientId,
      encounter_id: encounter.id,
      action: "WRITE",
      justification: "Front desk check-in, visit opened for triage",
    });

    return { encounterId: encounter.id as string, alreadyOpen: false as const, queueNumber };
  });
