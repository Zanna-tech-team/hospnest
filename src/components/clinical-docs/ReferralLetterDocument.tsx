import React from "react";
import { Building2, Calendar, FileText, HeartPulse, MapPin, Send, ShieldCheck, Stethoscope, User, AlertTriangle } from "lucide-react";
import { QrCodeBadge } from "./QrCodeBadge";

export type ReferralLetterProps = {
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
    bloodGroup?: string | null;
  };
  referral: {
    referralNumber: string;
    referralDate: string;
    referralType: "emergency" | "urgent" | "routine";
    receivingFacility: string; // e.g. National Hospital Abuja / LUTH
    receivingSpecialty: string; // e.g. Cardiology / Neurosurgery / Obstetrics
    reasonForReferral: string;
    clinicalSummaryAndHistory: string;
    vitalSignsSummary?: {
      bp?: string;
      pulse?: number;
      temp?: number;
      spo2?: number;
      respiratoryRate?: number;
    };
    investigationsSummary?: string;
    treatmentGivenSoFar?: string;
    referringDoctorName: string;
    referringDoctorRank?: string;
    referringDoctorLicenseNumber: string; // MDCN/R/12345
    referringDoctorContact?: string;
    digitalSignatureHash?: string;
  };
};

export function ReferralLetterDocument({ hospital, patient, referral }: ReferralLetterProps) {
  const verificationUrl = `https://hospnest.ng/verify?doc=${referral.referralNumber}&nin=${patient.nin || "PAT"}`;

  return (
    <div className="bg-white text-slate-900 font-sans p-8 sm:p-12 max-w-4xl mx-auto space-y-8 border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
      {/* 1. Header */}
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
                Clinical Referral & Transfer Division
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 flex items-center gap-2 pt-1">
            <MapPin className="size-3.5 text-teal-600 shrink-0" />
            <span>{hospital.address || "Healthcare Facility Location"}, {hospital.state || "Nigeria"}</span>
            {hospital.contactPhone && <span>• Tel: {hospital.contactPhone}</span>}
          </p>
        </div>

        <div className="text-right">
          <span className={`inline-block rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
            referral.referralType === "emergency"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : referral.referralType === "urgent"
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-teal-50 text-teal-800 border-teal-200"
          }`}>
            {referral.referralType.toUpperCase()} REFERRAL
          </span>
          <p className="mt-1 text-xs font-mono font-bold text-slate-700">
            Ref: {referral.referralNumber}
          </p>
        </div>
      </div>

      {/* 2. Destination Facility Notice */}
      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div>
          <span className="text-slate-500 block font-medium">To Attending Consultant / Department:</span>
          <span className="font-bold text-slate-900 text-sm">{referral.receivingSpecialty}</span>
          <span className="text-slate-700 block mt-0.5">{referral.receivingFacility}</span>
        </div>
        <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
          <span className="text-slate-500 block font-medium">Date of Referral:</span>
          <span className="font-mono font-bold text-slate-900">
            {new Date(referral.referralDate).toLocaleDateString("en-GB", { dateStyle: "long" })}
          </span>
        </div>
      </div>

      {/* 3. Patient Demographics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs">
        <div>
          <span className="text-slate-500 block font-medium">Patient Name:</span>
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
          <span className="text-slate-500 block font-medium">Blood Group:</span>
          <span className="font-bold text-teal-800">{patient.bloodGroup || "O+"}</span>
        </div>
      </div>

      {/* 4. Reason for Referral & Clinical History */}
      <div className="space-y-4 text-xs">
        <div className="space-y-1">
          <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
            <Send className="size-4 text-teal-600" />
            Reason for Clinical Referral
          </h3>
          <p className="rounded-lg bg-teal-50/50 p-3 text-slate-900 font-semibold border border-teal-200">
            {referral.reasonForReferral}
          </p>
        </div>

        <div className="space-y-1">
          <h3 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
            <FileText className="size-4 text-teal-600" />
            Clinical Summary, History & Presenting Illness
          </h3>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-3 rounded-lg border border-slate-200">
            {referral.clinicalSummaryAndHistory}
          </p>
        </div>

        {/* Vital Signs at Transfer */}
        {referral.vitalSignsSummary && (
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase">Vitals at Time of Transfer</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">BP</span>
                <span className="font-bold font-mono text-slate-900">{referral.vitalSignsSummary.bp || "N/A"}</span>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Pulse</span>
                <span className="font-bold font-mono text-slate-900">{referral.vitalSignsSummary.pulse ? `${referral.vitalSignsSummary.pulse} bpm` : "N/A"}</span>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Temp</span>
                <span className="font-bold font-mono text-slate-900">{referral.vitalSignsSummary.temp ? `${referral.vitalSignsSummary.temp}°C` : "N/A"}</span>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">SpO2</span>
                <span className="font-bold font-mono text-slate-900">{referral.vitalSignsSummary.spo2 ? `${referral.vitalSignsSummary.spo2}%` : "N/A"}</span>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Resp Rate</span>
                <span className="font-bold font-mono text-slate-900">{referral.vitalSignsSummary.respiratoryRate ? `${referral.vitalSignsSummary.respiratoryRate} cpm` : "N/A"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostic Investigations & Treatment */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <span className="font-bold text-slate-800 block">Investigations Done & Results:</span>
            <p className="rounded-lg bg-slate-50 p-2.5 text-slate-700 border border-slate-200 min-h-16">
              {referral.investigationsSummary || "Awaiting tertiary workup."}
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-800 block">Treatments / Medications Administered:</span>
            <p className="rounded-lg bg-slate-50 p-2.5 text-slate-700 border border-slate-200 min-h-16">
              {referral.treatmentGivenSoFar || "Primary stabilization administered."}
            </p>
          </div>
        </div>
      </div>

      {/* 5. Signature & Stamp */}
      <div className="flex items-end justify-between border-t-2 border-slate-900 pt-6">
        <div className="space-y-2 max-w-md">
          <div className="flex items-center gap-2 text-slate-700 text-xs">
            <ShieldCheck className="size-4 text-teal-600 shrink-0" />
            <span className="font-semibold">MDCN Licensed Medical Practitioner</span>
          </div>

          <div className="space-y-0.5 text-xs text-slate-800">
            <p className="font-bold text-sm text-slate-900">{referral.referringDoctorName}</p>
            <p className="text-slate-600">{referral.referringDoctorRank || "Medical Officer"} • Reg No: <strong className="font-mono text-slate-900">{referral.referringDoctorLicenseNumber}</strong></p>
            {referral.referringDoctorContact && (
              <p className="text-slate-600">Contact: {referral.referringDoctorContact}</p>
            )}
            <p className="text-[10px] text-slate-400 font-mono pt-1">
              Sign-Hash: {referral.digitalSignatureHash || `0x${referral.referralNumber.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toLowerCase()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scan for e-Referral Records</p>
            <p className="text-[9px] text-slate-400">National Health Transfer Mesh</p>
          </div>
          <QrCodeBadge value={verificationUrl} size={84} />
        </div>
      </div>
    </div>
  );
}
