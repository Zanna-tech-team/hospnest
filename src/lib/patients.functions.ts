import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type PatientDirectoryItem = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  nin: string; // masked if non-clinical
  isNinMasked: boolean;
  age: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  bloodGroup: string | null;
  lastVisitDate: string | null;
  hasOpenVisit: boolean;
  openVisitStatus: string | null;
  hasConsent: boolean;
  visitCount: number;
};

export type PatientsDirectoryResponse = {
  patients: PatientDirectoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isClinical: boolean;
};

const SYSTEM_AUDIT_PATIENT_ID = "00000000-0000-0000-0000-000000000000";

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
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null | undefined;
  },
) {
  try {
    await supabase.from("record_audit_logs").insert({
      hospital_id: entry.hospital_id,
      accessor_id: entry.accessor_id,
      accessor_role: entry.accessor_role,
      patient_id: entry.patient_id || SYSTEM_AUDIT_PATIENT_ID,
      action: entry.action,
      justification: entry.justification || null,
    });
  } catch (err) {
    console.warn("Audit logging notice:", err);
  }
}

/**
 * Searches and paginates patients who have visited this hospital or have active consent.
 */
export const getPatientsDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input?: {
      hospitalId?: string | undefined;
      search?: string | undefined;
      filter?: "all" | "visited" | "consent" | "open_visit" | undefined;
      page?: number | undefined;
      pageSize?: number | undefined;
    }) => {
      return {
        hospitalId: input?.hospitalId ? String(input.hospitalId).trim() : undefined,
        search: input?.search ? String(input.search).trim() : "",
        filter: input?.filter || "all",
        page: Math.max(1, Number(input?.page) || 1),
        pageSize: Math.max(1, Math.min(50, Number(input?.pageSize) || 10)),
      };
    },
  )
  .handler(async ({ context, data: input }): Promise<PatientsDirectoryResponse> => {
    const { supabase, userId } = context;

    // 1. Verify caller belongs to a hospital
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) {
      return {
        patients: [],
        totalCount: 0,
        page: 1,
        pageSize: input.pageSize,
        totalPages: 0,
        isClinical: false,
      };
    }

    const activeHospitalId: string =
      input.hospitalId && roles.some((r: any) => r.hospital_id === input.hospitalId)
        ? input.hospitalId
        : roles[0]?.hospital_id || "";

    if (!activeHospitalId) {
      return {
        patients: [],
        totalCount: 0,
        page: 1,
        pageSize: input.pageSize,
        totalPages: 0,
        isClinical: false,
      };
    }

    const callerRole = (roles.find((r: any) => r.hospital_id === activeHospitalId)?.role as StaffRole) || "doctor";
    const isSuper = roles.some((r: any) => r.role === "super_admin");
    const isClinical =
      isSuper || ["doctor", "nurse", "lab_tech", "pharmacist", "hospital_admin"].includes(callerRole);

    // 2. Query encounters at this hospital
    const { data: encountersData } = await supabase
      .from("encounters")
      .select("id, patient_id, encounter_status, created_at, closed_at")
      .eq("hospital_id", activeHospitalId)
      .order("created_at", { ascending: false });

    // 3. Query active consents at this hospital
    const nowIso = new Date().toISOString();
    const { data: consentsData } = await supabase
      .from("patient_consents")
      .select("patient_id, is_active, expires_at")
      .eq("hospital_id", activeHospitalId)
      .eq("is_active", true);

    const validConsentPatientIds = new Set<string>();
    (consentsData ?? []).forEach((c: any) => {
      if (c.patient_id && (!c.expires_at || c.expires_at > nowIso)) {
        validConsentPatientIds.add(c.patient_id);
      }
    });

    const encounterMap = new Map<
      string,
      {
        lastVisit: string;
        openEncounter: { id: string; status: string } | null;
        count: number;
      }
    >();

    (encountersData ?? []).forEach((e: any) => {
      if (!e.patient_id) return;
      const existing = encounterMap.get(e.patient_id);
      const isOpen = !e.closed_at && e.encounter_status !== "closed";
      if (!existing) {
        encounterMap.set(e.patient_id, {
          lastVisit: e.created_at,
          openEncounter: isOpen ? { id: e.id, status: e.encounter_status } : null,
          count: 1,
        });
      } else {
        existing.count += 1;
        if (isOpen && !existing.openEncounter) {
          existing.openEncounter = { id: e.id, status: e.encounter_status };
        }
      }
    });

    // Determine relevant patient IDs
    const allPatientIds = new Set<string>([
      ...Array.from(encounterMap.keys()),
      ...Array.from(validConsentPatientIds),
    ]);

    if (allPatientIds.size === 0) {
      return {
        patients: [],
        totalCount: 0,
        page: 1,
        pageSize: input.pageSize,
        totalPages: 0,
        isClinical,
      };
    }

    // 4. Fetch patient records
    const { data: patientRows, error: patientError } = await supabase
      .from("patients")
      .select("id, nin, first_name, last_name, date_of_birth, gender, phone, email, blood_group, created_at")
      .in("id", Array.from(allPatientIds));

    if (patientError) throw new Error(patientError.message);

    // 5. Apply in-memory search and filters
    let list: PatientDirectoryItem[] = (patientRows ?? []).map((p: any) => {
      const encInfo = encounterMap.get(p.id);
      const hasConsent = validConsentPatientIds.has(p.id);
      const hasOpen = Boolean(encInfo?.openEncounter);

      return {
        id: p.id,
        fullName: `${p.first_name} ${p.last_name}`,
        firstName: p.first_name,
        lastName: p.last_name,
        nin: isClinical ? p.nin : maskNin(p.nin),
        isNinMasked: !isClinical,
        age: calculateAge(p.date_of_birth),
        dateOfBirth: p.date_of_birth,
        gender: p.gender || "Unknown",
        phone: p.phone,
        bloodGroup: p.blood_group,
        lastVisitDate: encInfo?.lastVisit || p.created_at,
        hasOpenVisit: hasOpen,
        openVisitStatus: encInfo?.openEncounter?.status || null,
        hasConsent,
        visitCount: encInfo?.count || 0,
      };
    });

    // Search filter (name, nin, phone)
    if (input.search) {
      const s = input.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(s) ||
          p.nin.toLowerCase().includes(s) ||
          (p.phone && p.phone.includes(s)),
      );
    }

    // Category filter
    if (input.filter === "visited") {
      list = list.filter((p) => p.visitCount > 0);
    } else if (input.filter === "consent") {
      list = list.filter((p) => p.hasConsent);
    } else if (input.filter === "open_visit") {
      list = list.filter((p) => p.hasOpenVisit);
    }

    // Sort by latest visit date descending
    list.sort((a, b) => {
      const timeA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
      const timeB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
      return timeB - timeA;
    });

    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / input.pageSize);
    const startIndex = (input.page - 1) * input.pageSize;
    const paginatedPatients = list.slice(startIndex, startIndex + input.pageSize);

    // 6. Record READ audit log
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      action: "READ",
      justification: `Patients directory searched (filter: ${input.filter}, query: "${input.search || "all"}", results: ${totalCount})`,
    });

    return {
      patients: paginatedPatients,
      totalCount,
      page: input.page,
      pageSize: input.pageSize,
      totalPages,
      isClinical,
    };
  });
