-- Trigger-only functions: no direct callers at all.
REVOKE ALL ON FUNCTION public.audit_log_hash_chain()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_log_append_only()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at()       FROM PUBLIC, anon, authenticated;

-- Access-check helpers: required by RLS policies for signed-in users only.
DO $$
DECLARE fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.has_role(uuid, public.user_role_type)',
    'public.is_super_admin()',
    'public.is_member_of_hospital(uuid)',
    'public.is_hospital_admin(uuid)',
    'public.is_clinical_at(uuid)',
    'public.current_staff_id(uuid)',
    'public.current_patient_id()',
    'public.is_on_active_shift(uuid, uuid, uuid)',
    'public.has_patient_consent(uuid, uuid)',
    'public.can_access_patient(uuid)',
    'public.can_access_encounter(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;