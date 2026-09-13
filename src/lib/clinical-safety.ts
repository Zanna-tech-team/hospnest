/**
 * Clinical Safety Engine — HospNest
 * National Early Warning Score 2 (NEWS2), Pediatric Warning Score (PEWS),
 * Drug-Allergy Cross-Matching & Major Drug-Drug Interaction Checker.
 */

export type ConsciousnessLevel = "A" | "C" | "V" | "P" | "U";

export interface News2Input {
  respiratoryRate?: number | null;
  spo2?: number | null;
  onOxygen?: boolean | null;
  systolicBp?: number | null;
  pulseRate?: number | null;
  consciousness?: ConsciousnessLevel | string | null;
  bodyTemperature?: number | null;
  isHypercapnicRisk?: boolean; // COPD or chronic hypercapnic respiratory failure (SpO2 Scale 2)
}

export interface News2Subscores {
  respiratoryRate: number;
  spo2: number;
  onOxygen: number;
  systolicBp: number;
  pulseRate: number;
  consciousness: number;
  bodyTemperature: number;
}

export type News2RiskLevel = "low" | "low_medium" | "medium" | "high";

export interface News2Result {
  totalScore: number;
  subscores: News2Subscores;
  riskLevel: News2RiskLevel;
  riskLabel: string;
  badgeClass: string;
  hasRedFlagSingleScore: boolean; // Single parameter score of 3
  clinicalResponse: string;
  monitoringFrequency: string;
}

/**
 * Calculates official Royal College of Physicians NEWS2 Deterioration Score.
 */
export function calculateNews2Score(input: News2Input): News2Result {
  const subscores: News2Subscores = {
    respiratoryRate: 0,
    spo2: 0,
    onOxygen: input.onOxygen ? 2 : 0,
    systolicBp: 0,
    pulseRate: 0,
    consciousness: 0,
    bodyTemperature: 0,
  };

  // 1. Respiration Rate (bpm)
  if (input.respiratoryRate != null) {
    const rr = Number(input.respiratoryRate);
    if (rr <= 8) subscores.respiratoryRate = 3;
    else if (rr >= 9 && rr <= 11) subscores.respiratoryRate = 1;
    else if (rr >= 12 && rr <= 20) subscores.respiratoryRate = 0;
    else if (rr >= 21 && rr <= 24) subscores.respiratoryRate = 2;
    else if (rr >= 25) subscores.respiratoryRate = 3;
  }

  // 2. SpO2 (%)
  if (input.spo2 != null) {
    const sat = Number(input.spo2);
    if (input.isHypercapnicRisk) {
      // Scale 2 (Target 88-92%)
      if (sat <= 83) subscores.spo2 = 3;
      else if (sat >= 84 && sat <= 85) subscores.spo2 = 2;
      else if (sat >= 86 && sat <= 87) subscores.spo2 = 1;
      else if (sat >= 88 && sat <= 92) subscores.spo2 = 0;
      else if (sat >= 93 && sat <= 94 && input.onOxygen) subscores.spo2 = 1;
      else if (sat >= 95 && sat <= 96 && input.onOxygen) subscores.spo2 = 2;
      else if (sat >= 97 && input.onOxygen) subscores.spo2 = 3;
      else subscores.spo2 = 0;
    } else {
      // Scale 1 (Standard)
      if (sat <= 91) subscores.spo2 = 3;
      else if (sat >= 92 && sat <= 93) subscores.spo2 = 2;
      else if (sat >= 94 && sat <= 95) subscores.spo2 = 1;
      else if (sat >= 96) subscores.spo2 = 0;
    }
  }

  // 3. Systolic Blood Pressure (mmHg)
  if (input.systolicBp != null) {
    const sbp = Number(input.systolicBp);
    if (sbp <= 90) subscores.systolicBp = 3;
    else if (sbp >= 91 && sbp <= 100) subscores.systolicBp = 2;
    else if (sbp >= 101 && sbp <= 110) subscores.systolicBp = 1;
    else if (sbp >= 111 && sbp <= 219) subscores.systolicBp = 0;
    else if (sbp >= 220) subscores.systolicBp = 3;
  }

  // 4. Pulse / Heart Rate (bpm)
  if (input.pulseRate != null) {
    const hr = Number(input.pulseRate);
    if (hr <= 40) subscores.pulseRate = 3;
    else if (hr >= 41 && hr <= 50) subscores.pulseRate = 1;
    else if (hr >= 51 && hr <= 90) subscores.pulseRate = 0;
    else if (hr >= 91 && hr <= 110) subscores.pulseRate = 1;
    else if (hr >= 111 && hr <= 130) subscores.pulseRate = 2;
    else if (hr >= 131) subscores.pulseRate = 3;
  }

  // 5. Consciousness (ACVPU)
  const c = String(input.consciousness || "A").trim().toUpperCase();
  if (c === "A" || c === "ALERT") {
    subscores.consciousness = 0;
  } else {
    // Confusion (C), Voice (V), Pain (P), Unresponsive (U)
    subscores.consciousness = 3;
  }

  // 6. Temperature (°C)
  if (input.bodyTemperature != null) {
    const temp = Number(input.bodyTemperature);
    if (temp <= 35.0) subscores.bodyTemperature = 3;
    else if (temp >= 35.1 && temp <= 36.0) subscores.bodyTemperature = 1;
    else if (temp >= 36.1 && temp <= 38.0) subscores.bodyTemperature = 0;
    else if (temp >= 38.1 && temp <= 39.0) subscores.bodyTemperature = 1;
    else if (temp >= 39.1) subscores.bodyTemperature = 2;
  }

  const totalScore =
    subscores.respiratoryRate +
    subscores.spo2 +
    subscores.onOxygen +
    subscores.systolicBp +
    subscores.pulseRate +
    subscores.consciousness +
    subscores.bodyTemperature;

  const hasRedFlagSingleScore = Object.values(subscores).some((score) => score === 3);

  let riskLevel: News2RiskLevel = "low";
  let riskLabel = "Low Clinical Risk";
  let badgeClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  let clinicalResponse = "Standard ward care. Routine vital monitoring.";
  let monitoringFrequency = "Minimum 12-hourly monitoring";

  if (totalScore >= 7) {
    riskLevel = "high";
    riskLabel = "HIGH Clinical Risk (Emergency)";
    badgeClass = "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse font-bold";
    clinicalResponse = "EMERGENCY: Immediate assessment by critical care / medical emergency team. Continuous monitoring and ICU escalation.";
    monitoringFrequency = "Continuous real-time monitoring";
  } else if (totalScore >= 5 || hasRedFlagSingleScore) {
    if (totalScore >= 5) {
      riskLevel = "medium";
      riskLabel = "Medium Clinical Risk (Urgent Review)";
      badgeClass = "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-bold";
      clinicalResponse = "URGENT: Key clinical threshold. Urgent bedside review by attending doctor / medical team within 30 minutes.";
      monitoringFrequency = "Minimum hourly vital sign monitoring";
    } else {
      riskLevel = "low_medium";
      riskLabel = "Low-Medium Risk (Red-Flag Score 3 in single parameter)";
      badgeClass = "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
      clinicalResponse = "Urgent ward-based review by registered nurse and doctor to evaluate underlying cause.";
      monitoringFrequency = "Minimum 4 to 6-hourly monitoring";
    }
  }

  return {
    totalScore,
    subscores,
    riskLevel,
    riskLabel,
    badgeClass,
    hasRedFlagSingleScore,
    clinicalResponse,
    monitoringFrequency,
  };
}

// ============================================================
// DRUG-ALLERGY & DRUG-DRUG INTERACTION DATABASE
// ============================================================

export interface AllergyClassRule {
  allergyPattern: RegExp;
  matchingDrugKeywords: string[];
  severity: "critical" | "high";
  message: string;
}

const ALLERGY_RULES: AllergyClassRule[] = [
  {
    allergyPattern: /penicillin|amoxicillin|ampicillin|augmentin/i,
    matchingDrugKeywords: [
      "penicillin", "amoxicillin", "ampicillin", "augmentin", "co-amoxiclav",
      "cloxacillin", "flucloxacillin", "piperacillin", "tazobactam", "unasyn", "ampiclox"
    ],
    severity: "critical",
    message: "Patient has documented Penicillin allergy. Risk of life-threatening anaphylaxis or severe angioedema.",
  },
  {
    allergyPattern: /sulfa|sulfonamide|bactrim|septra|cotrimoxazole/i,
    matchingDrugKeywords: [
      "sulfamethoxazole", "co-trimoxazole", "bactrim", "septrin", "sulfasalazine",
      "sulfadiazine", "fansidar", "sulfadoxine"
    ],
    severity: "critical",
    message: "Patient has documented Sulfonamide allergy. Risk of Stevens-Johnson syndrome (SJS) and toxic epidermal necrolysis (TEN).",
  },
  {
    allergyPattern: /nsaid|aspirin|ibuprofen|diclofenac/i,
    matchingDrugKeywords: [
      "aspirin", "ibuprofen", "diclofenac", "ketorolac", "naproxen", "piroxicam",
      "meloxicam", "celecoxib", "indomethacin", "felbinac", "aceclofenac"
    ],
    severity: "high",
    message: "Patient has documented NSAID / Aspirin hypersensitivity. Risk of bronchospasm, urticaria, or GI hemorrhage.",
  },
  {
    allergyPattern: /cephalosporin|ceftriaxone|cefuroxime/i,
    matchingDrugKeywords: [
      "ceftriaxone", "cefuroxime", "cefixime", "cephalexin", "cefepime",
      "ceftazidime", "cefotaxime", "rocephin", "zinnat"
    ],
    severity: "high",
    message: "Patient has documented Cephalosporin allergy. Risk of cross-reactivity and hypersensitivity.",
  },
  {
    allergyPattern: /quinolone|ciprofloxacin|levofloxacin/i,
    matchingDrugKeywords: [
      "ciprofloxacin", "levofloxacin", "ofloxacin", "moxifloxacin", "norfloxacin", "cipro"
    ],
    severity: "high",
    message: "Patient has documented Fluoroquinolone allergy. Risk of tendonitis, QT prolongation, or hypersensitivity.",
  },
  {
    allergyPattern: /macrolide|azithromycin|erythromycin/i,
    matchingDrugKeywords: [
      "azithromycin", "erythromycin", "clarithromycin", "zithromax", "klacid"
    ],
    severity: "high",
    message: "Patient has documented Macrolide antibiotic allergy.",
  },
];

export interface DrugInteractionRule {
  drugAKeywords: string[];
  drugBKeywords: string[];
  severity: "contraindicated" | "major" | "moderate";
  title: string;
  mechanism: string;
  clinicalAction: string;
}

const DRUG_INTERACTION_RULES: DrugInteractionRule[] = [
  {
    drugAKeywords: ["warfarin", "heparin", "enoxaparin", "rivaroxaban", "apixaban", "dabigatran"],
    drugBKeywords: ["ibuprofen", "diclofenac", "ketorolac", "naproxen", "aspirin", "piroxicam", "meloxicam"],
    severity: "contraindicated",
    title: "Anticoagulant + NSAID / Aspirin (Major Hemorrhage)",
    mechanism: "Concurrent NSAID use causes gastric mucosal damage and platelet inhibition, drastically increasing risk of severe gastrointestinal and internal bleeding.",
    clinicalAction: "Avoid combination. Substitute NSAID with Paracetamol (Acetaminophen) or short-term opioid if analgesia needed.",
  },
  {
    drugAKeywords: ["lisinopril", "ramipril", "enalapril", "captopril", "losartan", "valsartan", "telmisartan"],
    drugBKeywords: ["spironolactone", "eplerenone", "potassium chloride", "amiloride", "potassium"],
    severity: "major",
    title: "ACE Inhibitor / ARB + Potassium-Sparing Diuretic (Severe Hyperkalemia)",
    mechanism: "Both agents inhibit aldosterone production or action, resulting in dangerous potassium retention and fatal cardiac arrhythmias.",
    clinicalAction: "Monitor serum potassium within 3-7 days. Avoid routine potassium supplementation.",
  },
  {
    drugAKeywords: ["tramadol", "pethidine", "fentanyl", "dextromethorphan"],
    drugBKeywords: ["fluoxetine", "sertraline", "escitalopram", "citalopram", "amitriptyline", "duloxetine", "venlafaxine"],
    severity: "major",
    title: "Tramadol + Serotonergic Antidepressant (Serotonin Syndrome & Seizures)",
    mechanism: "Synergistic enhancement of central serotonin and lowered seizure threshold.",
    clinicalAction: "Monitor for neuromuscular hyperactivity, clonus, hyperthermia. Reduce tramadol dose or switch to alternative non-serotonergic analgesic.",
  },
  {
    drugAKeywords: ["metformin"],
    drugBKeywords: ["contrast", "iohexol", "iopamidol", "iodinated"],
    severity: "major",
    title: "Metformin + Iodinated Radiographic Contrast (Lactic Acidosis)",
    mechanism: "Contrast-induced acute renal impairment can lead to toxic metformin accumulation and life-threatening lactic acidosis.",
    clinicalAction: "Withhold Metformin 48 hours prior to and 48 hours after contrast procedure until renal function (eGFR) is verified normal.",
  },
  {
    drugAKeywords: ["ciprofloxacin", "levofloxacin", "doxycycline", "tetracycline"],
    drugBKeywords: ["calcium", "iron", "ferrous sulfate", "magnesium", "antacid", "gestid", "aluminium hydroxide"],
    severity: "moderate",
    title: "Fluoroquinolones / Tetracyclines + Polyvalent Cations (Chelation)",
    mechanism: "Divalent and trivalent metal ions bind antimicrobial molecules, reducing GI absorption by up to 90%.",
    clinicalAction: "Separate administration times by at least 2 hours before or 4 hours after mineral/antacid ingestion.",
  },
  {
    drugAKeywords: ["clopidogrel"],
    drugBKeywords: ["omeprazole", "esomeprazole"],
    severity: "moderate",
    title: "Clopidogrel + Omeprazole (Attenuated Antiplatelet Effect)",
    mechanism: "CYP2C19 competitive inhibition prevents biotransformation of clopidogrel to its active antiplatelet metabolite.",
    clinicalAction: "Switch proton pump inhibitor to Pantoprazole or H2-blocker (Famotidine) which does not inhibit CYP2C19.",
  },
  {
    drugAKeywords: ["sildenafil", "tadalafil", "vardenafil"],
    drugBKeywords: ["nitroglycerin", "isosorbide", "glyceryl trinitrate", "nitrate"],
    severity: "contraindicated",
    title: "PDE5 Inhibitor + Organic Nitrates (Severe Refractory Hypotension)",
    mechanism: "Massive cGMP accumulation causing profound systemic vasodilation, cardiogenic shock, and syncope.",
    clinicalAction: "ABSOLUTELY CONTRAINDICATED. Nitrates must not be given within 24-48 hours of PDE5 inhibitor.",
  },
  {
    drugAKeywords: ["methotrexate"],
    drugBKeywords: ["co-trimoxazole", "bactrim", "septrin", "ibuprofen", "diclofenac"],
    severity: "contraindicated",
    title: "Methotrexate + Co-trimoxazole / NSAIDs (Fatal Bone Marrow Aplasia)",
    mechanism: "Decreased renal clearance of methotrexate and additive folate antagonism.",
    clinicalAction: "Avoid co-administration. Monitor CBC and serum methotrexate levels closely.",
  },
  {
    drugAKeywords: ["digoxin"],
    drugBKeywords: ["amiodarone", "verapamil", "clarithromycin"],
    severity: "major",
    title: "Digoxin + P-gp / CYP3A4 Inhibitors (Digoxin Toxicity)",
    mechanism: "Inhibition of renal and biliary P-glycoprotein efflux transporters increases serum digoxin levels by 50-100%.",
    clinicalAction: "Halve digoxin dose upon initiation of partner drug; monitor ECG and serum digoxin levels.",
  },
];

export interface DrugSafetyCheckInput {
  prescribedDrugName: string;
  patientAllergies: string[];
  activeMedicationNames: string[];
}

export interface AllergyConflictResult {
  allergy: string;
  prescribedDrug: string;
  severity: "critical" | "high";
  message: string;
}

export interface DrugInteractionResult {
  drug1: string;
  drug2: string;
  severity: "contraindicated" | "major" | "moderate";
  title: string;
  mechanism: string;
  clinicalAction: string;
}

export interface DrugSafetyResult {
  hasConflicts: boolean;
  hasContraindications: boolean;
  allergyConflicts: AllergyConflictResult[];
  drugInteractions: DrugInteractionResult[];
}

/**
 * Validates prescribed drug against patient allergies and active medication profile.
 */
export function checkDrugSafetyAndInteractions(input: DrugSafetyCheckInput): DrugSafetyResult {
  const targetDrug = input.prescribedDrugName.toLowerCase();
  const allergyConflicts: AllergyConflictResult[] = [];
  const drugInteractions: DrugInteractionResult[] = [];

  // 1. Check Allergies
  for (const allergy of input.patientAllergies) {
    if (!allergy || !allergy.trim()) continue;
    const cleanAllergy = allergy.trim();

    for (const rule of ALLERGY_RULES) {
      if (rule.allergyPattern.test(cleanAllergy)) {
        const matchesDrug = rule.matchingDrugKeywords.some((kw) => targetDrug.includes(kw));
        if (matchesDrug) {
          allergyConflicts.push({
            allergy: cleanAllergy,
            prescribedDrug: input.prescribedDrugName,
            severity: rule.severity,
            message: rule.message,
          });
        }
      }
    }
  }

  // 2. Check Drug-Drug Interactions
  const allDrugsToCheck = [input.prescribedDrugName, ...input.activeMedicationNames].map((d) => d.toLowerCase());

  for (const rule of DRUG_INTERACTION_RULES) {
    const hasDrugA = allDrugsToCheck.some((d) => rule.drugAKeywords.some((kw) => d.includes(kw)));
    const hasDrugB = allDrugsToCheck.some((d) => rule.drugBKeywords.some((kw) => d.includes(kw)));

    if (hasDrugA && hasDrugB) {
      // Find exact names
      const foundA = allDrugsToCheck.find((d) => rule.drugAKeywords.some((kw) => d.includes(kw))) || "Drug A";
      const foundB = allDrugsToCheck.find((d) => rule.drugBKeywords.some((kw) => d.includes(kw))) || "Drug B";

      // Prevent duplicate entries
      const alreadyReported = drugInteractions.some(
        (di) => di.title === rule.title,
      );

      if (!alreadyReported) {
        drugInteractions.push({
          drug1: foundA,
          drug2: foundB,
          severity: rule.severity,
          title: rule.title,
          mechanism: rule.mechanism,
          clinicalAction: rule.clinicalAction,
        });
      }
    }
  }

  const hasContraindications =
    allergyConflicts.some((a) => a.severity === "critical") ||
    drugInteractions.some((d) => d.severity === "contraindicated");

  const hasConflicts = allergyConflicts.length > 0 || drugInteractions.length > 0;

  return {
    hasConflicts,
    hasContraindications,
    allergyConflicts,
    drugInteractions,
  };
}
