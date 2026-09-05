-- ============================================================
-- HOSPNEST — PART 2: SECURITY FUNCTIONS, TRIGGERS, RLS
-- ============================================================

-- ---------- ROLE / TENANCY HELPERS ----------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role_type)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = _user_id AND ur.role = _role AND ur.is_active);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_hospital(_hospital_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _hospital_id IS NOT NULL AND (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.hospital_id = _hospital_id AND ur.is_active
                 AND ur.role <> 'patient')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_hospital_admin(_hospital_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.hospital_id = _hospital_id
                 AND ur.role = 'hospital_admin' AND ur.is_active);
$$;

-- Clinical roles may read clinical narrative columns; others are masked.
CREATE OR REPLACE FUNCTION public.is_clinical_at(_hospital_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.hospital_id = _hospital_id AND ur.is_active
                 AND ur.role IN ('doctor','nurse','lab_tech','pharmacist','hospital_admin'));
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

-- ABAC: is the caller rostered on an active shift covering this department/ward?
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

-- Consent: an external hospital may read a patient record only with unexpired consent.
CREATE OR REPLACE FUNCTION public.has_patient_consent(_patient_id UUID, _hospital_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_consents pc
    WHERE pc.patient_id = _patient_id AND pc.hospital_id = _hospital_id
      AND pc.is_active AND (pc.expires_at IS NULL OR pc.expires_at > now())
  );
$$;

-- Universal patient-record access rule.
CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
    OR _patient_id = public.current_patient_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_active AND ur.role <> 'patient'
        AND ur.hospital_id IS NOT NULL
        AND (
          EXISTS (SELECT 1 FROM public.encounters e
                  WHERE e.patient_id = _patient_id AND e.hospital_id = ur.hospital_id)
          OR EXISTS (SELECT 1 FROM public.appointments a
                     WHERE a.patient_id = _patient_id AND a.hospital_id = ur.hospital_id)
          OR public.has_patient_consent(_patient_id, ur.hospital_id)
        )
    );
$$;

-- Encounter-level ABAC + break-glass.
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
        OR EXISTS (SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = auth.uid() AND ur.is_active AND ur.role <> 'patient'
                     AND public.has_patient_consent(e.patient_id, ur.hospital_id))
      )
  );
$$;

-- ---------- TAMPER-EVIDENT AUDIT LOG ----------
CREATE OR REPLACE FUNCTION public.audit_log_hash_chain()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev TEXT;
BEGIN
  SELECT record_hash INTO prev FROM public.record_audit_logs ORDER BY id DESC LIMIT 1;
  IF prev IS NULL THEN prev := repeat('0', 64); END IF;

  NEW."timestamp"   := COALESCE(NEW."timestamp", now());
  NEW.previous_hash := prev;
  NEW.record_hash   := encode(
    digest(prev || COALESCE(NEW.accessor_id::text,'') || NEW.action ||
           COALESCE(NEW.patient_id::text,'') || NEW."timestamp"::text, 'sha256'), 'hex');

  IF NEW.action = 'BREAK_GLASS_OVERRIDE'
     AND (NEW.justification IS NULL OR length(btrim(NEW.justification)) < 6) THEN
    RAISE EXCEPTION 'A written justification is required for a break-glass override';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_audit_log_hash_chain
BEFORE INSERT ON public.record_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_log_hash_chain();

CREATE OR REPLACE FUNCTION public.audit_log_append_only()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'record_audit_logs is append-only: % is not permitted', TG_OP;
END; $$;

CREATE TRIGGER trg_audit_log_no_update BEFORE UPDATE ON public.record_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_log_append_only();

CREATE TRIGGER trg_audit_log_no_delete BEFORE DELETE ON public.record_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_log_append_only();

-- ---------- updated_at maintenance ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_hospitals_touch BEFORE UPDATE ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_landing_touch BEFORE UPDATE ON public.hospital_landing_pages
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_patients_touch BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.hospitals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_vitals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_catalog       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_lab_tests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_catalog           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_inventory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_line_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_audit_logs      ENABLE ROW LEVEL SECURITY;

-- ---------- hospitals ----------
CREATE POLICY hospitals_public_read ON public.hospitals
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY hospitals_signup ON public.hospitals
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY hospitals_admin_update ON public.hospitals
  FOR UPDATE TO authenticated USING (public.is_hospital_admin(id)) WITH CHECK (public.is_hospital_admin(id));
CREATE POLICY hospitals_platform_delete ON public.hospitals
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- ---------- hospital_landing_pages ----------
CREATE POLICY landing_public_read ON public.hospital_landing_pages
  FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY landing_admin_all ON public.hospital_landing_pages
  FOR ALL TO authenticated USING (public.is_hospital_admin(hospital_id)) WITH CHECK (public.is_hospital_admin(hospital_id));

-- ---------- departments ----------
CREATE POLICY departments_public_read ON public.departments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY departments_admin_write ON public.departments
  FOR ALL TO authenticated USING (public.is_hospital_admin(hospital_id)) WITH CHECK (public.is_hospital_admin(hospital_id));

-- ---------- patients (national record) ----------
CREATE POLICY patients_read ON public.patients
  FOR SELECT TO authenticated USING (public.can_access_patient(id));
CREATE POLICY patients_self_insert ON public.patients
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.is_active AND ur.role <> 'patient')
  );
CREATE POLICY patients_update ON public.patients
  FOR UPDATE TO authenticated USING (public.can_access_patient(id)) WITH CHECK (public.can_access_patient(id));
CREATE POLICY patients_platform_delete ON public.patients
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- ---------- user_roles ----------
CREATE POLICY user_roles_read ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_hospital_admin(hospital_id));
CREATE POLICY user_roles_admin_write ON public.user_roles
  FOR ALL TO authenticated USING (public.is_hospital_admin(hospital_id)) WITH CHECK (public.is_hospital_admin(hospital_id));

-- ---------- staff ----------
CREATE POLICY staff_read ON public.staff
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_member_of_hospital(hospital_id));
CREATE POLICY staff_admin_write ON public.staff
  FOR ALL TO authenticated USING (public.is_hospital_admin(hospital_id)) WITH CHECK (public.is_hospital_admin(hospital_id));

-- ---------- wards & beds ----------
CREATE POLICY wards_read ON public.wards
  FOR SELECT TO authenticated USING (public.is_member_of_hospital(hospital_id));
CREATE POLICY wards_admin_write ON public.wards
  FOR ALL TO authenticated USING (public.is_hospital_admin(hospital_id)) WITH CHECK (public.is_hospital_admin(hospital_id));

CREATE POLICY beds_read ON public.beds
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.wards w WHERE w.id = ward_id AND public.is_member_of_hospital(w.hospital_id)));
CREATE POLICY beds_write ON public.beds
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.wards w WHERE w.id = ward_id AND public.is_member_of_hospital(w.hospital_id)))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.wards w WHERE w.id = ward_id AND public.is_member_of_hospital(w.hospital_id)));

-- ---------- staff_schedules (duty roster) ----------
CREATE POLICY schedules_read ON public.staff_schedules
  FOR SELECT TO authenticated USING (public.is_member_of_hospital(hospital_id));
CREATE POLICY schedules_admin_write ON public.staff_schedules
  FOR ALL TO authenticated USING (public.is_hospital_admin(hospital_id)) WITH CHECK (public.is_hospital_admin(hospital_id));

-- ---------- patient_consents ----------
CREATE POLICY consents_read ON public.patient_consents
  FOR SELECT TO authenticated USING (
    patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id));
CREATE POLICY consents_patient_write ON public.patient_consents
  FOR ALL TO authenticated
  USING (patient_id = public.current_patient_id())
  WITH CHECK (patient_id = public.current_patient_id());

-- ---------- appointments (incl. public microsite bookings) ----------
CREATE POLICY appointments_read ON public.appointments
  FOR SELECT TO authenticated USING (
    patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id));
CREATE POLICY appointments_staff_write ON public.appointments
  FOR ALL TO authenticated USING (public.is_member_of_hospital(hospital_id)) WITH CHECK (public.is_member_of_hospital(hospital_id));
CREATE POLICY appointments_patient_book ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (patient_id = public.current_patient_id());
CREATE POLICY appointments_external_book ON public.appointments
  FOR INSERT TO anon WITH CHECK (
    is_external_booking
    AND status = 'booked'
    AND EXISTS (SELECT 1 FROM public.hospital_landing_pages lp
                WHERE lp.hospital_id = appointments.hospital_id AND lp.is_published));

-- ---------- encounters ----------
CREATE POLICY encounters_read ON public.encounters
  FOR SELECT TO authenticated USING (
    patient_id = public.current_patient_id()
    OR public.is_hospital_admin(hospital_id)
    OR (public.is_member_of_hospital(hospital_id) AND (
          is_break_glass
          OR practitioner_id = public.current_staff_id(hospital_id)
          OR nurse_id = public.current_staff_id(hospital_id)
          OR public.is_on_active_shift(hospital_id, department_id, ward_id)))
    OR EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.is_active AND ur.role <> 'patient'
                 AND public.has_patient_consent(encounters.patient_id, ur.hospital_id)));
CREATE POLICY encounters_clinical_write ON public.encounters
  FOR INSERT TO authenticated WITH CHECK (public.is_clinical_at(hospital_id));
CREATE POLICY encounters_clinical_update ON public.encounters
  FOR UPDATE TO authenticated
  USING (public.is_clinical_at(hospital_id) AND (
          is_break_glass
          OR practitioner_id = public.current_staff_id(hospital_id)
          OR nurse_id = public.current_staff_id(hospital_id)
          OR public.is_on_active_shift(hospital_id, department_id, ward_id)
          OR public.is_hospital_admin(hospital_id)))
  WITH CHECK (public.is_clinical_at(hospital_id));
CREATE POLICY encounters_admin_delete ON public.encounters
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- Masked projection for non-clinical staff (billing, reception).
CREATE VIEW public.encounters_masked WITH (security_invoker = true) AS
SELECT e.id, e.hospital_id, e.patient_id, e.appointment_id, e.practitioner_id, e.nurse_id,
       e.department_id, e.ward_id, e.bed_id, e.encounter_status, e.chief_complaint,
       CASE WHEN public.is_clinical_at(e.hospital_id) THEN e.clinical_notes    ELSE NULL END AS clinical_notes,
       CASE WHEN public.is_clinical_at(e.hospital_id) THEN e.psychiatric_notes ELSE NULL END AS psychiatric_notes,
       CASE WHEN public.is_clinical_at(e.hospital_id) THEN e.diagnosis         ELSE NULL END AS diagnosis,
       CASE WHEN public.is_clinical_at(e.hospital_id) THEN e.icd10_codes       ELSE NULL END AS icd10_codes,
       e.is_break_glass, e.break_glass_reason, e.created_at, e.closed_at
FROM public.encounters e;
GRANT SELECT ON public.encounters_masked TO authenticated;

-- ---------- triage_vitals ----------
CREATE POLICY vitals_read ON public.triage_vitals
  FOR SELECT TO authenticated USING (
    patient_id = public.current_patient_id() OR public.can_access_encounter(encounter_id));
CREATE POLICY vitals_write ON public.triage_vitals
  FOR ALL TO authenticated
  USING (public.is_clinical_at(hospital_id) AND public.can_access_encounter(encounter_id))
  WITH CHECK (public.is_clinical_at(hospital_id) AND public.can_access_encounter(encounter_id));

-- ---------- shared catalogs ----------
CREATE POLICY lab_catalog_read ON public.lab_test_catalog
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY lab_catalog_write ON public.lab_test_catalog
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY drug_catalog_read ON public.drug_catalog
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY drug_catalog_write ON public.drug_catalog
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ---------- hospital_lab_tests ----------
CREATE POLICY hospital_lab_tests_read ON public.hospital_lab_tests
  FOR SELECT TO authenticated USING (public.is_member_of_hospital(hospital_id));
CREATE POLICY hospital_lab_tests_write ON public.hospital_lab_tests
  FOR ALL TO authenticated USING (public.is_hospital_admin(hospital_id)) WITH CHECK (public.is_hospital_admin(hospital_id));

-- ---------- lab_orders ----------
CREATE POLICY lab_orders_read ON public.lab_orders
  FOR SELECT TO authenticated USING (
    patient_id = public.current_patient_id() OR public.can_access_encounter(encounter_id));
CREATE POLICY lab_orders_write ON public.lab_orders
  FOR ALL TO authenticated
  USING (public.is_clinical_at(hospital_id) AND public.is_member_of_hospital(hospital_id))
  WITH CHECK (public.is_clinical_at(hospital_id) AND public.is_member_of_hospital(hospital_id));

-- ---------- pharmacy ----------
CREATE POLICY inventory_read ON public.hospital_inventory
  FOR SELECT TO authenticated USING (public.is_member_of_hospital(hospital_id));
CREATE POLICY inventory_write ON public.hospital_inventory
  FOR ALL TO authenticated
  USING (public.is_member_of_hospital(hospital_id)) WITH CHECK (public.is_member_of_hospital(hospital_id));

CREATE POLICY prescriptions_read ON public.prescriptions
  FOR SELECT TO authenticated USING (
    patient_id = public.current_patient_id() OR public.can_access_encounter(encounter_id));
CREATE POLICY prescriptions_write ON public.prescriptions
  FOR ALL TO authenticated
  USING (public.is_clinical_at(hospital_id)) WITH CHECK (public.is_clinical_at(hospital_id));

CREATE POLICY prescription_items_read ON public.prescription_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id
            AND (p.patient_id = public.current_patient_id() OR public.can_access_encounter(p.encounter_id))));
CREATE POLICY prescription_items_write ON public.prescription_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND public.is_clinical_at(p.hospital_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND public.is_clinical_at(p.hospital_id)));

-- ---------- billing ----------
CREATE POLICY invoices_read ON public.invoices
  FOR SELECT TO authenticated USING (
    patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id));
CREATE POLICY invoices_write ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_member_of_hospital(hospital_id)) WITH CHECK (public.is_member_of_hospital(hospital_id));

CREATE POLICY line_items_read ON public.billing_line_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id
            AND (i.patient_id = public.current_patient_id() OR public.is_member_of_hospital(i.hospital_id))));
CREATE POLICY line_items_write ON public.billing_line_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_member_of_hospital(i.hospital_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_member_of_hospital(i.hospital_id)));

CREATE POLICY payments_read ON public.payments
  FOR SELECT TO authenticated USING (
    patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id));
CREATE POLICY payments_write ON public.payments
  FOR ALL TO authenticated
  USING (public.is_member_of_hospital(hospital_id)) WITH CHECK (public.is_member_of_hospital(hospital_id));

CREATE POLICY claims_read ON public.insurance_claims
  FOR SELECT TO authenticated USING (
    patient_id = public.current_patient_id() OR public.is_member_of_hospital(hospital_id));
CREATE POLICY claims_write ON public.insurance_claims
  FOR ALL TO authenticated
  USING (public.is_member_of_hospital(hospital_id)) WITH CHECK (public.is_member_of_hospital(hospital_id));

-- ---------- record_audit_logs (append-only ledger) ----------
CREATE POLICY audit_read ON public.record_audit_logs
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR public.is_hospital_admin(hospital_id)
    OR patient_id = public.current_patient_id());
CREATE POLICY audit_append ON public.record_audit_logs
  FOR INSERT TO authenticated WITH CHECK (accessor_id = auth.uid());
-- No UPDATE or DELETE policy exists: the ledger is immutable at the policy layer,
-- and the append-only triggers block privileged paths as well.