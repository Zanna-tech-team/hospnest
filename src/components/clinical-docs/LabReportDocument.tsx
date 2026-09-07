import React from "react";
import { AlertCircle, CheckCircle2, FlaskConical, MapPin, ShieldCheck, User } from "lucide-react";
import { QrCodeBadge } from "./QrCodeBadge";

export type LabReportParam = {
  parameterName: string;
  measuredValue: string | number;
  unit?: string;
  referenceInterval?: string;
  flag?: "normal" | "abnormal" | "critical";
};

export type LabReportProps = {
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
  };
  lab: {
    reportNumber: string;
    testName: string;
    testCode: string;
    category?: string;
    specimenType: string;
    collectionDate: string;
    receivedDate?: string;
    reportedDate: string;
    orderingDoctor: string;
    pathologistOrScientist: string;
    overallStatus: "completed" | "critical";
    clinicalIndication?: string;
    parameters: LabReportParam[];
    comments?: string;
  };
};

export function LabReportDocument({ hospital, patient, lab }: LabReportProps) {
  const verificationUrl = `https://hospnest.ng/verify?lab=${lab.reportNumber}&code=${lab.testCode}`;

  return (
    <div className="bg-white text-slate-900 font-sans p-8 sm:p-12 max-w-4xl mx-auto space-y-8 border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
      {/* 1. Official Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-lg">
              🧪
            </span>
            <div>
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900">
                {hospital.name}
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Department of Laboratory Medicine & Diagnostic Pathology
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 flex items-center gap-2 pt-1">
            <MapPin className="size-3.5 text-teal-600 shrink-0" />
            <span>{hospital.address || "Medical Centre"}, {hospital.state || "Nigeria"}</span>
            {hospital.contactPhone && <span>• Tel: {hospital.contactPhone}</span>}
          </p>
        </div>

        <div className="text-right">
          <span className="inline-block rounded-md bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-800 border border-teal-200">
            Diagnostic Pathology Report
          </span>
          <p className="mt-1 text-xs font-mono font-bold text-slate-700">
            Lab Ref: {lab.reportNumber}
          </p>
        </div>
      </div>

      {/* 2. Patient & Specimen Meta Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs">
        <div>
          <span className="text-slate-500 block font-medium">Patient Name:</span>
          <span className="font-bold text-slate-900 text-sm">{patient.fullName}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">National NIN:</span>
          <span className="font-mono font-bold text-slate-800">{patient.nin || "Universal ID"}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Age / Gender:</span>
          <span className="font-bold text-slate-800">{patient.age || "Adult"} / {patient.gender || "Unspecified"}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Ordering Clinician:</span>
          <span className="font-bold text-slate-800">{lab.orderingDoctor}</span>
        </div>
      </div>

      {/* 3. Investigation & Specimen Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-200 rounded-xl p-4 text-xs">
        <div>
          <span className="text-slate-500 block">Specimen / Matrix:</span>
          <span className="font-bold text-slate-900">{lab.specimenType}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Sample Collection Date:</span>
          <span className="font-bold text-slate-900">
            {new Date(lab.collectionDate).toLocaleDateString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Report Authorized Date:</span>
          <span className="font-bold text-slate-900">
            {new Date(lab.reportedDate).toLocaleDateString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
      </div>

      {/* 4. Investigation Title */}
      <div className="border-l-4 border-teal-600 pl-3">
        <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">Investigation Requested</span>
        <h2 className="text-base font-extrabold text-slate-900">
          {lab.testName} <span className="text-xs font-mono font-normal text-slate-500">({lab.testCode})</span>
        </h2>
        {lab.clinicalIndication && (
          <p className="text-xs text-slate-600 mt-0.5">Clinical Indication: {lab.clinicalIndication}</p>
        )}
      </div>

      {/* 5. Results & Reference Intervals Table */}
      <div className="space-y-2">
        <table className="w-full text-left text-xs border border-slate-200">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3 border-b border-slate-200">Investigation Parameter</th>
              <th className="p-3 border-b border-slate-200">Observed Result</th>
              <th className="p-3 border-b border-slate-200">Units</th>
              <th className="p-3 border-b border-slate-200">Biological Reference Interval</th>
              <th className="p-3 border-b border-slate-200">Clinical Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lab.parameters.map((p, idx) => {
              const isCrit = p.flag === "critical";
              const isAbn = p.flag === "abnormal";
              return (
                <tr key={idx} className={isCrit ? "bg-rose-50" : isAbn ? "bg-amber-50/50" : idx % 2 === 1 ? "bg-slate-50/60" : ""}>
                  <td className="p-3 font-semibold text-slate-900">{p.parameterName}</td>
                  <td className={`p-3 font-extrabold text-sm ${isCrit ? "text-rose-700" : isAbn ? "text-amber-700" : "text-slate-900"}`}>
                    {p.measuredValue}
                  </td>
                  <td className="p-3 text-slate-600 font-mono">{p.unit || "—"}</td>
                  <td className="p-3 text-slate-700">{p.referenceInterval || "Standard Clinical Normal"}</td>
                  <td className="p-3">
                    {isCrit ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">
                        <AlertCircle className="size-3" /> Critical
                      </span>
                    ) : isAbn ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        Abnormal
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                        <CheckCircle2 className="size-3" /> Normal
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 6. Pathologist Comments */}
      {lab.comments && (
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider block">Clinical Laboratory Interpretation & Comments:</span>
          <p className="text-slate-800 mt-1 leading-relaxed">{lab.comments}</p>
        </div>
      )}

      {/* 7. Sign-off & Verification Footer */}
      <div className="flex items-end justify-between border-t-2 border-slate-900 pt-6">
        <div className="space-y-4 text-xs">
          <div>
            <p className="font-bold text-slate-900">{lab.pathologistOrScientist}</p>
            <p className="text-slate-500">Medical Laboratory Scientist / Consultant Pathologist</p>
            <p className="text-[11px] text-slate-400">Electronic Pathology Authorization — HospNest Certified</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <ShieldCheck className="size-3.5 text-teal-600" />
            <span>Digital Diagnostic Result securely hash-verified via HospNest Registry</span>
          </div>
        </div>

        <div>
          <QrCodeBadge
            value={verificationUrl}
            size={76}
            label="Verify Result"
          />
        </div>
      </div>
    </div>
  );
}
