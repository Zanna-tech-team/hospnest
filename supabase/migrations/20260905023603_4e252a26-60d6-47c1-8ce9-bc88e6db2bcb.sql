-- ============================================================
-- HOSPNEST — PART 1: EXTENSIONS, ENUMS, TABLES, INDEXES, GRANTS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- ENUM TYPES ----------
CREATE TYPE public.user_role_type       AS ENUM ('super_admin','hospital_admin','doctor','nurse','lab_tech','pharmacist','patient');
CREATE TYPE public.hospital_type        AS ENUM ('government','private');
CREATE TYPE public.bed_status           AS ENUM ('available','occupied','reserved','maintenance');
CREATE TYPE public.bed_type             AS ENUM ('general','icu','er','maternity','pediatric');
CREATE TYPE public.appointment_status   AS ENUM ('booked','checked_in','in_consultation','completed','cancelled','no_show');
CREATE TYPE public.encounter_status     AS ENUM ('triage','consultation','lab_pending','pharmacy_pending','admitted','discharged','closed');
CREATE TYPE public.lab_status           AS ENUM ('ordered','sample_collected','processing','completed','critical','cancelled');
CREATE TYPE public.prescription_status  AS ENUM ('pending','dispensed','partially_dispensed','cancelled');
CREATE TYPE public.invoice_status       AS ENUM ('pending','partially_paid','paid','waived','cancelled');
CREATE TYPE public.payment_method       AS ENUM ('cash','card','bank_transfer','insurance','ussd');
CREATE TYPE public.insurance_claim_status AS ENUM ('draft','submitted','reviewing','approved','rejected');
CREATE TYPE public.gender_allocation    AS ENUM ('male','female','mixed');

-- ============================================================
-- 2. TENANCY & INFRASTRUCTURE
-- ============================================================

CREATE TABLE public.hospitals (
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

CREATE TABLE public.hospital_landing_pages (
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

CREATE TABLE public.departments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL,
  floor           TEXT,
  head_of_dept_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, code)
);

-- ============================================================
-- 3. NATIONAL IDENTITY, USERS & ROLES
-- ============================================================

CREATE TABLE public.patients (
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

CREATE TABLE public.user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  role        public.user_role_type NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, hospital_id, role)
);

CREATE TABLE public.staff (
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

ALTER TABLE public.departments
  ADD CONSTRAINT departments_head_of_dept_fk
  FOREIGN KEY (head_of_dept_id) REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE TABLE public.wards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id     UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  gender_allocation public.gender_allocation NOT NULL DEFAULT 'mixed',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.beds (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id            UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  bed_number         TEXT NOT NULL,
  bed_type           public.bed_type NOT NULL DEFAULT 'general',
  status             public.bed_status NOT NULL DEFAULT 'available',
  current_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ward_id, bed_number)
);

CREATE TABLE public.staff_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  hospital_id   UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ward_id       UUID REFERENCES public.wards(id) ON DELETE SET NULL,
  shift_name    TEXT NOT NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_consents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  granted_by  UUID,
  scope       TEXT NOT NULL DEFAULT 'full_record',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. APPOINTMENTS, QUEUES & ENCOUNTERS
-- ============================================================

CREATE TABLE public.appointments (
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

CREATE TABLE public.encounters (
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
  is_break_glass     BOOLEAN NOT NULL DEFAULT FALSE,
  break_glass_reason TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at          TIMESTAMPTZ,
  CONSTRAINT break_glass_requires_reason
    CHECK (is_break_glass = FALSE OR (break_glass_reason IS NOT NULL AND length(btrim(break_glass_reason)) > 5))
);

CREATE TABLE public.triage_vitals (
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

-- ============================================================
-- 5. LABORATORY & DIAGNOSTICS
-- ============================================================

CREATE TABLE public.lab_test_catalog (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                     TEXT NOT NULL UNIQUE,
  name                     TEXT NOT NULL,
  category                 TEXT,
  standard_reference_range JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hospital_lab_tests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  test_catalog_id  UUID NOT NULL REFERENCES public.lab_test_catalog(id) ON DELETE CASCADE,
  price            NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_available     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, test_catalog_id)
);

CREATE TABLE public.lab_orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id       UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  hospital_id        UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id         UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_id            UUID NOT NULL REFERENCES public.hospital_lab_tests(id) ON DELETE RESTRICT,
  ordered_by         UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  technician_id      UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  status             public.lab_status NOT NULL DEFAULT 'ordered',
  sample_type        TEXT,
  sample_collected_at TIMESTAMPTZ,
  result_value       TEXT,
  result_metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_critical        BOOLEAN NOT NULL DEFAULT FALSE,
  critical_flagged_at TIMESTAMPTZ,
  result_file_url    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. PHARMACY & INVENTORY
-- ============================================================

CREATE TABLE public.drug_catalog (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_name TEXT NOT NULL,
  brand_name   TEXT,
  dosage_form  TEXT,
  strength     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (generic_name, brand_name, dosage_form, strength)
);

CREATE TABLE public.hospital_inventory (
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

CREATE TABLE public.prescriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  hospital_id  UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id   UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id    UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  status       public.prescription_status NOT NULL DEFAULT 'pending',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.prescription_items (
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

-- ============================================================
-- 7. BILLING & INSURANCE
-- ============================================================

CREATE TABLE public.invoices (
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

CREATE TABLE public.billing_line_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  description  TEXT,
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price  NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
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

CREATE TABLE public.insurance_claims (
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

-- ============================================================
-- 8. TAMPER-EVIDENT AUDIT LOG
-- ============================================================

CREATE TABLE public.record_audit_logs (
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

-- ============================================================
-- 10. COMPOSITE INDEXES
-- ============================================================
CREATE INDEX idx_hospitals_slug              ON public.hospitals (slug);
CREATE INDEX idx_hospitals_state_type        ON public.hospitals (state, hospital_type);
CREATE INDEX idx_landing_pages_hospital      ON public.hospital_landing_pages (hospital_id);
CREATE INDEX idx_departments_hospital        ON public.departments (hospital_id);
CREATE INDEX idx_patients_nin                ON public.patients (nin);
CREATE INDEX idx_patients_user               ON public.patients (user_id);
CREATE INDEX idx_patients_name               ON public.patients (last_name, first_name);
CREATE INDEX idx_user_roles_user             ON public.user_roles (user_id, is_active);
CREATE INDEX idx_user_roles_hospital_role    ON public.user_roles (hospital_id, role);
CREATE INDEX idx_staff_hospital_user         ON public.staff (hospital_id, user_id);
CREATE INDEX idx_staff_hospital_dept         ON public.staff (hospital_id, department_id);
CREATE INDEX idx_schedules_staff_window      ON public.staff_schedules (staff_id, start_time, end_time);
CREATE INDEX idx_schedules_hospital          ON public.staff_schedules (hospital_id, department_id);
CREATE INDEX idx_consents_patient_hospital   ON public.patient_consents (patient_id, hospital_id, is_active);
CREATE INDEX idx_wards_hospital              ON public.wards (hospital_id);
CREATE INDEX idx_beds_ward_status            ON public.beds (ward_id, status);
CREATE INDEX idx_appointments_hosp_patient   ON public.appointments (hospital_id, patient_id);
CREATE INDEX idx_appointments_patient_recent ON public.appointments (patient_id, created_at DESC);
CREATE INDEX idx_appointments_queue          ON public.appointments (hospital_id, appointment_date, status);
CREATE INDEX idx_encounters_hosp_patient     ON public.encounters (hospital_id, patient_id);
CREATE INDEX idx_encounters_patient_recent   ON public.encounters (patient_id, created_at DESC);
CREATE INDEX idx_encounters_status           ON public.encounters (hospital_id, encounter_status);
CREATE INDEX idx_encounters_ward             ON public.encounters (ward_id);
CREATE INDEX idx_vitals_hosp_patient         ON public.triage_vitals (hospital_id, patient_id);
CREATE INDEX idx_hospital_lab_tests_hospital ON public.hospital_lab_tests (hospital_id, is_available);
CREATE INDEX idx_lab_orders_hosp_patient     ON public.lab_orders (hospital_id, patient_id);
CREATE INDEX idx_lab_orders_patient_recent   ON public.lab_orders (patient_id, created_at DESC);
CREATE INDEX idx_lab_orders_worklist         ON public.lab_orders (hospital_id, status, created_at DESC);
CREATE INDEX idx_inventory_hospital_drug     ON public.hospital_inventory (hospital_id, drug_id);
CREATE INDEX idx_inventory_reorder           ON public.hospital_inventory (hospital_id, quantity_in_stock);
CREATE INDEX idx_prescriptions_hosp_patient  ON public.prescriptions (hospital_id, patient_id);
CREATE INDEX idx_prescriptions_recent        ON public.prescriptions (patient_id, created_at DESC);
CREATE INDEX idx_prescription_items_rx       ON public.prescription_items (prescription_id);
CREATE INDEX idx_invoices_hosp_patient       ON public.invoices (hospital_id, patient_id);
CREATE INDEX idx_invoices_patient_recent     ON public.invoices (patient_id, created_at DESC);
CREATE INDEX idx_line_items_invoice          ON public.billing_line_items (invoice_id);
CREATE INDEX idx_payments_hosp_patient       ON public.payments (hospital_id, patient_id);
CREATE INDEX idx_claims_hosp_patient         ON public.insurance_claims (hospital_id, patient_id);
CREATE INDEX idx_audit_hospital_id           ON public.record_audit_logs (hospital_id, id);
CREATE INDEX idx_audit_patient_time          ON public.record_audit_logs (patient_id, "timestamp" DESC);

-- ============================================================
-- GRANTS (Data API access)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals, public.hospital_landing_pages, public.departments,
  public.patients, public.user_roles, public.staff, public.staff_schedules, public.patient_consents,
  public.wards, public.beds, public.appointments, public.encounters, public.triage_vitals,
  public.lab_test_catalog, public.hospital_lab_tests, public.lab_orders, public.drug_catalog,
  public.hospital_inventory, public.prescriptions, public.prescription_items, public.invoices,
  public.billing_line_items, public.payments, public.insurance_claims TO authenticated;

GRANT SELECT, INSERT ON public.record_audit_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.record_audit_logs_id_seq TO authenticated, service_role;

GRANT ALL ON public.hospitals, public.hospital_landing_pages, public.departments,
  public.patients, public.user_roles, public.staff, public.staff_schedules, public.patient_consents,
  public.wards, public.beds, public.appointments, public.encounters, public.triage_vitals,
  public.lab_test_catalog, public.hospital_lab_tests, public.lab_orders, public.drug_catalog,
  public.hospital_inventory, public.prescriptions, public.prescription_items, public.invoices,
  public.billing_line_items, public.payments, public.insurance_claims, public.record_audit_logs TO service_role;

-- Public (anon) may read only published hospital marketing surfaces and shared catalogs
GRANT SELECT ON public.hospitals, public.hospital_landing_pages, public.departments,
  public.lab_test_catalog, public.drug_catalog TO anon;
GRANT INSERT ON public.appointments TO anon;