-- ============================================================
-- HOSPNEST — COMMON ICD-10 DIAGNOSES CATALOG & SEED DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.diagnosis_catalog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  chapter     TEXT,
  is_common   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnosis_catalog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'diagnosis_catalog' AND policyname = 'diagnosis_catalog_public_read'
  ) THEN
    CREATE POLICY diagnosis_catalog_public_read ON public.diagnosis_catalog
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_diagnosis_catalog_code ON public.diagnosis_catalog (code);
CREATE INDEX IF NOT EXISTS idx_diagnosis_catalog_name ON public.diagnosis_catalog USING gin (to_tsvector('english', name));

-- Seed common tropical & general outpatient diagnoses
INSERT INTO public.diagnosis_catalog (code, name, category, chapter, is_common)
VALUES
  ('B50.9', 'Plasmodium falciparum malaria, unspecified', 'Infectious Diseases', 'Chapter I', true),
  ('B54', 'Unspecified malaria', 'Infectious Diseases', 'Chapter I', true),
  ('A01.0', 'Typhoid fever', 'Infectious Diseases', 'Chapter I', true),
  ('A09', 'Infectious gastroenteritis and colitis, unspecified', 'Gastrointestinal', 'Chapter I', true),
  ('I10', 'Essential (primary) hypertension', 'Cardiovascular', 'Chapter IX', true),
  ('I11.9', 'Hypertensive heart disease without heart failure', 'Cardiovascular', 'Chapter IX', true),
  ('E11.9', 'Type 2 diabetes mellitus without complications', 'Endocrine & Metabolic', 'Chapter IV', true),
  ('E10.9', 'Type 1 diabetes mellitus without complications', 'Endocrine & Metabolic', 'Chapter IV', true),
  ('J00', 'Acute nasopharyngitis (common cold)', 'Respiratory', 'Chapter X', true),
  ('J02.9', 'Acute pharyngitis, unspecified', 'Respiratory', 'Chapter X', true),
  ('J06.9', 'Acute upper respiratory infection, unspecified', 'Respiratory', 'Chapter X', true),
  ('J18.9', 'Pneumonia, unspecified organism', 'Respiratory', 'Chapter X', true),
  ('J45.909', 'Unspecified asthma, uncomplicated', 'Respiratory', 'Chapter X', true),
  ('J20.9', 'Acute bronchitis, unspecified', 'Respiratory', 'Chapter X', true),
  ('N39.0', 'Urinary tract infection, site not specified', 'Genitourinary', 'Chapter XIV', true),
  ('D57.1', 'Sickle-cell disease without crisis', 'Hematology', 'Chapter III', true),
  ('D57.0', 'Sickle-cell anemia with crisis (vaso-occlusive)', 'Hematology', 'Chapter III', true),
  ('D50.9', 'Iron deficiency anemia, unspecified', 'Hematology', 'Chapter III', true),
  ('K29.7', 'Gastritis, unspecified', 'Gastrointestinal', 'Chapter XI', true),
  ('K21.9', 'Gastro-esophageal reflux disease without esophagitis', 'Gastrointestinal', 'Chapter XI', true),
  ('K35.80', 'Unspecified acute appendicitis', 'Gastrointestinal', 'Chapter XI', true),
  ('K80.20', 'Calculus of gallbladder without cholecystitis', 'Gastrointestinal', 'Chapter XI', true),
  ('G43.909', 'Migraine, unspecified, not intractable', 'Neurological', 'Chapter VI', true),
  ('G44.209', 'Tension-type headache, unspecified', 'Neurological', 'Chapter VI', true),
  ('M54.5', 'Low back pain', 'Musculoskeletal', 'Chapter XIII', true),
  ('M25.50', 'Pain in unspecified joint', 'Musculoskeletal', 'Chapter XIII', true),
  ('L30.9', 'Dermatitis, unspecified', 'Dermatology', 'Chapter XII', true),
  ('L03.90', 'Cellulitis, unspecified', 'Dermatology', 'Chapter XII', true),
  ('H10.9', 'Unspecified conjunctivitis', 'Ophthalmology', 'Chapter VII', true),
  ('H66.90', 'Otitis media, unspecified', 'ENT', 'Chapter VIII', true),
  ('F32.9', 'Major depressive disorder, single episode, unspecified', 'Mental Health', 'Chapter V', true),
  ('F41.1', 'Generalized anxiety disorder', 'Mental Health', 'Chapter V', true),
  ('O80', 'Encounter for full-term uncomplicated delivery', 'Obstetrics', 'Chapter XV', true),
  ('Z00.00', 'Encounter for general adult medical examination', 'General Health', 'Chapter XXI', true)
ON CONFLICT (code) DO NOTHING;
