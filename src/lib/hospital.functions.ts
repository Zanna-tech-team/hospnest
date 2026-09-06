import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEFAULT_DEPARTMENTS = [
  { name: "General Outpatient", code: "GOPD" },
  { name: "Emergency", code: "ER" },
  { name: "Laboratory", code: "LAB" },
  { name: "Pharmacy", code: "PHARM" },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Hospitals the signed-in person already belongs to, so setup can be skipped. */
export const getMyHospitals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role, hospital_id, hospitals(id, name, is_verified)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) throw new Error(error.message);

    return {
      hospitals: (data ?? [])
        .filter((r: any) => r.hospital_id && r.role !== "patient")
        .map((r: any) => ({
          id: r.hospital_id as string,
          name: (r.hospitals?.name as string) ?? "Hospital",
          role: r.role as string,
          isVerified: Boolean(r.hospitals?.is_verified),
        })),
    };
  });

/**
 * Registers a brand-new hospital and makes the caller its administrator.
 * The caller has no role yet, so RLS cannot authorise these inserts — this runs
 * privileged, and only ever writes rows tied back to the caller's own user id.
 */
export const createHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      name: string;
      hospitalType: "government" | "private";
      licenseNumber: string;
      state: string;
      lga?: string;
      address?: string;
      contactEmail?: string;
      contactPhone?: string;
      adminFullName: string;
    }) => {
      const name = String(input?.name ?? "").trim();
      if (name.length < 3) throw new Error("Enter the hospital's full name.");
      const licenseNumber = String(input?.licenseNumber ?? "").trim();
      if (licenseNumber.length < 3) throw new Error("Enter the facility licence number.");
      const state = String(input?.state ?? "").trim();
      if (!state) throw new Error("Choose the state the hospital operates in.");
      const adminFullName = String(input?.adminFullName ?? "").trim();
      if (adminFullName.length < 3) throw new Error("Enter your full name.");
      const hospitalType = input?.hospitalType === "government" ? "government" : "private";

      return {
        name,
        hospitalType: hospitalType as "government" | "private",
        licenseNumber,
        state,
        lga: input?.lga?.trim() || null,
        address: input?.address?.trim() || null,
        contactEmail: input?.contactEmail?.trim() || null,
        contactPhone: input?.contactPhone?.trim() || null,
        adminFullName,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: licenceClash } = await supabaseAdmin
      .from("hospitals")
      .select("id")
      .eq("license_number", data.licenseNumber)
      .maybeSingle();

    if (licenceClash) {
      throw new Error(
        "A hospital with that licence number is already on HospNest. Ask its administrator to invite you.",
      );
    }

    const base = slugify(data.name) || "hospital";
    let slug = base;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const { data: taken } = await supabaseAdmin
        .from("hospitals")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!taken) break;
      slug = `${base}-${attempt + 2}`;
    }

    const { data: hospital, error: hospitalError } = await supabaseAdmin
      .from("hospitals")
      .insert({
        name: data.name,
        slug,
        hospital_type: data.hospitalType,
        license_number: data.licenseNumber,
        state: data.state,
        lga: data.lga,
        address: data.address,
        contact_email: data.contactEmail ?? (claims['email'] as string | undefined) ?? null,
        contact_phone: data.contactPhone,
      })
      .select("id, name, slug")
      .single();

    if (hospitalError) throw new Error(hospitalError.message);

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      hospital_id: hospital.id,
      role: "hospital_admin",
    });

    if (roleError) {
      await supabaseAdmin.from("hospitals").delete().eq("id", hospital.id);
      throw new Error(roleError.message);
    }

    await supabaseAdmin.from("departments").insert(
      DEFAULT_DEPARTMENTS.map((d) => ({
        hospital_id: hospital.id,
        name: d.name,
        code: d.code,
      })),
    );

    await supabaseAdmin.from("staff").insert({
      user_id: userId,
      hospital_id: hospital.id,
      full_name: data.adminFullName,
      staff_id_code: "ADM-001",
      phone: data.contactPhone,
    });

    return { hospitalId: hospital.id as string, name: hospital.name as string, slug };
  });
