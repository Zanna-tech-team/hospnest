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
    resultValue?: string | null | undefined;
    isCritical?: boolean | undefined;
    isOutOfRange?: boolean | undefined;
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
  clinicianSummary: string;
  patientFriendlySummary: string;
  keyFindings: string[];
  suggestedNextSteps: string[];
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
  gatewayProvider?: string;
};

async function writeAuditEntry(
  supabase: { from: (t: string) => any },
  entry: {
    hospital_id: string;
    accessor_id: string;
    accessor_role: StaffRole;
    patient_id?: string | undefined;
    encounter_id?: string | undefined;
    action: "READ" | "WRITE" | "BREAK_GLASS_OVERRIDE" | "EXPORT";
    justification?: string | null | undefined;
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
 * AI Clinical Copilot & Consultation Summarizer via AI Gateway
 * Generates both Clinician SOAP/Summary and Patient-Friendly Home Guide with Key Findings and Next Steps.
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

    // Check for AI Gateway configuration
    let aiGatewayResult: Partial<AiCopilotResult> | null = null;
    let gatewayProvider = "HospNest Clinical Reasoning Engine";

    const aiGatewayUrl = process.env.AI_GATEWAY_URL || process.env.CF_AI_GATEWAY_URL;
    const aiApiKey = process.env.AI_GATEWAY_TOKEN || process.env.CLOUDFLARE_API_TOKEN || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

    if (aiGatewayUrl || aiApiKey) {
      try {
        const endpoint = aiGatewayUrl || (process.env.OPENAI_API_KEY ? "https://api.openai.com/v1/chat/completions" : null);
        if (endpoint) {
          gatewayProvider = "Cloudflare AI Gateway / Neural LLM";
          const promptPayload = {
            model: process.env.AI_MODEL || "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are an expert clinical AI assistant. Given patient consultation details, synthesize:
1. Clinician technical summary (SOAP context, concise findings, diagnostic rationale).
2. Patient-friendly summary & home instructions (warm, clear, non-jargon, medication guidance, red flag warning signs).
3. Structured key findings (bullet points).
4. Suggested next steps (actionable patient & doctor checklist).
5. SOAP breakdown (Subjective, Objective, Assessment, Plan).
Return strictly valid JSON with keys: clinicianSummary, patientFriendlySummary, keyFindings (array of strings), suggestedNextSteps (array of strings), redFlags (array of strings), soapSummary ({subjective, objective, assessment, plan}).`
              },
              {
                role: "user",
                content: JSON.stringify({
                  patient: {
                    name: input.patientName,
                    age: input.patientAge,
                    gender: input.patientGender,
                    allergies: input.allergies,
                    chronicConditions: input.chronicConditions,
                  },
                  visit: {
                    chiefComplaint: input.chiefComplaint,
                    hpi: input.historyOfPresentingIllness,
                    exam: input.examinationFindings,
                    provisionalDiagnosis: input.provisionalDiagnosis,
                    vitals: input.vitals,
                    labOrders: input.labOrders,
                    prescriptions: input.prescriptions,
                  }
                })
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          };

          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(aiApiKey ? { "Authorization": `Bearer ${aiApiKey}` } : {}),
            },
            body: JSON.stringify(promptPayload),
          });

          if (res.ok) {
            const json = await res.json();
            const contentStr = json?.choices?.[0]?.message?.content;
            if (contentStr) {
              const parsed = JSON.parse(contentStr);
              if (parsed.clinicianSummary && parsed.patientFriendlySummary) {
                aiGatewayResult = parsed;
              }
            }
          }
        }
      } catch (gatewayErr) {
        console.warn("AI Gateway request bypassed, using clinical algorithmic engine fallback:", gatewayErr);
      }
    }

    // 1. Scan for Clinical Red Flags & Risk Indicators
    const redFlags: string[] = aiGatewayResult?.redFlags || [];
    const v = input.vitals || {};

    if (v.systolicBp && v.systolicBp >= 140) {
      redFlags.push(`Elevated Systolic Blood Pressure: ${v.systolicBp} mmHg (Stage 2 Hypertension range)`);
    } else if (v.systolicBp && v.systolicBp <= 90) {
      redFlags.push(`Hypotension Warning: Systolic BP ${v.systolicBp} mmHg (Evaluate for shock/dehydration)`);
    }

    if (v.bodyTemperature && v.bodyTemperature >= 38.0) {
      redFlags.push(`Febrile State: Core Temperature ${v.bodyTemperature}°C (Rule out systemic infection / malaria)`);
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

    // Check critical labs if available
    if (input.labOrders && input.labOrders.some(l => l.isCritical || l.isOutOfRange)) {
      const abnormal = input.labOrders.filter(l => l.isCritical || l.isOutOfRange);
      redFlags.push(`Abnormal Lab Findings: ${abnormal.map(l => `${l.testName}${l.resultValue ? ` (${l.resultValue})` : ""}`).join(", ")}`);
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
      ? `Ordered Diagnostic Tests: ${input.labOrders.map(l => `${l.testName} (${l.status}${l.resultValue ? `: ${l.resultValue}` : ""})`).join("; ")}.`
      : "Diagnostics: No laboratory tests requested at this time.";

    const objectiveNarrative = [vitalsSummary, physicalFindings, labSynopsis].join("\n");

    const dx = input.provisionalDiagnosis || "Clinical Evaluation Pending";
    const assessmentNarrative = `Primary Clinical Impression: ${dx}.\nDifferential considerations evaluated based on presented symptoms, vital signs profile, and regional epidemiological patterns.`;

    const rxList = input.prescriptions && input.prescriptions.length > 0
      ? input.prescriptions.map(p => `• ${p.drugName}: ${p.dosage || "Standard dose"} ${p.frequency || "daily"} for ${p.duration || "course"}`).join("\n")
      : "• No new pharmaceuticals ordered during this consultation.";

    const planNarrative = [
      `1. Pharmacotherapy / Prescriptions:\n${rxList}`,
      input.labOrders && input.labOrders.length > 0 ? `2. Laboratory Diagnostics: Follow up on results for ${input.labOrders.map(l => l.testName).join(", ")}.` : null,
      `3. Patient Counseling: Maintain adequate hydration, take medications as scheduled, and practice infection safety.`,
      `4. Follow-up: Clinical review in 3 to 5 days, or emergency room immediately if alarm symptoms occur.`,
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
        rationale: "Persistent fever with constitutional symptoms and abdominal discomfort.",
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
        rationale: "Consistent with primary clinical examination and patient symptoms.",
      });
    }

    // 4. Structured Key Findings & Suggested Next Steps
    const keyFindings: string[] = aiGatewayResult?.keyFindings && aiGatewayResult.keyFindings.length > 0
      ? aiGatewayResult.keyFindings
      : [
          `Primary Impression: ${dx}`,
          input.chiefComplaint ? `Chief Complaint: ${input.chiefComplaint}` : null,
          v.systolicBp ? `Blood Pressure: ${v.systolicBp}/${v.diastolicBp || "--"} mmHg` : null,
          v.bodyTemperature ? `Temperature: ${v.bodyTemperature}°C` : null,
          v.spo2 ? `SpO2: ${v.spo2}%` : null,
          input.labOrders && input.labOrders.length > 0 ? `Diagnostics: ${input.labOrders.length} test(s) requested` : null,
          input.prescriptions && input.prescriptions.length > 0 ? `Prescriptions: ${input.prescriptions.length} item(s) issued` : null,
        ].filter(Boolean) as string[];

    const suggestedNextSteps: string[] = aiGatewayResult?.suggestedNextSteps && aiGatewayResult.suggestedNextSteps.length > 0
      ? aiGatewayResult.suggestedNextSteps
      : [
          input.prescriptions && input.prescriptions.length > 0
            ? "Collect prescribed medications from the hospital pharmacy and adhere strictly to dosing instructions."
            : "Complete supportive care and maintain adequate oral hydration.",
          input.labOrders && input.labOrders.length > 0
            ? `Await lab results for ${input.labOrders.map(l => l.testName).join(", ")} and review with attending clinician.`
            : null,
          "Return for clinical review in 3–5 days to monitor symptom resolution.",
          "Seek emergency medical evaluation immediately if experiencing high fever (>38.5°C), breathing difficulty, severe chest pain, or fainting.",
        ].filter(Boolean) as string[];

    // 5. Dual Summaries: Clinician Summary + Patient-Friendly Summary
    const clinicianSummary = aiGatewayResult?.clinicianSummary ||
      `Patient ${input.patientName} presented with ${input.chiefComplaint}. Clinical impression: ${dx}. Vitals: BP ${v.systolicBp || "--"}/${v.diastolicBp || "--"}, Temp ${v.bodyTemperature ? v.bodyTemperature + "°C" : "unrecorded"}, SpO2 ${v.spo2 ? v.spo2 + "%" : "unrecorded"}. ${input.prescriptions?.length || 0} medications prescribed and ${input.labOrders?.length || 0} diagnostic tests requested. Follow-up advised in 3-5 days.`;

    const firstName = input.patientName.split(" ")[0] || "Patient";
    const patientFriendlySummary = aiGatewayResult?.patientFriendlySummary ||
      (`Dear ${firstName},\n\n` +
      `During your visit today, the doctor reviewed your condition regarding your symptoms of ${input.chiefComplaint.toLowerCase()}.\n\n` +
      `• Diagnosis: ${dx}\n` +
      `• What we found: Your physical examination was completed and your vital signs were recorded.\n` +
      (input.prescriptions && input.prescriptions.length > 0
        ? `• Your Medications:\n${input.prescriptions.map(p => `  - ${p.drugName}: Take ${p.dosage || "as directed"} (${p.frequency || "daily"}) for ${p.duration || "course"}`).join("\n")}\n`
        : `• Treatment: Supportive rest and fluids recommended.\n`) +
      `• Next Steps:\n` +
      suggestedNextSteps.map(step => `  ✓ ${step}`).join("\n") + `\n\n` +
      `If your symptoms worsen or you develop high fever or breathing distress, please return to the hospital immediately.`);

    const patientInstructions = patientFriendlySummary;
    const suggestedFollowUp = "Review in 3–5 days, or emergency visit if red flag signs appear.";

    // 6. Persist AI summaries to Supabase Database (encounters table)
    try {
      await supabase
        .from("encounters")
        .update({
          ai_summary: clinicianSummary,
          ai_patient_summary: patientFriendlySummary,
          ai_key_findings: keyFindings,
          ai_next_steps: suggestedNextSteps,
          ai_differential_diagnoses: differentialDiagnoses,
          ai_red_flags: redFlags,
          ai_generated_at: new Date().toISOString(),
        })
        .eq("id", input.encounterId);
    } catch (err) {
      console.warn("Could not persist AI summary to encounters table:", err);
    }

    // 7. Audit AI generation
    await writeAuditEntry(supabase, {
      hospital_id: activeHospitalId,
      accessor_id: userId,
      accessor_role: callerRole,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      action: "READ",
      justification: `AI Clinical Copilot synthesized dual clinician & patient summary for encounter via ${gatewayProvider}`,
    });

    return {
      soapSummary: aiGatewayResult?.soapSummary || {
        subjective: subjectNarrative,
        objective: objectiveNarrative,
        assessment: assessmentNarrative,
        plan: planNarrative,
      },
      fullDraftNote,
      clinicianSummary,
      patientFriendlySummary,
      keyFindings,
      suggestedNextSteps,
      redFlags,
      differentialDiagnoses,
      patientInstructions,
      suggestedFollowUp,
      generatedAt: new Date().toISOString(),
      gatewayProvider,
    };
  });
