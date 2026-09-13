export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admissions: {
        Row: {
          admission_date: string
          admission_reason: string | null
          admission_type: string
          admitting_doctor_id: string | null
          bed_cleaning_status: string
          bed_id: string | null
          created_at: string
          discharge_condition: string | null
          discharge_date: string | null
          discharge_instructions: string | null
          discharge_summary: string | null
          encounter_id: string | null
          expected_stay_days: number
          follow_up_appointment_id: string | null
          hospital_id: string
          id: string
          initial_condition: string | null
          patient_id: string
          status: string
          take_home_prescriptions: Json | null
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          admission_date?: string
          admission_reason?: string | null
          admission_type?: string
          admitting_doctor_id?: string | null
          bed_cleaning_status?: string
          bed_id?: string | null
          created_at?: string
          discharge_condition?: string | null
          discharge_date?: string | null
          discharge_instructions?: string | null
          discharge_summary?: string | null
          encounter_id?: string | null
          expected_stay_days?: number
          follow_up_appointment_id?: string | null
          hospital_id: string
          id?: string
          initial_condition?: string | null
          patient_id: string
          status?: string
          take_home_prescriptions?: Json | null
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          admission_date?: string
          admission_reason?: string | null
          admission_type?: string
          admitting_doctor_id?: string | null
          bed_cleaning_status?: string
          bed_id?: string | null
          created_at?: string
          discharge_condition?: string | null
          discharge_date?: string | null
          discharge_instructions?: string | null
          discharge_summary?: string | null
          encounter_id?: string | null
          expected_stay_days?: number
          follow_up_appointment_id?: string | null
          hospital_id?: string
          id?: string
          initial_condition?: string | null
          patient_id?: string
          status?: string
          take_home_prescriptions?: Json | null
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admissions_admitting_doctor_id_fkey"
            columns: ["admitting_doctor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_follow_up_appointment_id_fkey"
            columns: ["follow_up_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      antenatal_enrollments: {
        Row: {
          alive: number | null
          anc_number: string
          blood_group: string | null
          created_at: string
          edd: string
          genotype: string | null
          gestational_age_at_booking_weeks: number | null
          gravida: number | null
          hepatitis_b_status: string | null
          hiv_status: string | null
          hospital_id: string
          id: string
          lmp: string
          miscarriages: number | null
          para: number | null
          patient_id: string
          rhesus: string | null
          risk_factors: string[] | null
          status: string
          updated_at: string
          vdrl_syphilis_status: string | null
        }
        Insert: {
          alive?: number | null
          anc_number: string
          blood_group?: string | null
          created_at?: string
          edd: string
          genotype?: string | null
          gestational_age_at_booking_weeks?: number | null
          gravida?: number | null
          hepatitis_b_status?: string | null
          hiv_status?: string | null
          hospital_id: string
          id?: string
          lmp: string
          miscarriages?: number | null
          para?: number | null
          patient_id: string
          rhesus?: string | null
          risk_factors?: string[] | null
          status?: string
          updated_at?: string
          vdrl_syphilis_status?: string | null
        }
        Update: {
          alive?: number | null
          anc_number?: string
          blood_group?: string | null
          created_at?: string
          edd?: string
          genotype?: string | null
          gestational_age_at_booking_weeks?: number | null
          gravida?: number | null
          hepatitis_b_status?: string | null
          hiv_status?: string | null
          hospital_id?: string
          id?: string
          lmp?: string
          miscarriages?: number | null
          para?: number | null
          patient_id?: string
          rhesus?: string | null
          risk_factors?: string[] | null
          status?: string
          updated_at?: string
          vdrl_syphilis_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "antenatal_enrollments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "antenatal_enrollments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      antenatal_visits: {
        Row: {
          clinical_notes: string | null
          created_at: string
          enrollment_id: string
          fetal_heart_rate_bpm: number | null
          fetal_lie: string | null
          fetal_presentation: string | null
          fundal_height_cm: number | null
          gestational_age_weeks: number | null
          hospital_id: string
          id: string
          maternal_bp_diastolic: number | null
          maternal_bp_systolic: number | null
          maternal_weight_kg: number | null
          next_visit_date: string | null
          practitioner_name: string | null
          urinalysis_glucose: string | null
          urinalysis_protein: string | null
          visit_date: string
          visit_number: number
        }
        Insert: {
          clinical_notes?: string | null
          created_at?: string
          enrollment_id: string
          fetal_heart_rate_bpm?: number | null
          fetal_lie?: string | null
          fetal_presentation?: string | null
          fundal_height_cm?: number | null
          gestational_age_weeks?: number | null
          hospital_id: string
          id?: string
          maternal_bp_diastolic?: number | null
          maternal_bp_systolic?: number | null
          maternal_weight_kg?: number | null
          next_visit_date?: string | null
          practitioner_name?: string | null
          urinalysis_glucose?: string | null
          urinalysis_protein?: string | null
          visit_date?: string
          visit_number?: number
        }
        Update: {
          clinical_notes?: string | null
          created_at?: string
          enrollment_id?: string
          fetal_heart_rate_bpm?: number | null
          fetal_lie?: string | null
          fetal_presentation?: string | null
          fundal_height_cm?: number | null
          gestational_age_weeks?: number | null
          hospital_id?: string
          id?: string
          maternal_bp_diastolic?: number | null
          maternal_bp_systolic?: number | null
          maternal_weight_kg?: number | null
          next_visit_date?: string | null
          practitioner_name?: string | null
          urinalysis_glucose?: string | null
          urinalysis_protein?: string | null
          visit_date?: string
          visit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "antenatal_visits_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "antenatal_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "antenatal_visits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          created_at: string
          department_id: string | null
          doctor_id: string | null
          hospital_id: string
          id: string
          is_external_booking: boolean
          is_walk_in: boolean
          notes: string | null
          patient_id: string
          previous_encounter_id: string | null
          priority: string
          queue_number: number | null
          slot_duration_minutes: number
          status: Database["public"]["Enums"]["appointment_status"]
          symptoms_summary: string | null
        }
        Insert: {
          appointment_date: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          created_at?: string
          department_id?: string | null
          doctor_id?: string | null
          hospital_id: string
          id?: string
          is_external_booking?: boolean
          is_walk_in?: boolean
          notes?: string | null
          patient_id: string
          previous_encounter_id?: string | null
          priority?: string
          queue_number?: number | null
          slot_duration_minutes?: number
          status?: Database["public"]["Enums"]["appointment_status"]
          symptoms_summary?: string | null
        }
        Update: {
          appointment_date?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          created_at?: string
          department_id?: string | null
          doctor_id?: string | null
          hospital_id?: string
          id?: string
          is_external_booking?: boolean
          is_walk_in?: boolean
          notes?: string | null
          patient_id?: string
          previous_encounter_id?: string | null
          priority?: string
          queue_number?: number | null
          slot_duration_minutes?: number
          status?: Database["public"]["Enums"]["appointment_status"]
          symptoms_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_previous_encounter_id_fkey"
            columns: ["previous_encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_previous_encounter_id_fkey"
            columns: ["previous_encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          bed_number: string
          bed_type: Database["public"]["Enums"]["bed_type"]
          created_at: string
          current_patient_id: string | null
          daily_rate: number
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["bed_status"]
          ward_id: string
        }
        Insert: {
          bed_number: string
          bed_type?: Database["public"]["Enums"]["bed_type"]
          created_at?: string
          current_patient_id?: string | null
          daily_rate?: number
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["bed_status"]
          ward_id: string
        }
        Update: {
          bed_number?: string
          bed_type?: Database["public"]["Enums"]["bed_type"]
          created_at?: string
          current_patient_id?: string | null
          daily_rate?: number
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["bed_status"]
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_current_patient_id_fkey"
            columns: ["current_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_line_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          quantity: number
          service_type: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          quantity?: number
          service_type: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          quantity?: number
          service_type?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      child_immunization_records: {
        Row: {
          administered_at: string | null
          adverse_events: string | null
          batch_number: string | null
          child_name: string
          created_at: string
          date_of_birth: string
          dose_number: number
          gender: string | null
          hospital_id: string
          id: string
          nurse_name: string | null
          patient_id: string | null
          status: string
          target_age_weeks: number
          vaccine_name: string
        }
        Insert: {
          administered_at?: string | null
          adverse_events?: string | null
          batch_number?: string | null
          child_name: string
          created_at?: string
          date_of_birth: string
          dose_number?: number
          gender?: string | null
          hospital_id: string
          id?: string
          nurse_name?: string | null
          patient_id?: string | null
          status?: string
          target_age_weeks?: number
          vaccine_name: string
        }
        Update: {
          administered_at?: string | null
          adverse_events?: string | null
          batch_number?: string | null
          child_name?: string
          created_at?: string
          date_of_birth?: string
          dose_number?: number
          gender?: string | null
          hospital_id?: string
          id?: string
          nurse_name?: string | null
          patient_id?: string | null
          status?: string
          target_age_weeks?: number
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_immunization_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_immunization_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_note_amendments: {
        Row: {
          amended_notes: string
          amendment_reason: string
          amendment_type: string
          author_id: string
          created_at: string
          digital_signature_hash: string | null
          encounter_id: string
          hospital_id: string
          id: string
          patient_id: string
          previous_notes: string | null
        }
        Insert: {
          amended_notes: string
          amendment_reason: string
          amendment_type?: string
          author_id: string
          created_at?: string
          digital_signature_hash?: string | null
          encounter_id: string
          hospital_id: string
          id?: string
          patient_id: string
          previous_notes?: string | null
        }
        Update: {
          amended_notes?: string
          amendment_reason?: string
          amendment_type?: string
          author_id?: string
          created_at?: string
          digital_signature_hash?: string | null
          encounter_id?: string
          hospital_id?: string
          id?: string
          patient_id?: string
          previous_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_amendments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_amendments_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_amendments_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_amendments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_amendments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          appointment_slot_duration_minutes: number
          code: string
          created_at: string
          floor: string | null
          head_of_dept_id: string | null
          hospital_id: string
          id: string
          name: string
        }
        Insert: {
          appointment_slot_duration_minutes?: number
          code: string
          created_at?: string
          floor?: string | null
          head_of_dept_id?: string | null
          hospital_id: string
          id?: string
          name: string
        }
        Update: {
          appointment_slot_duration_minutes?: number
          code?: string
          created_at?: string
          floor?: string | null
          head_of_dept_id?: string | null
          hospital_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_of_dept_fk"
            columns: ["head_of_dept_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_catalog: {
        Row: {
          category: string
          chapter: string | null
          code: string
          created_at: string
          id: string
          is_common: boolean
          name: string
        }
        Insert: {
          category: string
          chapter?: string | null
          code: string
          created_at?: string
          id?: string
          is_common?: boolean
          name: string
        }
        Update: {
          category?: string
          chapter?: string | null
          code?: string
          created_at?: string
          id?: string
          is_common?: boolean
          name?: string
        }
        Relationships: []
      }
      drug_catalog: {
        Row: {
          brand_name: string | null
          created_at: string
          dosage_form: string | null
          generic_name: string
          id: string
          strength: string | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string
          dosage_form?: string | null
          generic_name: string
          id?: string
          strength?: string | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string
          dosage_form?: string | null
          generic_name?: string
          id?: string
          strength?: string | null
        }
        Relationships: []
      }
      encounters: {
        Row: {
          allergies_notes: string | null
          appointment_id: string | null
          bed_id: string | null
          break_glass_reason: string | null
          chief_complaint: string | null
          clinical_notes: string | null
          closed_at: string | null
          created_at: string
          department_id: string | null
          diagnosis: string | null
          digital_signature_hash: string | null
          drug_history: string | null
          encounter_status: Database["public"]["Enums"]["encounter_status"]
          hospital_id: string
          icd10_codes: string[]
          id: string
          is_break_glass: boolean
          is_locked: boolean | null
          nurse_id: string | null
          past_medical_history: string | null
          patient_id: string
          physical_exam_systematic: Json | null
          practitioner_id: string | null
          psychiatric_notes: string | null
          review_of_systems: string | null
          signed_at: string | null
          signed_by: string | null
          ward_id: string | null
        }
        Insert: {
          allergies_notes?: string | null
          appointment_id?: string | null
          bed_id?: string | null
          break_glass_reason?: string | null
          chief_complaint?: string | null
          clinical_notes?: string | null
          closed_at?: string | null
          created_at?: string
          department_id?: string | null
          diagnosis?: string | null
          digital_signature_hash?: string | null
          drug_history?: string | null
          encounter_status?: Database["public"]["Enums"]["encounter_status"]
          hospital_id: string
          icd10_codes?: string[]
          id?: string
          is_break_glass?: boolean
          is_locked?: boolean | null
          nurse_id?: string | null
          past_medical_history?: string | null
          patient_id: string
          physical_exam_systematic?: Json | null
          practitioner_id?: string | null
          psychiatric_notes?: string | null
          review_of_systems?: string | null
          signed_at?: string | null
          signed_by?: string | null
          ward_id?: string | null
        }
        Update: {
          allergies_notes?: string | null
          appointment_id?: string | null
          bed_id?: string | null
          break_glass_reason?: string | null
          chief_complaint?: string | null
          clinical_notes?: string | null
          closed_at?: string | null
          created_at?: string
          department_id?: string | null
          diagnosis?: string | null
          digital_signature_hash?: string | null
          drug_history?: string | null
          encounter_status?: Database["public"]["Enums"]["encounter_status"]
          hospital_id?: string
          icd10_codes?: string[]
          id?: string
          is_break_glass?: boolean
          is_locked?: boolean | null
          nurse_id?: string | null
          past_medical_history?: string | null
          patient_id?: string
          physical_exam_systematic?: Json | null
          practitioner_id?: string | null
          psychiatric_notes?: string | null
          review_of_systems?: string | null
          signed_at?: string | null
          signed_by?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_inventory: {
        Row: {
          batch_number: string
          created_at: string
          drug_id: string
          expiry_date: string | null
          hospital_id: string
          id: string
          quantity_in_stock: number
          reorder_level: number
          unit_price: number
        }
        Insert: {
          batch_number: string
          created_at?: string
          drug_id: string
          expiry_date?: string | null
          hospital_id: string
          id?: string
          quantity_in_stock?: number
          reorder_level?: number
          unit_price?: number
        }
        Update: {
          batch_number?: string
          created_at?: string
          drug_id?: string
          expiry_date?: string | null
          hospital_id?: string
          id?: string
          quantity_in_stock?: number
          reorder_level?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "hospital_inventory_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drug_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_inventory_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_lab_tests: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          is_available: boolean
          price: number
          test_catalog_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          is_available?: boolean
          price?: number
          test_catalog_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          is_available?: boolean
          price?: number
          test_catalog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_lab_tests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_lab_tests_test_catalog_id_fkey"
            columns: ["test_catalog_id"]
            isOneToOne: false
            referencedRelation: "lab_test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_landing_pages: {
        Row: {
          about_us: string | null
          brand_color_primary: string
          brand_color_secondary: string
          created_at: string
          doctors_showcase: Json
          hero_headline: string
          hero_subheadline: string | null
          hospital_id: string
          id: string
          is_published: boolean
          public_contact: Json
          services: Json
          updated_at: string
        }
        Insert: {
          about_us?: string | null
          brand_color_primary?: string
          brand_color_secondary?: string
          created_at?: string
          doctors_showcase?: Json
          hero_headline?: string
          hero_subheadline?: string | null
          hospital_id: string
          id?: string
          is_published?: boolean
          public_contact?: Json
          services?: Json
          updated_at?: string
        }
        Update: {
          about_us?: string | null
          brand_color_primary?: string
          brand_color_secondary?: string
          created_at?: string
          doctors_showcase?: Json
          hero_headline?: string
          hero_subheadline?: string | null
          hospital_id?: string
          id?: string
          is_published?: boolean
          public_contact?: Json
          services?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_landing_pages_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: true
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_services: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean
          price: number
          service_category: string
          service_code: string
          service_name: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          price?: number
          service_category?: string
          service_code: string
          service_name: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          price?: number
          service_category?: string
          service_code?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_services_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          hospital_type: Database["public"]["Enums"]["hospital_type"]
          id: string
          is_active: boolean
          is_verified: boolean
          lga: string | null
          license_number: string
          name: string
          slug: string
          state: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          hospital_type?: Database["public"]["Enums"]["hospital_type"]
          id?: string
          is_active?: boolean
          is_verified?: boolean
          lga?: string | null
          license_number: string
          name: string
          slug: string
          state: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          hospital_type?: Database["public"]["Enums"]["hospital_type"]
          id?: string
          is_active?: boolean
          is_verified?: boolean
          lga?: string | null
          license_number?: string
          name?: string
          slug?: string
          state?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      insurance_claims: {
        Row: {
          claim_amount: number
          created_at: string
          hospital_id: string
          id: string
          invoice_id: string
          patient_id: string
          policy_number: string | null
          provider_name: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["insurance_claim_status"]
          submitted_at: string | null
        }
        Insert: {
          claim_amount?: number
          created_at?: string
          hospital_id: string
          id?: string
          invoice_id: string
          patient_id: string
          policy_number?: string | null
          provider_name: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["insurance_claim_status"]
          submitted_at?: string | null
        }
        Update: {
          claim_amount?: number
          created_at?: string
          hospital_id?: string
          id?: string
          invoice_id?: string
          patient_id?: string
          policy_number?: string | null
          provider_name?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["insurance_claim_status"]
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          due_date: string | null
          encounter_id: string
          hospital_id: string
          id: string
          insurance_coverage_amount: number
          invoice_number: string | null
          notes: string | null
          patient_id: string
          patient_payable_amount: number
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          encounter_id: string
          hospital_id: string
          id?: string
          insurance_coverage_amount?: number
          invoice_number?: string | null
          notes?: string | null
          patient_id: string
          patient_payable_amount?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          encounter_id?: string
          hospital_id?: string
          id?: string
          insurance_coverage_amount?: number
          invoice_number?: string | null
          notes?: string | null
          patient_id?: string
          patient_payable_amount?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: true
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: true
            referencedRelation: "encounters_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          created_at: string
          critical_flagged_at: string | null
          encounter_id: string
          hospital_id: string
          id: string
          is_critical: boolean
          ordered_by: string | null
          patient_id: string
          result_file_url: string | null
          result_metadata: Json
          result_value: string | null
          sample_collected_at: string | null
          sample_type: string | null
          status: Database["public"]["Enums"]["lab_status"]
          technician_id: string | null
          test_id: string
        }
        Insert: {
          created_at?: string
          critical_flagged_at?: string | null
          encounter_id: string
          hospital_id: string
          id?: string
          is_critical?: boolean
          ordered_by?: string | null
          patient_id: string
          result_file_url?: string | null
          result_metadata?: Json
          result_value?: string | null
          sample_collected_at?: string | null
          sample_type?: string | null
          status?: Database["public"]["Enums"]["lab_status"]
          technician_id?: string | null
          test_id: string
        }
        Update: {
          created_at?: string
          critical_flagged_at?: string | null
          encounter_id?: string
          hospital_id?: string
          id?: string
          is_critical?: boolean
          ordered_by?: string | null
          patient_id?: string
          result_file_url?: string | null
          result_metadata?: Json
          result_value?: string | null
          sample_collected_at?: string | null
          sample_type?: string | null
          status?: Database["public"]["Enums"]["lab_status"]
          technician_id?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "hospital_lab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_test_catalog: {
        Row: {
          category: string | null
          code: string
          created_at: string
          id: string
          name: string
          standard_reference_range: Json
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          standard_reference_range?: Json
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          standard_reference_range?: Json
        }
        Relationships: []
      }
      labor_and_delivery_records: {
        Row: {
          apgar_10min: number | null
          apgar_1min: number | null
          apgar_5min: number | null
          attending_midwife: string | null
          attending_obstetrician: string | null
          baby_gender: string | null
          birth_weight_kg: number | null
          cervical_dilation_cm: number | null
          contractions_per_10min: number | null
          created_at: string
          delivery_mode: string
          delivery_time: string | null
          enrollment_id: string | null
          estimated_blood_loss_ml: number | null
          fetal_station: string | null
          hospital_id: string
          id: string
          labor_start_time: string
          maternal_outcome: string | null
          membranes_status: string | null
          neonatal_outcome: string | null
          notes: string | null
          patient_id: string
          perineal_tear_degree: string | null
        }
        Insert: {
          apgar_10min?: number | null
          apgar_1min?: number | null
          apgar_5min?: number | null
          attending_midwife?: string | null
          attending_obstetrician?: string | null
          baby_gender?: string | null
          birth_weight_kg?: number | null
          cervical_dilation_cm?: number | null
          contractions_per_10min?: number | null
          created_at?: string
          delivery_mode?: string
          delivery_time?: string | null
          enrollment_id?: string | null
          estimated_blood_loss_ml?: number | null
          fetal_station?: string | null
          hospital_id: string
          id?: string
          labor_start_time?: string
          maternal_outcome?: string | null
          membranes_status?: string | null
          neonatal_outcome?: string | null
          notes?: string | null
          patient_id: string
          perineal_tear_degree?: string | null
        }
        Update: {
          apgar_10min?: number | null
          apgar_1min?: number | null
          apgar_5min?: number | null
          attending_midwife?: string | null
          attending_obstetrician?: string | null
          baby_gender?: string | null
          birth_weight_kg?: number | null
          cervical_dilation_cm?: number | null
          contractions_per_10min?: number | null
          created_at?: string
          delivery_mode?: string
          delivery_time?: string | null
          enrollment_id?: string | null
          estimated_blood_loss_ml?: number | null
          fetal_station?: string | null
          hospital_id?: string
          id?: string
          labor_start_time?: string
          maternal_outcome?: string | null
          membranes_status?: string | null
          neonatal_outcome?: string | null
          notes?: string | null
          patient_id?: string
          perineal_tear_degree?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_and_delivery_records_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "antenatal_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_and_delivery_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_and_delivery_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      nursing_care_observations: {
        Row: {
          admission_id: string
          created_at: string
          details: Json
          hospital_id: string
          id: string
          notes: string | null
          nurse_id: string | null
          observation_type: string
        }
        Insert: {
          admission_id: string
          created_at?: string
          details?: Json
          hospital_id: string
          id?: string
          notes?: string | null
          nurse_id?: string | null
          observation_type: string
        }
        Update: {
          admission_id?: string
          created_at?: string
          details?: Json
          hospital_id?: string
          id?: string
          notes?: string | null
          nurse_id?: string | null
          observation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nursing_care_observations_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nursing_care_observations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nursing_care_observations_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_consents: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          hospital_id: string
          id: string
          is_active: boolean
          patient_id: string
          scope: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean
          patient_id: string
          scope?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean
          patient_id?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_transfers: {
        Row: {
          approved_by_id: string | null
          clinical_summary: string | null
          consent_scope: string | null
          consent_verified: boolean
          created_at: string
          id: string
          patient_consent_id: string | null
          patient_id: string
          priority: string
          reason_for_transfer: string | null
          receiving_hospital_id: string
          referring_hospital_id: string
          requested_by_id: string | null
          response_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_by_id?: string | null
          clinical_summary?: string | null
          consent_scope?: string | null
          consent_verified?: boolean
          created_at?: string
          id?: string
          patient_consent_id?: string | null
          patient_id: string
          priority?: string
          reason_for_transfer?: string | null
          receiving_hospital_id: string
          referring_hospital_id: string
          requested_by_id?: string | null
          response_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by_id?: string | null
          clinical_summary?: string | null
          consent_scope?: string | null
          consent_verified?: boolean
          created_at?: string
          id?: string
          patient_consent_id?: string | null
          patient_id?: string
          priority?: string
          reason_for_transfer?: string | null
          receiving_hospital_id?: string
          referring_hospital_id?: string
          requested_by_id?: string | null
          response_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_transfers_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_patient_consent_id_fkey"
            columns: ["patient_consent_id"]
            isOneToOne: false
            referencedRelation: "patient_consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_receiving_hospital_id_fkey"
            columns: ["receiving_hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_referring_hospital_id_fkey"
            columns: ["referring_hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_transfers_requested_by_id_fkey"
            columns: ["requested_by_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          allergies: string[]
          blood_group: string | null
          chronic_conditions: string[]
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact: Json
          first_name: string
          gender: string | null
          genotype: string | null
          id: string
          insurance_expiry_date: string | null
          insurance_plan_type: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_name: string
          nin: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allergies?: string[]
          blood_group?: string | null
          chronic_conditions?: string[]
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: Json
          first_name: string
          gender?: string | null
          genotype?: string | null
          id?: string
          insurance_expiry_date?: string | null
          insurance_plan_type?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name: string
          nin: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allergies?: string[]
          blood_group?: string | null
          chronic_conditions?: string[]
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: Json
          first_name?: string
          gender?: string | null
          genotype?: string | null
          id?: string
          insurance_expiry_date?: string | null
          insurance_plan_type?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name?: string
          nin?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_paid: number
          hospital_id: string
          id: string
          invoice_id: string
          paid_at: string
          patient_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          recorded_by: string | null
          transaction_reference: string | null
        }
        Insert: {
          amount_paid: number
          hospital_id: string
          id?: string
          invoice_id: string
          paid_at?: string
          patient_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recorded_by?: string | null
          transaction_reference?: string | null
        }
        Update: {
          amount_paid?: number
          hospital_id?: string
          id?: string
          invoice_id?: string
          paid_at?: string
          patient_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recorded_by?: string | null
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          dispense_notes: string | null
          dispensed_at: string | null
          dispensed_by: string | null
          dosage: string | null
          drug_id: string
          duration: string | null
          frequency: string | null
          id: string
          prescription_id: string
          quantity_dispensed: number
          quantity_prescribed: number
        }
        Insert: {
          dispense_notes?: string | null
          dispensed_at?: string | null
          dispensed_by?: string | null
          dosage?: string | null
          drug_id: string
          duration?: string | null
          frequency?: string | null
          id?: string
          prescription_id: string
          quantity_dispensed?: number
          quantity_prescribed?: number
        }
        Update: {
          dispense_notes?: string | null
          dispensed_at?: string | null
          dispensed_by?: string | null
          dosage?: string | null
          drug_id?: string
          duration?: string | null
          frequency?: string | null
          id?: string
          prescription_id?: string
          quantity_dispensed?: number
          quantity_prescribed?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drug_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          doctor_id: string | null
          encounter_id: string
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["prescription_status"]
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          encounter_id: string
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["prescription_status"]
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          encounter_id?: string
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["prescription_status"]
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      radiology_studies: {
        Row: {
          body_part: string
          clinical_indication: string | null
          created_at: string
          encounter_id: string | null
          findings: string | null
          hospital_id: string
          id: string
          image_url: string | null
          impression: string | null
          is_critical: boolean
          modality: Database["public"]["Enums"]["imaging_modality"]
          patient_id: string
          priority: string
          radiologist_id: string | null
          radiologist_notes: string | null
          requesting_doctor_id: string | null
          status: Database["public"]["Enums"]["imaging_study_status"]
          study_date: string
          technician_id: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          body_part: string
          clinical_indication?: string | null
          created_at?: string
          encounter_id?: string | null
          findings?: string | null
          hospital_id: string
          id?: string
          image_url?: string | null
          impression?: string | null
          is_critical?: boolean
          modality?: Database["public"]["Enums"]["imaging_modality"]
          patient_id: string
          priority?: string
          radiologist_id?: string | null
          radiologist_notes?: string | null
          requesting_doctor_id?: string | null
          status?: Database["public"]["Enums"]["imaging_study_status"]
          study_date?: string
          technician_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          body_part?: string
          clinical_indication?: string | null
          created_at?: string
          encounter_id?: string | null
          findings?: string | null
          hospital_id?: string
          id?: string
          image_url?: string | null
          impression?: string | null
          is_critical?: boolean
          modality?: Database["public"]["Enums"]["imaging_modality"]
          patient_id?: string
          priority?: string
          radiologist_id?: string | null
          radiologist_notes?: string | null
          requesting_doctor_id?: string | null
          status?: Database["public"]["Enums"]["imaging_study_status"]
          study_date?: string
          technician_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radiology_studies_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_studies_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_studies_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_studies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_studies_radiologist_id_fkey"
            columns: ["radiologist_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_studies_requesting_doctor_id_fkey"
            columns: ["requesting_doctor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_studies_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      record_audit_logs: {
        Row: {
          accessor_id: string
          accessor_role: Database["public"]["Enums"]["user_role_type"]
          action: string
          encounter_id: string | null
          hospital_id: string | null
          id: number
          ip_address: unknown
          justification: string | null
          patient_id: string
          previous_hash: string
          record_hash: string
          timestamp: string
        }
        Insert: {
          accessor_id: string
          accessor_role: Database["public"]["Enums"]["user_role_type"]
          action: string
          encounter_id?: string | null
          hospital_id?: string | null
          id?: number
          ip_address?: unknown
          justification?: string | null
          patient_id: string
          previous_hash?: string
          record_hash?: string
          timestamp?: string
        }
        Update: {
          accessor_id?: string
          accessor_role?: Database["public"]["Enums"]["user_role_type"]
          action?: string
          encounter_id?: string | null
          hospital_id?: string | null
          id?: number
          ip_address?: unknown
          justification?: string | null
          patient_id?: string
          previous_hash?: string
          record_hash?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_audit_logs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          cadre_rank: string | null
          created_at: string
          department_id: string | null
          full_name: string
          hospital_id: string
          id: string
          is_active: boolean
          license_number: string | null
          license_type: string | null
          medical_license_number: string | null
          phone: string | null
          specialization: string | null
          staff_id_code: string
          user_id: string | null
        }
        Insert: {
          cadre_rank?: string | null
          created_at?: string
          department_id?: string | null
          full_name: string
          hospital_id: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          license_type?: string | null
          medical_license_number?: string | null
          phone?: string | null
          specialization?: string | null
          staff_id_code: string
          user_id?: string | null
        }
        Update: {
          cadre_rank?: string | null
          created_at?: string
          department_id?: string | null
          full_name?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          license_type?: string | null
          medical_license_number?: string | null
          phone?: string | null
          specialization?: string | null
          staff_id_code?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          expires_at: string
          full_name: string
          hospital_id: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          staff_id_code: string | null
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          expires_at?: string
          full_name: string
          hospital_id: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          staff_id_code?: string | null
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          hospital_id?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          staff_id_code?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          created_at: string
          department_id: string | null
          end_time: string
          hospital_id: string
          id: string
          shift_name: string
          staff_id: string
          start_time: string
          ward_id: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          end_time: string
          hospital_id: string
          id?: string
          shift_name: string
          staff_id: string
          start_time: string
          ward_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          end_time?: string
          hospital_id?: string
          id?: string
          shift_name?: string
          staff_id?: string
          start_time?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_weekly_shifts: {
        Row: {
          created_at: string
          day_of_week: number
          department_id: string | null
          end_time_str: string
          hospital_id: string
          id: string
          is_active: boolean
          staff_id: string
          start_time_str: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          department_id?: string | null
          end_time_str: string
          hospital_id: string
          id?: string
          is_active?: boolean
          staff_id: string
          start_time_str: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          department_id?: string | null
          end_time_str?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          staff_id?: string
          start_time_str?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_weekly_shifts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_weekly_shifts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_weekly_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          drug_id: string
          hospital_id: string
          id: string
          inventory_id: string | null
          movement_type: string
          new_stock: number
          performed_by: string | null
          previous_stock: number
          quantity_change: number
          reason: string | null
        }
        Insert: {
          created_at?: string
          drug_id: string
          hospital_id: string
          id?: string
          inventory_id?: string | null
          movement_type: string
          new_stock?: number
          performed_by?: string | null
          previous_stock?: number
          quantity_change: number
          reason?: string | null
        }
        Update: {
          created_at?: string
          drug_id?: string
          hospital_id?: string
          id?: string
          inventory_id?: string | null
          movement_type?: string
          new_stock?: number
          performed_by?: string | null
          previous_stock?: number
          quantity_change?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drug_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "hospital_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_vitals: {
        Row: {
          body_temperature: number | null
          diastolic_bp: number | null
          encounter_id: string
          height_cm: number | null
          hospital_id: string
          id: string
          pain_score: number | null
          patient_id: string
          pulse_rate: number | null
          recorded_at: string
          recorded_by: string | null
          respiratory_rate: number | null
          spo2: number | null
          systolic_bp: number | null
          weight_kg: number | null
        }
        Insert: {
          body_temperature?: number | null
          diastolic_bp?: number | null
          encounter_id: string
          height_cm?: number | null
          hospital_id: string
          id?: string
          pain_score?: number | null
          patient_id: string
          pulse_rate?: number | null
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          systolic_bp?: number | null
          weight_kg?: number | null
        }
        Update: {
          body_temperature?: number | null
          diastolic_bp?: number | null
          encounter_id?: string
          height_cm?: number | null
          hospital_id?: string
          id?: string
          pain_score?: number | null
          patient_id?: string
          pulse_rate?: number | null
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          spo2?: number | null
          systolic_bp?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "triage_vitals_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: true
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_vitals_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: true
            referencedRelation: "encounters_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_vitals_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_vitals_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          hospital_id: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["user_role_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_round_notes: {
        Row: {
          admission_id: string
          assessment: string | null
          created_at: string
          doctor_id: string | null
          hospital_id: string
          id: string
          objective: string | null
          plan: string
          subjective: string | null
          vitals_snapshot: Json | null
        }
        Insert: {
          admission_id: string
          assessment?: string | null
          created_at?: string
          doctor_id?: string | null
          hospital_id: string
          id?: string
          objective?: string | null
          plan: string
          subjective?: string | null
          vitals_snapshot?: Json | null
        }
        Update: {
          admission_id?: string
          assessment?: string | null
          created_at?: string
          doctor_id?: string | null
          hospital_id?: string
          id?: string
          objective?: string | null
          plan?: string
          subjective?: string | null
          vitals_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ward_round_notes_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_round_notes_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_round_notes_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_staff_assignments: {
        Row: {
          created_at: string
          end_time: string | null
          hospital_id: string
          id: string
          notes: string | null
          role_in_ward: string
          shift_date: string
          shift_type: string
          staff_id: string
          start_time: string | null
          ward_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          role_in_ward: string
          shift_date: string
          shift_type: string
          staff_id: string
          start_time?: string | null
          ward_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          role_in_ward?: string
          shift_date?: string
          shift_type?: string
          staff_id?: string
          start_time?: string | null
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_staff_assignments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_staff_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_staff_assignments_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          created_at: string
          department_id: string | null
          floor_location: string | null
          gender_allocation: Database["public"]["Enums"]["gender_allocation"]
          gender_restriction: string
          hospital_id: string
          id: string
          is_active: boolean
          name: string
          total_beds: number
          type: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          floor_location?: string | null
          gender_allocation?: Database["public"]["Enums"]["gender_allocation"]
          gender_restriction?: string
          hospital_id: string
          id?: string
          is_active?: boolean
          name: string
          total_beds?: number
          type?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          floor_location?: string | null
          gender_allocation?: Database["public"]["Enums"]["gender_allocation"]
          gender_restriction?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          name?: string
          total_beds?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      encounters_masked: {
        Row: {
          appointment_id: string | null
          bed_id: string | null
          break_glass_reason: string | null
          chief_complaint: string | null
          clinical_notes: string | null
          closed_at: string | null
          created_at: string | null
          department_id: string | null
          diagnosis: string | null
          encounter_status:
            | Database["public"]["Enums"]["encounter_status"]
            | null
          hospital_id: string | null
          icd10_codes: string[] | null
          id: string | null
          is_break_glass: boolean | null
          nurse_id: string | null
          patient_id: string | null
          practitioner_id: string | null
          psychiatric_notes: string | null
          ward_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          bed_id?: string | null
          break_glass_reason?: string | null
          chief_complaint?: string | null
          clinical_notes?: never
          closed_at?: string | null
          created_at?: string | null
          department_id?: string | null
          diagnosis?: never
          encounter_status?:
            | Database["public"]["Enums"]["encounter_status"]
            | null
          hospital_id?: string | null
          icd10_codes?: never
          id?: string | null
          is_break_glass?: boolean | null
          nurse_id?: string | null
          patient_id?: string | null
          practitioner_id?: string | null
          psychiatric_notes?: never
          ward_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          bed_id?: string | null
          break_glass_reason?: string | null
          chief_complaint?: string | null
          clinical_notes?: never
          closed_at?: string | null
          created_at?: string | null
          department_id?: string | null
          diagnosis?: never
          encounter_status?:
            | Database["public"]["Enums"]["encounter_status"]
            | null
          hospital_id?: string | null
          icd10_codes?: never
          id?: string | null
          is_break_glass?: boolean | null
          nurse_id?: string | null
          patient_id?: string | null
          practitioner_id?: string | null
          psychiatric_notes?: never
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_encounter: {
        Args: { _encounter_id: string }
        Returns: boolean
      }
      can_access_patient: { Args: { _patient_id: string }; Returns: boolean }
      current_patient_id: { Args: never; Returns: string }
      current_staff_id: { Args: { _hospital_id: string }; Returns: string }
      has_patient_consent: {
        Args: { _hospital_id: string; _patient_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role_type"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinical_at: { Args: { _hospital_id: string }; Returns: boolean }
      is_hospital_admin: { Args: { _hospital_id: string }; Returns: boolean }
      is_member_of_hospital: {
        Args: { _hospital_id: string }
        Returns: boolean
      }
      is_on_active_shift: {
        Args: { _department_id: string; _hospital_id: string; _ward_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      appointment_status:
        | "booked"
        | "checked_in"
        | "in_consultation"
        | "completed"
        | "cancelled"
        | "no_show"
      bed_status: "available" | "occupied" | "reserved" | "maintenance"
      bed_type: "general" | "icu" | "er" | "maternity" | "pediatric"
      encounter_status:
        | "triage"
        | "consultation"
        | "lab_pending"
        | "pharmacy_pending"
        | "admitted"
        | "discharged"
        | "closed"
      gender_allocation: "male" | "female" | "mixed"
      hospital_type: "government" | "private"
      imaging_modality:
        | "xray"
        | "ct"
        | "mri"
        | "ultrasound"
        | "mammography"
        | "other"
      imaging_study_status: "scheduled" | "acquired" | "reported" | "reviewed"
      insurance_claim_status:
        | "draft"
        | "submitted"
        | "reviewing"
        | "approved"
        | "rejected"
      invoice_status:
        | "pending"
        | "partially_paid"
        | "paid"
        | "waived"
        | "cancelled"
      lab_status:
        | "ordered"
        | "sample_collected"
        | "processing"
        | "completed"
        | "critical"
        | "cancelled"
      payment_method: "cash" | "card" | "bank_transfer" | "insurance" | "ussd"
      prescription_status:
        | "pending"
        | "dispensed"
        | "partially_dispensed"
        | "cancelled"
      user_role_type:
        | "super_admin"
        | "hospital_admin"
        | "doctor"
        | "nurse"
        | "lab_tech"
        | "pharmacist"
        | "patient"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "booked",
        "checked_in",
        "in_consultation",
        "completed",
        "cancelled",
        "no_show",
      ],
      bed_status: ["available", "occupied", "reserved", "maintenance"],
      bed_type: ["general", "icu", "er", "maternity", "pediatric"],
      encounter_status: [
        "triage",
        "consultation",
        "lab_pending",
        "pharmacy_pending",
        "admitted",
        "discharged",
        "closed",
      ],
      gender_allocation: ["male", "female", "mixed"],
      hospital_type: ["government", "private"],
      imaging_modality: [
        "xray",
        "ct",
        "mri",
        "ultrasound",
        "mammography",
        "other",
      ],
      imaging_study_status: ["scheduled", "acquired", "reported", "reviewed"],
      insurance_claim_status: [
        "draft",
        "submitted",
        "reviewing",
        "approved",
        "rejected",
      ],
      invoice_status: [
        "pending",
        "partially_paid",
        "paid",
        "waived",
        "cancelled",
      ],
      lab_status: [
        "ordered",
        "sample_collected",
        "processing",
        "completed",
        "critical",
        "cancelled",
      ],
      payment_method: ["cash", "card", "bank_transfer", "insurance", "ussd"],
      prescription_status: [
        "pending",
        "dispensed",
        "partially_dispensed",
        "cancelled",
      ],
      user_role_type: [
        "super_admin",
        "hospital_admin",
        "doctor",
        "nurse",
        "lab_tech",
        "pharmacist",
        "patient",
      ],
    },
  },
} as const
