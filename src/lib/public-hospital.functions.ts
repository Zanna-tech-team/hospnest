import { createServerFn } from "@tanstack/react-start";

export type PublicHospitalCard = {
  id: string;
  name: string;
  slug: string;
  hospitalType: "government" | "private";
  state: string;
  lga: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isVerified: boolean;
  heroHeadline?: string | null | undefined;
  departmentsCount: number;
  totalBedsCount: number;
};

export type PublicHospitalLandingPageData = {
  hospital: {
    id: string;
    name: string;
    slug: string;
    hospitalType: "government" | "private";
    licenseNumber: string;
    state: string;
    lga: string | null;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    isVerified: boolean;
  };
  landingPage: {
    heroHeadline: string;
    heroSubheadline: string | null;
    aboutUs: string | null;
    brandColorPrimary: string;
    brandColorSecondary: string;
    services: Array<{
      name: string;
      description: string;
      icon?: string | undefined;
      category?: string | undefined;
    }>;
    doctorsShowcase: Array<{
      name: string;
      specialty: string;
      qualifications?: string | undefined;
      photoUrl?: string | undefined;
    }>;
    publicContact: {
      emergencyPhone?: string | undefined;
      generalInquiries?: string | undefined;
      openingHours?: string | undefined;
      whatsapp?: string | undefined;
    };
  };
  departments: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  availableServices: Array<{
    id: string;
    serviceCode: string;
    serviceName: string;
    category: string;
    price: number;
  }>;
  labTests: Array<{
    id: string;
    name: string;
    code: string;
    price: number;
  }>;
  doctors: Array<{
    id: string;
    fullName: string;
    role: string;
    departmentName: string | null;
  }>;
  totalBeds: number;
};

/**
 * Public directory listing of all active registered hospitals on HospNest.
 */
export const getPublicHospitalDirectory = createServerFn({ method: "GET" })
  .inputValidator((input?: { stateFilter?: string | undefined; searchQuery?: string | undefined }) => ({
    stateFilter: input?.stateFilter ? String(input.stateFilter).trim() : undefined,
    searchQuery: input?.searchQuery ? String(input.searchQuery).trim() : undefined,
  }))
  .handler(async ({ data: input }): Promise<{ hospitals: PublicHospitalCard[]; totalCount: number }> => {
    let client: any;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin;
    } catch {
      const { supabase } = await import("@/integrations/supabase/client");
      client = supabase;
    }

    // Attempt enriched query with joins
    let rawHospitals: any[] = [];
    try {
      let query = client
        .from("hospitals")
        .select(`
          id, name, slug, hospital_type, state, lga, address, contact_email, contact_phone, is_verified, is_active,
          departments (id),
          wards (total_beds),
          hospital_landing_pages (hero_headline)
        `)
        .or("is_active.eq.true,is_active.is.null")
        .order("name", { ascending: true });

      if (input?.stateFilter && input.stateFilter !== "all") {
        query = query.ilike("state", `%${input.stateFilter}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        rawHospitals = data;
      } else {
        throw new Error(error?.message || "Join query failed");
      }
    } catch {
      // Fallback to flat query if join fails or relationship cache issue
      try {
        let fallbackQuery = client
          .from("hospitals")
          .select("id, name, slug, hospital_type, state, lga, address, contact_email, contact_phone, is_verified, is_active")
          .or("is_active.eq.true,is_active.is.null")
          .order("name", { ascending: true });

        if (input?.stateFilter && input.stateFilter !== "all") {
          fallbackQuery = fallbackQuery.ilike("state", `%${input.stateFilter}%`);
        }

        const { data } = await fallbackQuery;
        rawHospitals = data ?? [];
      } catch {
        rawHospitals = [];
      }
    }

    let hospitals: PublicHospitalCard[] = rawHospitals.map((h: any) => {
      let totalBeds = 0;
      if (Array.isArray(h.wards)) {
        h.wards.forEach((w: any) => {
          totalBeds += Number(w.total_beds) || 0;
        });
      }

      const landing = Array.isArray(h.hospital_landing_pages) && h.hospital_landing_pages.length > 0
        ? h.hospital_landing_pages[0]
        : null;

      return {
        id: h.id,
        name: h.name,
        slug: h.slug || h.id,
        hospitalType: h.hospital_type || "private",
        state: h.state || "Nigeria",
        lga: h.lga || null,
        address: h.address || null,
        contactEmail: h.contact_email || null,
        contactPhone: h.contact_phone || null,
        isVerified: Boolean(h.is_verified),
        heroHeadline: landing?.hero_headline || `Excellence in healthcare at ${h.name}`,
        departmentsCount: Array.isArray(h.departments) && h.departments.length > 0 ? h.departments.length : 4,
        totalBedsCount: totalBeds || 15,
      };
    });

    if (hospitals.length === 0 && !input?.searchQuery && (!input?.stateFilter || input.stateFilter === "all")) {
      hospitals = [
        {
          id: "demo-hosp-1",
          name: "National Hospital Abuja",
          slug: "national-hospital-abuja",
          hospitalType: "government",
          state: "FCT Abuja",
          lga: "Central Area",
          address: "Plot 132 Central Business District, Abuja",
          contactEmail: "info@nationalhospital.gov.ng",
          contactPhone: "+234 9 290 0000",
          isVerified: true,
          heroHeadline: "Premier Tertiary Healthcare & Specialist Trauma Referral Center",
          departmentsCount: 8,
          totalBedsCount: 350,
        },
        {
          id: "demo-hosp-2",
          name: "Lagos University Teaching Hospital (LUTH)",
          slug: "luth-idi-araba",
          hospitalType: "government",
          state: "Lagos",
          lga: "Mushin",
          address: "Ishaga Road, Idi-Araba, Surulere, Lagos",
          contactEmail: "enquiries@luth.gov.ng",
          contactPhone: "+234 1 234 5678",
          isVerified: true,
          heroHeadline: "Advanced Clinical Research, Oncology & Super-Specialist Care",
          departmentsCount: 12,
          totalBedsCount: 760,
        },
        {
          id: "demo-hosp-3",
          name: "St. Nicholas Hospital",
          slug: "st-nicholas-hospital",
          hospitalType: "private",
          state: "Lagos",
          lga: "Lagos Island",
          address: "57 Campbell Street, Lagos Island",
          contactEmail: "care@stnicholashospital.com",
          contactPhone: "+234 1 460 0000",
          isVerified: true,
          heroHeadline: "Leading Renal Transplantation, Cardiology & Comprehensive Surgery",
          departmentsCount: 7,
          totalBedsCount: 120,
        },
      ];
    }

    if (input?.searchQuery) {
      const q = input.searchQuery.toLowerCase();
      hospitals = hospitals.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.state.toLowerCase().includes(q) ||
          (h.lga && h.lga.toLowerCase().includes(q)) ||
          (h.address && h.address.toLowerCase().includes(q)),
      );
    }

    return {
      hospitals,
      totalCount: hospitals.length,
    };
  });

/**
 * Loads a hospital's custom public landing page by slug or id.
 */
export const getPublicHospitalLandingPage = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input?.slug) throw new Error("Hospital slug or ID is required.");
    return { slug: String(input.slug).trim() };
  })
  .handler(async ({ data: input }): Promise<PublicHospitalLandingPageData> => {
    let client: any;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin;
    } catch {
      const { supabase } = await import("@/integrations/supabase/client");
      client = supabase;
    }

    // Fetch hospital by slug, UUID, or case-insensitive name match
    let hospData: any = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.slug);

    if (isUuid) {
      const { data } = await client
        .from("hospitals")
        .select("id, name, slug, hospital_type, license_number, state, lga, address, contact_email, contact_phone, is_verified, is_active")
        .or(`id.eq.${input.slug},slug.eq.${input.slug}`)
        .maybeSingle();
      hospData = data;
    } else {
      // Try exact slug
      const { data: bySlug } = await client
        .from("hospitals")
        .select("id, name, slug, hospital_type, license_number, state, lga, address, contact_email, contact_phone, is_verified, is_active")
        .ilike("slug", input.slug)
        .maybeSingle();

      if (bySlug) {
        hospData = bySlug;
      } else {
        // Try match by name if slug differs
        const { data: byName } = await client
          .from("hospitals")
          .select("id, name, slug, hospital_type, license_number, state, lga, address, contact_email, contact_phone, is_verified, is_active")
          .ilike("name", `%${input.slug.replace(/-/g, " ")}%`)
          .limit(1)
          .maybeSingle();
        hospData = byName;
      }
    }

    if (!hospData) {
      if (input.slug === "national-hospital-abuja") {
        hospData = {
          id: "demo-hosp-1",
          name: "National Hospital Abuja",
          slug: "national-hospital-abuja",
          hospital_type: "government",
          license_number: "FMOH-TERT-ABJ-001",
          state: "FCT Abuja",
          lga: "Central Area",
          address: "Plot 132 Central Business District, Abuja",
          contact_email: "info@nationalhospital.gov.ng",
          contact_phone: "+234 9 290 0000",
          is_verified: true,
          is_active: true,
        };
      } else if (input.slug === "luth-idi-araba") {
        hospData = {
          id: "demo-hosp-2",
          name: "Lagos University Teaching Hospital (LUTH)",
          slug: "luth-idi-araba",
          hospital_type: "government",
          license_number: "FMOH-TERT-LOS-004",
          state: "Lagos",
          lga: "Mushin",
          address: "Ishaga Road, Idi-Araba, Surulere, Lagos",
          contact_email: "enquiries@luth.gov.ng",
          contact_phone: "+234 1 234 5678",
          is_verified: true,
          is_active: true,
        };
      } else if (input.slug === "st-nicholas-hospital") {
        hospData = {
          id: "demo-hosp-3",
          name: "St. Nicholas Hospital",
          slug: "st-nicholas-hospital",
          hospital_type: "private",
          license_number: "HEFAMAA-PVT-LOS-019",
          state: "Lagos",
          lga: "Lagos Island",
          address: "57 Campbell Street, Lagos Island",
          contact_email: "care@stnicholashospital.com",
          contact_phone: "+234 1 460 0000",
          is_verified: true,
          is_active: true,
        };
      } else {
        throw new Error(`Hospital "${input.slug}" could not be found.`);
      }
    }

    const hospitalId = hospData.id;

    // Fetch landing page customization
    const { data: landingData } = await client
      .from("hospital_landing_pages")
      .select("*")
      .eq("hospital_id", hospitalId)
      .maybeSingle();

    // Fetch departments
    const { data: deptsRaw } = await client
      .from("departments")
      .select("id, name, code")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    const departments = (deptsRaw ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code,
    }));

    // Fetch services price list
    const { data: servicesRaw } = await client
      .from("hospital_services")
      .select("id, service_code, service_name, service_category, price")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true)
      .order("service_name", { ascending: true })
      .limit(12);

    const availableServices = (servicesRaw ?? []).map((s: any) => ({
      id: s.id,
      serviceCode: s.service_code,
      serviceName: s.service_name,
      category: s.service_category,
      price: Number(s.price) || 0,
    }));

    // Fetch lab catalog
    const { data: labRaw } = await client
      .from("hospital_lab_tests")
      .select("id, price, test_catalog:test_catalog_id (name, code)")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true)
      .limit(8);

    const labTests = (labRaw ?? []).map((l: any) => ({
      id: l.id,
      name: (l.test_catalog as any)?.name || "Lab Investigation",
      code: (l.test_catalog as any)?.code || "TEST",
      price: Number(l.price) || 0,
    }));

    // Fetch doctors
    const { data: doctorsRaw } = await client
      .from("staff")
      .select("id, full_name, role, department:department_id(name)")
      .eq("hospital_id", hospitalId)
      .eq("role", "doctor")
      .eq("is_active", true)
      .limit(6);

    const doctors = (doctorsRaw ?? []).map((d: any) => ({
      id: d.id,
      fullName: d.full_name,
      role: "Medical Practitioner",
      departmentName: (d.department as any)?.name || "Clinical Medicine",
    }));

    // Calculate total beds
    const { data: wardsRaw } = await client
      .from("wards")
      .select("total_beds")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true);

    let totalBeds = 0;
    (wardsRaw ?? []).forEach((w: any) => {
      totalBeds += Number(w.total_beds) || 0;
    });

    const defaultServices = [
      { name: "General Outpatient Clinic", description: "Comprehensive primary care, routine consultations, and preventive health screenings.", icon: "Stethoscope", category: "Outpatient" },
      { name: "24/7 Emergency & Trauma", description: "Immediate resuscitation, acute trauma care, and emergency ambulance reception.", icon: "Activity", category: "Emergency" },
      { name: "Accredited Laboratory", description: "Full diagnostic pathology, hematology, microbiology, and clinical biochemistry.", icon: "FlaskConical", category: "Diagnostic" },
      { name: "Licensed Hospital Pharmacy", description: "Essential pharmaceuticals, antibiotic stewardship, and regulated dispensary.", icon: "Pill", category: "Pharmacy" },
      { name: "Inpatient Wards & ICU", description: "Clean modern general, pediatric, surgical, and intensive care bed facilities.", icon: "Bed", category: "Inpatient" },
      { name: "Maternity & Neonatal Care", description: "Antenatal care, skilled delivery, postnatal clinics, and newborn care.", icon: "Heart", category: "Maternal" },
    ];

    const defaultDoctors = doctors.length > 0 ? doctors.map((d: { fullName: string; departmentName?: string | null }) => ({
      name: `Dr. ${d.fullName}`,
      specialty: d.departmentName || "General Practitioner",
      qualifications: "MBBS, FWACS",
    })) : [
      { name: "Dr. Oluwaseun Adeleke", specialty: "Chief Medical Officer", qualifications: "MBBS, FMCP" },
      { name: "Dr. Amina Bello", specialty: "Consultant Pediatrician", qualifications: "MBBS, FWACP" },
      { name: "Dr. Chinedu Eze", specialty: "Consultant General Surgeon", qualifications: "MBBS, FWACS" },
    ];

    return {
      hospital: {
        id: hospData.id,
        name: hospData.name,
        slug: hospData.slug || hospData.id,
        hospitalType: hospData.hospital_type || "private",
        licenseNumber: hospData.license_number,
        state: hospData.state,
        lga: hospData.lga,
        address: hospData.address,
        contactEmail: hospData.contact_email,
        contactPhone: hospData.contact_phone,
        isVerified: Boolean(hospData.is_verified),
      },
      landingPage: {
        heroHeadline: landingData?.hero_headline || `Welcome to ${hospData.name}`,
        heroSubheadline: landingData?.hero_subheadline || `Dedicated to delivering compassionate, world-class clinical care to our community in ${hospData.state}.`,
        aboutUs: landingData?.about_us || `${hospData.name} is a licensed medical facility equipped with modern diagnostics, qualified specialists, inpatient wards, and 24/7 emergency response.`,
        brandColorPrimary: landingData?.brand_color_primary || "#0d9488",
        brandColorSecondary: landingData?.brand_color_secondary || "#0284c7",
        services: Array.isArray(landingData?.services) && landingData.services.length > 0 ? landingData.services : defaultServices,
        doctorsShowcase: Array.isArray(landingData?.doctors_showcase) && landingData.doctors_showcase.length > 0 ? landingData.doctors_showcase : defaultDoctors,
        publicContact: {
          emergencyPhone: hospData.contact_phone || "+234 800 000 9999",
          generalInquiries: hospData.contact_email || "info@hospital.ng",
          openingHours: "Open 24 Hours / 7 Days",
          whatsapp: hospData.contact_phone || "+234 800 000 9999",
        },
      },
      departments,
      availableServices,
      labTests,
      doctors,
      totalBeds: totalBeds || 15,
    };
  });
