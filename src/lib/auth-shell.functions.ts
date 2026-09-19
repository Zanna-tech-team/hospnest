import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type Workplace = {
  hospitalId: string;
  name: string;
  slug: string;
  role: StaffRole;
  modulePermissions: string[];
};

export type UserProfileDetails = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  specialization?: string | null;
  licenseNumber?: string | null;
  departmentName?: string | null;
  staffId?: string | null;
  nin?: string | null;
  bloodGroup?: string | null;
  genotype?: string | null;
  dateOfBirth?: string | null;
  roles: string[];
};

export type AppShellData = {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  profileDetails?: UserProfileDetails | undefined;
  workplaces: Workplace[];
  activeWorkplace: Workplace | null;
  modulePermissions: string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPatient: boolean;
};

export const getAppShellData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input?: { hospitalId?: string | undefined }) => ({
    hospitalId: input?.hospitalId ? String(input.hospitalId) : undefined,
  }))
  .handler(async ({ context, data: input }): Promise<AppShellData> => {
    const { supabase, userId } = context;

    // ── PHASE 1: Run core identity queries in parallel ─────────────────────
    const [{ data: userData }, { data: roleRows, error: roleError }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("user_roles")
        .select("role, hospital_id, module_permissions, hospitals(id, name, slug)")
        .eq("user_id", userId)
        .eq("is_active", true),
    ]);

    if (roleError) throw new Error(roleError.message);

    const email = userData?.user?.email ?? "";
    const userMetaName = (userData?.user?.user_metadata?.["full_name"] as string) ?? "";
    const userRoleMeta = (userData?.user?.user_metadata?.["role"] as string) ?? "";

    const isSuperAdmin = (roleRows ?? []).some(
      (r: any) => r.role === "super_admin" || r.role === "superadmin"
    );
    let isPatient = (roleRows ?? []).some((r: any) => r.role === "patient");

    let workplaces: Workplace[] = (roleRows ?? [])
      .filter((r: any) => r.hospital_id && r.role !== "patient")
      .map((r: any) => ({
        hospitalId: r.hospital_id as string,
        name: (r.hospitals?.name as string) ?? "Hospital",
        slug: (r.hospitals?.slug as string) ?? "hospital",
        role: r.role as StaffRole,
        modulePermissions: Array.isArray(r.module_permissions) ? r.module_permissions : [],
      }));

    // ── PHASE 2: Parallel profile + fallback resolution ────────────────────
    // Run staff and patient queries simultaneously regardless of workspace state
    // This way we have all data ready for profile details even on the fast path
    const staffQuery = supabase
      .from("staff")
      .select(
        "id, hospital_id, full_name, phone, specialization, medical_license_number, staff_id_code, departments(name), hospitals(id, name, slug)"
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const patientQuery =
      isPatient || workplaces.length === 0
        ? supabase
            .from("patients")
            .select(
              "id, nin, first_name, last_name, phone, email, blood_group, genotype, date_of_birth, user_id"
            )
            .or(`user_id.eq.${userId}${email ? `,email.eq.${email}` : ""}`)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null });

    const [{ data: staffRow }, { data: pRow }] = await Promise.all([staffQuery, patientQuery]);

    let staffProfile: any = staffRow || null;
    let patientProfile: any = pRow || null;

    // Auto-resolve workspace from staff table if user_roles was empty
    if (workplaces.length === 0 && !isSuperAdmin && staffProfile?.hospital_id) {
      const resolvedRole = (
        ["doctor", "nurse", "lab_tech", "pharmacist", "hospital_admin", "front_desk"].includes(
          userRoleMeta
        )
          ? userRoleMeta
          : "doctor"
      ) as StaffRole;

      workplaces.push({
        hospitalId: staffProfile.hospital_id,
        name: (staffProfile.hospitals as any)?.name ?? "Hospital",
        slug: (staffProfile.hospitals as any)?.slug ?? "hospital",
        role: resolvedRole,
        modulePermissions: [],
      });

      // Auto-heal user_roles — fire and forget, non-blocking
      supabase
        .from("user_roles")
        .upsert(
          {
            user_id: userId,
            hospital_id: staffProfile.hospital_id,
            role: resolvedRole,
            is_active: true,
          },
          { onConflict: "user_id,hospital_id,role" }
        )
        .then(() => {})
        .catch(() => {});
    }

    // Patient determination: only if still no workplace
    if (workplaces.length === 0 && !isSuperAdmin) {
      if (patientProfile) {
        isPatient = true;
        // Link patient record to auth user if not yet linked
        if (!patientProfile.user_id) {
          supabase
            .from("patients")
            .update({ user_id: userId })
            .eq("id", patientProfile.id)
            .then(() => {})
            .catch(() => {});
        }
      } else if (
        userRoleMeta &&
        ["doctor", "nurse", "lab_tech", "pharmacist", "hospital_admin", "front_desk"].includes(
          userRoleMeta
        )
      ) {
        // User is staff by metadata but not yet linked — do NOT mark as patient
        isPatient = false;
      } else {
        isPatient = true;
      }
    }

    // ── Resolve display name ───────────────────────────────────────────────
    let fullName = userMetaName;
    if (staffProfile?.full_name) {
      fullName = staffProfile.full_name;
    } else if (patientProfile) {
      const pName =
        `${patientProfile.first_name || ""} ${patientProfile.last_name || ""}`.trim();
      if (pName) fullName = pName;
    }
    if (!fullName) {
      fullName = email.split("@")[0] ?? "Member";
    }

    const allRoles = (roleRows ?? []).map((r: any) => r.role);
    if (isPatient && !allRoles.includes("patient")) allRoles.push("patient");

    const profileDetails: UserProfileDetails = {
      id: userId,
      email,
      fullName,
      phone: staffProfile?.phone || patientProfile?.phone || null,
      specialization: staffProfile?.specialization || null,
      licenseNumber: staffProfile?.medical_license_number || null,
      departmentName: (staffProfile?.departments as any)?.name || null,
      staffId: staffProfile?.staff_id_code || staffProfile?.id || null,
      nin: patientProfile?.nin || null,
      bloodGroup: patientProfile?.blood_group || null,
      genotype: patientProfile?.genotype || null,
      dateOfBirth: patientProfile?.date_of_birth || null,
      roles: allRoles,
    };

    const activeHospitalId =
      input?.hospitalId && workplaces.some((w) => w.hospitalId === input.hospitalId)
        ? input.hospitalId
        : workplaces[0]?.hospitalId || null;

    const activeWorkplace =
      workplaces.find((w) => w.hospitalId === activeHospitalId) || workplaces[0] || null;

    const isAdmin = isSuperAdmin || activeWorkplace?.role === "hospital_admin";

    return {
      user: { id: userId, email, fullName },
      profileDetails,
      workplaces,
      activeWorkplace,
      modulePermissions: activeWorkplace?.modulePermissions || [],
      isAdmin,
      isSuperAdmin,
      isPatient,
    };
  });
