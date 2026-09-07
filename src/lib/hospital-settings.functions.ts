import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

/** Confirms caller has access to the hospital and checks if they are admin */
async function checkHospitalAccess(
  supabase: { from: (t: string) => any },
  userId: string,
  hospitalId: string,
): Promise<{ role: StaffRole; isAdmin: boolean }> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, hospital_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { role: StaffRole | "patient"; hospital_id: string | null }[];
  const superAdmin = rows.find((r) => r.role === "super_admin");
  if (superAdmin) return { role: "super_admin", isAdmin: true };

  const match = rows.find((r) => r.hospital_id === hospitalId && r.role !== "patient");
  if (!match) throw new Error("You are not assigned to this hospital.");

  const isAdmin = match.role === "hospital_admin";
  return { role: match.role as StaffRole, isAdmin };
}

async function assertHospitalAdmin(
  supabase: { from: (t: string) => any },
  userId: string,
  hospitalId: string,
): Promise<StaffRole> {
  const { role, isAdmin } = await checkHospitalAccess(supabase, userId, hospitalId);
  if (!isAdmin) throw new Error("Administrator privileges required for this action.");
  return role;
}

async function writeAuditEntry(
  supabase: { from: (t: string) => any },
  entry: {
    hospital_id: string;
    accessor_id: string;
    accessor_role: StaffRole;
    patient_id?: string;
    encounter_id?: string;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null;
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
    console.warn("Audit log notice:", err);
  }
}

export type HospitalProfileData = {
  id: string;
  name: string;
  slug: string;
  hospitalType: string;
  licenseNumber: string;
  state: string;
  lga: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
};

export type DepartmentItem = {
  id: string;
  hospitalId: string;
  name: string;
  code: string;
  floor: string | null;
  headOfDeptId: string | null;
  headOfDeptName?: string | null;
};

export type HospitalServiceItem = {
  id: string;
  hospitalId: string;
  serviceCode: string;
  serviceName: string;
  category: string;
  price: number;
  isActive: boolean;
};

export type HospitalLabTestItem = {
  id: string;
  hospitalId: string;
  testCatalogId: string;
  testName: string;
  testCode: string;
  category: string | null;
  price: number;
  isAvailable: boolean;
};

export type HospitalSettingsResponse = {
  hospital: HospitalProfileData;
  departments: DepartmentItem[];
  services: HospitalServiceItem[];
  labTests: HospitalLabTestItem[];
  staffMembers: Array<{ id: string; fullName: string; role: string }>;
  isAdmin: boolean;
  callerRole: StaffRole;
};

/** Fetches full settings data or read-only profile for non-admins */
export const getHospitalSettingsData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hospitalId: string }) => {
    if (!input?.hospitalId) throw new Error("Hospital ID is required.");
    return { hospitalId: input.hospitalId };
  })
  .handler(async ({ data: input, context }): Promise<HospitalSettingsResponse> => {
    const { supabase, userId } = context;
    const { role, isAdmin } = await checkHospitalAccess(supabase, userId, input.hospitalId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Parallel fetch: Hospital, Departments, Services, Lab Tests, Staff
    const [
      { data: hospitalRow, error: hospErr },
      { data: depts, error: deptErr },
      { data: services, error: srvErr },
      { data: labTests, error: labErr },
      { data: staffRows, error: staffErr },
    ] = await Promise.all([
      supabaseAdmin
        .from("hospitals")
        .select(`
          id, name, slug, hospital_type, license_number, state, lga, address,
          contact_email, contact_phone, is_verified, is_active, created_at
        `)
        .eq("id", input.hospitalId)
        .single(),

      supabaseAdmin
        .from("departments")
        .select("id, hospital_id, name, code, floor, head_of_dept_id")
        .eq("hospital_id", input.hospitalId)
        .order("name", { ascending: true }),

      (supabaseAdmin as any)
        .from("hospital_services")
        .select("id, hospital_id, service_code, service_name, category, price, is_active")
        .eq("hospital_id", input.hospitalId)
        .order("category", { ascending: true }),

      supabaseAdmin
        .from("hospital_lab_tests")
        .select(`
          id, hospital_id, test_catalog_id, price, is_available,
          lab_test_catalog (code, name, category)
        `)
        .eq("hospital_id", input.hospitalId),

      supabaseAdmin
        .from("staff")
        .select("id, full_name, role")
        .eq("hospital_id", input.hospitalId)
        .eq("is_active", true),
    ]);

    if (hospErr || !hospitalRow) throw new Error("Hospital not found.");

    const staffMap = new Map((staffRows ?? []).map((s: any) => [s.id, s.full_name]));

    const mappedDepartments: DepartmentItem[] = (depts ?? []).map((d: any) => ({
      id: d.id,
      hospitalId: d.hospital_id,
      name: d.name,
      code: d.code,
      floor: d.floor,
      headOfDeptId: d.head_of_dept_id,
      headOfDeptName: d.head_of_dept_id ? staffMap.get(d.head_of_dept_id) || null : null,
    }));

    const mappedServices: HospitalServiceItem[] = (services ?? []).map((s: any) => ({
      id: s.id,
      hospitalId: s.hospital_id,
      serviceCode: s.service_code,
      serviceName: s.service_name,
      category: s.category || "General",
      price: Number(s.price || 0),
      isActive: Boolean(s.is_active),
    }));

    const mappedLabTests: HospitalLabTestItem[] = (labTests ?? []).map((l: any) => ({
      id: l.id,
      hospitalId: l.hospital_id,
      testCatalogId: l.test_catalog_id,
      testName: l.lab_test_catalog?.name || "Lab Investigation",
      testCode: l.lab_test_catalog?.code || "LAB",
      category: l.lab_test_catalog?.category || null,
      price: Number(l.price || 0),
      isAvailable: Boolean(l.is_available),
    }));

    const mappedStaff = (staffRows ?? []).map((s: any) => ({
      id: s.id,
      fullName: s.full_name,
      role: s.role,
    }));

    return {
      hospital: {
        id: hospitalRow.id,
        name: hospitalRow.name,
        slug: hospitalRow.slug,
        hospitalType: hospitalRow.hospital_type,
        licenseNumber: hospitalRow.license_number,
        state: hospitalRow.state,
        lga: hospitalRow.lga,
        address: hospitalRow.address,
        contactEmail: hospitalRow.contact_email,
        contactPhone: hospitalRow.contact_phone,
        logoUrl: null,
        isVerified: Boolean(hospitalRow.is_verified),
        isActive: Boolean(hospitalRow.is_active),
        createdAt: hospitalRow.created_at,
      },
      departments: mappedDepartments,
      services: mappedServices,
      labTests: mappedLabTests,
      staffMembers: mappedStaff,
      isAdmin,
      callerRole: role,
    };
  });

/** Updates hospital profile details (Prompt 22) */
export const updateHospitalProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      name: string;
      address?: string | undefined;
      contactEmail?: string | undefined;
      contactPhone?: string | undefined;
      state?: string | undefined;
      lga?: string | undefined;
      hospitalType?: string | undefined;
    }) => {
      if (!input.hospitalId) throw new Error("Hospital ID is required.");
      if (!input.name || input.name.trim().length < 2) throw new Error("Hospital name is required.");
      return {
        hospitalId: input.hospitalId,
        name: input.name.trim(),
        address: input.address?.trim() || null,
        contactEmail: input.contactEmail?.trim() || null,
        contactPhone: input.contactPhone?.trim() || null,
        state: input.state?.trim() || undefined,
        lga: input.lga?.trim() || null,
        hospitalType: input.hospitalType || undefined,
      };
    },
  )
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context;
    const adminRole = await assertHospitalAdmin(supabase, userId, input.hospitalId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const updatePayload: Record<string, any> = {
      name: input.name,
      address: input.address,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      lga: input.lga,
      updated_at: new Date().toISOString(),
    };

    if (input.state) updatePayload["state"] = input.state;
    if (input.hospitalType) updatePayload["hospital_type"] = input.hospitalType;

    const { error } = await (supabaseAdmin.from("hospitals") as any)
      .update(updatePayload)
      .eq("id", input.hospitalId);

    if (error) throw new Error(error.message);

    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: adminRole,
      action: "WRITE",
      justification: `Hospital profile updated by admin (${input.name})`,
    });

    return { success: true };
  });

/** Adds or edits a clinical department (Prompt 22) */
export const createOrUpdateDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      departmentId?: string | undefined;
      name: string;
      code: string;
      floor?: string | undefined;
      headOfDeptId?: string | undefined;
    }) => {
      if (!input.hospitalId) throw new Error("Hospital ID is required.");
      if (!input.name || input.name.trim().length < 2) throw new Error("Department name is required.");
      if (!input.code || input.code.trim().length < 2) throw new Error("Department code is required.");
      return {
        hospitalId: input.hospitalId,
        departmentId: input.departmentId || undefined,
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        floor: input.floor?.trim() || null,
        headOfDeptId: input.headOfDeptId || null,
      };
    },
  )
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context;
    const adminRole = await assertHospitalAdmin(supabase, userId, input.hospitalId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (input.departmentId) {
      // Update existing
      const { error } = await supabaseAdmin
        .from("departments")
        .update({
          name: input.name,
          code: input.code,
          floor: input.floor,
          head_of_dept_id: input.headOfDeptId,
        })
        .eq("id", input.departmentId)
        .eq("hospital_id", input.hospitalId);

      if (error) throw new Error(error.message);
    } else {
      // Create new
      const { error } = await supabaseAdmin.from("departments").insert({
        hospital_id: input.hospitalId,
        name: input.name,
        code: input.code,
        floor: input.floor,
        head_of_dept_id: input.headOfDeptId,
      });

      if (error) {
        if (error.message.includes("unique") || error.message.includes("duplicate")) {
          throw new Error(`A department with code '${input.code}' already exists in this hospital.`);
        }
        throw new Error(error.message);
      }
    }

    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: adminRole,
      action: "WRITE",
      justification: `${input.departmentId ? "Updated" : "Created"} department ${input.name} (${input.code})`,
    });

    return { success: true };
  });

/** Deletes/deactivates a department */
export const deleteDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hospitalId: string; departmentId: string }) => {
    if (!input.hospitalId || !input.departmentId) throw new Error("Hospital ID and Department ID required.");
    return { hospitalId: input.hospitalId, departmentId: input.departmentId };
  })
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context;
    const adminRole = await assertHospitalAdmin(supabase, userId, input.hospitalId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("departments")
      .delete()
      .eq("id", input.departmentId)
      .eq("hospital_id", input.hospitalId);

    if (error) throw new Error(error.message);

    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: adminRole,
      action: "WRITE",
      justification: `Deleted department #${input.departmentId.slice(0, 8)}`,
    });

    return { success: true };
  });

/** Creates or updates a service price (including consultation fees) */
export const saveHospitalService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      serviceId?: string | undefined;
      serviceCode: string;
      serviceName: string;
      category: string;
      price: number;
      isActive: boolean;
    }) => {
      if (!input.hospitalId) throw new Error("Hospital ID is required.");
      if (!input.serviceName) throw new Error("Service name is required.");
      if (input.price < 0) throw new Error("Price cannot be negative.");
      return {
        hospitalId: input.hospitalId,
        serviceId: input.serviceId || undefined,
        serviceCode: input.serviceCode.trim().toUpperCase(),
        serviceName: input.serviceName.trim(),
        category: input.category.trim(),
        price: input.price,
        isActive: input.isActive,
      };
    },
  )
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context;
    const adminRole = await assertHospitalAdmin(supabase, userId, input.hospitalId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (input.serviceId) {
      const { error } = await (supabaseAdmin as any)
        .from("hospital_services")
        .update({
          service_name: input.serviceName,
          service_code: input.serviceCode,
          category: input.category,
          price: input.price,
          is_active: input.isActive,
        })
        .eq("id", input.serviceId)
        .eq("hospital_id", input.hospitalId);

      if (error) throw new Error(error.message);
    } else {
      const { error } = await (supabaseAdmin as any).from("hospital_services").insert({
        hospital_id: input.hospitalId,
        service_code: input.serviceCode,
        service_name: input.serviceName,
        category: input.category,
        price: input.price,
        is_active: input.isActive,
      });

      if (error) throw new Error(error.message);
    }

    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: adminRole,
      action: "WRITE",
      justification: `Saved service tariff '${input.serviceName}' @ ₦${input.price}`,
    });

    return { success: true };
  });

/** Updates diagnostic lab test prices or availability in the hospital catalog */
export const updateHospitalLabTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      hospitalId: string;
      testId: string;
      price: number;
      isAvailable: boolean;
    }) => {
      if (!input.hospitalId || !input.testId) throw new Error("Hospital ID and Test ID required.");
      if (input.price < 0) throw new Error("Price cannot be negative.");
      return {
        hospitalId: input.hospitalId,
        testId: input.testId,
        price: input.price,
        isAvailable: input.isAvailable,
      };
    },
  )
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context;
    const adminRole = await assertHospitalAdmin(supabase, userId, input.hospitalId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("hospital_lab_tests")
      .update({
        price: input.price,
        is_available: input.isAvailable,
      })
      .eq("id", input.testId)
      .eq("hospital_id", input.hospitalId);

    if (error) throw new Error(error.message);

    await writeAuditEntry(supabase, {
      hospital_id: input.hospitalId,
      accessor_id: userId,
      accessor_role: adminRole,
      action: "WRITE",
      justification: `Updated hospital lab test #${input.testId.slice(0, 8)} tariff to ₦${input.price}`,
    });

    return { success: true };
  });
