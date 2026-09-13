-- Migration: Maternity ANC, Labor & Delivery Partograph, Postnatal & Immunization (NPI)
-- Timestamp: 2026-09-13

CREATE TABLE IF NOT EXISTS public.antenatal_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  anc_number TEXT NOT NULL,
  gravida INT DEFAULT 1,
  para INT DEFAULT 0,
  alive INT DEFAULT 0,
  miscarriages INT DEFAULT 0,
  lmp DATE NOT NULL,
  edd DATE NOT NULL,
  gestational_age_at_booking_weeks INT,
  blood_group TEXT,
  genotype TEXT,
  rhesus TEXT,
  hiv_status TEXT DEFAULT 'non-reactive',
  hepatitis_b_status TEXT DEFAULT 'negative',
  vdrl_syphilis_status TEXT DEFAULT 'non-reactive',
  risk_factors TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.antenatal_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.antenatal_enrollments(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  visit_number INT NOT NULL DEFAULT 1,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  gestational_age_weeks NUMERIC(4, 1),
  fundal_height_cm NUMERIC(4, 1),
  fetal_heart_rate_bpm INT,
  fetal_presentation TEXT DEFAULT 'cephalic',
  fetal_lie TEXT DEFAULT 'longitudinal',
  maternal_bp_systolic INT,
  maternal_bp_diastolic INT,
  maternal_weight_kg NUMERIC(5, 2),
  urinalysis_protein TEXT DEFAULT 'nil',
  urinalysis_glucose TEXT DEFAULT 'nil',
  clinical_notes TEXT,
  next_visit_date DATE,
  practitioner_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.labor_and_delivery_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES public.antenatal_enrollments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  labor_start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_time TIMESTAMPTZ,
  delivery_mode TEXT NOT NULL DEFAULT 'spontaneous_vaginal',
  cervical_dilation_cm NUMERIC(3, 1) DEFAULT 4.0,
  contractions_per_10min INT DEFAULT 3,
  membranes_status TEXT DEFAULT 'intact',
  fetal_station TEXT DEFAULT '0',
  baby_gender TEXT DEFAULT 'female',
  birth_weight_kg NUMERIC(4, 2),
  apgar_1min INT DEFAULT 8,
  apgar_5min INT DEFAULT 10,
  apgar_10min INT,
  estimated_blood_loss_ml INT DEFAULT 200,
  perineal_tear_degree TEXT DEFAULT 'intact',
  maternal_outcome TEXT DEFAULT 'stable',
  neonatal_outcome TEXT DEFAULT 'crying_well',
  attending_obstetrician TEXT,
  attending_midwife TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.child_immunization_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  child_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT DEFAULT 'female',
  vaccine_name TEXT NOT NULL,
  target_age_weeks INT NOT NULL DEFAULT 0,
  dose_number INT NOT NULL DEFAULT 1,
  administered_at TIMESTAMPTZ,
  batch_number TEXT,
  nurse_name TEXT,
  adverse_events TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.antenatal_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antenatal_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_and_delivery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_immunization_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated for antenatal_enrollments" ON public.antenatal_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated for antenatal_visits" ON public.antenatal_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated for labor_and_delivery_records" ON public.labor_and_delivery_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated for child_immunization_records" ON public.child_immunization_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
