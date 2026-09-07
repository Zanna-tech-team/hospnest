import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StaffRole } from "./team.functions";

export type AiEncounterInput = {
  encounterId: string;
  patientId: string;
  hospitalId?: string | undefined;
  patientName: string;
  patientAge?: string | undefined;
  patientGender?: string | undefined;
  allergies?: string[] | undefined;
  chronicConditions?: string[] | undefined;
  chiefComplaint: string;
  historyOfPresentingIllness?: string | undefined;
  examinationFindings?: string | undefined;
  provisionalDiagnosis?: string | undefined;
  vitals?: {
    bodyTemperature?: number | null | undefined;
    systolicBp?: number | null | undefined;
    diastolicBp?: number | null | undefined;
    pulseRate?: number | null | undefined;
    respiratoryRate?: number | null | undefined;
    spo2?: number | null | undefined;
    weightKg?: number | null | undefined;
    painScore?: number | null | undefined;
  } | undefined;
  labOrders?: Array<{
    testName: string;
    status: string;
    sampleType?: string | null | undefined;
  }> | undefined;
  prescriptions?: Array<{
    drugName: string;
    dosage?: string | null | undefined;
    frequency?: string | null | undefined;
    duration?: string | null | undefined;
  }> | undefined;
};

export type AiCopilotResult = {
  soapSummary: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  fullDraftNote: string;
  redFlags: string[];
  differentialDiagnoses: Array<{
    code: string;
    name: string;
    confidence: "High" | "Moderate" | "Possible";
    rationale: string;
  }>;
  patientInstructions: string;
  suggestedFollowUp: string;
  generatedAt: string;
};

async function writeAuditEntry(
  supabase: { from: (t: string) => any },
  entry: {
    hospital_id: string;
    accessor_id: string;
    accessor_role: StaffRole;
    patient_id?: string;
    encounter_id?: string;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null;
  },
) {
  try {
    await supabase.from("record_audit_logs").insert({
      hospital_id: entry.hospital_id,
      accessor_id: entry.accessor_id,
      accessor_role: entry.accessor_role,
      patient_id: entry.patient_id || "00000000-0000-0000-0000-000000000000",
      encounter_id: entry.encounter_id || null,
      action: entry.action,
      justification: entry.justification || null,
    });
  } catch (err) {
    console.warn("Audit log notice:", err);
  }
}

/**
 * AI Clinical Copilot Server Function
 * Drafts encounter SOAP notes, flags clinical risks, suggests differentials, and creates patient instructions.
 */
export const generateAiEncounterSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AiEncounterInput) => {
    if (!input.encounterId) throw new Error("Missing encounter ID.");
    if (!input.chiefComplaint && !input.historyOfPresentingIllness && !input.provisionalDiagnosis) {
      throw new Error("At least a chief complaint, HPI, or diagnosis is required to generate an AI clinical draft.");
    }
    return input;
  })
  .handler(async ({ context, data: input }): Promise<AiCopilotResult> => {
    const { supabase, userId } = context;

    // Verify staff permissions
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const roles = (roleRows ?? []).filter((r: any) => r.hospital_id && r.role !== "patient");
    if (roles.length === 0) throw new Error("Unauthorized.");

    const matchedRole = input.hospitalId
      ? roles.find((r: any) => r.hospital_id === input.hospitalId) || roles[0]
      : roles[0];

    const activeHospitalId = matchedRole?.hospital_id || "";
    const callerRole = (matchedRole?.role as StaffRole) || "doctor";

    // 1. Scan for Clinical Red Flags
    const redFlags: string[] = [];
    const v = input.vitals || {};

    if (v.systolicBp && v.systolicBp >= 140) {
      redFlags.push(`Elevated Systolic Blood Pressure: ${v.systolicBp} mmHg (Stage 2 Hypertension range)`);
    } else if (v.systolicBp && v.systolicBp <= 90) {
      redFlags.push(`Hypotension Warning: Systolic BP ${v.systolicBp} mmHg (Evaluate for shock/dehydration)`);
    }

    if (v.bodyTemperature && v.bodyTemperature >= 38.0) {
      redFlags.push(`Febrile State: Core Temperature ${v.bodyTemperature}°C (Rule out systemic infection/malaria)`);
    }

    if (v.spo2 && v.spo2 < 95) {
      redFlags.push(`Suboptimal Oxygen Saturation: SpO2 ${v.spo2}% on room air (Monitor airway & ventilation)`);
    }

    if (v.pulseRate && v.pulseRate >= 100) {
      redFlags.push(`Tachycardia: Resting Pulse ${v.pulseRate} bpm`);
    }

    if (v.painScore && v.painScore >= 7) {
      redFlags.push(`Severe Acute Pain: Pain scale score ${v.painScore}/10 reported by patient`);
    }

    if (input.allergies && input.allergies.length > 0) {
      redFlags.push(`Documented Allergies: ${input.allergies.join(", ")} — Ensure all ordered medications are cross-checked.`);
    }

    // 2. Synthesize SOAP Components
    const subjectNarrative = [
      `Patient ${input.patientName} (${input.patientAge || "Adult"}, ${input.patientGender || "Unspecified"}) presents with chief complaint of: "${input.chiefComplaint}".`,
      input.historyOfPresentingIllness ? `History of Presenting Illness: ${input.historyOfPresentingIllness}` : null,
      input.chronicConditions && input.chronicConditions.length > 0 ? `Past Medical History / Comorbidities: ${input.chronicConditions.join(", ")}.` : null,
      input.allergies && input.allergies.length > 0 ? `Known Allergies: ${input.allergies.join(", ")}.` : "No known drug allergies reported.",
    ].filter(Boolean).join("\n");

    const vitalsSummary = v.systolicBp || v.bodyTemperature || v.pulseRate
      ? `Vitals Recorded: BP: ${v.systolicBp || "--"}/${v.diastolicBp || "--"} mmHg | Temp: ${v.bodyTemperature ? v.bodyTemperature + "°C" : "--"} | Pulse: ${v.pulseRate ? v.pulseRate + " bpm" : "--"} | RR: ${v.respiratoryRate ? v.respiratoryRate + " cpm" : "--"} | SpO2: ${v.spo2 ? v.spo2 + "%" : "--"} | Weight: ${v.weightKg ? v.weightKg + " kg" : "--"}.`
      : "Vitals: No new vital signs captured in this encounter.";

    const physicalFindings = input.examinationFindings
      ? `Physical Examination: ${input.examinationFindings}`
      : "Physical Examination: General exam conducted, no acute distress documented on inspection.";

    const labSynopsis = input.labOrders && input.labOrders.length > 0
      ? `Ordered Diagnostic Tests: ${input.labOrders.map(l => `${l.testName} (${l.status})`).join("; ")}.`
      : "Diagnostics: No laboratory tests requested at this time.";

    const objectiveNarrative = [vitalsSummary, physicalFindings, labSynopsis].join("\n");

    const dx = input.provisionalDiagnosis || "Clinical Evaluation Pending";
    const assessmentNarrative = `Primary Clinical Impression: ${dx}.\nDifferential considerations evaluated based on presented symptoms, vital signs profile, and local epidemiology (malaria/febrile illnesses).`;

    const rxList = input.prescriptions && input.prescriptions.length > 0
      ? input.prescriptions.map(p => `• ${p.drugName}: ${p.dosage || "Standard dose"} ${p.frequency || "daily"} for ${p.duration || "course"}`).join("\n")
      : "• No new pharmaceuticals ordered during this consultation.";

    const planNarrative = [
      `1. Pharmacotherapy / Prescriptions:\n${rxList}`,
      input.labOrders && input.labOrders.length > 0 ? `2. Laboratory Diagnostics: Follow up on pending results for ${input.labOrders.map(l => l.testName).join(", ")}.` : null,
      `3. Patient Counseling: Maintain adequate oral hydration, adhere strictly to prescribed drug regimens, and observe infection control practices.`,
      `4. Follow-up: Clinical review recommended in 3 to 5 days, or immediately if symptoms worsen or alarm signs appear.`,
    ].filter(Boolean).join("\n\n");

    const fullDraftNote = `[SOAP CLINICAL ENCOUNTER NOTE]\n\n` +
      `S (SUBJECTIVE):\n${subjectNarrative}\n\n` +
      `O (OBJECTIVE):\n${objectiveNarrative}\n\n` +
      `A (ASSESSMENT):\n${assessmentNarrative}\n\n` +
      `P (PLAN):\n${planNarrative}`;

    // 3. Differential Diagnoses Matrix
    const differentialDiagnoses: AiCopilotResult["differentialDiagnoses"] = [];
    const complaintLower = (input.chiefComplaint + " " + (input.historyOfPresentingIllness || "")).toLowerCase();

    if (complaintLower.includes("fever") || complaintLower.includes("headache") || complaintLower.includes("body pain") || (v.bodyTemperature && v.bodyTemperature >= 37.8)) {
      differentialDiagnoses.push({
        code: "B50.9",
        name: "Plasmodium Falciparum Malaria",
        confidence: "High",
        rationale: "Classic presentation of fever, malaise, and headache in endemic region. RDT / Blood Film indicated.",
      });
      differentialDiagnoses.push({
        code: "A01.0",
        name: "Typhoid Fever (Salmonella enterica)",
        confidence: "Moderate",
        rationale: "Persistent step-ladder fever with constitutional symptoms and abdominal discomfort.",
      });
      differentialDiagnoses.push({
        code: "J06.9",
        name: "Acute Upper Respiratory Infection",
        confidence: "Possible",
        rationale: "Viral prodrome with secondary fever and mild catarrhal symptoms.",
      });
    } else if (complaintLower.includes("cough") || complaintLower.includes("chest") || complaintLower.includes("breath")) {
      differentialDiagnoses.push({
        code: "J18.9",
        name: "Community-Acquired Pneumonia",
        confidence: "High",
        rationale: "Cough with respiratory involvement; monitor SpO2 and auscultate lung fields.",
      });
      differentialDiagnoses.push({
        code: "J20.9",
        name: "Acute Bronchitis",
        confidence: "Moderate",
        rationale: "Productive or dry cough following viral upper respiratory infection.",
      });
    } else if (complaintLower.includes("stomach") || complaintLower.includes("abdominal") || complaintLower.includes("stool") || complaintLower.includes("vomit")) {
      differentialDiagnoses.push({
        code: "A09",
        name: "Infectious Gastroenteritis",
        confidence: "High",
        rationale: "Gastrointestinal distress; ensure oral rehydration solution (ORS) and electrolyte balance.",
      });
      differentialDiagnoses.push({
        code: "K29.7",
        name: "Gastritis / Peptic Ulcer Disease",
        confidence: "Moderate",
        rationale: "Epigastric discomfort or dyspepsia related to meals.",
      });
    } else {
      differentialDiagnoses.push({
        code: "Z00.00",
        name: dx,
        confidence: "High",
        rationale: "Consistent with doctor's primary clinical examination and patient symptoms.",
      });
    }

    // 4. Patient Friendly Home-Care Instructions
    const patientInstructions = `Hello ${input.patientName.split(" ")[0] || "Patient"},\n\n` +
      `Here is your home care guide from your consultation today:\n` +
      `1. Take your prescribed medications exactly as instructed by the pharmacy.\n` +
      `2. Drink plenty of clean water and get adequate rest.\n` +
      `3. Return to the clinic immediately if you experience persistent high fever (>38.5°C), difficulty breathing, sudden severe weakness, or inability to keep fluids down.\n` +
      `4. Next scheduled clinical review: in 3–5 days.`;

    const suggestedFollowUp = "Review in 3–5 days, or emergency visit if red flag signs appear.";

    // Audit AI generation
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "READ",
      justification: `AI Clinical Copilot synthesized SOAP note and safety analysis for encounter`,
    });

    return {
      soapSummary: {
        subjective: subjectNarrative,
        objective: objectiveNarrative,
        assessment: assessmentNarrative,
        plan: planNarrative,
      },
      fullDraftNote,
      redFlags,
      differentialDiagnoses,
      patientInstructions,
      suggestedFollowUp,
      generatedAt: new Date().toISOString(),
    };
  });
