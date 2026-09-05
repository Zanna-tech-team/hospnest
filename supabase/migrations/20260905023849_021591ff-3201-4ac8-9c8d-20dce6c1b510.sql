CREATE OR REPLACE FUNCTION public.audit_log_hash_chain()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev TEXT;
BEGIN
  SELECT record_hash INTO prev FROM public.record_audit_logs ORDER BY id DESC LIMIT 1;
  IF prev IS NULL THEN prev := repeat('0', 64); END IF;

  NEW."timestamp"   := COALESCE(NEW."timestamp", now());
  NEW.previous_hash := prev;
  -- record_hash = SHA256(previous_hash || accessor_id || action || patient_id || timestamp)
  NEW.record_hash   := encode(sha256(convert_to(
      prev || COALESCE(NEW.accessor_id::text,'') || NEW.action ||
      COALESCE(NEW.patient_id::text,'') || NEW."timestamp"::text, 'UTF8')), 'hex');

  IF NEW.action = 'BREAK_GLASS_OVERRIDE'
     AND (NEW.justification IS NULL OR length(btrim(NEW.justification)) < 6) THEN
    RAISE EXCEPTION 'A written justification is required for a break-glass override';
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.audit_log_hash_chain() FROM PUBLIC, anon, authenticated;