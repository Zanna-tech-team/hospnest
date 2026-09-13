import React from "react";
import { Building2, Calendar, CheckCircle2, FileText, HeartPulse, MapPin, ShieldCheck, Stethoscope, User, Scan, AlertTriangle } from "lucide-react";
import { QrCodeBadge } from "./QrCodeBadge";

export type RadiologyReportProps = {
  hospital: {
    name: string;
    address?: string | null;
    state?: string;
    contactPhone?: string | null;
    licenseNumber?: string | null;
  };
  patient: {
    fullName: string;
    nin?: string | null;
    age?: string | number | null;
    gender?: string | null;
    phone?: string | null;
  };
  study: {
    accessionNumber: string;
    studyDate: string;
    modality: string;
    bodyPart: string;
    clinicalIndication?: string | null;
    requestingDoctor?: string | null;
    reportingRadiologist: string;
    radiologistRank?: string;
    findings: string;
    impression: string;
    isCritical?: boolean;
    radiologistNotes?: string | null;
  };
};

export function RadiologyReportDocument({ hospital, patient, study }: RadiologyReportProps) {
  const verificationUrl = `https://hospnest.ng/verify?doc=${study.accessionNumber}&pat=${patient.nin || "PAT"}`;

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
              <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
                {hospital.name}
              </h1>
              <p className="text-xs text-slate-500">Department of Radiology & Diagnostic Imaging</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 max-w-md">
            {hospital.address || "Main Medical Center Boulevard"}, {hospital.state || "Nigeria"}
            {hospital.contactPhone && ` • Tel: ${hospital.contactPhone}`}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono pt-1">
            <span>License: {hospital.licenseNumber || "FMOH/HOSP/2026/09"}</span>
            <span>•</span>
            <span className="text-teal-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="size-3.5 inline" /> NNRA Radiation Safety Certified
            </span>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="inline-block rounded-lg bg-slate-900 text-white px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider">
            Diagnostic Imaging Report
          </div>
          <p className="font-mono text-xs font-bold text-slate-700">
            ACCESSION: {study.accessionNumber}
          </p>
          <p className="text-[11px] text-slate-500">
            Exam Date: {new Date(study.studyDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Critical Finding Alert Banner if Applicable */}
      {study.isCritical && (
        <div className="rounded-xl border-2 border-rose-600 bg-rose-50 p-4 text-rose-900 flex items-center gap-3">
          <AlertTriangle className="size-6 text-rose-600 shrink-0" />
          <div className="text-xs">
            <p className="font-black uppercase tracking-wider text-rose-700">Critical Finding Communicated</p>
            <p>Immediate clinician verbal escalation logged to ordering physician at time of interpretation.</p>
          </div>
        </div>
      )}

      {/* 2. Patient Identity & Study Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block uppercase">Patient Name</span>
          <strong className="text-slate-900 text-sm">{patient.fullName}</strong>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block uppercase">National ID (NIN)</span>
          <strong className="text-slate-900 font-mono">{patient.nin || "Not recorded"}</strong>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block uppercase">Age / Gender</span>
          <strong className="text-slate-900">{patient.age || "N/A"} • {patient.gender || "N/A"}</strong>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block uppercase">Modality & Body Part</span>
          <strong className="text-teal-800 uppercase font-black">{study.modality}: {study.bodyPart}</strong>
        </div>
      </div>

      {/* 3. Clinical Indication & Technique */}
      <div className="space-y-4 text-xs leading-relaxed">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-1.5">
            Clinical Indication
          </h2>
          <p className="text-slate-800 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
            {study.clinicalIndication || "Routine diagnostic evaluation"}
          </p>
        </div>

        {/* 4. Detailed Findings */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-1.5">
            Radiological Findings
          </h2>
          <p className="text-slate-800 whitespace-pre-line bg-slate-50/80 p-3.5 rounded-lg border border-slate-200">
            {study.findings || "No focal radiographic abnormalities identified."}
          </p>
        </div>

        {/* 5. Impression / Conclusion */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-1.5">
            Impression
          </h2>
          <div className="bg-teal-50/60 p-3.5 rounded-lg border border-teal-200 text-slate-900 font-semibold">
            {study.impression}
          </div>
        </div>
      </div>

      {/* 6. Attending Radiologist Signature Block & QR Code */}
      <div className="pt-6 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
        <div className="space-y-1.5 text-left">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">Certified & Signed Electronically By:</span>
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Stethoscope className="size-4 text-teal-600" />
              {study.reportingRadiologist}
            </p>
            <p className="text-slate-600 text-[11px]">{study.radiologistRank || "Consultant Radiologist"}</p>
            <p className="text-[10px] text-slate-400 font-mono">
              Signed {new Date().toLocaleDateString()} • Verified on HospNest Audit Ledger
            </p>
          </div>
        </div>

        {/* Cryptographic QR Verification Code */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
          <QrCodeBadge value={verificationUrl} size={64} />
          <div className="text-[10px] text-slate-500 space-y-0.5 max-w-[140px]">
            <p className="font-bold text-slate-800">Scan to Verify</p>
            <p>Scan QR code with smartphone to authenticate genuine clinical record.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
