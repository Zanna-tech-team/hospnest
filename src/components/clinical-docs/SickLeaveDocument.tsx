import React from "react";
import { Building2, Calendar, CheckCircle2, FileText, HeartPulse, MapPin, ShieldCheck, Stethoscope, User, AlertCircle } from "lucide-react";
import { QrCodeBadge } from "./QrCodeBadge";

export type SickLeaveProps = {
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
    employerOrSchool?: string | null | undefined;
  };
  sickLeave: {
    certificateNumber: string;
    issueDate: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    resumeWorkDate: string;
    diagnosisCategory: string; // e.g. Acute Febrile Illness, Post-Operative Recovery, Severe Bronchitis
    clinicalJustificationSummary?: string | undefined;
    excusedDutyType: "total_bed_rest" | "light_duty" | "excused_from_duty";
    attendingPhysician: string;
    physicianRank?: string | undefined;
    physicianLicenseNumber: string; // MDCN/R/12345
    digitalSignatureHash?: string | undefined;
  };
};

export function SickLeaveDocument({ hospital, patient, sickLeave }: SickLeaveProps) {
  const verificationUrl = `https://hospnest.ng/verify?doc=${sickLeave.certificateNumber}&nin=${patient.nin || "PAT"}`;

  return (
    <div className="bg-white text-slate-900 font-sans p-8 sm:p-12 max-w-4xl mx-auto space-y-8 border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
      {/* 1. Official Header */}
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
                Clinical Health & Occupational Medicine Directorate
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
          <span className="inline-block rounded-md bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800 border border-amber-200">
            Medical Excused Duty Certificate
          </span>
          <p className="mt-1 text-xs font-mono font-bold text-slate-700">
            Cert No: {sickLeave.certificateNumber}
          </p>
        </div>
      </div>

      {/* 2. Patient Profile */}
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
          <span className="text-slate-500 block font-medium">Employer / Institution:</span>
          <span className="font-bold text-slate-800">{patient.employerOrSchool || "To Whom It May Concern"}</span>
        </div>
      </div>

      {/* 3. Excused Duty Declaration Banner */}
      <div className="rounded-xl p-5 border bg-amber-50/70 border-amber-200 text-amber-950 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-extrabold uppercase tracking-wider text-sm flex items-center gap-1.5 text-amber-900">
            <AlertCircle className="size-5 text-amber-700" />
            Medical Certification of Temporary Incapacity
          </span>
          <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
            {sickLeave.durationDays} Days Excused Duty
          </span>
        </div>

        <p className="leading-relaxed text-slate-800">
          This is to certify that the above-named patient was examined by me on <strong>{new Date(sickLeave.issueDate).toLocaleDateString("en-GB", { dateStyle: "long" })}</strong> and is suffering from <strong>{sickLeave.diagnosisCategory}</strong>.
        </p>

        <p className="leading-relaxed text-slate-800">
          In consequence of this illness, they are medically unfit for work/duty and are advised to observe{" "}
          <strong>{sickLeave.excusedDutyType === "total_bed_rest" ? "Strict Bed Rest" : sickLeave.excusedDutyType === "light_duty" ? "Light / Modified Duty" : "Excused Duty from all physical work/school"}</strong>{" "}
          for a period of <strong>{sickLeave.durationDays} day(s)</strong>, starting from{" "}
          <strong>{new Date(sickLeave.startDate).toLocaleDateString("en-GB", { dateStyle: "medium" })}</strong> to{" "}
          <strong>{new Date(sickLeave.endDate).toLocaleDateString("en-GB", { dateStyle: "medium" })}</strong> inclusive.
        </p>

        <div className="rounded-lg bg-white p-3 border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-slate-500 text-[11px] block">Expected Date of Resumption:</span>
            <span className="font-bold font-mono text-sm text-slate-900">
              {new Date(sickLeave.resumeWorkDate).toLocaleDateString("en-GB", { dateStyle: "full" })}
            </span>
          </div>
          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="size-4" /> Fit to Resume on Specified Date
          </span>
        </div>
      </div>

      {/* 4. Clinical Details */}
      {sickLeave.clinicalJustificationSummary && (
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-700 uppercase tracking-wider">Physician's Clinical Notes</h4>
          <p className="rounded-lg bg-slate-50 p-3 text-slate-700 border border-slate-200">
            {sickLeave.clinicalJustificationSummary}
          </p>
        </div>
      )}

      {/* 5. Attestation & Signature */}
      <div className="flex items-end justify-between border-t-2 border-slate-900 pt-6">
        <div className="space-y-2 max-w-md">
          <div className="flex items-center gap-2 text-slate-700 text-xs">
            <ShieldCheck className="size-4 text-teal-600 shrink-0" />
            <span className="font-semibold">Official MDCN Medical Certificate</span>
          </div>

          <div className="space-y-0.5 text-xs text-slate-800">
            <p className="font-bold text-sm text-slate-900">{sickLeave.attendingPhysician}</p>
            <p className="text-slate-600">{sickLeave.physicianRank || "Medical Officer"} • Reg No: <strong className="font-mono text-slate-900">{sickLeave.physicianLicenseNumber}</strong></p>
            <p className="text-[10px] text-slate-400 font-mono pt-1">
              Sign-Hash: {sickLeave.digitalSignatureHash || `0x${sickLeave.certificateNumber.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toLowerCase()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scan to Verify Authenticity</p>
            <p className="text-[9px] text-slate-400">Anti-Forgery Medical Register</p>
          </div>
          <QrCodeBadge value={verificationUrl} size={84} />
        </div>
      </div>
    </div>
  );
}
