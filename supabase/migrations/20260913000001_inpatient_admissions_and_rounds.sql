-- ============================================================
-- HOSPNEST — INPATIENT ADMISSIONS, WARD ROUNDS & NURSING CARE MIGRATION
-- ============================================================

-- 1. Extend admissions table
ALTER TABLE public.admissions
  ADD COLUMN IF NOT EXISTS admission_type TEXT NOT NULL DEFAULT 'emergency' CHECK (admission_type IN ('emergency', 'elective', 'maternity', 'day_case')),
  ADD COLUMN IF NOT EXISTS expected_stay_days INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS bed_cleaning_status TEXT NOT NULL DEFAULT 'clean' CHECK (bed_cleaning_status IN ('clean', 'cleaning_required', 'in_progress')),
  ADD COLUMN IF NOT EXISTS take_home_prescriptions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS follow_up_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

-- 2. Ward Round Notes (Structured SOAP per patient round)
CREATE TABLE IF NOT EXISTS public.ward_round_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id    UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  hospital_id     UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  subjective      TEXT,
  objective       TEXT,
  assessment      TEXT,
  plan            TEXT NOT NULL,
  vitals_snapshot JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ward_round_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ward_round_notes' AND policyname = 'ward_round_notes_staff_all'
  ) THEN
    CREATE POLICY ward_round_notes_staff_all ON public.ward_round_notes
      FOR ALL TO authenticated
      USING (public.is_member_of_hospital(hospital_id))
      WITH CHECK (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ward_round_notes_admission ON public.ward_round_notes (admission_id, created_at DESC);

-- 3. Nursing Care Observations (MAR, Fluid Balance, Wound Care, Routine Schedules)
CREATE TABLE IF NOT EXISTS public.nursing_care_observations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id      UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  hospital_id       UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  nurse_id          UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  observation_type  TEXT NOT NULL CHECK (observation_type IN ('vitals', 'mar', 'fluid_balance', 'wound_care')),
  details           JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nursing_care_observations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nursing_care_observations' AND policyname = 'nursing_obs_staff_all'
  ) THEN
    CREATE POLICY nursing_obs_staff_all ON public.nursing_care_observations
      FOR ALL TO authenticated
      USING (public.is_member_of_hospital(hospital_id))
      WITH CHECK (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nursing_obs_admission ON public.nursing_care_observations (admission_id, observation_type, created_at DESC);
