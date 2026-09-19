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
      lga?: string | undefined;
      address?: string | undefined;
      contactEmail?: string | undefined;
      contactPhone?: string | undefined;
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

    // Auto-initialize published custom landing page
    await supabaseAdmin.from("hospital_landing_pages").insert({
      hospital_id: hospital.id,
      hero_headline: `Welcome to ${data.name}`,
      hero_subheadline: `Excellence in specialized and primary healthcare in ${data.state}, Nigeria.`,
      about_us: `${data.name} is a licensed healthcare provider committed to clinical excellence, compassionate patient recovery, and cutting-edge diagnostics.`,
      brand_color_primary: "#0d9488",
      brand_color_secondary: "#0284c7",
      is_published: true,
      public_contact: {
        emergencyPhone: data.contactPhone || "+234 800 000 9999",
        generalInquiries: data.contactEmail || "info@hospital.ng",
        openingHours: "Open 24 Hours / 7 Days",
      },
    }).select().maybeSingle();

    // Auto-initialize default ward with beds
    await supabaseAdmin.from("wards").insert({
      hospital_id: hospital.id,
      name: "Main Inpatient Ward",
      type: "general",
      floor_location: "Ground Floor",
      gender_restriction: "mixed",
      total_beds: 20,
      is_active: true,
    }).select().maybeSingle();

    return { hospitalId: hospital.id as string, name: hospital.name as string, slug };
  });

export type QuickOnboardInput = {
  name: string;
  hospitalType: "government" | "private";
  category: "general" | "specialist" | "primary" | "private_clinic";
  licenseNumber: string;
  state: string;
  lga?: string | undefined;
  address?: string | undefined;
  contactEmail?: string | undefined;
  contactPhone?: string | undefined;
  adminFullName: string;
  consultationFee: number;
  specialistFee?: number | undefined;
  slotDurationMinutes?: number | undefined;
  openingHours?: string | undefined;
  emergencyAvailable?: boolean | undefined;
  selectedDepartmentCodes?: string[] | undefined;
};

const ALL_DEPARTMENT_PRESETS: Record<string, { name: string; code: string }> = {
  OPD: { name: "General Outpatient (GOPD)", code: "OPD" },
  PED: { name: "Pediatrics & Child Health", code: "PED" },
  "O&G": { name: "Obstetrics & Gynaecology (Maternity)", code: "O&G" },
  SURG: { name: "General Surgery & Theater", code: "SURG" },
  ER: { name: "Accident & Emergency (A&E)", code: "ER" },
  LAB: { name: "Diagnostic Laboratory", code: "LAB" },
  PHARM: { name: "Pharmacy & Dispensary", code: "PHARM" },
  RAD: { name: "Radiology & Ultrasound Imaging", code: "RAD" },
};

/**
 * Fast-track single-step Hospital Onboarding.
 * Creates the facility, configures tariffs, departments, wards, admin access,
 * and launches the public online booking portal instantly.
 */
export const quickOnboardHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: QuickOnboardInput) => {
    const name = String(input?.name ?? "").trim();
    if (name.length < 3) throw new Error("Hospital name must be at least 3 characters.");
    const licenseNumber = String(input?.licenseNumber ?? "").trim();
    if (licenseNumber.length < 2) throw new Error("Facility CAC or Ministry of Health license is required.");
    const state = String(input?.state ?? "").trim();
    if (!state) throw new Error("Please select the state of operation.");
    const adminFullName = String(input?.adminFullName ?? "").trim();
    if (adminFullName.length < 3) throw new Error("Administrator full name is required.");
    const consultationFee = Number(input?.consultationFee || 0);

    return {
      name,
      hospitalType: input?.hospitalType === "government" ? "government" : "private",
      category: input?.category || "general",
      licenseNumber,
      state,
      lga: input?.lga?.trim() || null,
      address: input?.address?.trim() || null,
      contactEmail: input?.contactEmail?.trim() || null,
      contactPhone: input?.contactPhone?.trim() || null,
      adminFullName,
      consultationFee: consultationFee >= 0 ? consultationFee : 3000,
      specialistFee: Number(input?.specialistFee || 7500),
      slotDurationMinutes: Number(input?.slotDurationMinutes || 30),
      openingHours: input?.openingHours?.trim() || "Open 24 Hours / 7 Days",
      emergencyAvailable: input?.emergencyAvailable !== false,
      selectedDepartmentCodes: input?.selectedDepartmentCodes && input.selectedDepartmentCodes.length > 0
        ? input.selectedDepartmentCodes
        : ["OPD", "PED", "O&G", "SURG", "ER", "LAB", "PHARM", "RAD"],
    };
  })
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check license collision
    const { data: licenceClash } = await supabaseAdmin
      .from("hospitals")
      .select("id, name")
      .eq("license_number", data.licenseNumber)
      .maybeSingle();

    if (licenceClash) {
      throw new Error(
        `Facility license "${data.licenseNumber}" is already registered on HospNest for "${licenceClash.name}". Please use a unique registration code.`,
      );
    }

    // 2. Generate slug
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

    // 3. Create Hospital Record (verified & active)
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
        is_active: true,
        is_verified: true,
      })
      .select("id, name, slug")
      .single();

    if (hospitalError) throw new Error(hospitalError.message);

    // 4. Assign Hospital Admin Role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      hospital_id: hospital.id,
      role: "hospital_admin",
      is_active: true,
    });

    if (roleError) {
      console.warn("User role assignment warning:", roleError);
    }

    // 5. Create Staff Record
    await supabaseAdmin.from("staff").insert({
      user_id: userId,
      hospital_id: hospital.id,
      full_name: data.adminFullName,
      staff_id_code: "ADM-001",
      phone: data.contactPhone,
      is_active: true,
    });

    // 6. Create Clinical Departments
    const deptRows = data.selectedDepartmentCodes
      .map((code) => ALL_DEPARTMENT_PRESETS[code] || { name: code, code })
      .map((d) => ({
        hospital_id: hospital.id,
        name: d.name,
        code: d.code,
      }));

    if (deptRows.length > 0) {
      await supabaseAdmin.from("departments").insert(deptRows);
    }

    // 7. Create Standard Consultation Tariffs
    const tariffsToInsert = [
      {
        hospital_id: hospital.id,
        service_name: "General Outpatient Consultation (GP)",
        service_code: "SRV-CONS-GP",
        category: "Consultation",
        price: data.consultationFee,
        is_active: true,
      },
      {
        hospital_id: hospital.id,
        service_name: "Specialist / Consultant Review",
        service_code: "SRV-CONS-SPEC",
        category: "Consultation",
        price: data.specialistFee,
        is_active: true,
      },
      {
        hospital_id: hospital.id,
        service_name: "Emergency Triage & Resuscitation",
        service_code: "SRV-EMERG-RESUS",
        category: "Emergency",
        price: 5000,
        is_active: true,
      },
    ];

    try {
      await supabaseAdmin.from("hospital_tariffs").insert(tariffsToInsert);
    } catch (tariffErr) {
      console.warn("Tariff creation notice:", tariffErr);
    }

    // 8. Create Published Landing Page
    await supabaseAdmin.from("hospital_landing_pages").insert({
      hospital_id: hospital.id,
      hero_headline: `Welcome to ${data.name}`,
      hero_subheadline: `Excellence in specialized and primary healthcare in ${data.state}, Nigeria.`,
      about_us: `${data.name} is a verified healthcare provider committed to clinical quality, compassionate patient care, and modern diagnostics.`,
      brand_color_primary: "#0d9488",
      brand_color_secondary: "#0284c7",
      is_published: true,
      public_contact: {
        emergencyPhone: data.contactPhone || "+234 800 000 9999",
        generalInquiries: data.contactEmail || "info@hospital.ng",
        openingHours: data.openingHours,
      },
    }).select().maybeSingle();

    // 9. Create Default Inpatient Ward
    await supabaseAdmin.from("wards").insert({
      hospital_id: hospital.id,
      name: "Main Clinical Ward",
      type: "general",
      floor_location: "Ground Floor",
      gender_restriction: "mixed",
      total_beds: 20,
      is_active: true,
    }).select().maybeSingle();

    // 10. Create Hospital Settings
    try {
      await supabaseAdmin.from("hospital_settings").insert({
        hospital_id: hospital.id,
        enable_online_booking: true,
        default_slot_duration_minutes: data.slotDurationMinutes,
        allow_walk_in: true,
        require_nin_for_booking: false,
        emergency_24_7: data.emergencyAvailable,
        currency_code: "NGN",
      });
    } catch (settErr) {
      console.warn("Settings creation notice:", settErr);
    }

    return {
      hospitalId: hospital.id as string,
      name: hospital.name as string,
      slug,
      bookingUrl: `/hospitals/${slug}`,
    };
  });

