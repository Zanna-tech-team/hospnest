import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type Workplace = {
  hospitalId: string;
  name: string;
  slug: string;
  role: StaffRole;
};

export type AppShellData = {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  workplaces: Workplace[];
  activeWorkplace: Workplace | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPatient: boolean;
};

export const getAppShellData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { hospitalId?: string | undefined }) => {
    return { hospitalId: input?.hospitalId ? String(input.hospitalId) : undefined };
  })
  .handler(async ({ context, data: input }): Promise<AppShellData> => {
    const { supabase, userId } = context;

    // 1. Fetch user email
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email ?? "";
    const userMetaName = (userData?.user?.user_metadata?.["full_name"] as string) ?? "";

    // 2. Fetch user's hospitals & roles
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name, slug)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (roleError) throw new Error(roleError.message);

    const isPatient = (roleRows ?? []).some((r: any) => r.role === "patient");
    const isSuperAdmin = (roleRows ?? []).some((r: any) => r.role === "super_admin" || r.role === "superadmin");

    const workplaces: Workplace[] = (roleRows ?? [])
      .filter((r: any) => r.hospital_id && r.role !== "patient")
      .map((r: any) => ({
        hospitalId: r.hospital_id as string,
        name: (r.hospitals?.name as string) ?? "Hospital",
        slug: (r.hospitals?.slug as string) ?? "hospital",
        role: r.role as StaffRole,
      }));

    // 3. Fetch staff or patient record name if available
    let fullName = userMetaName;
    if (workplaces.length > 0) {
      const { data: staffRow } = await supabase
        .from("staff")
        .select("full_name")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (staffRow?.full_name) {
        fullName = staffRow.full_name;
      }
    } else if (isPatient) {
      const { data: patientRow } = await supabase
        .from("patients")
        .select("first_name, last_name")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (patientRow?.first_name && patientRow?.last_name) {
        fullName = `${patientRow.first_name} ${patientRow.last_name}`;
      }
    }

    if (!fullName) {
      fullName = email.split("@")[0] ?? "Member";
    }

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
      workplaces,
      activeWorkplace,
      isAdmin,
      isSuperAdmin,
      isPatient,
    };
  });
