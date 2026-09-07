-- ============================================================
-- HOSPNEST — PHARMACY DISPENSING & BILLING INTEGRATION MIGRATION
-- ============================================================

-- 1. Add dispense_notes to prescription_items if not already present
ALTER TABLE public.prescription_items 
ADD COLUMN IF NOT EXISTS dispense_notes TEXT;

-- 2. Ensure RLS policies on prescription_items allow hospital staff to update upon dispensing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prescription_items' AND policyname = 'prescription_items_dispense_update'
  ) THEN
    CREATE POLICY prescription_items_dispense_update ON public.prescription_items
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.prescriptions p 
        WHERE p.id = prescription_id AND public.is_member_of_hospital(p.hospital_id)
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.prescriptions p 
        WHERE p.id = prescription_id AND public.is_member_of_hospital(p.hospital_id)
      ));
  END IF;
END $$;

-- 3. Ensure RLS policies on prescriptions allow updating status upon dispensing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'prescriptions_dispense_update'
  ) THEN
    CREATE POLICY prescriptions_dispense_update ON public.prescriptions
      FOR UPDATE TO authenticated
      USING (public.is_member_of_hospital(hospital_id))
      WITH CHECK (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

-- 4. Ensure RLS policies on hospital_inventory allow updating stock during dispensing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hospital_inventory' AND policyname = 'hospital_inventory_dispense_update'
  ) THEN
    CREATE POLICY hospital_inventory_dispense_update ON public.hospital_inventory
      FOR UPDATE TO authenticated
      USING (public.is_member_of_hospital(hospital_id))
      WITH CHECK (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

-- 5. Indexes for fast dispensing queue retrieval
CREATE INDEX IF NOT EXISTS idx_prescriptions_hospital_status ON public.prescriptions (hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_prescription_items_rx_drug ON public.prescription_items (prescription_id, drug_id);
