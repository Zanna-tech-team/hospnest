-- ============================================================
-- HOSPNEST — RECURRING STAFF SHIFTS & ACTIVE SHIFT EVALUATION
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_weekly_shifts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  hospital_id   UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday ... 6=Saturday
  start_time_str TIME NOT NULL, -- e.g. '08:00'
  end_time_str   TIME NOT NULL, -- e.g. '16:00'
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_weekly_shifts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_weekly_shifts' AND policyname = 'weekly_shifts_read'
  ) THEN
    CREATE POLICY weekly_shifts_read ON public.staff_weekly_shifts
      FOR SELECT TO authenticated
      USING (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_weekly_shifts' AND policyname = 'weekly_shifts_admin_write'
  ) THEN
    CREATE POLICY weekly_shifts_admin_write ON public.staff_weekly_shifts
      FOR ALL TO authenticated
      USING (public.is_hospital_admin(hospital_id))
      WITH CHECK (public.is_hospital_admin(hospital_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_weekly_shifts_staff ON public.staff_weekly_shifts (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_weekly_shifts_hospital ON public.staff_weekly_shifts (hospital_id);

-- Update is_on_active_shift to evaluate both date schedules and weekly recurring shifts
CREATE OR REPLACE FUNCTION public.is_on_active_shift(_hospital_id UUID, _department_id UUID, _ward_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.staff_schedules sch
      JOIN public.staff s ON s.id = sch.staff_id
      WHERE s.user_id = auth.uid()
        AND sch.hospital_id = _hospital_id
        AND now() BETWEEN sch.start_time AND sch.end_time
        AND (sch.department_id IS NULL OR _department_id IS NULL OR sch.department_id = _department_id)
        AND (sch.ward_id IS NULL OR _ward_id IS NULL OR sch.ward_id = _ward_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.staff_weekly_shifts ws
      JOIN public.staff s ON s.id = ws.staff_id
      WHERE s.user_id = auth.uid()
        AND ws.hospital_id = _hospital_id
        AND ws.is_active = TRUE
        AND ws.day_of_week = CAST(EXTRACT(DOW FROM now()) AS INT)
        AND CAST(now() AS TIME) BETWEEN ws.start_time_str AND ws.end_time_str
        AND (ws.department_id IS NULL OR _department_id IS NULL OR ws.department_id = _department_id)
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_on_active_shift(uuid, uuid, uuid) TO authenticated, service_role;
