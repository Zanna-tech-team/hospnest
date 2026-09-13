import React from "react";
import { Building2, Calendar, CheckCircle2, FileText, HeartPulse, MapPin, ShieldCheck, Stethoscope, User } from "lucide-react";
import { QrCodeBadge } from "./QrCodeBadge";

export type DischargeSummaryProps = {
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
    phone?: string | null | undefined;
    bloodGroup?: string | null | undefined;
  };
  discharge: {
    summaryNumber: string;
    admissionDate: string;
    dischargeDate: string;
    wardName: string;
    bedNumber?: string | null | undefined;
    attendingPhysician: string;
    physicianRank?: string | undefined;
    admissionReason: string;
    primaryDiagnosis: string;
    secondaryDiagnoses?: string[] | undefined;
    hospitalCourseSummary: string;
    investigationsSummary?: string | undefined;
    proceduresPerformed?: string[] | undefined;
    dischargeCondition: "recovered" | "improved" | "stable" | "transferred" | "against_medical_advice";
    dischargeMedications: Array<{
      drugName: string;
      dosage: string | null;
      frequency: string | null;
      duration: string | null;
      specialInstructions?: string | undefined;
    }>;
    followUpInstructions: string;
    nextAppointmentDate?: string | undefined;
    emergencyContactHelpline?: string | undefined;
  };
};

export function DischargeSummaryDocument({ hospital, patient, discharge }: DischargeSummaryProps) {
  const verificationUrl = `https://hospnest.ng/verify?doc=${discharge.summaryNumber}&pat=${patient.nin || "PAT"}`;

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
                Federal Republic of Nigeria — Ministry of Health Accredited
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 flex items-center gap-2 pt-1">
            <MapPin className="size-3.5 text-teal-600 shrink-0" />
            <span>{hospital.address || "Healthcare Facility Location"}, {hospital.state || "Nigeria"}</span>
            {hospital.contactPhone && (
              <span>• Tel: {hospital.contactPhone}</span>
            )}
            {hospital.licenseNumber && (
              <span>• Licence: {hospital.licenseNumber}</span>
            )}
          </p>
        </div>

        <div className="text-right">
          <span className="inline-block rounded-md bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-800 border border-teal-200">
            Clinical Discharge Summary
          </span>
          <p className="mt-1 text-xs font-mono font-bold text-slate-700">
            Doc Ref: {discharge.summaryNumber}
          </p>
        </div>
      </div>

      {/* 2. Patient Demographics Strip */}
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
          <span className="text-slate-500 block font-medium">Blood Group:</span>
          <span className="font-bold text-slate-800">{patient.bloodGroup || "O+"}</span>
        </div>
      </div>

      {/* 3. Inpatient Stay Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-200 rounded-xl p-4 text-xs">
        <div>
          <span className="text-slate-500 block">Date of Admission:</span>
          <span className="font-bold text-slate-900">
            {new Date(discharge.admissionDate).toLocaleDateString("en-GB", { dateStyle: "long" })}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Date of Discharge:</span>
          <span className="font-bold text-slate-900">
            {new Date(discharge.dischargeDate).toLocaleDateString("en-GB", { dateStyle: "long" })}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Ward & Bed Number:</span>
          <span className="font-bold text-slate-900">
            {discharge.wardName} {discharge.bedNumber ? `(Bed ${discharge.bedNumber})` : ""}
          </span>
        </div>
      </div>

      {/* 4. Diagnoses & Clinical Course */}
      <div className="space-y-4 text-xs">
        <div className="border-l-4 border-teal-600 pl-3">
          <span className="font-bold text-slate-900 uppercase tracking-wider block">Principal Diagnosis</span>
          <p className="text-sm font-extrabold text-slate-900 mt-0.5">{discharge.primaryDiagnosis}</p>
        </div>

        {discharge.secondaryDiagnoses && discharge.secondaryDiagnoses.length > 0 && (
          <div>
            <span className="font-bold text-slate-700 block">Secondary / Co-morbid Conditions:</span>
            <ul className="list-disc list-inside text-slate-800 mt-1">
              {discharge.secondaryDiagnoses.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <span className="font-bold text-slate-700 uppercase tracking-wider block">Hospital Course & Summary</span>
          <p className="text-slate-800 leading-relaxed mt-1 text-justify bg-slate-50 p-3 rounded-lg border border-slate-200">
            {discharge.hospitalCourseSummary}
          </p>
        </div>

        {discharge.proceduresPerformed && discharge.proceduresPerformed.length > 0 && (
          <div>
            <span className="font-bold text-slate-700 block">Procedures & Interventions:</span>
            <p className="text-slate-800 mt-1">{discharge.proceduresPerformed.join(" • ")}</p>
          </div>
        )}
      </div>

      {/* 5. Discharge Medications Table */}
      <div className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Stethoscope className="size-3.5 text-teal-600" /> Discharge Medications & Prescription Regimen
        </h3>
        <table className="w-full text-left text-xs border border-slate-200">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-2.5 border-b border-slate-200">Medication</th>
              <th className="p-2.5 border-b border-slate-200">Dosage</th>
              <th className="p-2.5 border-b border-slate-200">Frequency</th>
              <th className="p-2.5 border-b border-slate-200">Duration</th>
              <th className="p-2.5 border-b border-slate-200">Special Instructions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {discharge.dischargeMedications.map((m, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50" : ""}>
                <td className="p-2.5 font-bold text-slate-900">{m.drugName}</td>
                <td className="p-2.5 text-slate-800">{m.dosage}</td>
                <td className="p-2.5 text-slate-800">{m.frequency}</td>
                <td className="p-2.5 text-slate-800">{m.duration}</td>
                <td className="p-2.5 text-slate-600 italic">{m.specialInstructions || "Take with water as directed"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 6. Follow-up & Discharge Condition */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 text-xs bg-slate-50">
        <div>
          <span className="text-slate-500 block font-medium">Condition at Discharge:</span>
          <span className="font-bold text-teal-800 uppercase tracking-wide">
            {discharge.dischargeCondition.replace(/_/g, " ")}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Next Outpatient Clinic Appointment:</span>
          <span className="font-bold text-slate-900">
            {discharge.nextAppointmentDate || "In 2 weeks (Book via HospNest Portal)"}
          </span>
        </div>
        <div className="sm:col-span-2">
          <span className="text-slate-500 block font-medium">Home Care & Follow-up Instructions:</span>
          <p className="text-slate-800 mt-0.5">{discharge.followUpInstructions}</p>
        </div>
      </div>

      {/* 7. Signatures & QR Verification Footer */}
      <div className="flex items-end justify-between border-t-2 border-slate-900 pt-6">
        <div className="space-y-4 text-xs">
          <div>
            <p className="font-bold text-slate-900">{discharge.attendingPhysician}</p>
            <p className="text-slate-500">{discharge.physicianRank || "Consultant Medical Practitioner"}</p>
            <p className="text-[11px] text-slate-400">Electronic Clinical Signature — HospNest OS Verified</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <ShieldCheck className="size-3.5 text-teal-600" />
            <span>Tamper-evident record secured by HospNest Cryptographic Health Chain</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <QrCodeBadge
            value={verificationUrl}
            size={76}
            label="Scan to Verify"
          />
        </div>
      </div>
    </div>
  );
}
