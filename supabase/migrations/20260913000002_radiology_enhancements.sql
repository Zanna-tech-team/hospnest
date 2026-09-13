-- ============================================================
-- HOSPNEST — RADIOLOGY & IMAGING DEPARTMENT ENHANCEMENTS
-- ============================================================

-- 1. Make image_url nullable for pending requests before acquisition
ALTER TABLE public.radiology_studies
  ALTER COLUMN image_url DROP NOT NULL;

-- 2. Add priority and requesting doctor
ALTER TABLE public.radiology_studies
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
  ADD COLUMN IF NOT EXISTS requesting_doctor_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_radiology_status ON public.radiology_studies(hospital_id, status, created_at DESC);
