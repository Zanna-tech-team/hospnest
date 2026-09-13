-- ============================================================
-- HOSPNEST — APPOINTMENTS & SCHEDULING ENHANCEMENTS MIGRATION
-- ============================================================

-- 1. Extend public.appointments with clinical priority and linkage columns
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'emergency')),
  ADD COLUMN IF NOT EXISTS previous_encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slot_duration_minutes INT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. Extend public.departments with default appointment slot duration
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS appointment_slot_duration_minutes INT NOT NULL DEFAULT 20;

-- 3. Ensure Staff can read and write appointments in their hospital
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_staff_select'
  ) THEN
    CREATE POLICY appointments_staff_select ON public.appointments
      FOR SELECT TO authenticated
      USING (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_staff_insert'
  ) THEN
    CREATE POLICY appointments_staff_insert ON public.appointments
      FOR INSERT TO authenticated
      WITH CHECK (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_staff_update'
  ) THEN
    CREATE POLICY appointments_staff_update ON public.appointments
      FOR UPDATE TO authenticated
      USING (public.is_member_of_hospital(hospital_id))
      WITH CHECK (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

-- 4. Fast indexing for calendar and queue queries
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_doctor_date ON public.appointments (hospital_id, doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_dept_date ON public.appointments (hospital_id, department_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_queue ON public.appointments (hospital_id, appointment_date, status, queue_number);
