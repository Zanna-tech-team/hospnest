-- ============================================================
-- HOSPNEST — WARDS, BEDS, INPATIENT ADMISSIONS, WARD ROSTERS & TRANSFERS MIGRATION
-- ============================================================

-- 1. Create wards table
CREATE TABLE IF NOT EXISTS public.wards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'icu', 'hdu', 'pediatric', 'maternity', 'isolation', 'surgical', 'emergency_ward')),
  total_beds          INTEGER NOT NULL DEFAULT 10 CHECK (total_beds >= 0),
  gender_restriction  TEXT DEFAULT 'none' CHECK (gender_restriction IN ('none', 'male_only', 'female_only', 'pediatric')),
  floor_location      TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wards' AND policyname = 'wards_read_policy'
  ) THEN
    CREATE POLICY wards_read_policy ON public.wards
      FOR SELECT TO authenticated
      USING (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wards' AND policyname = 'wards_write_policy'
  ) THEN
    CREATE POLICY wards_write_policy ON public.wards
      FOR ALL TO authenticated
      USING (public.is_hospital_admin(hospital_id) OR public.is_super_admin())
      WITH CHECK (public.is_hospital_admin(hospital_id) OR public.is_super_admin());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wards_hospital ON public.wards(hospital_id);

-- 2. Create beds table
CREATE TABLE IF NOT EXISTS public.beds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id       UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  bed_number    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  daily_rate    NUMERIC(12,2) NOT NULL DEFAULT 5000 CHECK (daily_rate >= 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ward_id, bed_number)
);

ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'beds' AND policyname = 'beds_read_policy'
  ) THEN
    CREATE POLICY beds_read_policy ON public.beds
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.wards w
        WHERE w.id = beds.ward_id AND public.is_member_of_hospital(w.hospital_id)
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'beds' AND policyname = 'beds_write_policy'
  ) THEN
    CREATE POLICY beds_write_policy ON public.beds
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.wards w
        WHERE w.id = beds.ward_id AND (public.is_hospital_admin(w.hospital_id) OR public.is_super_admin() OR public.has_role_in_hospital('doctor', w.hospital_id) OR public.has_role_in_hospital('nurse', w.hospital_id))
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_beds_ward ON public.beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON public.beds(status);

-- 3. Create inpatient admissions table
CREATE TABLE IF NOT EXISTS public.admissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id           UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id            UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id          UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  ward_id               UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  bed_id                UUID NOT NULL REFERENCES public.beds(id) ON DELETE RESTRICT,
  admission_date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharge_date        TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted', 'discharged', 'transferred', 'absconded')),
  admitting_doctor_id   UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  admission_reason      TEXT NOT NULL,
  initial_condition     TEXT,
  discharge_condition   TEXT CHECK (discharge_condition IN ('recovered', 'improved', 'stable', 'transferred', 'deceased', 'against_medical_advice', NULL)),
  discharge_summary     TEXT,
  discharge_instructions TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admissions' AND policyname = 'admissions_read_policy'
  ) THEN
    CREATE POLICY admissions_read_policy ON public.admissions
      FOR SELECT TO authenticated
      USING (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admissions' AND policyname = 'admissions_write_policy'
  ) THEN
    CREATE POLICY admissions_write_policy ON public.admissions
      FOR ALL TO authenticated
      USING (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admissions_hosp ON public.admissions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON public.admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON public.admissions(status);

-- 4. Create ward staff duty assignments table (Doctors overseeing, Nurses, Interns on shift schedule)
CREATE TABLE IF NOT EXISTS public.ward_staff_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  ward_id             UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  staff_id            UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  role_in_ward        TEXT NOT NULL CHECK (role_in_ward IN ('supervising_doctor', 'primary_nurse', 'assisting_nurse', 'intern', 'resident')),
  shift_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type          TEXT NOT NULL DEFAULT 'morning' CHECK (shift_type IN ('morning', 'afternoon', 'night', 'full_day')),
  start_time          TIME,
  end_time            TIME,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ward_staff_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ward_staff_assignments' AND policyname = 'ward_staff_read'
  ) THEN
    CREATE POLICY ward_staff_read ON public.ward_staff_assignments
      FOR SELECT TO authenticated
      USING (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ward_staff_assignments' AND policyname = 'ward_staff_write'
  ) THEN
    CREATE POLICY ward_staff_write ON public.ward_staff_assignments
      FOR ALL TO authenticated
      USING (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ward_staff_ward ON public.ward_staff_assignments(ward_id, shift_date);

-- 5. Create cross-hospital patient transfers table
CREATE TABLE IF NOT EXISTS public.patient_transfers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  referring_hospital_id   UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  receiving_hospital_id   UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  requested_by_id         UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  approved_by_id          UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  priority                TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'emergency')),
  reason_for_transfer     TEXT NOT NULL,
  clinical_summary        TEXT NOT NULL,
  consent_scope           TEXT NOT NULL DEFAULT 'full_transfer' CHECK (consent_scope IN ('full_transfer', 'emergency_referral', 'second_opinion')),
  consent_verified        BOOLEAN NOT NULL DEFAULT true,
  patient_consent_id      UUID REFERENCES public.patient_consents(id) ON DELETE SET NULL,
  response_notes          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_transfers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'patient_transfers' AND policyname = 'transfers_read_policy'
  ) THEN
    CREATE POLICY transfers_read_policy ON public.patient_transfers
      FOR SELECT TO authenticated
      USING (
        public.is_member_of_hospital(referring_hospital_id) OR
        public.is_member_of_hospital(receiving_hospital_id) OR
        public.is_super_admin()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'patient_transfers' AND policyname = 'transfers_write_policy'
  ) THEN
    CREATE POLICY transfers_write_policy ON public.patient_transfers
      FOR ALL TO authenticated
      USING (
        public.is_member_of_hospital(referring_hospital_id) OR
        public.is_member_of_hospital(receiving_hospital_id) OR
        public.is_super_admin()
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transfers_ref_hosp ON public.patient_transfers(referring_hospital_id);
CREATE INDEX IF NOT EXISTS idx_transfers_rec_hosp ON public.patient_transfers(receiving_hospital_id);
CREATE INDEX IF NOT EXISTS idx_transfers_patient ON public.patient_transfers(patient_id);

-- 6. Seed initial wards and beds for existing hospitals
DO $$
DECLARE
  h RECORD;
  w_male UUID;
  w_female UUID;
  w_ped UUID;
  w_icu UUID;
  i INT;
BEGIN
  FOR h IN SELECT id FROM public.hospitals LOOP
    -- Only seed if no wards exist for this hospital
    IF NOT EXISTS (SELECT 1 FROM public.wards WHERE hospital_id = h.id) THEN
      -- Male Medical Ward
      INSERT INTO public.wards (hospital_id, name, type, total_beds, gender_restriction, floor_location)
      VALUES (h.id, 'Male Medical Ward', 'general', 6, 'male_only', '1st Floor - Wing A')
      RETURNING id INTO w_male;

      FOR i IN 1..6 LOOP
        INSERT INTO public.beds (ward_id, bed_number, status, daily_rate)
        VALUES (w_male, 'MMW-' || LPAD(i::text, 2, '0'), 'available', 6500.00);
      END LOOP;

      -- Female Surgical Ward
      INSERT INTO public.wards (hospital_id, name, type, total_beds, gender_restriction, floor_location)
      VALUES (h.id, 'Female Surgical Ward', 'surgical', 6, 'female_only', '1st Floor - Wing B')
      RETURNING id INTO w_female;

      FOR i IN 1..6 LOOP
        INSERT INTO public.beds (ward_id, bed_number, status, daily_rate)
        VALUES (w_female, 'FSW-' || LPAD(i::text, 2, '0'), 'available', 7500.00);
      END LOOP;

      -- Pediatric Ward
      INSERT INTO public.wards (hospital_id, name, type, total_beds, gender_restriction, floor_location)
      VALUES (h.id, 'Pediatric & Neonatal Ward', 'pediatric', 4, 'pediatric', '2nd Floor - Wing A')
      RETURNING id INTO w_ped;

      FOR i IN 1..4 LOOP
        INSERT INTO public.beds (ward_id, bed_number, status, daily_rate)
        VALUES (w_ped, 'PED-' || LPAD(i::text, 2, '0'), 'available', 5000.00);
      END LOOP;

      -- Intensive Care Unit (ICU)
      INSERT INTO public.wards (hospital_id, name, type, total_beds, gender_restriction, floor_location)
      VALUES (h.id, 'Intensive Care Unit (ICU)', 'icu', 3, 'none', 'Ground Floor - Trauma Unit')
      RETURNING id INTO w_icu;

      FOR i IN 1..3 LOOP
        INSERT INTO public.beds (ward_id, bed_number, status, daily_rate)
        VALUES (w_icu, 'ICU-' || LPAD(i::text, 2, '0'), 'available', 25000.00);
      END LOOP;

    END IF;
  END LOOP;
END $$;
