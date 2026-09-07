-- ============================================================
-- HOSPNEST — PATIENT PORTAL & APPOINTMENT BOOKING MIGRATION
-- ============================================================

-- 1. Ensure public.patients has user_id indexed and unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients (user_id) WHERE user_id IS NOT NULL;

-- 2. Ensure RLS on public.patients allows signed-in patient to select and update their own record
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'patients_self_read'
  ) THEN
    CREATE POLICY patients_self_read ON public.patients
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'patients_self_update'
  ) THEN
    CREATE POLICY patients_self_update ON public.patients
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 3. Ensure appointments RLS allows patient to read and book their own appointments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_patient_read_own'
  ) THEN
    CREATE POLICY appointments_patient_read_own ON public.appointments
      FOR SELECT TO authenticated
      USING (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_patient_insert_own'
  ) THEN
    CREATE POLICY appointments_patient_insert_own ON public.appointments
      FOR INSERT TO authenticated
      WITH CHECK (patient_id = public.current_patient_id());
  END IF;
END $$;

-- 4. Indexes for fast appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON public.appointments (patient_id, appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_status_date ON public.appointments (hospital_id, status, appointment_date);
