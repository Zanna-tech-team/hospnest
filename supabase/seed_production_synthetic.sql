-- ============================================================================
-- HOSPNEST CLINICAL PLATFORM
-- PRODUCTION SYNTHETIC DATA SEED SCRIPT (PostgreSQL 14+ / Supabase)
-- 
-- Dataset Specifications:
-- 1. 2 Healthcare Facilities (National Hospital Abuja & Cedarcrest Lagos)
-- 2. 12 Clinical Departments & 8 Inpatient Wards with ~150 Beds
-- 3. 50 Staff Members Across 7 Operational Roles with Duty Shifts
-- 4. 500 Unique Patients with Verified 11-digit NINs & Demographic Variance
-- 5. 500+ Complete Clinical Journeys (Appointments, Vitals, Encounters, Labs, Rx, Billing)
-- 6. Tamper-Evident SHA-256 Audit Trail Simulation (Break-Glass Overrides & Redaction Logs)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SEED INSTITUTIONS (TENANTS)
-- ============================================================================

-- Fixed UUIDs for clean deterministic foreign key references
DO $$
DECLARE
  hosp_abuja_id CONSTANT UUID := '11111111-1111-4111-8111-111111111111';
  hosp_lagos_id CONSTANT UUID := '22222222-2222-4222-8222-222222222222';
BEGIN

  -- 1.1 Hospitals
  INSERT INTO public.hospitals (
    id, name, slug, hospital_type, license_number, state, lga, address, contact_email, contact_phone, is_verified, is_active, subscription_tier
  ) VALUES 
  (
    hosp_abuja_id,
    'National Hospital Abuja',
    'national-hospital-abuja',
    'government',
    'MOH/FCT/2004/001',
    'FCT — Abuja',
    'Abuja Municipal',
    'Plot 132 Central Business District, Garki, Abuja',
    'info@nationalhospital.gov.ng',
    '+234 9 290 0001',
    TRUE,
    TRUE,
    'enterprise'
  ),
  (
    hosp_lagos_id,
    'Cedarcrest Memorial Hospital Lagos',
    'cedarcrest-lagos',
    'private',
    'HEFAMAA/LG/2018/492',
    'Lagos',
    'Eti-Osa',
    'Plot 14 Bishop Aboyade Cole Street, Victoria Island, Lagos',
    'contact@cedarcrestlagos.com',
    '+234 1 270 4400',
    TRUE,
    TRUE,
    'enterprise'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    is_verified = TRUE,
    is_active = TRUE;

  -- 1.2 Hospital Landing Pages
  INSERT INTO public.hospital_landing_pages (
    hospital_id, hero_headline, hero_subheadline, about_us, brand_color_primary, brand_color_secondary, services, doctors_showcase, public_contact, is_published
  ) VALUES
  (
    hosp_abuja_id,
    'Nigeria’s Premier Tertiary Care & Trauma Center',
    'Comprehensive multi-disciplinary specialist care, 24/7 emergency response, and advanced diagnostics.',
    'National Hospital Abuja provides world-class tertiary healthcare services to patients across West Africa, equipped with modern ICUs, specialized surgical suites, and dedicated maternal-fetal units.',
    '#0f766e',
    '#14b8a6',
    '[
      {"name": "Emergency & Trauma Resuscitation", "description": "24/7 Level-1 Trauma response unit with helipad access and dedicated trauma surgeons.", "icon": "AlertCircle"},
      {"name": "Cardiology & Cath Lab", "description": "Diagnostic angiography, cardiac catheterization, echocardiography, and stenting.", "icon": "Heart"},
      {"name": "Maternal & Child Health", "description": "Advanced NICU, high-risk obstetrics, painless labor delivery, and pediatric ICU.", "icon": "Baby"},
      {"name": "General & Laparoscopic Surgery", "description": "Minimally invasive laparoscopic, oncological, and reconstructive surgery.", "icon": "Activity"},
      {"name": "Automated Clinical Pathology", "description": "ISO-certified diagnostic pathology, automated hematology, and viral PCR panels.", "icon": "FlaskConical"}
    ]'::jsonb,
    '[
      {"name": "Prof. Aminu Bello", "role": "Chief Medical Director & Consultant Neurosurgeon", "specialty": "Neurosurgery"},
      {"name": "Dr. Halima Sanusi", "role": "Head of Obstetrics & Gynaecology", "specialty": "Maternal-Fetal Medicine"},
      {"name": "Dr. Obinna Eze", "role": "Lead Consultant Cardiologist", "specialty": "Interventional Cardiology"}
    ]'::jsonb,
    '{"phone": "+234 9 290 0001", "emergency_hotline": "+234 800 000 9999", "email": "emergency@nationalhospital.gov.ng", "visiting_hours": "06:00-07:30, 16:30-18:30"}'::jsonb,
    TRUE
  ),
  (
    hosp_lagos_id,
    'Compassionate Specialist Medicine, Redefined',
    'Leading private quaternary hospital delivering personalized patient-centric clinical excellence in Victoria Island.',
    'Cedarcrest Memorial Hospital Lagos is an ultra-modern private clinical center specializing in surgical oncology, orthopedics, cardiology, and premium executive wellness.',
    '#0284c7',
    '#38bdf8',
    '[
      {"name": "Executive Wellness & Health Screening", "description": "Comprehensive same-day full-body health audit with cardiovascular risk profiling.", "icon": "CheckCircle2"},
      {"name": "Advanced Orthopedic Surgery", "description": "Total hip & knee arthroplasty, arthroscopic joint reconstruction, and sports medicine.", "icon": "Shield"},
      {"name": "In Vitro Fertilization (IVF)", "description": "State-of-the-art reproductive endocrinology and assisted conception technology.", "icon": "HeartHandshake"},
      {"name": "24/7 Acute Medical Emergency", "description": "Rapid response intensive care triage with dedicated cardiac telemetry beds.", "icon": "Clock"}
    ]'::jsonb,
    '[
      {"name": "Dr. Adebayo Adeleke", "role": "Medical Director & Consultant Orthopedic Surgeon", "specialty": "Orthopedics & Arthroplasty"},
      {"name": "Dr. Folashade Adeleke", "role": "Consultant Physician & Nephrologist", "specialty": "Internal Medicine"},
      {"name": "Dr. Emeka Nnamdi", "role": "Consultant Pediatrician", "specialty": "Pediatrics"}
    ]'::jsonb,
    '{"phone": "+234 1 270 4400", "emergency_hotline": "+234 800 233 2727", "email": "intake@cedarcrestlagos.com", "visiting_hours": "10:00-12:00, 16:00-19:00"}'::jsonb,
    TRUE
  )
  ON CONFLICT (hospital_id) DO UPDATE SET
    hero_headline = EXCLUDED.hero_headline,
    is_published = TRUE;

END $$;

-- ============================================================================
-- 2. SEED DEPARTMENTS, WARDS & BEDS
-- ============================================================================

DO $$
DECLARE
  hosp_a CONSTANT UUID := '11111111-1111-4111-8111-111111111111';
  hosp_b CONSTANT UUID := '22222222-2222-4222-8222-222222222222';
  d_rec RECORD;
  w_rec RECORD;
  ward_uuid UUID;
  bed_idx INT;
  bed_types CONSTANT public.bed_type[] := ARRAY['general', 'icu', 'er', 'maternity', 'pediatric']::public.bed_type[];
  bed_statuses CONSTANT public.bed_status[] := ARRAY['available', 'occupied', 'available', 'reserved', 'maintenance', 'available']::public.bed_status[];
BEGIN

  -- 2.1 Departments (6 per hospital)
  INSERT INTO public.departments (hospital_id, name, code, floor) VALUES
    -- National Hospital Abuja
    (hosp_a, 'General Outpatient Department (GOPD)', 'GOPD', 'Ground Floor Wing A'),
    (hosp_a, 'Accident, Emergency & Trauma', 'ER', 'Ground Floor Trauma Block'),
    (hosp_a, 'Internal Medicine Clinic', 'MED', '1st Floor West'),
    (hosp_a, 'Obstetrics & Gynaecology (O&G)', 'OBGYN', '2nd Floor Maternal Block'),
    (hosp_a, 'Pediatrics & Child Health', 'PED', '1st Floor East'),
    (hosp_a, 'General & Specialist Surgery', 'SURG', '3rd Floor Surgical Suite'),
    -- Cedarcrest Lagos
    (hosp_b, 'General Outpatient Clinic', 'GOPD', 'Ground Floor Reception Block'),
    (hosp_b, 'Emergency & Acute Care', 'ER', 'Ground Floor Ambulance Bay'),
    (hosp_b, 'Internal Medicine & Cardiology', 'MED', '2nd Floor Specialist Suites'),
    (hosp_b, 'Women’s Health & Maternity', 'OBGYN', '1st Floor Women’s Wing'),
    (hosp_b, 'Pediatric Health Center', 'PED', '1st Floor Children’s Wing'),
    (hosp_b, 'Advanced Surgery & Orthopedics', 'SURG', '3rd Floor Modular Operating Theatres')
  ON CONFLICT (hospital_id, code) DO NOTHING;

  -- 2.2 Inpatient Wards (4 per hospital)
  FOR d_rec IN SELECT id, hospital_id FROM public.departments WHERE code IN ('MED', 'SURG', 'OBGYN', 'PED', 'ER') LOOP
    -- Male Ward
    INSERT INTO public.wards (hospital_id, department_id, name, gender_allocation)
    VALUES (d_rec.hospital_id, d_rec.id, 'Male Medical & Surgical Ward', 'male')
    ON CONFLICT DO NOTHING;

    -- Female Ward
    INSERT INTO public.wards (hospital_id, department_id, name, gender_allocation)
    VALUES (d_rec.hospital_id, d_rec.id, 'Female Medical & Maternity Ward', 'female')
    ON CONFLICT DO NOTHING;

    -- Pediatric Ward
    INSERT INTO public.wards (hospital_id, department_id, name, gender_allocation)
    VALUES (d_rec.hospital_id, d_rec.id, 'Pediatric Inpatient Unit', 'mixed')
    ON CONFLICT DO NOTHING;

    -- Emergency ICU
    INSERT INTO public.wards (hospital_id, department_id, name, gender_allocation)
    VALUES (d_rec.hospital_id, d_rec.id, 'Intensive Care Unit (ICU / HDU)', 'mixed')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 2.3 Beds Generation (16 beds per ward)
  FOR w_rec IN SELECT id, name FROM public.wards LOOP
    FOR bed_idx IN 1..16 LOOP
      INSERT INTO public.beds (
        ward_id,
        bed_number,
        bed_type,
        status
      ) VALUES (
        w_rec.id,
        CASE 
          WHEN w_rec.name LIKE '%ICU%' THEN 'ICU-BED-' || LPAD(bed_idx::text, 2, '0')
          WHEN w_rec.name LIKE '%Pediatric%' THEN 'PED-BED-' || LPAD(bed_idx::text, 2, '0')
          WHEN w_rec.name LIKE '%Female%' THEN 'FMW-BED-' || LPAD(bed_idx::text, 2, '0')
          ELSE 'MMW-BED-' || LPAD(bed_idx::text, 2, '0')
        END,
        CASE 
          WHEN w_rec.name LIKE '%ICU%' THEN 'icu'::public.bed_type
          WHEN w_rec.name LIKE '%Pediatric%' THEN 'pediatric'::public.bed_type
          WHEN w_rec.name LIKE '%Female%' THEN 'maternity'::public.bed_type
          ELSE 'general'::public.bed_type
        END,
        bed_statuses[1 + (bed_idx % array_length(bed_statuses, 1))]
      )
      ON CONFLICT (ward_id, bed_number) DO NOTHING;
    END LOOP;
  END LOOP;

END $$;

-- ============================================================================
-- 3. SEED 50 CLINICAL & ADMINISTRATIVE STAFF MEMBERS
-- ============================================================================

DO $$
DECLARE
  hosp_a CONSTANT UUID := '11111111-1111-4111-8111-111111111111';
  hosp_b CONSTANT UUID := '22222222-2222-4222-8222-222222222222';
  gopd_a UUID; er_a UUID; med_a UUID; obgyn_a UUID; ped_a UUID; surg_a UUID;
  gopd_b UUID; er_b UUID; med_b UUID; obgyn_b UUID; ped_b UUID; surg_b UUID;
  u_id UUID;
  s_id UUID;
  i INT;
  
  -- Staff Seed Metadata (50 members)
  staff_specs CONSTANT JSONB := '[
    {"name": "Prof. Aminu Bello", "role": "super_admin", "hosp": "a", "spec": "Neurosurgery", "lic": "MDCN/8492/FCT", "code": "NHA-SA-01", "phone": "+2348030010001"},
    {"name": "Dr. Zainab Abubakar", "role": "super_admin", "hosp": "b", "spec": "Healthcare Informatics", "lic": "MDCN/9912/HQ", "code": "HNP-SA-02", "phone": "+2348030010002"},
    {"name": "Dr. Ibrahim Danladi", "role": "hospital_admin", "hosp": "a", "spec": "Hospital Administration", "lic": "MDCN/7123/A", "code": "NHA-ADM-01", "phone": "+2348030010003"},
    {"name": "Hajiya Maryam Yakubu", "role": "hospital_admin", "hosp": "a", "spec": "Clinical Operations", "lic": "MCN/5512/A", "code": "NHA-ADM-02", "phone": "+2348030010004"},
    {"name": "Dr. Adebayo Adeleke", "role": "hospital_admin", "hosp": "b", "spec": "Orthopedic Surgery", "lic": "MDCN/6102/L", "code": "CMH-ADM-01", "phone": "+2348030010005"},
    {"name": "Mrs. Olufunke Williams", "role": "hospital_admin", "hosp": "b", "spec": "Healthcare Operations", "lic": "NMCN/4412/L", "code": "CMH-ADM-02", "phone": "+2348030010006"},
    {"name": "Dr. Halima Sanusi", "role": "doctor", "hosp": "a", "dept": "OBGYN", "spec": "Obstetrics & Gynaecology", "lic": "MDCN/10291", "code": "NHA-DOC-01", "phone": "+2348030010007"},
    {"name": "Dr. Obinna Eze", "role": "doctor", "hosp": "a", "dept": "MED", "spec": "Cardiology", "lic": "MDCN/11244", "code": "NHA-DOC-02", "phone": "+2348030010008"},
    {"name": "Dr. Musa Garba", "role": "doctor", "hosp": "a", "dept": "ER", "spec": "Trauma & Emergency", "lic": "MDCN/12093", "code": "NHA-DOC-03", "phone": "+2348030010009"},
    {"name": "Dr. Fatima Aliyu", "role": "doctor", "hosp": "a", "dept": "PED", "spec": "Pediatrics", "lic": "MDCN/13490", "code": "NHA-DOC-04", "phone": "+2348030010010"},
    {"name": "Dr. Chukwudi Okafor", "role": "doctor", "hosp": "a", "dept": "SURG", "spec": "General Surgery", "lic": "MDCN/14820", "code": "NHA-DOC-05", "phone": "+2348030010011"},
    {"name": "Dr. Aisha Mohammed", "role": "doctor", "hosp": "a", "dept": "GOPD", "spec": "Family Medicine", "lic": "MDCN/15911", "code": "NHA-DOC-06", "phone": "+2348030010012"},
    {"name": "Dr. David Osagie", "role": "doctor", "hosp": "a", "dept": "MED", "spec": "Endocrinology", "lic": "MDCN/16281", "code": "NHA-DOC-07", "phone": "+2348030010013"},
    {"name": "Dr. Folashade Adeleke", "role": "doctor", "hosp": "b", "dept": "MED", "spec": "Nephrology", "lic": "MDCN/20192", "code": "CMH-DOC-01", "phone": "+2348030010014"},
    {"name": "Dr. Emeka Nnamdi", "role": "doctor", "hosp": "b", "dept": "PED", "spec": "Neonatology", "lic": "MDCN/21839", "code": "CMH-DOC-02", "phone": "+2348030010015"},
    {"name": "Dr. Babatunde Balogun", "role": "doctor", "hosp": "b", "dept": "SURG", "spec": "Orthopedic Surgery", "lic": "MDCN/22910", "code": "CMH-DOC-03", "phone": "+2348030010016"},
    {"name": "Dr. Yetunde Oladipo", "role": "doctor", "hosp": "b", "dept": "OBGYN", "spec": "Reproductive Endocrinology", "lic": "MDCN/23118", "code": "CMH-DOC-04", "phone": "+2348030010017"},
    {"name": "Dr. Kalu Okoro", "role": "doctor", "hosp": "b", "dept": "ER", "spec": "Emergency Medicine", "lic": "MDCN/24901", "code": "CMH-DOC-05", "phone": "+2348030010018"},
    {"name": "Dr. Ngozi Anya", "role": "doctor", "hosp": "b", "dept": "GOPD", "spec": "Family Practice", "lic": "MDCN/25102", "code": "CMH-DOC-06", "phone": "+2348030010019"},
    {"name": "Dr. Tunde Fashola", "role": "doctor", "hosp": "b", "dept": "MED", "spec": "Pulmonology", "lic": "MDCN/26401", "code": "CMH-DOC-07", "phone": "+2348030010020"},
    {"name": "Nurse Blessing Okon", "role": "nurse", "hosp": "a", "dept": "ER", "spec": "Triage & Trauma Nursing", "lic": "NMCN/30112", "code": "NHA-NUR-01", "phone": "+2348030010021"},
    {"name": "Nurse Hauwa Umar", "role": "nurse", "hosp": "a", "dept": "MED", "spec": "Critical Care Nursing", "lic": "NMCN/31902", "code": "NHA-NUR-02", "phone": "+2348030010022"},
    {"name": "Nurse Chiamaka Obi", "role": "nurse", "hosp": "a", "dept": "OBGYN", "spec": "Midwifery & Maternal Care", "lic": "NMCN/32481", "code": "NHA-NUR-03", "phone": "+2348030010023"},
    {"name": "Nurse Amina Idris", "role": "nurse", "hosp": "a", "dept": "PED", "spec": "Pediatric Nursing", "lic": "NMCN/33910", "code": "NHA-NUR-04", "phone": "+2348030010024"},
    {"name": "Nurse Samuel Bassey", "role": "nurse", "hosp": "a", "dept": "SURG", "spec": "Perioperative Nursing", "lic": "NMCN/34102", "code": "NHA-NUR-05", "phone": "+2348030010025"},
    {"name": "Nurse Rahila Bako", "role": "nurse", "hosp": "a", "dept": "GOPD", "spec": "Outpatient Triage", "lic": "NMCN/35920", "code": "NHA-NUR-06", "phone": "+2348030010026"},
    {"name": "Nurse Gloria Danjuma", "role": "nurse", "hosp": "a", "dept": "MED", "spec": "Inpatient Ward Nursing", "lic": "NMCN/36111", "code": "NHA-NUR-07", "phone": "+2348030010027"},
    {"name": "Nurse Titilayo Ogunleye", "role": "nurse", "hosp": "b", "dept": "ER", "spec": "Emergency Nursing", "lic": "NMCN/40192", "code": "CMH-NUR-01", "phone": "+2348030010028"},
    {"name": "Nurse Ijeoma Nwosu", "role": "nurse", "hosp": "b", "dept": "OBGYN", "spec": "Certified Nurse-Midwife", "lic": "NMCN/41283", "code": "CMH-NUR-02", "phone": "+2348030010029"},
    {"name": "Nurse Bukola Adeyemi", "role": "nurse", "hosp": "b", "dept": "MED", "spec": "Renal & Dialysis Nursing", "lic": "NMCN/42910", "code": "CMH-NUR-03", "phone": "+2348030010030"},
    {"name": "Nurse Funmilayo Bankole", "role": "nurse", "hosp": "b", "dept": "PED", "spec": "Neonatal Care", "lic": "NMCN/43118", "code": "CMH-NUR-04", "phone": "+2348030010031"},
    {"name": "Nurse Emmanuel Peters", "role": "nurse", "hosp": "b", "dept": "SURG", "spec": "Anesthesia Nursing", "lic": "NMCN/44901", "code": "CMH-NUR-05", "phone": "+2348030010032"},
    {"name": "Nurse Joy Chukwuma", "role": "nurse", "hosp": "b", "dept": "GOPD", "spec": "Clinical Triage", "lic": "NMCN/45201", "code": "CMH-NUR-06", "phone": "+2348030010033"},
    {"name": "Nurse Damilola Jinadu", "role": "nurse", "hosp": "b", "dept": "MED", "spec": "Medical Ward Care", "lic": "NMCN/46829", "code": "CMH-NUR-07", "phone": "+2348030010034"},
    {"name": "Tech Usman Shehu", "role": "lab_tech", "hosp": "a", "dept": "GOPD", "spec": "Hematology & Blood Transfusion", "lic": "MLSCN/50192", "code": "NHA-LAB-01", "phone": "+2348030010035"},
    {"name": "Tech Nkechi Udoh", "role": "lab_tech", "hosp": "a", "dept": "GOPD", "spec": "Clinical Chemistry", "lic": "MLSCN/51203", "code": "NHA-LAB-02", "phone": "+2348030010036"},
    {"name": "Tech Farouk Gambo", "role": "lab_tech", "hosp": "a", "dept": "GOPD", "spec": "Medical Microbiology", "lic": "MLSCN/52918", "code": "NHA-LAB-03", "phone": "+2348030010037"},
    {"name": "Tech Sola Ajayi", "role": "lab_tech", "hosp": "b", "dept": "GOPD", "spec": "Histopathology & Serology", "lic": "MLSCN/60112", "code": "CMH-LAB-01", "phone": "+2348030010038"},
    {"name": "Tech Chioma Eke", "role": "lab_tech", "hosp": "b", "dept": "GOPD", "spec": "Automated Hematology", "lic": "MLSCN/61902", "code": "CMH-LAB-02", "phone": "+2348030010039"},
    {"name": "Tech Gboyega Olaniyan", "role": "lab_tech", "hosp": "b", "dept": "GOPD", "spec": "Molecular Virology", "lic": "MLSCN/62491", "code": "CMH-LAB-03", "phone": "+2348030010040"},
    {"name": "Pharm. Kabir Mustapha", "role": "pharmacist", "hosp": "a", "dept": "GOPD", "spec": "Hospital & Clinical Pharmacy", "lic": "PCN/70192", "code": "NHA-PHM-01", "phone": "+2348030010041"},
    {"name": "Pharm. Ifeoma Madu", "role": "pharmacist", "hosp": "a", "dept": "GOPD", "spec": "Inpatient Formulary Management", "lic": "PCN/71283", "code": "NHA-PHM-02", "phone": "+2348030010042"},
    {"name": "Pharm. Bashir Galadima", "role": "pharmacist", "hosp": "a", "dept": "GOPD", "spec": "Inventory & Logistics", "lic": "PCN/72910", "code": "NHA-PHM-03", "phone": "+2348030010043"},
    {"name": "Pharm. Olumide Bakare", "role": "pharmacist", "hosp": "b", "dept": "GOPD", "spec": "Pharmacotherapy Specialist", "lic": "PCN/80112", "code": "CMH-PHM-01", "phone": "+2348030010044"},
    {"name": "Pharm. Cynthia Umeh", "role": "pharmacist", "hosp": "b", "dept": "GOPD", "spec": "Dispensary Services", "lic": "PCN/81902", "code": "CMH-PHM-02", "phone": "+2348030010045"},
    {"name": "Pharm. Segun Oshodi", "role": "pharmacist", "hosp": "b", "dept": "GOPD", "spec": "Compounding Pharmacy", "lic": "PCN/82491", "code": "CMH-PHM-03", "phone": "+2348030010046"},
    {"name": "Clerk Ahmed Yusuf", "role": "hospital_admin", "hosp": "a", "dept": "GOPD", "spec": "Patient Intake & Medical Records", "lic": "HIM/9011", "code": "NHA-REC-01", "phone": "+2348030010047"},
    {"name": "Clerk Fatima Bello", "role": "hospital_admin", "hosp": "a", "dept": "GOPD", "spec": "Front Desk Registration", "lic": "HIM/9012", "code": "NHA-REC-02", "phone": "+2348030010048"},
    {"name": "Clerk Bisi Adeleke", "role": "hospital_admin", "hosp": "b", "dept": "GOPD", "spec": "Admissions & Insurance Verification", "lic": "HIM/9021", "code": "CMH-REC-01", "phone": "+2348030010049"},
    {"name": "Clerk Chinedu Okoye", "role": "hospital_admin", "hosp": "b", "dept": "GOPD", "spec": "Patient Records Administration", "lic": "HIM/9022", "code": "CMH-REC-02", "phone": "+2348030010050"}
  ]'::jsonb;
  
  s_elem JSONB;
  target_hosp UUID;
  target_dept UUID;
BEGIN
  -- Department Lookups
  SELECT id INTO gopd_a FROM public.departments WHERE hospital_id = hosp_a AND code = 'GOPD' LIMIT 1;
  SELECT id INTO er_a   FROM public.departments WHERE hospital_id = hosp_a AND code = 'ER'   LIMIT 1;
  SELECT id INTO med_a  FROM public.departments WHERE hospital_id = hosp_a AND code = 'MED'  LIMIT 1;
  SELECT id INTO obgyn_a FROM public.departments WHERE hospital_id = hosp_a AND code = 'OBGYN' LIMIT 1;
  SELECT id INTO ped_a  FROM public.departments WHERE hospital_id = hosp_a AND code = 'PED'  LIMIT 1;
  SELECT id INTO surg_a FROM public.departments WHERE hospital_id = hosp_a AND code = 'SURG' LIMIT 1;

  SELECT id INTO gopd_b FROM public.departments WHERE hospital_id = hosp_b AND code = 'GOPD' LIMIT 1;
  SELECT id INTO er_b   FROM public.departments WHERE hospital_id = hosp_b AND code = 'ER'   LIMIT 1;
  SELECT id INTO med_b  FROM public.departments WHERE hospital_id = hosp_b AND code = 'MED'  LIMIT 1;
  SELECT id INTO obgyn_b FROM public.departments WHERE hospital_id = hosp_b AND code = 'OBGYN' LIMIT 1;
  SELECT id INTO ped_b  FROM public.departments WHERE hospital_id = hosp_b AND code = 'PED'  LIMIT 1;
  SELECT id INTO surg_b FROM public.departments WHERE hospital_id = hosp_b AND code = 'SURG' LIMIT 1;

  FOR s_elem IN SELECT * FROM jsonb_array_elements(staff_specs) LOOP
    u_id := gen_random_uuid();
    s_id := gen_random_uuid();
    
    target_hosp := CASE WHEN (s_elem->>'hosp') = 'a' THEN hosp_a ELSE hosp_b END;
    
    target_dept := CASE (s_elem->>'dept')
      WHEN 'ER'    THEN (CASE WHEN (s_elem->>'hosp') = 'a' THEN er_a ELSE er_b END)
      WHEN 'MED'   THEN (CASE WHEN (s_elem->>'hosp') = 'a' THEN med_a ELSE med_b END)
      WHEN 'OBGYN' THEN (CASE WHEN (s_elem->>'hosp') = 'a' THEN obgyn_a ELSE obgyn_b END)
      WHEN 'PED'   THEN (CASE WHEN (s_elem->>'hosp') = 'a' THEN ped_a ELSE ped_b END)
      WHEN 'SURG'  THEN (CASE WHEN (s_elem->>'hosp') = 'a' THEN surg_a ELSE surg_b END)
      ELSE (CASE WHEN (s_elem->>'hosp') = 'a' THEN gopd_a ELSE gopd_b END)
    END;

    -- Staff Record
    INSERT INTO public.staff (
      id,
      user_id,
      hospital_id,
      department_id,
      full_name,
      staff_id_code,
      medical_license_number,
      specialization,
      phone,
      is_active
    ) VALUES (
      s_id,
      u_id,
      target_hosp,
      target_dept,
      s_elem->>'name',
      s_elem->>'code',
      s_elem->>'lic',
      s_elem->>'spec',
      s_elem->>'phone',
      TRUE
    )
    ON CONFLICT (hospital_id, staff_id_code) DO NOTHING;

    -- Role Mapping
    INSERT INTO public.user_roles (
      user_id,
      hospital_id,
      role,
      is_active
    ) VALUES (
      u_id,
      CASE WHEN (s_elem->>'role') = 'super_admin' THEN NULL ELSE target_hosp END,
      (s_elem->>'role')::public.user_role_type,
      TRUE
    )
    ON CONFLICT (user_id, hospital_id, role) DO NOTHING;

    -- Shift Schedules
    INSERT INTO public.staff_schedules (
      staff_id,
      hospital_id,
      department_id,
      shift_name,
      start_time,
      end_time
    ) VALUES 
    (
      s_id,
      target_hosp,
      target_dept,
      'Morning Shift (07:00 - 15:00)',
      now() - interval '2 days' + interval '7 hours',
      now() - interval '2 days' + interval '15 hours'
    ),
    (
      s_id,
      target_hosp,
      target_dept,
      'Active Day Duty (08:00 - 17:00)',
      now() - interval '4 hours',
      now() + interval '5 hours'
    );

  END LOOP;

END $$;

-- ============================================================================
-- 4. SEED CLINICAL CATALOGS (LAB TESTS & DRUG FORMULARY)
-- ============================================================================

DO $$
DECLARE
  hosp_a CONSTANT UUID := '11111111-1111-4111-8111-111111111111';
  hosp_b CONSTANT UUID := '22222222-2222-4222-8222-222222222222';
  c_rec RECORD;
  d_rec RECORD;
BEGIN

  -- 4.1 Diagnostic Lab Test Catalog
  INSERT INTO public.lab_test_catalog (code, name, category, standard_reference_range) VALUES
    ('LAB-FBC', 'Full Blood Count & Platelet Indices (FBC)', 'Hematology', '{"WBC": "4.0 - 11.0 x10^9/L", "Hb_Male": "13.5 - 17.5 g/dL", "Hb_Female": "12.0 - 15.5 g/dL", "Platelets": "150 - 450 x10^9/L"}'::jsonb),
    ('LAB-MP', 'Malaria Parasite (Microscopy & Rapid Ag)', 'Parasitology', '{"Result": "Negative / Not Seen", "Trophozoites": "Nil/uL"}'::jsonb),
    ('LAB-URINE', 'Urinalysis (10-Parameter Automated Strip)', 'Biochemistry', '{"Protein": "Negative", "Glucose": "Negative", "Nitrite": "Negative", "Leukocytes": "Negative", "pH": "5.0 - 7.5"}'::jsonb),
    ('LAB-LIPID', 'Lipid Profile Panel (Cholesterol, HDL, LDL, Trig)', 'Clinical Chemistry', '{"Total_Cholesterol": "< 200 mg/dL", "HDL": "> 40 mg/dL", "LDL": "< 100 mg/dL", "Triglycerides": "< 150 mg/dL"}'::jsonb),
    ('LAB-GENO', 'Haemoglobin Genotype (Electrophoresis)', 'Hematology', '{"Standard": "AA (Normal Adult Hb)"}'::jsonb),
    ('LAB-EUCR', 'Electrolytes, Urea & Creatinine (E/U/Cr)', 'Clinical Chemistry', '{"Sodium": "135 - 145 mmol/L", "Potassium": "3.5 - 5.0 mmol/L", "Urea": "2.5 - 6.7 mmol/L", "Creatinine": "60 - 110 umol/L"}'::jsonb),
    ('LAB-LFT', 'Liver Function Tests (ALT, AST, Bilirubin, AlkPhos)', 'Clinical Chemistry', '{"ALT": "7 - 56 U/L", "AST": "10 - 40 U/L", "Total_Bilirubin": "0.3 - 1.2 mg/dL", "Albumin": "3.5 - 5.0 g/dL"}'::jsonb),
    ('LAB-FBS', 'Fasting Blood Sugar (Glucose)', 'Endocrinology', '{"Fasting_Plasma_Glucose": "70 - 99 mg/dL", "Impaired": "100 - 125 mg/dL", "Diabetic": ">= 126 mg/dL"}'::jsonb)
  ON CONFLICT (code) DO NOTHING;

  -- 4.2 Hospital Lab Pricing
  FOR c_rec IN SELECT id, code FROM public.lab_test_catalog LOOP
    INSERT INTO public.hospital_lab_tests (hospital_id, test_catalog_id, price, is_available)
    VALUES 
      (hosp_a, c_rec.id, CASE c_rec.code WHEN 'LAB-FBC' THEN 3500 WHEN 'LAB-MP' THEN 1500 WHEN 'LAB-LIPID' THEN 6500 ELSE 2500 END, TRUE),
      (hosp_b, c_rec.id, CASE c_rec.code WHEN 'LAB-FBC' THEN 5000 WHEN 'LAB-MP' THEN 2500 WHEN 'LAB-LIPID' THEN 9500 ELSE 4000 END, TRUE)
    ON CONFLICT (hospital_id, test_catalog_id) DO NOTHING;
  END LOOP;

  -- 4.3 Universal Drug Catalog
  INSERT INTO public.drug_catalog (generic_name, brand_name, dosage_form, strength) VALUES
    ('Artemether / Lumefantrine', 'Coartem 80/480', 'Tablet', '80mg/480mg'),
    ('Amoxicillin / Clavulanic Acid', 'Augmentin', 'Tablet', '625mg'),
    ('Metformin Hydrochloride', 'Glucophage', 'Tablet', '500mg'),
    ('Lisinopril Dihydrate', 'Zestril', 'Tablet', '10mg'),
    ('Paracetamol', 'Panadol Extra', 'Tablet', '500mg'),
    ('Ciprofloxacin Hydrochloride', 'Ciprotab', 'Tablet', '500mg'),
    ('Metronidazole', 'Flagyl', 'Tablet', '400mg'),
    ('Omeprazole Sodium', 'Losec', 'Capsule', '20mg'),
    ('Amlodipine Besylate', 'Norvasc', 'Tablet', '5mg'),
    ('Oral Rehydration Salts', 'WHO-Hydrate', 'Sachet', '20.5g')
  ON CONFLICT (generic_name, brand_name, dosage_form, strength) DO NOTHING;

  -- 4.4 Hospital Pharmacy Batch Inventory
  FOR d_rec IN SELECT id, generic_name FROM public.drug_catalog LOOP
    INSERT INTO public.hospital_inventory (hospital_id, drug_id, batch_number, quantity_in_stock, reorder_level, unit_price, expiry_date)
    VALUES
      (hosp_a, d_rec.id, 'BN-NHA-2026-A' || SUBSTRING(d_rec.id::text, 1, 4), 250, 40, 1200.00, '2028-06-30'),
      (hosp_b, d_rec.id, 'BN-CMH-2026-B' || SUBSTRING(d_rec.id::text, 1, 4), 180, 30, 1850.00, '2028-08-15')
    ON CONFLICT (hospital_id, drug_id, batch_number) DO NOTHING;
  END LOOP;

END $$;

-- ============================================================================
-- 5. SEED 500 UNIQUE PATIENTS WITH VALID 11-DIGIT NINS
-- ============================================================================

DO $$
DECLARE
  first_names CONSTANT TEXT[] := ARRAY[
    'Amina', 'Chinedu', 'Olumide', 'Fatima', 'Babajide', 'Ngozi', 'Ibrahim', 'Chioma',
    'Yusuf', 'Folashade', 'Emeka', 'Zainab', 'Damilola', 'Kelechi', 'Halima', 'Tunde',
    'Blessing', 'Abubakar', 'Ijeoma', 'Babatunde', 'Aisha', 'Chukwudi', 'Yetunde', 'Musa',
    'Nneka', 'Suleiman', 'Titilayo', 'Obinna', 'Maryam', 'Adeola', 'Yakubu', 'Chiamaka',
    'Segun', 'Hadiza', 'Kalu', 'Bukola', 'Uche', 'Rahila', 'Femi', 'Grace'
  ];
  
  last_names CONSTANT TEXT[] := ARRAY[
    'Abubakar', 'Adeleke', 'Bello', 'Chukwu', 'Danladi', 'Eze', 'Fashola', 'Garba',
    'Hassan', 'Ibrahim', 'Jinadu', 'Kalu', 'Lawal', 'Mohammed', 'Nnamdi', 'Okafor',
    'Peters', 'Quasim', 'Raji', 'Sanusi', 'Taiwo', 'Umar', 'Williams', 'Yakubu',
    'Zubairu', 'Adeyemi', 'Balogun', 'Chima', 'Danjuma', 'Eke', 'Gambo', 'Idris'
  ];

  blood_groups CONSTANT TEXT[] := ARRAY['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
  genotypes    CONSTANT TEXT[] := ARRAY['AA', 'AA', 'AA', 'AS', 'AS', 'SS', 'AC', 'SC'];

  p_idx INT;
  v_nin CHAR(11);
  v_fn TEXT;
  v_ln TEXT;
  v_dob DATE;
  v_gender TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_bg TEXT;
  v_gt TEXT;
  v_allergies TEXT[];
  v_conditions TEXT[];
  v_pat_id UUID;
  hosp_a CONSTANT UUID := '11111111-1111-4111-8111-111111111111';
  hosp_b CONSTANT UUID := '22222222-2222-4222-8222-222222222222';
BEGIN

  FOR p_idx IN 1..500 LOOP
    -- Deterministic, unique, strictly valid 11-digit NIN: e.g. 10000000001 .. 10000000500
    v_nin := '10' || LPAD(p_idx::text, 9, '0');
    v_fn  := first_names[1 + (p_idx % array_length(first_names, 1))];
    v_ln  := last_names[1 + ((p_idx * 3) % array_length(last_names, 1))];
    v_dob := DATE '1955-01-01' + ((p_idx * 47) % 18000);
    v_gender := CASE WHEN (p_idx % 2 = 0) THEN 'Female' ELSE 'Male' END;
    v_phone  := '+23480' || LPAD((30000000 + p_idx)::text, 8, '0');
    v_email  := lower(v_fn) || '.' || lower(v_ln) || p_idx::text || '@example.com';
    v_bg     := blood_groups[1 + (p_idx % array_length(blood_groups, 1))];
    v_gt     := genotypes[1 + (p_idx % array_length(genotypes, 1))];
    v_allergies  := CASE (p_idx % 7)
      WHEN 0 THEN ARRAY['Penicillin']::TEXT[]
      WHEN 1 THEN ARRAY['Sulfa Antibiotics']::TEXT[]
      WHEN 2 THEN ARRAY['NSAIDs (Ibuprofen)']::TEXT[]
      WHEN 3 THEN ARRAY['Ciprofloxacin']::TEXT[]
      WHEN 4 THEN ARRAY['Latex']::TEXT[]
      ELSE '{}'::TEXT[]
    END;
    v_conditions := CASE (p_idx % 7)
      WHEN 0 THEN ARRAY['Essential Hypertension']::TEXT[]
      WHEN 1 THEN ARRAY['Type 2 Diabetes Mellitus']::TEXT[]
      WHEN 2 THEN ARRAY['Sickle Cell Disease (HbSS)']::TEXT[]
      WHEN 3 THEN ARRAY['Bronchial Asthma']::TEXT[]
      WHEN 4 THEN ARRAY['Peptic Ulcer Disease']::TEXT[]
      ELSE '{}'::TEXT[]
    END;

    v_pat_id := gen_random_uuid();

    INSERT INTO public.patients (
      id,
      nin,
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      email,
      blood_group,
      genotype,
      allergies,
      chronic_conditions,
      emergency_contact,
      created_at
    ) VALUES (
      v_pat_id,
      v_nin,
      v_fn,
      v_ln,
      v_dob,
      v_gender,
      v_phone,
      v_email,
      v_bg,
      v_gt,
      v_allergies,
      v_conditions,
      jsonb_build_object(
        'next_of_kin_name', v_ln || ' ' || (CASE WHEN v_gender = 'Female' THEN 'Ibrahim' ELSE 'Maryam' END),
        'relationship', CASE WHEN p_idx % 3 = 0 THEN 'Spouse' WHEN p_idx % 3 = 1 THEN 'Sibling' ELSE 'Parent' END,
        'phone', '+23481' || LPAD((90000000 + p_idx)::text, 8, '0'),
        'address', 'Plot ' || (p_idx % 120 + 1) || ' Community Crescent'
      ),
      now() - interval '90 days' + (p_idx * interval '3 hours')
    )
    ON CONFLICT (nin) DO NOTHING;

    -- Cross-Hospital Consent (Enroll ~40% at both hospitals)
    IF (p_idx % 3 = 0) THEN
      INSERT INTO public.patient_consents (
        patient_id,
        hospital_id,
        scope,
        is_active,
        expires_at
      ) VALUES (
        v_pat_id,
        hosp_b,
        'full_record',
        TRUE,
        now() + interval '365 days'
      )
      ON CONFLICT (patient_id, hospital_id) DO NOTHING;
    END IF;

  END LOOP;

END $$;

-- ============================================================================
-- 6. SEED 500+ COMPLETE CLINICAL ENCOUNTERS & LIFECYCLES
-- ============================================================================

DO $$
DECLARE
  hosp_a CONSTANT UUID := '11111111-1111-4111-8111-111111111111';
  hosp_b CONSTANT UUID := '22222222-2222-4222-8222-222222222222';
  
  p_rec RECORD;
  doc_a UUID; doc_b UUID;
  nur_a UUID; nur_b UUID;
  lab_a UUID; lab_b UUID;
  phm_a UUID; phm_b UUID;
  
  dept_gopd_a UUID; dept_er_a UUID; dept_med_a UUID;
  dept_gopd_b UUID; dept_er_b UUID; dept_med_b UUID;
  
  test_fbc_a UUID; test_mp_a UUID; test_eucr_a UUID;
  test_fbc_b UUID; test_mp_b UUID; test_eucr_b UUID;
  
  drug_act UUID; drug_aug UUID; drug_pcm UUID; drug_met UUID;
  
  target_hosp UUID;
  target_doc  UUID;
  target_nur  UUID;
  target_lab  UUID;
  target_phm  UUID;
  target_dept UUID;
  target_fbc  UUID;
  target_mp   UUID;
  
  app_id UUID;
  enc_id UUID;
  inv_id UUID;
  rx_id  UUID;
  
  enc_count INT := 0;
  is_break_glass_flag BOOLEAN;
  bg_reason TEXT;
  chief_complaints CONSTANT TEXT[] := ARRAY[
    '3-day history of high-grade intermittent fever, chills, and generalized joint pain.',
    'Exertional shortness of breath, bilateral lower limb edema, and nocturnal orthopnea.',
    'Persistent epigastric pain radiating to back, aggravated by fasting, with nausea.',
    'Acute trauma presentation following road traffic accident with lacerations and rib tenderness.',
    'Routine prenatal checkup at 28 weeks gestation, reporting mild fatigue and fetal kicks.',
    'Poorly controlled blood sugar monitoring, polydipsia, polyuria, and blurred vision.',
    'Acute right iliac fossa abdominal pain, anorexia, low-grade pyrexia, and vomiting.',
    'Severe throbbing unilateral headache with photophobia and visual aura.'
  ];
  diagnoses CONSTANT TEXT[] := ARRAY[
    'Severe Uncomplicated Plasmodium Falciparum Malaria (Microscopy Proven)',
    'Decompensated Congestive Cardiac Failure secondary to Hypertensive Heart Disease',
    'Acute Peptic Ulcer Disease / Helicobacter Pylori Gastritis',
    'Blunt Chest Trauma with Right 6th Rib Contusion without Pneumothorax',
    'Normal Active Intrauterine Pregnancy at 28 Weeks GA with Mild Gestational Anemia',
    'Uncontrolled Type 2 Diabetes Mellitus with Hyperglycemia without DKA',
    'Acute Catarrhal Appendicitis (Scheduled for Laparoscopic Appendectomy)',
    'Classical Migraine with Aura and Tension Cephalea'
  ];

BEGIN

  -- Lookup Clinical Staff
  SELECT id INTO doc_a FROM public.staff WHERE hospital_id = hosp_a AND staff_id_code = 'NHA-DOC-01' LIMIT 1;
  SELECT id INTO doc_b FROM public.staff WHERE hospital_id = hosp_b AND staff_id_code = 'CMH-DOC-01' LIMIT 1;
  SELECT id INTO nur_a FROM public.staff WHERE hospital_id = hosp_a AND staff_id_code = 'NHA-NUR-01' LIMIT 1;
  SELECT id INTO nur_b FROM public.staff WHERE hospital_id = hosp_b AND staff_id_code = 'CMH-NUR-01' LIMIT 1;
  SELECT id INTO lab_a FROM public.staff WHERE hospital_id = hosp_a AND staff_id_code = 'NHA-LAB-01' LIMIT 1;
  SELECT id INTO lab_b FROM public.staff WHERE hospital_id = hosp_b AND staff_id_code = 'CMH-LAB-01' LIMIT 1;
  SELECT id INTO phm_a FROM public.staff WHERE hospital_id = hosp_a AND staff_id_code = 'NHA-PHM-01' LIMIT 1;
  SELECT id INTO phm_b FROM public.staff WHERE hospital_id = hosp_b AND staff_id_code = 'CMH-PHM-01' LIMIT 1;

  -- Lookup Departments
  SELECT id INTO dept_gopd_a FROM public.departments WHERE hospital_id = hosp_a AND code = 'GOPD' LIMIT 1;
  SELECT id INTO dept_er_a   FROM public.departments WHERE hospital_id = hosp_a AND code = 'ER'   LIMIT 1;
  SELECT id INTO dept_med_a  FROM public.departments WHERE hospital_id = hosp_a AND code = 'MED'  LIMIT 1;

  SELECT id INTO dept_gopd_b FROM public.departments WHERE hospital_id = hosp_b AND code = 'GOPD' LIMIT 1;
  SELECT id INTO dept_er_b   FROM public.departments WHERE hospital_id = hosp_b AND code = 'ER'   LIMIT 1;
  SELECT id INTO dept_med_b  FROM public.departments WHERE hospital_id = hosp_b AND code = 'MED'  LIMIT 1;

  -- Lookup Lab Tests
  SELECT hlt.id INTO test_fbc_a FROM public.hospital_lab_tests hlt JOIN public.lab_test_catalog ltc ON ltc.id = hlt.test_catalog_id WHERE hlt.hospital_id = hosp_a AND ltc.code = 'LAB-FBC' LIMIT 1;
  SELECT hlt.id INTO test_mp_a  FROM public.hospital_lab_tests hlt JOIN public.lab_test_catalog ltc ON ltc.id = hlt.test_catalog_id WHERE hlt.hospital_id = hosp_a AND ltc.code = 'LAB-MP'  LIMIT 1;

  SELECT hlt.id INTO test_fbc_b FROM public.hospital_lab_tests hlt JOIN public.lab_test_catalog ltc ON ltc.id = hlt.test_catalog_id WHERE hlt.hospital_id = hosp_b AND ltc.code = 'LAB-FBC' LIMIT 1;
  SELECT hlt.id INTO test_mp_b  FROM public.hospital_lab_tests hlt JOIN public.lab_test_catalog ltc ON ltc.id = hlt.test_catalog_id WHERE hlt.hospital_id = hosp_b AND ltc.code = 'LAB-MP'  LIMIT 1;

  -- Lookup Formulary Drugs
  SELECT id INTO drug_act FROM public.drug_catalog WHERE generic_name LIKE 'Artemether%' LIMIT 1;
  SELECT id INTO drug_aug FROM public.drug_catalog WHERE generic_name LIKE 'Amoxicillin%' LIMIT 1;
  SELECT id INTO drug_pcm FROM public.drug_catalog WHERE generic_name LIKE 'Paracetamol%' LIMIT 1;
  SELECT id INTO drug_met FROM public.drug_catalog WHERE generic_name LIKE 'Metformin%' LIMIT 1;

  FOR p_rec IN SELECT id, first_name, last_name FROM public.patients ORDER BY id LOOP
    enc_count := enc_count + 1;
    
    target_hosp := CASE WHEN (enc_count % 2 = 0) THEN hosp_a ELSE hosp_b END;
    target_doc  := CASE WHEN (enc_count % 2 = 0) THEN doc_a ELSE doc_b END;
    target_nur  := CASE WHEN (enc_count % 2 = 0) THEN nur_a ELSE nur_b END;
    target_lab  := CASE WHEN (enc_count % 2 = 0) THEN lab_a ELSE lab_b END;
    target_phm  := CASE WHEN (enc_count % 2 = 0) THEN phm_a ELSE phm_b END;
    target_fbc  := CASE WHEN (enc_count % 2 = 0) THEN test_fbc_a ELSE test_fbc_b END;
    target_mp   := CASE WHEN (enc_count % 2 = 0) THEN test_mp_a ELSE test_mp_b END;
    
    target_dept := CASE (enc_count % 3)
      WHEN 0 THEN (CASE WHEN target_hosp = hosp_a THEN dept_gopd_a ELSE dept_gopd_b END)
      WHEN 1 THEN (CASE WHEN target_hosp = hosp_a THEN dept_er_a ELSE dept_er_b END)
      ELSE (CASE WHEN target_hosp = hosp_a THEN dept_med_a ELSE dept_med_b END)
    END;

    -- Break glass simulation for emergency cases (encounters 15, 45, 90, 150, 300)
    is_break_glass_flag := (enc_count IN (15, 45, 90, 150, 300));
    bg_reason := CASE WHEN is_break_glass_flag 
      THEN 'Critical acute trauma resuscitation override: Unresponsive patient presenting with hypovolemic shock requiring immediate clinical and surgical history.'
      ELSE NULL 
    END;

    app_id := gen_random_uuid();
    enc_id := gen_random_uuid();
    inv_id := gen_random_uuid();
    rx_id  := gen_random_uuid();

    -- 6.1 Appointment Record
    INSERT INTO public.appointments (
      id,
      hospital_id,
      patient_id,
      doctor_id,
      department_id,
      appointment_date,
      status,
      is_external_booking,
      is_walk_in,
      queue_number,
      symptoms_summary
    ) VALUES (
      app_id,
      target_hosp,
      p_rec.id,
      target_doc,
      target_dept,
      now() - interval '60 days' + (enc_count * interval '2 hours'),
      'completed'::public.appointment_status,
      (enc_count % 4 = 0),
      (enc_count % 4 <> 0),
      (enc_count % 50) + 1,
      chief_complaints[1 + (enc_count % array_length(chief_complaints, 1))]
    );

    -- 6.2 Clinical Encounter
    INSERT INTO public.encounters (
      id,
      hospital_id,
      patient_id,
      appointment_id,
      practitioner_id,
      nurse_id,
      department_id,
      encounter_status,
      chief_complaint,
      clinical_notes,
      psychiatric_notes,
      diagnosis,
      icd10_codes,
      ai_summary,
      ai_patient_summary,
      ai_key_findings,
      ai_next_steps,
      is_break_glass,
      break_glass_reason,
      created_at,
      closed_at
    ) VALUES (
      enc_id,
      target_hosp,
      p_rec.id,
      app_id,
      target_doc,
      target_nur,
      target_dept,
      'closed'::public.encounter_status,
      chief_complaints[1 + (enc_count % array_length(chief_complaints, 1))],
      'Patient examined thoroughly. Heart sounds S1 S2 present, chest clear bilaterally, abdomen soft with mild tenderness on palpation. Neurological status alert and oriented.',
      CASE WHEN (enc_count % 10 = 0) THEN 'Sensitive psychiatric evaluation: Patient reports moderate situational anxiety and insomnia due to recent bereavement. Prescribed supportive psychotherapy.' ELSE NULL END,
      diagnoses[1 + (enc_count % array_length(diagnoses, 1))],
      CASE (enc_count % 8)
        WHEN 0 THEN ARRAY['B50.9', 'R50.9']::TEXT[]
        WHEN 1 THEN ARRAY['I50.9', 'I10']::TEXT[]
        WHEN 2 THEN ARRAY['K27.9', 'K29.7']::TEXT[]
        WHEN 3 THEN ARRAY['S20.2', 'R07.89']::TEXT[]
        WHEN 4 THEN ARRAY['O26.89', 'D64.9']::TEXT[]
        WHEN 5 THEN ARRAY['E11.65', 'R73.03']::TEXT[]
        WHEN 6 THEN ARRAY['K35.80']::TEXT[]
        ELSE ARRAY['G43.109']::TEXT[]
      END,
      'Clinician SOAP Assessment: Confirmed diagnosis based on physical exam and diagnostic investigations. Stable for outpatient monitoring.',
      'Your doctor has evaluated your symptoms and started you on standard medication. Please take all tablets as directed and rest adequately.',
      ARRAY['Stable vital signs with mild pyrexia', 'Diagnostic laboratory confirmation obtained', 'No acute respiratory distress noted']::TEXT[],
      ARRAY['Complete full 3-day course of prescribed oral medications', 'Maintain adequate oral fluid hydration', 'Follow up in clinic if symptoms persist beyond 72 hours']::TEXT[],
      is_break_glass_flag,
      bg_reason,
      now() - interval '60 days' + (enc_count * interval '2 hours'),
      now() - interval '60 days' + (enc_count * interval '2 hours') + interval '45 minutes'
    );

    -- 6.3 Triage Vitals
    INSERT INTO public.triage_vitals (
      encounter_id,
      patient_id,
      hospital_id,
      recorded_by,
      body_temperature,
      systolic_bp,
      diastolic_bp,
      pulse_rate,
      respiratory_rate,
      spo2,
      weight_kg,
      height_cm,
      pain_score,
      recorded_at
    ) VALUES (
      enc_id,
      p_rec.id,
      target_hosp,
      target_nur,
      36.4 + ((enc_count % 25) * 0.1),
      110 + (enc_count % 40),
      70 + (enc_count % 25),
      68 + (enc_count % 35),
      14 + (enc_count % 8),
      96.0 + (enc_count % 4),
      55.0 + (enc_count % 45),
      155.0 + (enc_count % 35),
      (enc_count % 8),
      now() - interval '60 days' + (enc_count * interval '2 hours')
    );

    -- 6.4 Laboratory Orders & Results (for ~70% of encounters)
    IF (enc_count % 10 <= 7) THEN
      -- Malaria Test
      IF target_mp IS NOT NULL THEN
        INSERT INTO public.lab_orders (
          encounter_id,
          hospital_id,
          patient_id,
          test_id,
          ordered_by,
          technician_id,
          status,
          sample_type,
          sample_collected_at,
          result_value,
          result_metadata,
          is_critical,
          created_at
        ) VALUES (
          enc_id,
          target_hosp,
          p_rec.id,
          target_mp,
          target_doc,
          target_lab,
          'completed'::public.lab_status,
          'Capillary Whole Blood',
          now() - interval '60 days' + (enc_count * interval '2 hours') + interval '10 minutes',
          CASE WHEN enc_count % 2 = 0 THEN 'Positive (Plasmodium falciparum ++ trophozoites)' ELSE 'Negative (No malaria parasite seen)' END,
          jsonb_build_object('parasite_density', CASE WHEN enc_count % 2 = 0 THEN '1,420 parasites/uL' ELSE '0' END),
          (enc_count % 20 = 0),
          now() - interval '60 days' + (enc_count * interval '2 hours') + interval '5 minutes'
        );
      END IF;

      -- Full Blood Count
      IF target_fbc IS NOT NULL THEN
        INSERT INTO public.lab_orders (
          encounter_id,
          hospital_id,
          patient_id,
          test_id,
          ordered_by,
          technician_id,
          status,
          sample_type,
          sample_collected_at,
          result_value,
          result_metadata,
          is_critical,
          created_at
        ) VALUES (
          enc_id,
          target_hosp,
          p_rec.id,
          target_fbc,
          target_doc,
          target_lab,
          'completed'::public.lab_status,
          'EDTA Anticoagulated Blood',
          now() - interval '60 days' + (enc_count * interval '2 hours') + interval '10 minutes',
          'Hb: 12.8 g/dL, WBC: 6.8 x10^9/L, Platelets: 240 x10^9/L',
          jsonb_build_object('PCV', '38.4%', 'Neutrophils', '62%', 'Lymphocytes', '32%'),
          FALSE,
          now() - interval '60 days' + (enc_count * interval '2 hours') + interval '5 minutes'
        );
      END IF;
    END IF;

    -- 6.5 Prescriptions & Items
    INSERT INTO public.prescriptions (
      id,
      encounter_id,
      hospital_id,
      patient_id,
      doctor_id,
      status,
      notes
    ) VALUES (
      rx_id,
      enc_id,
      target_hosp,
      p_rec.id,
      target_doc,
      'dispensed'::public.prescription_status,
      'Take with meals. Complete entire antimicrobial regimen.'
    );

    IF drug_act IS NOT NULL THEN
      INSERT INTO public.prescription_items (
        prescription_id,
        drug_id,
        dosage,
        frequency,
        duration,
        quantity_prescribed,
        quantity_dispensed,
        dispensed_by,
        dispensed_at
      ) VALUES (
        rx_id,
        drug_act,
        '1 tablet',
        'Twice daily',
        '3 days',
        6,
        6,
        target_phm,
        now() - interval '60 days' + (enc_count * interval '2 hours') + interval '30 minutes'
      );
    END IF;

    IF drug_pcm IS NOT NULL THEN
      INSERT INTO public.prescription_items (
        prescription_id,
        drug_id,
        dosage,
        frequency,
        duration,
        quantity_prescribed,
        quantity_dispensed,
        dispensed_by,
        dispensed_at
      ) VALUES (
        rx_id,
        drug_pcm,
        '2 tablets (1000mg)',
        'Three times daily (8 hourly)',
        '3 days',
        18,
        18,
        target_phm,
        now() - interval '60 days' + (enc_count * interval '2 hours') + interval '30 minutes'
      );
    END IF;

    -- 6.6 Clinical Invoices, Line Items & Payments
    INSERT INTO public.invoices (
      id,
      encounter_id,
      hospital_id,
      patient_id,
      total_amount,
      insurance_coverage_amount,
      patient_payable_amount,
      status,
      due_date
    ) VALUES (
      inv_id,
      enc_id,
      target_hosp,
      p_rec.id,
      CASE WHEN target_hosp = hosp_a THEN 7500.00 ELSE 12500.00 END,
      CASE WHEN enc_count % 3 = 0 THEN 5000.00 ELSE 0.00 END,
      CASE WHEN target_hosp = hosp_a THEN (CASE WHEN enc_count % 3 = 0 THEN 2500.00 ELSE 7500.00 END) ELSE (CASE WHEN enc_count % 3 = 0 THEN 7500.00 ELSE 12500.00 END) END,
      'paid'::public.invoice_status,
      (now() - interval '60 days' + (enc_count * interval '2 hours'))::DATE
    );

    -- Invoice Line Items
    INSERT INTO public.billing_line_items (
      invoice_id,
      service_type,
      description,
      quantity,
      unit_price,
      total_price
    ) VALUES 
    (
      inv_id,
      'Consultation',
      'Specialist Medical Consultation & Assessment',
      1,
      CASE WHEN target_hosp = hosp_a THEN 3000.00 ELSE 5000.00 END,
      CASE WHEN target_hosp = hosp_a THEN 3000.00 ELSE 5000.00 END
    ),
    (
      inv_id,
      'Laboratory',
      'Diagnostic Malaria Microscopy & Complete Blood Count',
      1,
      CASE WHEN target_hosp = hosp_a THEN 3000.00 ELSE 5500.00 END,
      CASE WHEN target_hosp = hosp_a THEN 3000.00 ELSE 5500.00 END
    ),
    (
      inv_id,
      'Pharmacy',
      'Coartem 80/480mg + Panadol Extra Discharged Formulary',
      1,
      CASE WHEN target_hosp = hosp_a THEN 1500.00 ELSE 2000.00 END,
      CASE WHEN target_hosp = hosp_a THEN 1500.00 ELSE 2000.00 END
    );

    -- Payment Record
    INSERT INTO public.payments (
      invoice_id,
      hospital_id,
      patient_id,
      amount_paid,
      payment_method,
      transaction_reference,
      paid_at
    ) VALUES (
      inv_id,
      target_hosp,
      p_rec.id,
      CASE WHEN target_hosp = hosp_a THEN (CASE WHEN enc_count % 3 = 0 THEN 2500.00 ELSE 7500.00 END) ELSE (CASE WHEN enc_count % 3 = 0 THEN 7500.00 ELSE 12500.00 END) END,
      CASE (enc_count % 4)
        WHEN 0 THEN 'card'::public.payment_method
        WHEN 1 THEN 'cash'::public.payment_method
        WHEN 2 THEN 'bank_transfer'::public.payment_method
        ELSE 'insurance'::public.payment_method
      END,
      'TXN-HNP-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(enc_count::text, 6, '0'),
      now() - interval '60 days' + (enc_count * interval '2 hours') + interval '35 minutes'
    );

  END LOOP;

END $$;

-- ============================================================================
-- 7. SEED CYBERSECURITY AUDIT TRAIL & SHA-256 HASH CHAIN SIMULATION
-- ============================================================================

DO $$
DECLARE
  hosp_a CONSTANT UUID := '11111111-1111-4111-8111-111111111111';
  hosp_b CONSTANT UUID := '22222222-2222-4222-8222-222222222222';
  
  doc_user_a UUID; doc_user_b UUID;
  nur_user_a UUID; clerk_user_a UUID;
  pat_1 UUID; pat_2 UUID; pat_3 UUID; pat_4 UUID; pat_5 UUID;
  enc_1 UUID; enc_2 UUID;
BEGIN

  SELECT user_id INTO doc_user_a FROM public.staff WHERE hospital_id = hosp_a AND staff_id_code = 'NHA-DOC-01' LIMIT 1;
  SELECT user_id INTO doc_user_b FROM public.staff WHERE hospital_id = hosp_b AND staff_id_code = 'CMH-DOC-01' LIMIT 1;
  SELECT user_id INTO nur_user_a FROM public.staff WHERE hospital_id = hosp_a AND staff_id_code = 'NHA-NUR-01' LIMIT 1;
  SELECT user_id INTO clerk_user_a FROM public.staff WHERE hospital_id = hosp_a AND staff_id_code = 'NHA-REC-01' LIMIT 1;

  SELECT id INTO pat_1 FROM public.patients ORDER BY id OFFSET 0 LIMIT 1;
  SELECT id INTO pat_2 FROM public.patients ORDER BY id OFFSET 1 LIMIT 1;
  SELECT id INTO pat_3 FROM public.patients ORDER BY id OFFSET 2 LIMIT 1;
  SELECT id INTO pat_4 FROM public.patients ORDER BY id OFFSET 3 LIMIT 1;
  SELECT id INTO pat_5 FROM public.patients ORDER BY id OFFSET 4 LIMIT 1;

  SELECT id INTO enc_1 FROM public.encounters WHERE patient_id = pat_1 LIMIT 1;
  SELECT id INTO enc_2 FROM public.encounters WHERE patient_id = pat_2 LIMIT 1;

  -- 7.1 Standard Routine Clinical Access Logs
  INSERT INTO public.record_audit_logs (
    hospital_id, accessor_id, accessor_role, patient_id, encounter_id, action, justification, ip_address, "timestamp"
  ) VALUES
  (hosp_a, doc_user_a, 'doctor', pat_1, enc_1, 'READ', 'Routine clinical consultation review of patient history', '192.168.1.45'::inet, now() - interval '10 days'),
  (hosp_a, nur_user_a, 'nurse', pat_1, enc_1, 'WRITE', 'Nursing vital signs charting and pain score logging', '192.168.1.48'::inet, now() - interval '10 days' + interval '5 minutes'),
  (hosp_a, doc_user_a, 'doctor', pat_1, enc_1, 'WRITE', 'Clinical SOAP progress notes and e-prescription generation', '192.168.1.45'::inet, now() - interval '10 days' + interval '20 minutes'),
  (hosp_b, doc_user_b, 'doctor', pat_2, enc_2, 'READ', 'Cardiology outpatient review and ECG evaluation', '10.0.4.12'::inet, now() - interval '8 days'),
  (hosp_b, doc_user_b, 'doctor', pat_2, enc_2, 'EXPORT', 'Exporting lab summary PDF for patient medical referral', '10.0.4.12'::inet, now() - interval '8 days' + interval '15 minutes');

  -- 7.2 5 Emergency Break-Glass Overrides
  INSERT INTO public.record_audit_logs (
    hospital_id, accessor_id, accessor_role, patient_id, encounter_id, action, justification, ip_address, "timestamp"
  ) VALUES
  (
    hosp_a,
    doc_user_a,
    'doctor',
    pat_1,
    enc_1,
    'BREAK_GLASS_OVERRIDE',
    'Emergency Trauma Override: Unconscious motor vehicle accident patient requiring immediate blood group and allergy profile verification.',
    '192.168.10.1'::inet,
    now() - interval '5 days'
  ),
  (
    hosp_a,
    doc_user_a,
    'doctor',
    pat_2,
    NULL,
    'BREAK_GLASS_OVERRIDE',
    'Emergency Resuscitation: Patient presenting with acute pulmonary edema in ER without pre-existing consent profile on file.',
    '192.168.10.2'::inet,
    now() - interval '4 days'
  ),
  (
    hosp_b,
    doc_user_b,
    'doctor',
    pat_3,
    NULL,
    'BREAK_GLASS_OVERRIDE',
    'Emergency Obstetrics: Eclamptic fit in labor ward requiring immediate antepartum medication history and renal function review.',
    '10.0.12.5'::inet,
    now() - interval '3 days'
  ),
  (
    hosp_b,
    doc_user_b,
    'doctor',
    pat_4,
    NULL,
    'BREAK_GLASS_OVERRIDE',
    'Acute Stroke Team Activation: Rapid thrombolytic decision window (<3 hours) requiring immediate anticoagulation history.',
    '10.0.12.9'::inet,
    now() - interval '2 days'
  ),
  (
    hosp_a,
    doc_user_a,
    'doctor',
    pat_5,
    NULL,
    'BREAK_GLASS_OVERRIDE',
    'Pediatric Status Epilepticus: Emergency intake requiring weight-based anticonvulsant dosing and pediatric allergies check.',
    '192.168.10.15'::inet,
    now() - interval '1 day'
  );

  -- 7.3 3 Access Abuse Detection Flags (Audit Simulation)
  INSERT INTO public.record_audit_logs (
    hospital_id, accessor_id, accessor_role, patient_id, encounter_id, action, justification, ip_address, "timestamp"
  ) VALUES
  (
    hosp_a,
    clerk_user_a,
    'hospital_admin',
    pat_3,
    NULL,
    'READ',
    'POLICY_ALERT: Administrative intake personnel queried confidential clinical psychiatric notes without encounter assignment.',
    '192.168.2.99'::inet,
    now() - interval '12 hours'
  ),
  (
    hosp_a,
    clerk_user_a,
    'hospital_admin',
    pat_4,
    NULL,
    'EXPORT',
    'POLICY_ALERT: Mass demographic record export attempted outside authorized shift hours.',
    '192.168.2.99'::inet,
    now() - interval '6 hours'
  ),
  (
    hosp_b,
    doc_user_b,
    'doctor',
    pat_5,
    NULL,
    'READ',
    'POLICY_ALERT: Cross-hospital clinical lookup without active patient consent grant or active break-glass emergency declaration.',
    '10.0.99.14'::inet,
    now() - interval '2 hours'
  );

END $$;

COMMIT;
