-- ============================================================
-- HOSPNEST — PART 9: RADIOLOGY & MEDICAL IMAGING WORKBENCH
-- ============================================================

CREATE TYPE public.imaging_modality AS ENUM ('xray', 'ct', 'mri', 'ultrasound', 'mammography', 'other');
CREATE TYPE public.imaging_study_status AS ENUM ('scheduled', 'acquired', 'reported', 'reviewed');

CREATE TABLE IF NOT EXISTS public.radiology_studies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id        UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  modality            public.imaging_modality NOT NULL DEFAULT 'xray',
  body_part           TEXT NOT NULL,
  clinical_indication TEXT,
  image_url           TEXT NOT NULL,
  thumbnail_url       TEXT,
  study_date          TIMESTAMPTZ NOT NULL DEFAULT now(),
  radiologist_id      UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  technician_id       UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  findings            TEXT,
  impression          TEXT,
  radiologist_notes   TEXT,
  is_critical         BOOLEAN NOT NULL DEFAULT FALSE,
  status              public.imaging_study_status NOT NULL DEFAULT 'acquired',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_radiology_studies_hospital ON public.radiology_studies(hospital_id);
CREATE INDEX IF NOT EXISTS idx_radiology_studies_patient ON public.radiology_studies(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_studies_encounter ON public.radiology_studies(encounter_id);
CREATE INDEX IF NOT EXISTS idx_radiology_studies_modality ON public.radiology_studies(modality);

-- Enable RLS
ALTER TABLE public.radiology_studies ENABLE ROW LEVEL SECURITY;

-- Staff Policy
CREATE POLICY "Staff can view radiology studies of their hospital"
  ON public.radiology_studies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.hospital_id = radiology_studies.hospital_id OR ur.role = 'super_admin')
        AND ur.is_active = true
    )
  );

CREATE POLICY "Staff can insert radiology studies of their hospital"
  ON public.radiology_studies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.hospital_id = radiology_studies.hospital_id OR ur.role = 'super_admin')
        AND ur.is_active = true
    )
  );

CREATE POLICY "Staff can update radiology studies of their hospital"
  ON public.radiology_studies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.hospital_id = radiology_studies.hospital_id OR ur.role = 'super_admin')
        AND ur.is_active = true
    )
  );

-- Patient Portal Policy
CREATE POLICY "Patients can view their own radiology reports"
  ON public.radiology_studies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = radiology_studies.patient_id
        AND p.user_id = auth.uid()
    )
  );
