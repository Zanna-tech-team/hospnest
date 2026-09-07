-- ============================================================
-- HOSPNEST — PHARMACY INVENTORY & STOCK MOVEMENTS MIGRATION
-- ============================================================

-- 1. Create stock_movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  inventory_id    UUID REFERENCES public.hospital_inventory(id) ON DELETE SET NULL,
  drug_id         UUID NOT NULL REFERENCES public.drug_catalog(id) ON DELETE CASCADE,
  movement_type   TEXT NOT NULL CHECK (movement_type IN ('restock', 'dispense', 'adjustment', 'return', 'expired')),
  quantity_change INT NOT NULL,
  previous_stock  INT NOT NULL DEFAULT 0,
  new_stock       INT NOT NULL DEFAULT 0,
  reason          TEXT,
  performed_by    UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stock_movements' AND policyname = 'stock_movements_hospital_read'
  ) THEN
    CREATE POLICY stock_movements_hospital_read ON public.stock_movements
      FOR SELECT TO authenticated
      USING (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stock_movements' AND policyname = 'stock_movements_hospital_write'
  ) THEN
    CREATE POLICY stock_movements_hospital_write ON public.stock_movements
      FOR ALL TO authenticated
      USING (public.is_member_of_hospital(hospital_id))
      WITH CHECK (public.is_member_of_hospital(hospital_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_movements_hospital ON public.stock_movements (hospital_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory ON public.stock_movements (inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_drug ON public.stock_movements (drug_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements (created_at DESC);

-- 2. Seed all existing hospitals with initial hospital_inventory stock rows
INSERT INTO public.hospital_inventory (
  hospital_id,
  drug_id,
  batch_number,
  unit_price,
  quantity_in_stock,
  reorder_level,
  expiry_date
)
SELECT
  h.id,
  d.id,
  'BATCH-' || substring(md5(h.id::text || d.id::text) from 1 for 6),
  CASE
    WHEN d.generic_name LIKE '%Artemether%' THEN 2200
    WHEN d.generic_name LIKE '%Amoxicillin%' THEN 3500
    WHEN d.generic_name LIKE '%Ciprofloxacin%' THEN 1800
    WHEN d.generic_name LIKE '%Paracetamol%' THEN 500
    WHEN d.generic_name LIKE '%Amlodipine%' THEN 1500
    WHEN d.generic_name LIKE '%Metformin%' THEN 2000
    WHEN d.generic_name LIKE '%Omeprazole%' THEN 1200
    WHEN d.generic_name LIKE '%Salbutamol%' THEN 3800
    ELSE 1500
  END,
  CASE
    WHEN d.generic_name LIKE '%Artemether%' THEN 80
    WHEN d.generic_name LIKE '%Paracetamol%' THEN 150
    WHEN d.generic_name LIKE '%Amoxicillin%' THEN 45
    WHEN d.generic_name LIKE '%Metformin%' THEN 15 -- low stock demo
    ELSE 60
  END,
  20, -- reorder level
  (now() + (CASE 
    WHEN d.generic_name LIKE '%Ciprofloxacin%' THEN interval '45 days' -- near expiry demo
    ELSE interval '18 months'
  END))::date
FROM public.hospitals h
CROSS JOIN public.drug_catalog d
WHERE NOT EXISTS (
  SELECT 1 FROM public.hospital_inventory hi
  WHERE hi.hospital_id = h.id AND hi.drug_id = d.id
);
