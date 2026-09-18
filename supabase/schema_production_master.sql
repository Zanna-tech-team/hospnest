-- ============================================================================
-- HOSPNEST ENTERPRISE CLINICAL PLATFORM
-- PRODUCTION MASTER DATABASE SCHEMA & SECURITY SPECIFICATION (PostgreSQL 14+ / Supabase)
-- 
-- Architecture Principles:
-- 1. Universal National Patient Identification (11-Digit NIN Single-Record Standard)
-- 2. Strict Multi-Tenant Hospital Isolation (Government & Private Tenancy Model)
-- 3. Encounter-Anchored Clinical Lifecycle (Triage, Notes, Labs, Rx, Billing)
-- 4. 7-Role Attribute-Based Access Control (ABAC) & Duty Rostering
-- 5. Break-Glass Emergency Overrides with Cryptographic SHA-256 Tamper-Evident Hash Chain
-- 6. End-to-End Row-Level Security (RLS) Policies & High-Performance Composite Indexes
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS & CUSTOM ENUM TYPES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.user_role_type AS ENUM (
    'super_admin',
    'hospital_admin',
    'doctor',
    'nurse',
    'lab_tech',
    'pharmacist',
    'patient'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.hospital_type AS ENUM (
    'government',
    'private'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.bed_status AS ENUM (
    'available',
    'occupied',
    'reserved',
    'maintenance'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.bed_type AS ENUM (
    'general',
    'icu',
    'er',
    'maternity',
    'pediatric'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.gender_allocation AS ENUM (
    'male',
    'female',
    'mixed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM (
    'booked',
    'checked_in',
    'in_consultation',
    'completed',
    'cancelled',
    'no_show'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.encounter_status AS ENUM (
    'triage',
    'consultation',
    'lab_pending',
    'pharmacy_pending',
    'admitted',
    'discharged',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.lab_status AS ENUM (
    'ordered',
    'sample_collected',
    'processing',
    'completed',
    'critical',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.prescription_status AS ENUM (
    'pending',
    'dispensed',
    'partially_dispensed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM (
    'pending',
    'partially_paid',
    'paid',
    'waived',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'card',
    'bank_transfer',
    'insurance',
    'ussd'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.insurance_claim_status AS ENUM (
    'draft',
    'submitted',
    'reviewing',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- SECTION 2: TENANCY & INFRASTRUCTURE
-- ============================================================================

-- 2.1 Hospitals / Healthcare Facilities
CREATE TABLE IF NOT EXISTS public.hospitals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  hospital_type     public.hospital_type NOT NULL DEFAULT 'private',
  license_number    TEXT NOT NULL UNIQUE,
  state             TEXT NOT NULL,
  lga               TEXT,
  address           TEXT,
  contact_email     TEXT,
  contact_phone     TEXT,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  subscription_tier TEXT NOT NULL DEFAULT 'starter',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Hospital Public Microsite / Landing Page Configuration
CREATE TABLE IF NOT EXISTS public.hospital_landing_pages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id           UUID NOT NULL UNIQUE REFERENCES public.hospitals(id) ON DELETE CASCADE,
  hero_headline         TEXT NOT NULL DEFAULT 'Quality care, close to home',
  hero_subheadline      TEXT,
  about_us              TEXT,
  brand_color_primary   TEXT NOT NULL DEFAULT '#0B4F9E',
  brand_color_secondary TEXT NOT NULL DEFAULT '#12B5A5',
  services              JSONB NOT NULL DEFAULT '[]'::jsonb,
  doctors_showcase      JSONB NOT NULL DEFAULT '[]'::jsonb,
  public_contact        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Clinical Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL,
  floor           TEXT,
  head_of_dept_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, code)
);

-- 2.4 Wards & Beds
CREATE TABLE IF NOT EXISTS public.wards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id     UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  gender_allocation public.gender_allocation NOT NULL DEFAULT 'mixed',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.beds (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id            UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  bed_number         TEXT NOT NULL,
  bed_type           public.bed_type NOT NULL DEFAULT 'general',
  status             public.bed_status NOT NULL DEFAULT 'available',
  current_patient_id UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ward_id, bed_number)
);

-- ============================================================================
-- SECTION 3: NATIONAL IDENTITY, USERS & ROLES
-- ============================================================================

-- 3.1 Universal Patient Record (Identified strictly by 11-Digit NIN)
CREATE TABLE IF NOT EXISTS public.patients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID UNIQUE,
  nin                 CHAR(11) NOT NULL UNIQUE CHECK (nin ~ '^[0-9]{11}$'),
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  date_of_birth       DATE,
  gender              TEXT,
  phone               TEXT,
  email               TEXT,
  blood_group         TEXT,
  genotype            TEXT,
  allergies           TEXT[] NOT NULL DEFAULT '{}',
  chronic_conditions  TEXT[] NOT NULL DEFAULT '{}',
  emergency_contact   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add Foreign Key from beds to patients
DO $$ BEGIN
  ALTER TABLE public.beds
    ADD CONSTRAINT beds_current_patient_fkey
    FOREIGN KEY (current_patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3.2 User Roles (Multi-Tenant & Super Admin Governance)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  role        public.user_role_type NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, hospital_id, role)
);

-- 3.3 Staff Profiles
CREATE TABLE IF NOT EXISTS public.staff (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID,
  hospital_id            UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id          UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  full_name              TEXT NOT NULL,
  staff_id_code          TEXT NOT NULL,
  medical_license_number TEXT,
  specialization         TEXT,
  phone                  TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, staff_id_code)
);

-- Add Foreign Key from departments to staff (Head of Department)
DO $$ BEGIN
  ALTER TABLE public.departments
    ADD CONSTRAINT departments_head_of_dept_fk
    FOREIGN KEY (head_of_dept_id) REFERENCES public.staff(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3.4 Duty Rostering & Staff Shift Allocations
CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  hospital_id   UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ward_id       UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  shift_name    TEXT NOT NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_shift_time_window CHECK (end_time > start_time)
);

-- 3.5 Cross-Hospital Patient Consent Management
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  granted_by  UUID,
  scope       TEXT NOT NULL DEFAULT 'full_record',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, hospital_id)
);

-- ============================================================================
-- SECTION 4: APPOINTMENTS, QUEUES & ENCOUNTERS
-- ============================================================================

-- 4.1 Appointments & Outpatient Queue
CREATE TABLE IF NOT EXISTS public.appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id           UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  department_id       UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  appointment_date    TIMESTAMPTZ NOT NULL,
  status              public.appointment_status NOT NULL DEFAULT 'booked',
  is_external_booking BOOLEAN NOT NULL DEFAULT FALSE,
  is_walk_in          BOOLEAN NOT NULL DEFAULT FALSE,
  queue_number        INT,
  symptoms_summary    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 Clinical Encounters (Central Lifecycle Anchor)
CREATE TABLE IF NOT EXISTS public.encounters (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id        UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id         UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id     UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  practitioner_id    UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  nurse_id           UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  department_id      UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ward_id            UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  bed_id             UUID REFERENCES public.beds(id) ON DELETE SET NULL,
  encounter_status   public.encounter_status NOT NULL DEFAULT 'triage',
  chief_complaint    TEXT,
  clinical_notes     TEXT,
  psychiatric_notes  TEXT,
  diagnosis          TEXT,
  icd10_codes        TEXT[] NOT NULL DEFAULT '{}',
  ai_summary         TEXT,
  ai_patient_summary TEXT,
  ai_key_findings    TEXT[] NOT NULL DEFAULT '{}',
  ai_next_steps      TEXT[] NOT NULL DEFAULT '{}',
  is_break_glass     BOOLEAN NOT NULL DEFAULT FALSE,
  break_glass_reason TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at          TIMESTAMPTZ,
  CONSTRAINT break_glass_requires_reason
    CHECK (is_break_glass = FALSE OR (break_glass_reason IS NOT NULL AND length(btrim(break_glass_reason)) > 5))
);

-- 4.3 Nursing Triage & Vital Signs
CREATE TABLE IF NOT EXISTS public.triage_vitals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id     UUID NOT NULL UNIQUE REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id       UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id      UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  recorded_by      UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  body_temperature NUMERIC(4,1),
  systolic_bp      INT,
  diastolic_bp     INT,
  pulse_rate       INT,
  respiratory_rate INT,
  spo2             NUMERIC(5,2),
  weight_kg        NUMERIC(6,2),
  height_cm        NUMERIC(6,2),
  pain_score       INT CHECK (pain_score IS NULL OR (pain_score BETWEEN 0 AND 10)),
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 5: LABORATORY & DIAGNOSTICS
-- ============================================================================

-- 5.1 Universal Diagnostic Test Catalog
CREATE TABLE IF NOT EXISTS public.lab_test_catalog (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                     TEXT NOT NULL UNIQUE,
  name                     TEXT NOT NULL,
  category                 TEXT,
  standard_reference_range JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.2 Hospital-Specific Lab Test Pricing & Availability
CREATE TABLE IF NOT EXISTS public.hospital_lab_tests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  test_catalog_id  UUID NOT NULL REFERENCES public.lab_test_catalog(id) ON DELETE CASCADE,
  price            NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_available     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, test_catalog_id)
);

-- 5.3 Diagnostic Orders & Results Execution
CREATE TABLE IF NOT EXISTS public.lab_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id        UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  hospital_id         UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_id             UUID NOT NULL REFERENCES public.hospital_lab_tests(id) ON DELETE RESTRICT,
  ordered_by          UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  technician_id       UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  status              public.lab_status NOT NULL DEFAULT 'ordered',
  sample_type         TEXT,
  sample_collected_at TIMESTAMPTZ,
  result_value        TEXT,
  result_metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_critical         BOOLEAN NOT NULL DEFAULT FALSE,
  critical_flagged_at TIMESTAMPTZ,
  result_file_url     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 6: PHARMACY & INVENTORY TRACKING
-- ============================================================================

-- 6.1 Universal Drug Catalog
CREATE TABLE IF NOT EXISTS public.drug_catalog (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_name TEXT NOT NULL,
  brand_name   TEXT,
  dosage_form  TEXT,
  strength     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (generic_name, brand_name, dosage_form, strength)
);

-- 6.2 Hospital Pharmacy Batch Inventory
CREATE TABLE IF NOT EXISTS public.hospital_inventory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  drug_id           UUID NOT NULL REFERENCES public.drug_catalog(id) ON DELETE RESTRICT,
  batch_number      TEXT NOT NULL,
  quantity_in_stock INT NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
  reorder_level     INT NOT NULL DEFAULT 0,
  unit_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  expiry_date       DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, drug_id, batch_number)
);

-- 6.3 Clinical Prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  hospital_id  UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id   UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id    UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  status       public.prescription_status NOT NULL DEFAULT 'pending',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.4 Prescription Line Items & Dispensing Records
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id     UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  drug_id             UUID NOT NULL REFERENCES public.drug_catalog(id) ON DELETE RESTRICT,
  dosage              TEXT,
  frequency           TEXT,
  duration            TEXT,
  quantity_prescribed INT NOT NULL DEFAULT 1 CHECK (quantity_prescribed > 0),
  quantity_dispensed  INT NOT NULL DEFAULT 0 CHECK (quantity_dispensed >= 0),
  dispensed_by        UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  dispensed_at        TIMESTAMPTZ
);

-- ============================================================================
-- SECTION 7: CLINICAL BILLING & INSURANCE CLAIMS
-- ============================================================================

-- 7.1 Patient Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id              UUID NOT NULL UNIQUE REFERENCES public.encounters(id) ON DELETE CASCADE,
  hospital_id               UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id                UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  total_amount              NUMERIC(14,2) NOT NULL DEFAULT 0,
  insurance_coverage_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  patient_payable_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  status                    public.invoice_status NOT NULL DEFAULT 'pending',
  due_date                  DATE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.2 Detailed Billing Line Items
CREATE TABLE IF NOT EXISTS public.billing_line_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  description  TEXT,
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price  NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.3 Financial Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id            UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  hospital_id           UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id            UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  amount_paid           NUMERIC(14,2) NOT NULL CHECK (amount_paid > 0),
  payment_method        public.payment_method NOT NULL DEFAULT 'cash',
  transaction_reference TEXT UNIQUE,
  recorded_by           UUID,
  paid_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7.4 Insurance Claims
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  hospital_id   UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id    UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  policy_number TEXT,
  claim_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  status        public.insurance_claim_status NOT NULL DEFAULT 'draft',
  submitted_at  TIMESTAMPTZ,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 8: TAMPER-EVIDENT SHA-256 HASH CHAINED AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.record_audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  hospital_id   UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  accessor_id   UUID NOT NULL,
  accessor_role public.user_role_type NOT NULL,
  patient_id    UUID NOT NULL,
  encounter_id  UUID,
  action        TEXT NOT NULL CHECK (action IN ('READ','WRITE','BREAK_GLASS_OVERRIDE','EXPORT')),
  justification TEXT,
  ip_address    INET,
  previous_hash TEXT NOT NULL DEFAULT '',
  record_hash   TEXT NOT NULL DEFAULT '',
  "timestamp"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8.1 Cryptographic SHA-256 Hash Chain Trigger Function
CREATE OR REPLACE FUNCTION public.audit_log_hash_chain()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_catalog AS $$
DECLARE
  prev TEXT;
BEGIN
  -- Retrieve the latest cryptographic hash in sequence
  SELECT record_hash INTO prev FROM public.record_audit_logs ORDER BY id DESC LIMIT 1;
  IF prev IS NULL THEN
    prev := repeat('0', 64); -- Genesis hash anchor
  END IF;

  NEW."timestamp"   := COALESCE(NEW."timestamp", now());
  NEW.previous_hash := prev;
  NEW.record_hash   := encode(
    sha256((
      prev ||
      COALESCE(NEW.accessor_id::text, '') ||
      NEW.action ||
      COALESCE(NEW.patient_id::text, '') ||
      NEW."timestamp"::text
    )::bytea),
    'hex'
  );

  -- Mandatory clinical justification check for emergency break-glass actions
  IF NEW.action = 'BREAK_GLASS_OVERRIDE'
     AND (NEW.justification IS NULL OR length(btrim(NEW.justification)) < 6) THEN
    RAISE EXCEPTION 'A valid clinical justification is strictly required for a Break-Glass Override';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_hash_chain ON public.record_audit_logs;
CREATE TRIGGER trg_audit_log_hash_chain
BEFORE INSERT ON public.record_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_log_hash_chain();

-- 8.2 Strictly Append-Only Enforcement Trigger (Blocks UPDATE and DELETE)
CREATE OR REPLACE FUNCTION public.audit_log_append_only()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Cryptographic audit ledger is strictly append-only: % operation is forbidden', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_no_update ON public.record_audit_logs;
CREATE TRIGGER trg_audit_log_no_update
BEFORE UPDATE OR DELETE ON public.record_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_log_append_only();

-- ============================================================================
-- SECTION 9: ACCESS CONTROL FUNCTIONS & ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- 9.1 Helper Functions for Tenancy, Role & ABAC Verification
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role_type)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role AND ur.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_hospital(_hospital_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _hospital_id IS NOT NULL AND (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.hospital_id = _hospital_id
        AND ur.is_active
        AND ur.role <> 'patient'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_hospital_admin(_hospital_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.hospital_id = _hospital_id
        AND ur.role = 'hospital_admin'
        AND ur.is_active
    );
$$;

CREATE OR REPLACE FUNCTION public.is_clinical_at(_hospital_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.hospital_id = _hospital_id
        AND ur.is_active
        AND ur.role IN ('doctor', 'nurse', 'lab_tech', 'pharmacist', 'hospital_admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.current_staff_id(_hospital_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id FROM public.staff s
  WHERE s.user_id = auth.uid() AND s.hospital_id = _hospital_id AND s.is_active
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.patients p WHERE p.user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_on_active_shift(_hospital_id UUID, _department_id UUID, _ward_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_schedules sch
    JOIN public.staff s ON s.id = sch.staff_id
    WHERE s.user_id = auth.uid()
      AND sch.hospital_id = _hospital_id
      AND now() BETWEEN sch.start_time AND sch.end_time
      AND (sch.department_id IS NULL OR _department_id IS NULL OR sch.department_id = _department_id)
      AND (sch.ward_id IS NULL OR _ward_id IS NULL OR sch.ward_id = _ward_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_patient_consent(_patient_id UUID, _hospital_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_consents pc
    WHERE pc.patient_id = _patient_id
      AND pc.hospital_id = _hospital_id
      AND pc.is_active
      AND (pc.expires_at IS NULL OR pc.expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
    OR _patient_id = public.current_patient_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND ur.role <> 'patient'
        AND ur.hospital_id IS NOT NULL
        AND (
          EXISTS (SELECT 1 FROM public.encounters e WHERE e.patient_id = _patient_id AND e.hospital_id = ur.hospital_id)
          OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.patient_id = _patient_id AND a.hospital_id = ur.hospital_id)
          OR public.has_patient_consent(_patient_id, ur.hospital_id)
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_encounter(_encounter_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = _encounter_id
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR e.patient_id = public.current_patient_id()
        OR public.is_hospital_admin(e.hospital_id)
        OR (public.is_member_of_hospital(e.hospital_id) AND e.is_break_glass)
        OR (public.is_member_of_hospital(e.hospital_id) AND (
              e.practitioner_id = public.current_staff_id(e.hospital_id)
              OR e.nurse_id = public.current_staff_id(e.hospital_id)
              OR public.is_on_active_shift(e.hospital_id, e.department_id, e.ward_id)
           ))
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.is_active
            AND ur.role <> 'patient'
            AND public.has_patient_consent(e.patient_id, ur.hospital_id)
        )
      )
  );
$$;

-- 9.2 Enable Row Level Security (RLS) On All Core Tables
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_audit_logs ENABLE ROW LEVEL SECURITY;

-- 9.3 RLS Policies: Hospitals & Public Landing Pages
DROP POLICY IF EXISTS hospitals_select_public ON public.hospitals;
CREATE POLICY hospitals_select_public ON public.hospitals
  FOR SELECT USING (is_active = TRUE OR public.is_super_admin() OR public.is_member_of_hospital(id));

DROP POLICY IF EXISTS hospitals_modify_admin ON public.hospitals;
CREATE POLICY hospitals_modify_admin ON public.hospitals
  FOR ALL USING (public.is_super_admin() OR public.is_hospital_admin(id))
  WITH CHECK (public.is_super_admin() OR public.is_hospital_admin(id));

DROP POLICY IF EXISTS landing_pages_select ON public.hospital_landing_pages;
CREATE POLICY landing_pages_select ON public.hospital_landing_pages
  FOR SELECT USING (is_published = TRUE OR public.is_member_of_hospital(hospital_id));

DROP POLICY IF EXISTS landing_pages_manage ON public.hospital_landing_pages;
CREATE POLICY landing_pages_manage ON public.hospital_landing_pages
  FOR ALL USING (public.is_hospital_admin(hospital_id))
  WITH CHECK (public.is_hospital_admin(hospital_id));

-- 9.4 RLS Policies: Departments, Wards & Beds
DROP POLICY IF EXISTS departments_access ON public.departments;
CREATE POLICY departments_access ON public.departments
  FOR SELECT USING (public.is_member_of_hospital(hospital_id) OR auth.role() = 'anon');

DROP POLICY IF EXISTS departments_manage ON public.departments;
CREATE POLICY departments_manage ON public.departments
  FOR ALL USING (public.is_hospital_admin(hospital_id))
  WITH CHECK (public.is_hospital_admin(hospital_id));

DROP POLICY IF EXISTS wards_access ON public.wards;
CREATE POLICY wards_access ON public.wards
  FOR SELECT USING (public.is_member_of_hospital(hospital_id));

DROP POLICY IF EXISTS wards_manage ON public.wards;
CREATE POLICY wards_manage ON public.wards
  FOR ALL USING (public.is_hospital_admin(hospital_id))
  WITH CHECK (public.is_hospital_admin(hospital_id));

DROP POLICY IF EXISTS beds_access ON public.beds;
CREATE POLICY beds_access ON public.beds
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.wards w WHERE w.id = ward_id AND public.is_member_of_hospital(w.hospital_id)));

DROP POLICY IF EXISTS beds_manage ON public.beds;
CREATE POLICY beds_manage ON public.beds
  FOR ALL USING (EXISTS (SELECT 1 FROM public.wards w WHERE w.id = ward_id AND public.is_member_of_hospital(w.hospital_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.wards w WHERE w.id = ward_id AND public.is_member_of_hospital(w.hospital_id)));

-- 9.5 RLS Policies: Patients & Consents
DROP POLICY IF EXISTS patients_select ON public.patients;
CREATE POLICY patients_select ON public.patients
  FOR SELECT USING (public.can_access_patient(id));

DROP POLICY IF EXISTS patients_insert ON public.patients;
CREATE POLICY patients_insert ON public.patients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS patients_update ON public.patients;
CREATE POLICY patients_update ON public.patients
  FOR UPDATE USING (user_id = auth.uid() OR public.can_access_patient(id));

DROP POLICY IF EXISTS consents_access ON public.patient_consents;
CREATE POLICY consents_access ON public.patient_consents
  FOR ALL USING (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id))
  WITH CHECK (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id));

-- 9.6 RLS Policies: Appointments & Clinical Encounters
DROP POLICY IF EXISTS appointments_select ON public.appointments;
CREATE POLICY appointments_select ON public.appointments
  FOR SELECT USING (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id));

DROP POLICY IF EXISTS appointments_insert ON public.appointments;
CREATE POLICY appointments_insert ON public.appointments
  FOR INSERT WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.is_member_of_hospital(hospital_id)
    OR is_external_booking = TRUE
  );

DROP POLICY IF EXISTS appointments_modify ON public.appointments;
CREATE POLICY appointments_modify ON public.appointments
  FOR UPDATE USING (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id));

DROP POLICY IF EXISTS encounters_select ON public.encounters;
CREATE POLICY encounters_select ON public.encounters
  FOR SELECT USING (public.can_access_encounter(id));

DROP POLICY IF EXISTS encounters_insert ON public.encounters;
CREATE POLICY encounters_insert ON public.encounters
  FOR INSERT WITH CHECK (public.is_clinical_at(hospital_id));

DROP POLICY IF EXISTS encounters_update ON public.encounters;
CREATE POLICY encounters_update ON public.encounters
  FOR UPDATE USING (public.can_access_encounter(id));

DROP POLICY IF EXISTS triage_access ON public.triage_vitals;
CREATE POLICY triage_access ON public.triage_vitals
  FOR ALL USING (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id))
  WITH CHECK (public.is_member_of_hospital(hospital_id));

-- 9.7 RLS Policies: Laboratory & Pharmacy
DROP POLICY IF EXISTS lab_catalog_select ON public.lab_test_catalog;
CREATE POLICY lab_catalog_select ON public.lab_test_catalog FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS hospital_lab_tests_select ON public.hospital_lab_tests;
CREATE POLICY hospital_lab_tests_select ON public.hospital_lab_tests FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS hospital_lab_tests_manage ON public.hospital_lab_tests;
CREATE POLICY hospital_lab_tests_manage ON public.hospital_lab_tests
  FOR ALL USING (public.is_hospital_admin(hospital_id))
  WITH CHECK (public.is_hospital_admin(hospital_id));

DROP POLICY IF EXISTS lab_orders_access ON public.lab_orders;
CREATE POLICY lab_orders_access ON public.lab_orders
  FOR ALL USING (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id))
  WITH CHECK (public.is_member_of_hospital(hospital_id));

DROP POLICY IF EXISTS drug_catalog_select ON public.drug_catalog;
CREATE POLICY drug_catalog_select ON public.drug_catalog FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS inventory_access ON public.hospital_inventory;
CREATE POLICY inventory_access ON public.hospital_inventory
  FOR ALL USING (public.is_member_of_hospital(hospital_id))
  WITH CHECK (public.is_hospital_admin(hospital_id) OR public.has_role(auth.uid(), 'pharmacist'));

DROP POLICY IF EXISTS prescriptions_access ON public.prescriptions;
CREATE POLICY prescriptions_access ON public.prescriptions
  FOR ALL USING (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id))
  WITH CHECK (public.is_member_of_hospital(hospital_id));

DROP POLICY IF EXISTS rx_items_access ON public.prescription_items;
CREATE POLICY rx_items_access ON public.prescription_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND (p.patient_id = public.current_patient_id() OR public.is_member_of_hospital(p.hospital_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND public.is_member_of_hospital(p.hospital_id)));

-- 9.8 RLS Policies: Billing & Financial Audits
DROP POLICY IF EXISTS invoices_access ON public.invoices;
CREATE POLICY invoices_access ON public.invoices
  FOR ALL USING (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id))
  WITH CHECK (public.is_member_of_hospital(hospital_id));

DROP POLICY IF EXISTS billing_items_access ON public.billing_line_items;
CREATE POLICY billing_items_access ON public.billing_line_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (i.patient_id = public.current_patient_id() OR public.is_member_of_hospital(i.hospital_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_member_of_hospital(i.hospital_id)));

DROP POLICY IF EXISTS payments_access ON public.payments;
CREATE POLICY payments_access ON public.payments
  FOR ALL USING (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id))
  WITH CHECK (public.is_member_of_hospital(hospital_id));

DROP POLICY IF EXISTS claims_access ON public.insurance_claims;
CREATE POLICY claims_access ON public.insurance_claims
  FOR ALL USING (patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id))
  WITH CHECK (public.is_member_of_hospital(hospital_id));

-- 9.9 RLS Policies: Audit Ledger
DROP POLICY IF EXISTS audit_select_policy ON public.record_audit_logs;
CREATE POLICY audit_select_policy ON public.record_audit_logs
  FOR SELECT USING (public.is_super_admin() OR public.is_hospital_admin(hospital_id));

DROP POLICY IF EXISTS audit_insert_policy ON public.record_audit_logs;
CREATE POLICY audit_insert_policy ON public.record_audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- SECTION 10: HIGH-PERFORMANCE COMPOSITE INDEXES
-- ============================================================================

-- Tenancy & Infrastructure Indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_slug              ON public.hospitals (slug);
CREATE INDEX IF NOT EXISTS idx_hospitals_state_type        ON public.hospitals (state, hospital_type);
CREATE INDEX IF NOT EXISTS idx_landing_pages_hospital      ON public.hospital_landing_pages (hospital_id);
CREATE INDEX IF NOT EXISTS idx_departments_hospital        ON public.departments (hospital_id);
CREATE INDEX IF NOT EXISTS idx_wards_hospital              ON public.wards (hospital_id);
CREATE INDEX IF NOT EXISTS idx_beds_ward_status            ON public.beds (ward_id, status);

-- Identity, Roles & Staff Scheduling Indexes
CREATE INDEX IF NOT EXISTS idx_patients_nin                ON public.patients (nin);
CREATE INDEX IF NOT EXISTS idx_patients_user               ON public.patients (user_id);
CREATE INDEX IF NOT EXISTS idx_patients_name               ON public.patients (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user             ON public.user_roles (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_hospital_role    ON public.user_roles (hospital_id, role);
CREATE INDEX IF NOT EXISTS idx_staff_hospital_user         ON public.staff (hospital_id, user_id);
CREATE INDEX IF NOT EXISTS idx_staff_hospital_dept         ON public.staff (hospital_id, department_id);
CREATE INDEX IF NOT EXISTS idx_schedules_staff_window      ON public.staff_schedules (staff_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_schedules_hospital          ON public.staff_schedules (hospital_id, department_id);
CREATE INDEX IF NOT EXISTS idx_consents_patient_hospital   ON public.patient_consents (patient_id, hospital_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consents_patient_hosp_unique ON public.patient_consents (patient_id, hospital_id);

-- Clinical Encounters & Appointments Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_hosp_patient   ON public.appointments (hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_recent ON public.appointments (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_queue          ON public.appointments (hospital_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_encounters_hosp_patient     ON public.encounters (hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_recent   ON public.encounters (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_encounters_status           ON public.encounters (hospital_id, encounter_status);
CREATE INDEX IF NOT EXISTS idx_encounters_ward             ON public.encounters (ward_id);
CREATE INDEX IF NOT EXISTS idx_vitals_hosp_patient         ON public.triage_vitals (hospital_id, patient_id);

-- Laboratory & Pharmacy Indexes
CREATE INDEX IF NOT EXISTS idx_hospital_lab_tests_hosp     ON public.hospital_lab_tests (hospital_id, is_available);
CREATE INDEX IF NOT EXISTS idx_lab_orders_hosp_patient     ON public.lab_orders (hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_recent   ON public.lab_orders (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_orders_worklist         ON public.lab_orders (hospital_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_hospital_drug     ON public.hospital_inventory (hospital_id, drug_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder           ON public.hospital_inventory (hospital_id, quantity_in_stock);
CREATE INDEX IF NOT EXISTS idx_prescriptions_hosp_patient  ON public.prescriptions (hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_recent        ON public.prescriptions (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_items_rx       ON public.prescription_items (prescription_id);

-- Billing & Audit Ledger Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_hosp_patient       ON public.invoices (hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_recent     ON public.invoices (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice          ON public.billing_line_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_hosp_patient       ON public.payments (hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_hosp_patient         ON public.insurance_claims (hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_hospital_id           ON public.record_audit_logs (hospital_id, id);
CREATE INDEX IF NOT EXISTS idx_audit_patient_time          ON public.record_audit_logs (patient_id, "timestamp" DESC);

-- ============================================================================
-- SECTION 11: PERMISSIONS & DATA API GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON 
  public.hospitals,
  public.hospital_landing_pages,
  public.departments,
  public.patients,
  public.user_roles,
  public.staff,
  public.staff_schedules,
  public.patient_consents,
  public.wards,
  public.beds,
  public.appointments,
  public.encounters,
  public.triage_vitals,
  public.lab_test_catalog,
  public.hospital_lab_tests,
  public.lab_orders,
  public.drug_catalog,
  public.hospital_inventory,
  public.prescriptions,
  public.prescription_items,
  public.invoices,
  public.billing_line_items,
  public.payments,
  public.insurance_claims
TO authenticated;

GRANT SELECT, INSERT ON public.record_audit_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.record_audit_logs_id_seq TO authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Public / Anonymous access for external appointment booking and public hospital profile
GRANT SELECT ON public.hospitals, public.hospital_landing_pages, public.departments, public.lab_test_catalog, public.drug_catalog TO anon;
GRANT INSERT ON public.appointments TO anon;
