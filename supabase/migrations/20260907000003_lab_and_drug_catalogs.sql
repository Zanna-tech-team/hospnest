-- ============================================================
-- HOSPNEST — LAB TEST & DRUG CATALOGS SEEDING
-- ============================================================

-- 1. Seed global lab test catalog
INSERT INTO public.lab_test_catalog (code, name, category, standard_reference_range)
VALUES
  ('FBC', 'Full Blood Count (Complete Blood Count)', 'Hematology', '{"WBC": "4.0-10.0 x10^9/L", "Hb": "12.0-16.0 g/dL", "Platelets": "150-450 x10^9/L"}'::jsonb),
  ('MP', 'Malaria Parasite (Thick & Thin Film / RDT)', 'Parasitology', '{"Result": "Negative"}'::jsonb),
  ('WIDAL', 'Widal Agglutination Test (Typhoid)', 'Serology', '{"TO": "< 1:80", "TH": "< 1:80"}'::jsonb),
  ('FBS', 'Fasting Blood Sugar (Glucose)', 'Biochemistry', '{"Normal": "70-100 mg/dL"}'::jsonb),
  ('RBS', 'Random Blood Sugar (Glucose)', 'Biochemistry', '{"Normal": "70-140 mg/dL"}'::jsonb),
  ('HBA1C', 'Glycated Hemoglobin (HbA1c)', 'Biochemistry', '{"Normal": "< 5.7%"}'::jsonb),
  ('LIPID', 'Lipid Profile (Cholesterol, HDL, LDL, TG)', 'Biochemistry', '{"Total Cholesterol": "< 200 mg/dL"}'::jsonb),
  ('EUC', 'Electrolytes, Urea & Creatinine (E/U/Cr)', 'Biochemistry', '{"Creatinine": "0.6-1.2 mg/dL", "Urea": "10-50 mg/dL"}'::jsonb),
  ('LFT', 'Liver Function Tests (ALT, AST, ALP, Bilirubin)', 'Biochemistry', '{"ALT": "7-56 U/L", "AST": "10-40 U/L"}'::jsonb),
  ('URINALYSIS', 'Routine Urinalysis (Dipstick & Microscopy)', 'Clinical Pathology', '{"Protein": "Nil", "Glucose": "Nil", "Pus Cells": "0-2 /hpf"}'::jsonb),
  ('STOOL', 'Stool Routine Examination & Microscopy', 'Microbiology', '{"Ova/Cyst": "Not seen"}'::jsonb),
  ('HIV_SCR', 'HIV I & II Rapid Screening', 'Serology', '{"Result": "Non-Reactive"}'::jsonb),
  ('HBSAG', 'Hepatitis B Surface Antigen (HBsAg)', 'Serology', '{"Result": "Negative"}'::jsonb),
  ('HCV', 'Hepatitis C Virus Antibody (HCV Ab)', 'Serology', '{"Result": "Negative"}'::jsonb),
  ('VDRL', 'Syphilis Rapid Test (VDRL / RPR)', 'Serology', '{"Result": "Non-Reactive"}'::jsonb),
  ('PREG_TEST', 'Urine Pregnancy Test (hCG)', 'Clinical Pathology', '{"Result": "Negative"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 2. Ensure each active hospital has common test catalog rows in hospital_lab_tests
INSERT INTO public.hospital_lab_tests (hospital_id, test_catalog_id, price, is_available)
SELECT 
  h.id,
  c.id,
  CASE 
    WHEN c.code = 'MP' THEN 1500
    WHEN c.code = 'FBC' THEN 3500
    WHEN c.code = 'WIDAL' THEN 2000
    WHEN c.code = 'FBS' THEN 1000
    WHEN c.code = 'RBS' THEN 1000
    WHEN c.code = 'HBA1C' THEN 6500
    WHEN c.code = 'EUC' THEN 5500
    WHEN c.code = 'LFT' THEN 5500
    WHEN c.code = 'LIPID' THEN 6000
    WHEN c.code = 'URINALYSIS' THEN 1500
    WHEN c.code = 'STOOL' THEN 2000
    WHEN c.code = 'HIV_SCR' THEN 1000
    WHEN c.code = 'HBSAG' THEN 1500
    WHEN c.code = 'HCV' THEN 2000
    WHEN c.code = 'PREG_TEST' THEN 1000
    ELSE 3000
  END as price,
  true as is_available
FROM public.hospitals h
CROSS JOIN public.lab_test_catalog c
WHERE NOT EXISTS (
  SELECT 1 FROM public.hospital_lab_tests hlt 
  WHERE hlt.hospital_id = h.id AND hlt.test_catalog_id = c.id
);

-- 3. Seed common drug catalog items
INSERT INTO public.drug_catalog (generic_name, brand_name, dosage_form, strength)
VALUES
  ('Artemether / Lumefantrine', 'Coartem 80/480mg', 'Tablet', '80/480mg'),
  ('Artesunate / Amodiaquine', 'Camoquin', 'Tablet', '100/270mg'),
  ('Paracetamol', 'Panadol 500mg', 'Tablet', '500mg'),
  ('Paracetamol Syrup', 'Emzor Paracetamol', 'Syrup', '120mg/5ml'),
  ('Ibuprofen', 'Brufen 400mg', 'Tablet', '400mg'),
  ('Amoxicillin / Clavulanic Acid', 'Augmentin 625mg', 'Tablet', '625mg'),
  ('Amoxicillin / Clavulanic Acid', 'Augmentin 1g', 'Tablet', '1g'),
  ('Ciprofloxacin', 'Cipro 500mg', 'Tablet', '500mg'),
  ('Azithromycin', 'Zithromax 500mg', 'Tablet', '500mg'),
  ('Metronidazole', 'Flagyl 400mg', 'Tablet', '400mg'),
  ('Cefuroxime Axetil', 'Zinnat 500mg', 'Tablet', '500mg'),
  ('Ceftriaxone Injection', 'Rocephin 1g', 'Injection', '1g'),
  ('Amlodipine', 'Norvasc 5mg', 'Tablet', '5mg'),
  ('Amlodipine', 'Norvasc 10mg', 'Tablet', '10mg'),
  ('Lisinopril', 'Zestril 10mg', 'Tablet', '10mg'),
  ('Losartan Potassium', 'Cozaar 50mg', 'Tablet', '50mg'),
  ('Metformin', 'Glucophage 500mg', 'Tablet', '500mg'),
  ('Metformin', 'Glucophage 1000mg', 'Tablet', '1000mg'),
  ('Glibenclamide', 'Daonil 5mg', 'Tablet', '5mg'),
  ('Omeprazole', 'Losec 20mg', 'Capsule', '20mg'),
  ('Pantoprazole', 'Controloc 40mg', 'Tablet', '40mg'),
  ('Salbutamol Inhaler', 'Ventolin 100mcg', 'Inhaler', '100mcg/dose'),
  ('Cetirizine', 'Zyrtec 10mg', 'Tablet', '10mg'),
  ('Loratadine', 'Claritine 10mg', 'Tablet', '10mg'),
  ('Oral Rehydration Salts (ORS)', 'WHO-ORS Sachet', 'Powder for Solution', '1L sachet'),
  ('Zinc Sulfate', 'Zinc 20mg', 'Tablet', '20mg'),
  ('Multivitamin with Minerals', 'Astymin Syrup / Capsule', 'Capsule', 'Standard'),
  ('Ferrous Sulfate + Folic Acid', 'Pregnacare / Fefol', 'Capsule', 'Standard')
ON CONFLICT DO NOTHING;
