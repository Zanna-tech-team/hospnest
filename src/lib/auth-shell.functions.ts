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

    // 1. Fetch user email
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email ?? "";
    const userMetaName = (userData?.user?.user_metadata?.["full_name"] as string) ?? "";

    // 2. Fetch user's hospitals & roles (including module_permissions)
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, module_permissions, hospitals(id, name, slug)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    let isPatient = (roleRows ?? []).some((r: any) => r.role === "patient");
    const isSuperAdmin = (roleRows ?? []).some((r: any) => r.role === "super_admin" || r.role === "superadmin");

    const workplaces: Workplace[] = (roleRows ?? [])
      .filter((r: any) => r.hospital_id && r.role !== "patient")
      .map((r: any) => ({
        hospitalId: r.hospital_id as string,
        name: (r.hospitals?.name as string) ?? "Hospital",
        slug: (r.hospitals?.slug as string) ?? "hospital",
        role: r.role as StaffRole,
        modulePermissions: Array.isArray(r.module_permissions) ? r.module_permissions : [],
      }));

    // Resilient Staff Auto-Resolution:
    // If workplaces is empty and user is not superadmin, check public.staff
    if (workplaces.length === 0 && !isSuperAdmin) {
      try {
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, hospital_id, full_name, phone, medical_license_number, specialization, hospitals(id, name, slug)")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(1);

        const matchedStaff = staffData?.[0];

        if (matchedStaff && matchedStaff.hospital_id) {
          const rawRole = (userData?.user?.user_metadata?.["role"] as string) || "doctor";
          const staffRole = (["doctor", "nurse", "lab_tech", "pharmacist", "hospital_admin"].includes(rawRole)
            ? rawRole
            : "doctor") as StaffRole;

          workplaces.push({
            hospitalId: matchedStaff.hospital_id,
            name: (matchedStaff.hospitals as any)?.name ?? "Hospital",
            slug: (matchedStaff.hospitals as any)?.slug ?? "hospital",
            role: staffRole,
            modulePermissions: [],
          });

          // Auto-heal user_roles entry in background/gracefully
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("user_roles").upsert(
              {
                user_id: userId,
                hospital_id: matchedStaff.hospital_id,
                role: staffRole,
                is_active: true,
              },
              { onConflict: "user_id,hospital_id,role" }
            );
          } catch (healErr) {
            console.warn("Non-fatal user_roles auto-heal notice:", healErr);
          }
        }
      } catch (err) {
        console.warn("Staff fallback lookup notice:", err);
      }
    }

    // Now, if workplaces is STILL empty and not superadmin, check if they are a patient
    if (workplaces.length === 0 && !isSuperAdmin) {
      if (!isPatient) {
        let pQuery = supabase.from("patients").select("id, first_name, last_name, user_id").limit(1);
        if (email) {
          pQuery = pQuery.or(`user_id.eq.${userId},email.eq.${email}`);
        } else {
          pQuery = pQuery.eq("user_id", userId);
        }
        const { data: pData } = await pQuery;
        if (pData && pData.length > 0) {
          isPatient = true;
          if (!pData[0].user_id) {
            await supabase.from("patients").update({ user_id: userId }).eq("id", pData[0].id);
          }
        } else {
          // Check user metadata before assuming patient
          const userRoleMeta = userData?.user?.user_metadata?.["role"];
          if (userRoleMeta && ["doctor", "nurse", "lab_tech", "pharmacist", "hospital_admin"].includes(userRoleMeta)) {
            // User registered as staff, do NOT set isPatient
            isPatient = false;
          } else {
            isPatient = true;
          }
        }
      }
    }

    // 3. Fetch staff or patient record name and metadata
    let fullName = userMetaName;
    let staffProfile: any = null;
    let patientProfile: any = null;

    if (workplaces.length > 0 || isSuperAdmin) {
      const { data: staffRow } = await supabase
        .from("staff")
        .select(`
          id, full_name, phone, specialization, medical_license_number, staff_id_code,
          departments(name)
        `)
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (staffRow) {
        staffProfile = staffRow;
        fullName = staffRow.full_name || fullName;
      }
    }

    if (isPatient || workplaces.length === 0) {
      const { data: pRow } = await supabase
        .from("patients")
        .select("id, nin, first_name, last_name, phone, email, blood_group, genotype, date_of_birth")
        .or(`user_id.eq.${userId},email.eq.${email}`)
        .limit(1)
        .maybeSingle();

      if (pRow) {
        patientProfile = pRow;
        if (!staffProfile) {
          fullName = `${pRow.first_name || ""} ${pRow.last_name || ""}`.trim() || fullName;
        }
      }
    }

    if (!fullName) {
      fullName = email.split("@")[0] ?? "Member";
    }

    const allRoles = (roleRows ?? []).map((r: any) => r.role);
    if (isPatient && !allRoles.includes("patient")) {
      allRoles.push("patient");
    }

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

    const activeWorkplace = workplaces.find((w) => w.hospitalId === activeHospitalId) || workplaces[0] || null;

    const isAdmin = isSuperAdmin || activeWorkplace?.role === "hospital_admin";

    return {
      user: {
        id: userId,
        email,
        fullName,
      },
      profileDetails,
      workplaces,
      activeWorkplace,
      modulePermissions: activeWorkplace?.modulePermissions || [],
      isAdmin,
      isSuperAdmin,
      isPatient,
    };
  });
