-- ============================================================
-- HOSPNEST — STAFF INVITATIONS TABLE & POLICIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          public.user_role_type NOT NULL,
  staff_id_code TEXT,
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by    UUID,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_invitations' AND policyname = 'staff_invitations_read'
  ) THEN
    CREATE POLICY staff_invitations_read ON public.staff_invitations
      FOR SELECT TO authenticated
      USING (public.is_hospital_admin(hospital_id) OR email = (auth.jwt() ->> 'email'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_invitations' AND policyname = 'staff_invitations_admin_write'
  ) THEN
    CREATE POLICY staff_invitations_admin_write ON public.staff_invitations
      FOR ALL TO authenticated
      USING (public.is_hospital_admin(hospital_id))
      WITH CHECK (public.is_hospital_admin(hospital_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_invitations_hospital ON public.staff_invitations (hospital_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON public.staff_invitations (token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON public.staff_invitations (email);
