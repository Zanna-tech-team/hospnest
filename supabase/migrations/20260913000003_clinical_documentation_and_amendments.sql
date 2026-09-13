-- ============================================================
-- PROMPT 31: SIGNED, ATTRIBUTED & BEAUTIFUL CLINICAL DOCUMENTATION
-- Professional licenses, signature hashes, structured notes & amendment logs
-- ============================================================

-- 1. Add structured clinical notes and digital signature columns to encounters
ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS past_medical_history TEXT,
  ADD COLUMN IF NOT EXISTS drug_history TEXT,
  ADD COLUMN IF NOT EXISTS allergies_notes TEXT,
  ADD COLUMN IF NOT EXISTS review_of_systems TEXT,
  ADD COLUMN IF NOT EXISTS physical_exam_systematic JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS digital_signature_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- 2. Add professional license numbers & rank to staff
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS license_type TEXT DEFAULT 'MDCN',
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS cadre_rank TEXT DEFAULT 'Medical Officer';

-- 3. Create immutable Clinical Note Amendments Table (Append-Only Audit Trail)
CREATE TABLE IF NOT EXISTS public.clinical_note_amendments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id            UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  encounter_id           UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id             UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  author_id              UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  amendment_type         TEXT NOT NULL DEFAULT 'addendum' CHECK (amendment_type IN ('addendum', 'correction', 'late_entry')),
  amendment_reason       TEXT NOT NULL,
  previous_notes         TEXT,
  amended_notes          TEXT NOT NULL,
  digital_signature_hash TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning queries
CREATE INDEX IF NOT EXISTS idx_clinical_amendments_encounter ON public.clinical_note_amendments(encounter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_amendments_hospital ON public.clinical_note_amendments(hospital_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.clinical_note_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view amendments for hospital patients"
  ON public.clinical_note_amendments
  FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM public.staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Medical staff can add amendments"
  ON public.clinical_note_amendments
  FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM public.staff WHERE user_id = auth.uid()
    )
  );
