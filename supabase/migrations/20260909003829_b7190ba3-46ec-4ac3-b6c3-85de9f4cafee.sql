-- Wards / beds extra columns
ALTER TABLE public.wards
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS total_beds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gender_restriction TEXT NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS floor_location TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.beds
  ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(12,2) NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ADMISSIONS
CREATE TABLE IF NOT EXISTS public.admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  ward_id UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
  admitting_doctor_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  admission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  admission_reason TEXT,
  initial_condition TEXT,
  status TEXT NOT NULL DEFAULT 'admitted',
  discharge_date TIMESTAMPTZ,
  discharge_condition TEXT,
  discharge_summary TEXT,
  discharge_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admissions TO authenticated;
GRANT ALL ON public.admissions TO service_role;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff manage admissions"
  ON public.admissions FOR ALL TO authenticated
  USING (public.is_member_of_hospital(hospital_id))
  WITH CHECK (public.is_member_of_hospital(hospital_id));

CREATE POLICY "Patients view their own admissions"
  ON public.admissions FOR SELECT TO authenticated
  USING (patient_id = public.current_patient_id());

CREATE INDEX IF NOT EXISTS idx_admissions_hospital ON public.admissions(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON public.admissions(patient_id);

CREATE TRIGGER trg_admissions_touch BEFORE UPDATE ON public.admissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- WARD STAFF ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.ward_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  ward_id UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  role_in_ward TEXT NOT NULL,
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_staff_assignments TO authenticated;
GRANT ALL ON public.ward_staff_assignments TO service_role;
ALTER TABLE public.ward_staff_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff manage ward duty roster"
  ON public.ward_staff_assignments FOR ALL TO authenticated
  USING (public.is_member_of_hospital(hospital_id))
  WITH CHECK (public.is_member_of_hospital(hospital_id));

CREATE INDEX IF NOT EXISTS idx_wsa_hospital_date ON public.ward_staff_assignments(hospital_id, shift_date);

-- PATIENT TRANSFERS
CREATE TABLE IF NOT EXISTS public.patient_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  referring_hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  receiving_hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  requested_by_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  patient_consent_id UUID REFERENCES public.patient_consents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'routine',
  reason_for_transfer TEXT,
  clinical_summary TEXT,
  consent_scope TEXT,
  consent_verified BOOLEAN NOT NULL DEFAULT FALSE,
  response_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_transfers TO authenticated;
GRANT ALL ON public.patient_transfers TO service_role;
ALTER TABLE public.patient_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff of either hospital view transfers"
  ON public.patient_transfers FOR SELECT TO authenticated
  USING (
    public.is_member_of_hospital(referring_hospital_id)
    OR public.is_member_of_hospital(receiving_hospital_id)
    OR patient_id = public.current_patient_id()
  );

CREATE POLICY "Referring hospital staff create transfers"
  ON public.patient_transfers FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of_hospital(referring_hospital_id));

CREATE POLICY "Staff of either hospital update transfers"
  ON public.patient_transfers FOR UPDATE TO authenticated
  USING (
    public.is_member_of_hospital(referring_hospital_id)
    OR public.is_member_of_hospital(receiving_hospital_id)
  )
  WITH CHECK (
    public.is_member_of_hospital(referring_hospital_id)
    OR public.is_member_of_hospital(receiving_hospital_id)
  );

CREATE INDEX IF NOT EXISTS idx_transfers_referring ON public.patient_transfers(referring_hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_transfers_receiving ON public.patient_transfers(receiving_hospital_id, status);

CREATE TRIGGER trg_transfers_touch BEFORE UPDATE ON public.patient_transfers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();