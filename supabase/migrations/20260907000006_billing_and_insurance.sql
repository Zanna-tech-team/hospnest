-- ============================================================
-- HOSPNEST — BILLING, SERVICES PRICE LIST & HMO CLAIMS MIGRATION
-- ============================================================

-- 1. Create hospital_services table for configurable hospital tariff catalog
CREATE TABLE IF NOT EXISTS public.hospital_services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  service_code      TEXT NOT NULL,
  service_name      TEXT NOT NULL,
  service_category  TEXT NOT NULL DEFAULT 'consultation' CHECK (service_category IN ('consultation', 'triage', 'nursing', 'procedure', 'admission', 'administrative', 'other')),
  price             NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, service_code)
);

ALTER TABLE public.hospital_services ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hospital_services' AND policyname = 'hospital_services_read'
  ) THEN
    CREATE POLICY hospital_services_read ON public.hospital_services
      FOR SELECT TO authenticated
      USING (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hospital_services' AND policyname = 'hospital_services_write'
  ) THEN
    CREATE POLICY hospital_services_write ON public.hospital_services
      FOR ALL TO authenticated
      USING (public.is_hospital_admin(hospital_id) OR public.is_super_admin())
      WITH CHECK (public.is_hospital_admin(hospital_id) OR public.is_super_admin());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hospital_services_hosp ON public.hospital_services (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_services_cat ON public.hospital_services (hospital_id, service_category);

-- 2. Add invoice_number and notes to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices (hospital_id, invoice_number);

-- 3. Add insurance/HMO fields to patients table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_plan_type TEXT,
ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;

-- 4. Seed initial standard service price list for all existing hospitals
INSERT INTO public.hospital_services (hospital_id, service_code, service_name, service_category, price)
SELECT
  h.id,
  s.service_code,
  s.service_name,
  s.service_category,
  s.price
FROM public.hospitals h
CROSS JOIN (
  VALUES
    ('REG_CARD', 'Patient Registration & Health Record Card', 'administrative', 2000.00),
    ('OPD_GEN', 'General Outpatient Medical Consultation', 'consultation', 5000.00),
    ('OPD_SPEC', 'Specialist Physician Consultation', 'consultation', 12000.00),
    ('EMERG_TRIAGE', 'Emergency Triage & Vital Signs Monitoring', 'triage', 3000.00),
    ('NURSE_OBS', 'Nursing Care & Day Observation (per session)', 'nursing', 4500.00),
    ('WARD_BED_GEN', 'Inpatient General Ward Bed Accommodation (per day)', 'admission', 8000.00),
    ('WARD_BED_PVT', 'Inpatient Private Room Bed Accommodation (per day)', 'admission', 20000.00),
    ('WOUND_DRESS', 'Minor Surgical Wound Dressing & Antiseptic Care', 'procedure', 3500.00),
    ('SUTURE_MINOR', 'Minor Laceration Suturing & Local Anaesthetic', 'procedure', 7500.00),
    ('NEBULIZATION', 'Nebulization Therapy / Respiratory Relief Session', 'nursing', 3000.00)
) AS s(service_code, service_name, service_category, price)
WHERE NOT EXISTS (
  SELECT 1 FROM public.hospital_services hs
  WHERE hs.hospital_id = h.id AND hs.service_code = s.service_code
);

-- 5. Trigger to seed services price list on new hospital onboarding
CREATE OR REPLACE FUNCTION public.fn_seed_hospital_services()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.hospital_services (hospital_id, service_code, service_name, service_category, price)
  VALUES
    (NEW.id, 'REG_CARD', 'Patient Registration & Health Record Card', 'administrative', 2000.00),
    (NEW.id, 'OPD_GEN', 'General Outpatient Medical Consultation', 'consultation', 5000.00),
    (NEW.id, 'OPD_SPEC', 'Specialist Physician Consultation', 'consultation', 12000.00),
    (NEW.id, 'EMERG_TRIAGE', 'Emergency Triage & Vital Signs Monitoring', 'triage', 3000.00),
    (NEW.id, 'NURSE_OBS', 'Nursing Care & Day Observation (per session)', 'nursing', 4500.00),
    (NEW.id, 'WARD_BED_GEN', 'Inpatient General Ward Bed Accommodation (per day)', 'admission', 8000.00),
    (NEW.id, 'WARD_BED_PVT', 'Inpatient Private Room Bed Accommodation (per day)', 'admission', 20000.00),
    (NEW.id, 'WOUND_DRESS', 'Minor Surgical Wound Dressing & Antiseptic Care', 'procedure', 3500.00),
    (NEW.id, 'SUTURE_MINOR', 'Minor Laceration Suturing & Local Anaesthetic', 'procedure', 7500.00),
    (NEW.id, 'NEBULIZATION', 'Nebulization Therapy / Respiratory Relief Session', 'nursing', 3000.00)
  ON CONFLICT (hospital_id, service_code) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_seed_hospital_services ON public.hospitals;
CREATE TRIGGER trg_seed_hospital_services
  AFTER INSERT ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.fn_seed_hospital_services();
