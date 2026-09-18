-- ============================================================
-- HOSPNEST — STAFF JOIN REQUESTS & DIRECT REGISTRATION
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_join_requests (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id            UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id                UUID,
  full_name              TEXT NOT NULL,
  email                  TEXT NOT NULL,
  phone                  TEXT,
  requested_role         public.user_role_type NOT NULL,
  medical_license_number TEXT,
  specialization         TEXT,
  department_id          UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  status                 TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason       TEXT,
  reviewed_by            UUID,
  reviewed_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_join_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_join_requests' AND policyname = 'staff_join_requests_select'
  ) THEN
    CREATE POLICY staff_join_requests_select ON public.staff_join_requests
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR email = (auth.jwt() ->> 'email')
        OR public.is_hospital_admin(hospital_id)
        OR public.is_super_admin()
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_join_requests' AND policyname = 'staff_join_requests_insert'
  ) THEN
    CREATE POLICY staff_join_requests_insert ON public.staff_join_requests
      FOR INSERT TO anon, authenticated
      WITH CHECK (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_join_requests' AND policyname = 'staff_join_requests_update'
  ) THEN
    CREATE POLICY staff_join_requests_update ON public.staff_join_requests
      FOR UPDATE TO authenticated
      USING (public.is_hospital_admin(hospital_id) OR public.is_super_admin())
      WITH CHECK (public.is_hospital_admin(hospital_id) OR public.is_super_admin());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_join_requests_hosp ON public.staff_join_requests(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_join_requests_user ON public.staff_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_join_requests_email ON public.staff_join_requests(email);

GRANT SELECT, INSERT, UPDATE ON public.staff_join_requests TO authenticated;
GRANT INSERT ON public.staff_join_requests TO anon;
GRANT ALL ON public.staff_join_requests TO service_role;
