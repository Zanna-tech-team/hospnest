-- HospNest VoiceCare & Superadmin Persisted Database Schema
-- Multi-Lingual Speech Evaluation, Session Logs & Competition Benchmark Storage

-- 1. VoiceCare Real-Time Sessions & Audio Logs
CREATE TABLE IF NOT EXISTS public.voicecare_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  user_id UUID,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL DEFAULT 'appointment_booking', -- appointment_booking | check_in | triage | clinical_note | communication
  target_language_code TEXT NOT NULL DEFAULT 'pcm',
  detected_language TEXT,
  transcript TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.95,
  latency_ms INTEGER DEFAULT 0,
  structured_data JSONB DEFAULT '{}'::jsonb,
  triage_priority TEXT,
  clinical_note_draft JSONB DEFAULT '{}'::jsonb,
  provider_used TEXT DEFAULT 'intron_sahara',
  is_reviewed_by_clinician BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voicecare_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can create voicecare sessions" ON public.voicecare_sessions;
CREATE POLICY "Authenticated users can create voicecare sessions"
  ON public.voicecare_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own hospital or patient voicecare sessions" ON public.voicecare_sessions;
CREATE POLICY "Users can view their own hospital or patient voicecare sessions"
  ON public.voicecare_sessions FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND (role IN ('super_admin', 'hospital_admin', 'doctor', 'nurse', 'lab_tech', 'pharmacist'))
    )
  );

CREATE INDEX IF NOT EXISTS idx_voicecare_sessions_hospital ON public.voicecare_sessions(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voicecare_sessions_patient ON public.voicecare_sessions(patient_id, created_at DESC);

-- 2. VoiceCare Benchmark Ground Truth Samples
CREATE TABLE IF NOT EXISTS public.voicecare_benchmark_samples (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audio_base64 TEXT,
  audio_url TEXT,
  audio_duration_seconds NUMERIC DEFAULT 0,
  language_pair TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Nigeria',
  accent TEXT,
  domain TEXT NOT NULL DEFAULT 'Appointment Booking',
  device_type TEXT NOT NULL DEFAULT 'Android phone',
  noise_condition TEXT NOT NULL DEFAULT 'Quiet',
  speaker_type TEXT NOT NULL DEFAULT 'Patient',
  consent_status TEXT DEFAULT 'Fully Synthetic Case (No PHI)',
  de_identification_status TEXT DEFAULT 'De-identified / Zero PHI',
  ground_truth_transcript TEXT NOT NULL,
  expected_intent TEXT NOT NULL DEFAULT 'Book Appointment',
  expected_structured_data JSONB DEFAULT '{}'::jsonb,
  is_synthetic BOOLEAN DEFAULT TRUE,
  created_by TEXT DEFAULT 'System',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voicecare_benchmark_samples
  ADD COLUMN IF NOT EXISTS audio_base64 TEXT,
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS consent_status TEXT DEFAULT 'Fully Synthetic Case (No PHI)',
  ADD COLUMN IF NOT EXISTS de_identification_status TEXT DEFAULT 'De-identified / Zero PHI';

ALTER TABLE public.voicecare_benchmark_samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public / Authenticated can view benchmark samples" ON public.voicecare_benchmark_samples;
CREATE POLICY "Public / Authenticated can view benchmark samples"
  ON public.voicecare_benchmark_samples FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Superadmins and service role can modify benchmark samples" ON public.voicecare_benchmark_samples;
CREATE POLICY "Superadmins and service role can modify benchmark samples"
  ON public.voicecare_benchmark_samples FOR ALL
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- 3. VoiceCare Benchmark Runs
CREATE TABLE IF NOT EXISTS public.voicecare_benchmark_runs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sample_ids TEXT[] DEFAULT '{}',
  models_evaluated JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ DEFAULT now(),
  total_samples INTEGER NOT NULL DEFAULT 0,
  overall_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  language_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  downstream_task_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT DEFAULT 'Superadmin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voicecare_benchmark_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view benchmark runs" ON public.voicecare_benchmark_runs;
CREATE POLICY "Authenticated can view benchmark runs"
  ON public.voicecare_benchmark_runs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Superadmins can insert and update benchmark runs" ON public.voicecare_benchmark_runs;
CREATE POLICY "Superadmins can insert and update benchmark runs"
  ON public.voicecare_benchmark_runs FOR ALL
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- 4. VoiceCare Competition Benchmark Reports
CREATE TABLE IF NOT EXISTS public.voicecare_benchmark_reports (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES public.voicecare_benchmark_runs(id) ON DELETE CASCADE,
  report_title TEXT NOT NULL,
  project TEXT NOT NULL DEFAULT 'HospNest VoiceCare',
  prepared_by TEXT NOT NULL,
  organisation TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Nigeria',
  benchmark_date TEXT NOT NULL,
  models JSONB NOT NULL DEFAULT '[]'::jsonb,
  methodology_note TEXT,
  dataset_note TEXT,
  responsible_ai_note TEXT,
  qualitative_findings TEXT,
  error_pattern_analysis TEXT,
  created_by TEXT DEFAULT 'Superadmin',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voicecare_benchmark_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view benchmark reports" ON public.voicecare_benchmark_reports;
CREATE POLICY "Authenticated can view benchmark reports"
  ON public.voicecare_benchmark_reports FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Superadmins can modify benchmark reports" ON public.voicecare_benchmark_reports;
CREATE POLICY "Superadmins can modify benchmark reports"
  ON public.voicecare_benchmark_reports FOR ALL
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- 5. Platform Superadmin Settings
CREATE TABLE IF NOT EXISTS public.platform_superadmin_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  platform_name TEXT NOT NULL DEFAULT 'HospNest National Health Platform',
  default_tier TEXT NOT NULL DEFAULT 'Community',
  system_announcement TEXT,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  tier_configurations JSONB DEFAULT '{
    "Community": { "maxBeds": 50, "maxStaff": 30, "priceMonthly": 0 },
    "General": { "maxBeds": 120, "maxStaff": 75, "priceMonthly": 150000 },
    "Teaching": { "maxBeds": 250, "maxStaff": 150, "priceMonthly": 400000 },
    "Enterprise": { "maxBeds": 9999, "maxStaff": 9999, "priceMonthly": 950000 }
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_superadmin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view platform settings" ON public.platform_superadmin_settings;
CREATE POLICY "Anyone authenticated can view platform settings"
  ON public.platform_superadmin_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Superadmins can update platform settings" ON public.platform_superadmin_settings;
CREATE POLICY "Superadmins can update platform settings"
  ON public.platform_superadmin_settings FOR ALL
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Pre-seed Initial Superadmin Settings Row if not present
INSERT INTO public.platform_superadmin_settings (id, platform_name, default_tier)
VALUES ('default', 'HospNest National Health Platform', 'Community')
ON CONFLICT (id) DO NOTHING;

-- Pre-seed Initial Sahara CodeSwitch Africa Benchmark Dataset
INSERT INTO public.voicecare_benchmark_samples (
  id, title, audio_duration_seconds, language_pair, country, accent, domain, device_type, noise_condition, speaker_type, ground_truth_transcript, expected_intent, expected_structured_data, is_synthetic
) VALUES
  (
    'sample_pcm_001',
    'Pidgin-English Abdominal Pain Intake',
    6.2,
    'Pidgin + English',
    'Nigeria',
    'Lagos / South-West Urban',
    'Appointment Booking',
    'Android phone',
    'Moderate noise',
    'Patient',
    'Abeg I want to see a doctor next Monday around 9am. My belle dey pain me for about three days now.',
    'Book Appointment',
    '{"intent": "Book Appointment", "date": "Monday", "time": "09:00", "department": "General Consultation", "complaint": "Abdominal / Stomach pain"}'::jsonb,
    TRUE
  ),
  (
    'sample_hau_002',
    'Hausa-English Migraine & Fever Consultation',
    7.1,
    'Hausa + English',
    'Nigeria',
    'Kano / Northern Regional',
    'Appointment Booking',
    'Android phone',
    'Quiet',
    'Patient',
    'Ina son ganin likita next Tuesday at 10 in the morning. Ina fama da ciwon kai da zazzabi since yesterday.',
    'Book Appointment',
    '{"intent": "Book Appointment", "date": "Tuesday", "time": "10:00", "department": "General Consultation", "complaint": "Headache and fever"}'::jsonb,
    TRUE
  ),
  (
    'sample_yor_003',
    'Yoruba-English Ante-Natal Checkup',
    5.8,
    'Yoruba + English',
    'Nigeria',
    'Ibadan / Oyo Accent',
    'Patient Intake',
    'Android phone',
    'Moderate noise',
    'Patient',
    'E kaaro sir, mo fe book appointment pelu doctor for next Wednesday morning. Osu marun lo ti wa lara mi.',
    'Book Appointment',
    '{"intent": "Book Appointment", "date": "Wednesday", "time": "09:00", "department": "Maternity & Obstetrics", "complaint": "Antenatal routine checkup"}'::jsonb,
    TRUE
  ),
  (
    'sample_ibo_004',
    'Igbo-English Routine Eye & Vision Check',
    6.5,
    'Igbo + English',
    'Nigeria',
    'Enugu / South-East Regional',
    'Appointment Booking',
    'Android phone',
    'Quiet',
    'Patient',
    'Ndewo, achoro m ịhụ doctor on Friday morning. Anya na-agba m mmiri and I cannot see far things clearly.',
    'Book Appointment',
    '{"intent": "Book Appointment", "date": "Friday", "time": "09:00", "department": "Ophthalmology / Eye Clinic", "complaint": "Watery eyes and blurred distance vision"}'::jsonb,
    TRUE
  ),
  (
    'sample_eng_005',
    'Nigerian Clinician Post-Operative Ward Round Dictation',
    8.4,
    'English (Nigeria)',
    'Nigeria',
    'Clinician Standard',
    'Clinical Documentation',
    'Laptop',
    'Quiet',
    'Doctor',
    'Patient is post-op day two following exploratory laparotomy. Abdomen soft, non-distended. Bowel sounds present. Continue IV Ceftriaxone 1g daily and maintain adequate hydration.',
    'Clinical Documentation',
    '{"intent": "Clinical Documentation", "department": "General Surgery", "complaint": "Post-op day 2 laparotomy monitoring"}'::jsonb,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Encounters AI Summaries & Key Findings (AI Gateway Persistence)
ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_patient_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_key_findings TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_next_steps TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_differential_diagnoses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_red_flags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ;

