-- HospNest Phase 3 Core Database Schema Enhancements (Prompts 39 - 43)

-- 1. Patients Table Enhancements
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS genotype TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chronic_conditions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;

-- Create unique index on NIN for non-null values if not already present
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_nin_unique ON public.patients(nin) WHERE nin IS NOT NULL;

-- 2. Patient Consents & Privacy Enhancements (Prompt 39 & 43)
ALTER TABLE public.patient_consents
  ADD COLUMN IF NOT EXISTS is_global_share BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_labs BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_prescriptions BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_imaging BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_clinical_notes BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_psychiatric_notes BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_sexual_health_notes BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scope_type TEXT DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- 3. Appointments Enhancements (Prompt 39)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_external_booking BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booking_reference TEXT,
  ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'patient_portal',
  ADD COLUMN IF NOT EXISTS symptoms_summary TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_external_booking ON public.appointments(hospital_id, is_external_booking, appointment_date);

-- 4. Notifications Table (Prompt 40 & 43)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'routine',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_target TEXT,
  entity_reference TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS "Service role & authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Service role & authenticated can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_user_id, is_read, created_at DESC);

-- 5. Lab Orders Enhancements (Prompt 40)
ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'routine',
  ADD COLUMN IF NOT EXISTS clinical_indication TEXT,
  ADD COLUMN IF NOT EXISTS specimen_type TEXT,
  ADD COLUMN IF NOT EXISTS sample_collected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS result_value TEXT,
  ADD COLUMN IF NOT EXISTS units TEXT,
  ADD COLUMN IF NOT EXISTS reference_range TEXT,
  ADD COLUMN IF NOT EXISTS is_out_of_range BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS interpretation TEXT,
  ADD COLUMN IF NOT EXISTS attached_file_url TEXT,
  ADD COLUMN IF NOT EXISTS technician_id UUID,
  ADD COLUMN IF NOT EXISTS technician_name TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID,
  ADD COLUMN IF NOT EXISTS acknowledged_by_name TEXT,
  ADD COLUMN IF NOT EXISTS acknowledgement_comment TEXT;

-- 6. Radiology Studies Enhancements (Prompt 40)
ALTER TABLE public.radiology_studies
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID,
  ADD COLUMN IF NOT EXISTS acknowledged_by_name TEXT,
  ADD COLUMN IF NOT EXISTS acknowledgement_comment TEXT,
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE;

-- 7. Hospital Onboarding & Profile Enhancements (Prompt 41)
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS licence_number TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#0d9488',
  ADD COLUMN IF NOT EXISTS brand_accent_color TEXT DEFAULT '#0284c7',
  ADD COLUMN IF NOT EXISTS public_headline TEXT,
  ADD COLUMN IF NOT EXISTS public_subheadline TEXT,
  ADD COLUMN IF NOT EXISTS public_about TEXT;

-- 8. Record Access Logs Enhancements (Prompt 43)
ALTER TABLE public.record_audit_logs
  ADD COLUMN IF NOT EXISTS accessor_name TEXT,
  ADD COLUMN IF NOT EXISTS hospital_name TEXT,
  ADD COLUMN IF NOT EXISTS accessed_categories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS was_break_glass BOOLEAN DEFAULT FALSE;
