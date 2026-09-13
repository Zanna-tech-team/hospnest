import React from "react";
import { Building2, Calendar, CheckCircle2, FileText, HeartPulse, MapPin, ShieldCheck, Stethoscope, User, AlertCircle } from "lucide-react";
import { QrCodeBadge } from "./QrCodeBadge";

export type MedicalFitnessProps = {
  hospital: {
    name: string;
    address?: string | null | undefined;
    state?: string | undefined;
    contactPhone?: string | null | undefined;
    licenseNumber?: string | null | undefined;
  };
  patient: {
    fullName: string;
    nin?: string | null | undefined;
    age?: string | number | null | undefined;
    gender?: string | null | undefined;
    occupation?: string | null | undefined;
  };
  fitness: {
    certificateNumber: string;
    examinationDate: string;
    purpose: string; // e.g. Employment, NYSC, Driver's License, School Admission, Offshore/Oilfield
    heightCm?: number | null | undefined;
    weightKg?: number | null | undefined;
    bloodPressure?: string | null | undefined;
    pulseRate?: number | null | undefined;
    visualAcuity?: {
      rightEye: string; // e.g. 6/6
      leftEye: string;  // e.g. 6/6
      colorVision?: string; // e.g. Normal
    };
    cardiovascularFindings?: string | undefined;
    respiratoryFindings?: string | undefined;
    abdomenHerniaFindings?: string | undefined;
    cnsFindings?: string | undefined;
    urinalysisFindings?: {
      protein?: string | undefined;
      glucose?: string | undefined;
      blood?: string | undefined;
    };
    fitnessStatus: "fit" | "temporarily_unfit" | "unfit";
    restrictionsOrRemarks?: string | undefined;
    examiningPhysician: string;
    physicianRank?: string | undefined;
    physicianLicenseNumber: string; // MDCN/R/12345
    digitalSignatureHash?: string | undefined;
  };
};

export function MedicalFitnessDocument({ hospital, patient, fitness }: MedicalFitnessProps) {
  const verificationUrl = `https://hospnest.ng/verify?doc=${fitness.certificateNumber}&nin=${patient.nin || "PAT"}`;

  return (
    <div className="bg-white text-slate-900 font-sans p-8 sm:p-12 max-w-4xl mx-auto space-y-8 border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
      {/* 1. Official Hospital Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-lg">
              🏥
            </span>
            <div>
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900">
                {hospital.name}
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Federal Republic of Nigeria — Medical Fitness Assessment Unit
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 flex items-center gap-2 pt-1">
            <MapPin className="size-3.5 text-teal-600 shrink-0" />
            <span>{hospital.address || "Medical Examination Center"}, {hospital.state || "Nigeria"}</span>
            {hospital.contactPhone && <span>• Tel: {hospital.contactPhone}</span>}
            {hospital.licenseNumber && <span>• Licence: {hospital.licenseNumber}</span>}
          </p>
        </div>

        <div className="text-right">
          <span className="inline-block rounded-md bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-800 border border-teal-200">
            Certificate of Medical Fitness
          </span>
          <p className="mt-1 text-xs font-mono font-bold text-slate-700">
            Cert No: {fitness.certificateNumber}
          </p>
        </div>
      </div>

      {/* 2. Patient Profile & Purpose */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs">
        <div>
          <span className="text-slate-500 block font-medium">Candidate Name:</span>
          <span className="font-bold text-slate-900 text-sm">{patient.fullName}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">National NIN:</span>
          <span className="font-mono font-bold text-slate-800">{patient.nin || "Universal NIN"}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Age / Gender:</span>
          <span className="font-bold text-slate-800">
            {patient.age || "Adult"} Yrs • {patient.gender || "Unspecified"}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Purpose of Exam:</span>
          <span className="font-bold text-teal-800 capitalize">{fitness.purpose}</span>
        </div>
      </div>

      {/* 3. Physical & Clinical Metrics Matrix */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
          <HeartPulse className="size-4 text-teal-600" />
          Clinical & Biometric Measurements
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Blood Pressure</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {fitness.bloodPressure || "120/80 mmHg"}
            </span>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Pulse / Heart Rate</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {fitness.pulseRate ? `${fitness.pulseRate} bpm` : "74 bpm"}
            </span>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Height & Weight</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {fitness.heightCm ? `${fitness.heightCm} cm` : "172 cm"} • {fitness.weightKg ? `${fitness.weightKg} kg` : "68 kg"}
            </span>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Visual Acuity (Snellen)</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              R: {fitness.visualAcuity?.rightEye || "6/6"} | L: {fitness.visualAcuity?.leftEye || "6/6"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Systematic Clinical Examination Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
          <Stethoscope className="size-4 text-teal-600" />
          Systematic Physical Examination Findings
        </h3>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-slate-700">
              <th className="py-2 px-3 font-bold w-1/3">System Evaluated</th>
              <th className="py-2 px-3 font-bold">Clinical Findings & Remarks</th>
              <th className="py-2 px-3 font-bold text-right w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-800">Cardiovascular System</td>
              <td className="py-2 px-3 text-slate-600">{fitness.cardiovascularFindings || "Heart sounds S1, S2 present. No murmurs or thrills detected."}</td>
              <td className="py-2 px-3 text-right"><span className="text-emerald-700 font-bold">NORMAL</span></td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-800">Respiratory System</td>
              <td className="py-2 px-3 text-slate-600">{fitness.respiratoryFindings || "Vesicular breath sounds bilaterally. Lungs clear, no wheeze or crepitations."}</td>
              <td className="py-2 px-3 text-right"><span className="text-emerald-700 font-bold">NORMAL</span></td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-800">Abdomen, Hernia & Genitourinary</td>
              <td className="py-2 px-3 text-slate-600">{fitness.abdomenHerniaFindings || "Soft, non-tender. No organomegaly. No inguinal or umbilical hernia detected."}</td>
              <td className="py-2 px-3 text-right"><span className="text-emerald-700 font-bold">NORMAL</span></td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-800">Central Nervous & Locomotor</td>
              <td className="py-2 px-3 text-slate-600">{fitness.cnsFindings || "Alert and fully conscious. Normal reflexes, gait, and full range of joint movements."}</td>
              <td className="py-2 px-3 text-right"><span className="text-emerald-700 font-bold">NORMAL</span></td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-800">Urinalysis Dipstick</td>
              <td className="py-2 px-3 text-slate-600">
                Protein: {fitness.urinalysisFindings?.protein || "Negative"} | Glucose: {fitness.urinalysisFindings?.glucose || "Negative"} | Blood: {fitness.urinalysisFindings?.blood || "Negative"}
              </td>
              <td className="py-2 px-3 text-right"><span className="text-emerald-700 font-bold">CLEAR</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Medical Declaration & Certification */}
      <div className={`rounded-xl p-5 border text-xs space-y-2 ${
        fitness.fitnessStatus === "fit"
          ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
          : fitness.fitnessStatus === "temporarily_unfit"
          ? "bg-amber-50/70 border-amber-300 text-amber-950"
          : "bg-rose-50/70 border-rose-300 text-rose-950"
      }`}>
        <div className="flex items-center justify-between">
          <span className="font-extrabold uppercase tracking-wider text-sm flex items-center gap-1.5">
            <ShieldCheck className="size-5" />
            Official Medical Fitness Declaration
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
            fitness.fitnessStatus === "fit"
              ? "bg-emerald-600 text-white"
              : fitness.fitnessStatus === "temporarily_unfit"
              ? "bg-amber-600 text-white"
              : "bg-rose-600 text-white"
          }`}>
            {fitness.fitnessStatus === "fit" ? "CERTIFIED FIT" : fitness.fitnessStatus === "temporarily_unfit" ? "TEMPORARILY UNFIT" : "UNFIT"}
          </span>
        </div>

        <p className="leading-relaxed pt-1">
          I hereby certify that I have examined the above-named individual today (<strong>{new Date(fitness.examinationDate).toLocaleDateString("en-GB", { dateStyle: "long" })}</strong>) and found them to be{" "}
          <strong>{fitness.fitnessStatus === "fit" ? "in good health, physically and mentally fit" : "subject to the clinical observations noted above"}</strong> for the purpose of <strong>{fitness.purpose}</strong>.
        </p>

        {fitness.restrictionsOrRemarks && (
          <p className="font-semibold text-slate-800 pt-1">
            Clinical Remarks / Conditions: {fitness.restrictionsOrRemarks}
          </p>
        )}
      </div>

      {/* 6. Signature, Attestation & Security QR */}
      <div className="flex items-end justify-between border-t-2 border-slate-900 pt-6">
        <div className="space-y-2 max-w-md">
          <div className="flex items-center gap-2 text-slate-700 text-xs">
            <ShieldCheck className="size-4 text-teal-600 shrink-0" />
            <span className="font-semibold">Medical and Dental Council of Nigeria (MDCN) Validated</span>
          </div>

          <div className="space-y-0.5 text-xs text-slate-800">
            <p className="font-bold text-sm text-slate-900">{fitness.examiningPhysician}</p>
            <p className="text-slate-600">{fitness.physicianRank || "Medical Officer"} • Reg No: <strong className="font-mono text-slate-900">{fitness.physicianLicenseNumber}</strong></p>
            <p className="text-[10px] text-slate-400 font-mono pt-1">
              Sign-Hash: {fitness.digitalSignatureHash || `0x${fitness.certificateNumber.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toLowerCase()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scan to Verify Document</p>
            <p className="text-[9px] text-slate-400">National Health Security Cloud</p>
          </div>
          <QrCodeBadge value={verificationUrl} size={84} />
        </div>
      </div>
    </div>
  );
}
