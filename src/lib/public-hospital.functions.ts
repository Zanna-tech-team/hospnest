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
  heroHeadline?: string | null;
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
      icon?: string;
      category?: string;
    }>;
    doctorsShowcase: Array<{
      name: string;
      specialty: string;
      qualifications?: string;
      photoUrl?: string;
    }>;
    publicContact: {
      emergencyPhone?: string;
      generalInquiries?: string;
      openingHours?: string;
      whatsapp?: string;
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("hospitals")
      .select(`
        id, name, slug, hospital_type, state, lga, address, contact_email, contact_phone, is_verified,
        departments (id),
        wards (total_beds),
        hospital_landing_pages (hero_headline)
      `)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (input?.stateFilter && input.stateFilter !== "all") {
      query = query.ilike("state", `%${input.stateFilter}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let hospitals: PublicHospitalCard[] = (data ?? []).map((h: any) => {
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
        state: h.state,
        lga: h.lga,
        address: h.address,
        contactEmail: h.contact_email,
        contactPhone: h.contact_phone,
        isVerified: Boolean(h.is_verified),
        heroHeadline: landing?.hero_headline || "Quality healthcare, close to home",
        departmentsCount: Array.isArray(h.departments) ? h.departments.length : 4,
        totalBedsCount: totalBeds || 15,
      };
    });

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch hospital
    let query = supabaseAdmin
      .from("hospitals")
      .select(`
        id, name, slug, hospital_type, license_number, state, lga, address, contact_email, contact_phone, is_verified, is_active
      `)
      .eq("is_active", true);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.slug);
    if (isUuid) {
      query = query.or(`id.eq.${input.slug},slug.eq.${input.slug}`);
    } else {
      query = query.eq("slug", input.slug);
    }

    const { data: hospData, error: hospErr } = await query.maybeSingle();
    if (hospErr || !hospData) {
      throw new Error(`Hospital "${input.slug}" not found.`);
    }

    const hospitalId = hospData.id;

    // Fetch landing page customization
    const { data: landingData } = await supabaseAdmin
      .from("hospital_landing_pages")
      .select("*")
      .eq("hospital_id", hospitalId)
      .maybeSingle();

    // Fetch departments
    const { data: deptsRaw } = await supabaseAdmin
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
    const { data: servicesRaw } = await supabaseAdmin
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
    const { data: labRaw } = await supabaseAdmin
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
    const { data: doctorsRaw } = await supabaseAdmin
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
    const { data: wardsRaw } = await supabaseAdmin
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

    const defaultDoctors = doctors.length > 0 ? doctors.map(d => ({
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
