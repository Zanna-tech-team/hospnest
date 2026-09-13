import React from "react";
import { CheckCircle2, CreditCard, MapPin, Receipt, ShieldCheck } from "lucide-react";
import { QrCodeBadge } from "./QrCodeBadge";

export type ReceiptLineItem = {
  description: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type PaymentReceiptProps = {
  hospital: {
    name: string;
    address?: string | null | undefined;
    state?: string | undefined;
    contactPhone?: string | null | undefined;
    contactEmail?: string | null | undefined;
    licenseNumber?: string | null | undefined;
  };
  patient: {
    fullName: string;
    nin?: string | null | undefined;
    phone?: string | null | undefined;
    insuranceProvider?: string | null | undefined;
    policyNumber?: string | null | undefined;
  };
  receipt: {
    receiptNumber: string;
    invoiceNumber: string;
    paymentDate: string;
    paymentMethod: "cash" | "card" | "bank_transfer" | "insurance" | "ussd";
    transactionReference: string;
    recordedBy: string;
    lineItems: ReceiptLineItem[];
    subtotal: number;
    insuranceCoverage: number;
    patientPayable: number;
    amountPaid: number;
    balanceRemaining: number;
    amountInWords?: string | undefined;
  };
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PaymentReceiptDocument({ hospital, patient, receipt }: PaymentReceiptProps) {
  const verificationUrl = `https://hospnest.ng/verify?rcpt=${receipt.receiptNumber}&ref=${receipt.transactionReference}`;

  return (
    <div className="bg-white text-slate-900 font-sans p-8 sm:p-12 max-w-4xl mx-auto space-y-8 border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
      {/* 1. Official Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-lg">
              💳
            </span>
            <div>
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900">
                {hospital.name}
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Official Revenue & Medical Payment Receipt
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 flex items-center gap-2 pt-1">
            <MapPin className="size-3.5 text-teal-600 shrink-0" />
            <span>{hospital.address || "Main Medical Centre"}, {hospital.state || "Nigeria"}</span>
            {hospital.contactPhone && <span>• Tel: {hospital.contactPhone}</span>}
          </p>
        </div>

        <div className="text-right">
          <span className="inline-block rounded-md bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
            Payment Completed
          </span>
          <p className="mt-1 text-xs font-mono font-bold text-slate-700">
            Receipt: {receipt.receiptNumber}
          </p>
        </div>
      </div>

      {/* 2. Patient Demographics & Invoice Reference */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs">
        <div>
          <span className="text-slate-500 block font-medium">Billed Patient:</span>
          <span className="font-bold text-slate-900 text-sm">{patient.fullName}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">National NIN:</span>
          <span className="font-mono font-bold text-slate-800">{patient.nin || "Universal ID"}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Invoice Number:</span>
          <span className="font-mono font-bold text-slate-800">{receipt.invoiceNumber}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Payment Date:</span>
          <span className="font-bold text-slate-800">
            {new Date(receipt.paymentDate).toLocaleDateString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
      </div>

      {/* 3. Payment Method & Transaction Reference */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-200 rounded-xl p-4 text-xs">
        <div>
          <span className="text-slate-500 block">Payment Channel:</span>
          <span className="font-bold text-teal-800 uppercase tracking-wide">
            {receipt.paymentMethod.replace(/_/g, " ")}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Transaction Reference:</span>
          <span className="font-mono font-bold text-slate-900">{receipt.transactionReference}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Cashier / Revenue Officer:</span>
          <span className="font-bold text-slate-900">{receipt.recordedBy}</span>
        </div>
      </div>

      {/* 4. Itemized Tariffs & Services Table */}
      <div className="space-y-2">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
          Itemized Hospital Charges & Services Rendered
        </h3>
        <table className="w-full text-left text-xs border border-slate-200">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3 border-b border-slate-200">Description / Service</th>
              <th className="p-3 border-b border-slate-200">Category</th>
              <th className="p-3 border-b border-slate-200 text-center">Qty</th>
              <th className="p-3 border-b border-slate-200 text-right">Unit Rate</th>
              <th className="p-3 border-b border-slate-200 text-right">Amount (NGN)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {receipt.lineItems.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/60" : ""}>
                <td className="p-3 font-semibold text-slate-900">{item.description}</td>
                <td className="p-3 text-slate-600 capitalize">{item.serviceType}</td>
                <td className="p-3 text-center text-slate-800 font-bold">{item.quantity}</td>
                <td className="p-3 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Financial Summary Breakdown */}
      <div className="flex flex-col sm:flex-row justify-between gap-6 border border-slate-200 rounded-xl p-5 bg-slate-50 text-xs">
        <div className="space-y-1.5 max-w-sm">
          {patient.insuranceProvider && (
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-3 text-[11px] text-teal-900 space-y-0.5">
              <span className="font-bold block">HMO / NHIA Insurance Co-pay:</span>
              <p>Provider: {patient.insuranceProvider}</p>
              {patient.policyNumber && <p>Policy: {patient.policyNumber}</p>}
            </div>
          )}
          {receipt.amountInWords && (
            <p className="text-slate-600 italic pt-1">
              <span className="font-bold not-italic text-slate-700">Amount in Words: </span>
              {receipt.amountInWords}
            </p>
          )}
        </div>

        <div className="space-y-2 min-w-[240px]">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal Gross Charges:</span>
            <span className="font-semibold text-slate-900">{formatCurrency(receipt.subtotal)}</span>
          </div>
          {receipt.insuranceCoverage > 0 && (
            <div className="flex justify-between text-teal-700">
              <span>HMO / Insurance Coverage:</span>
              <span className="font-semibold">- {formatCurrency(receipt.insuranceCoverage)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-800 font-semibold border-t border-slate-200 pt-2">
            <span>Patient Payable:</span>
            <span>{formatCurrency(receipt.patientPayable)}</span>
          </div>
          <div className="flex justify-between text-emerald-800 font-extrabold text-sm border-t-2 border-slate-900 pt-2">
            <span>Amount Paid:</span>
            <span>{formatCurrency(receipt.amountPaid)}</span>
          </div>
          {receipt.balanceRemaining > 0 && (
            <div className="flex justify-between text-rose-700 font-bold">
              <span>Outstanding Balance:</span>
              <span>{formatCurrency(receipt.balanceRemaining)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 6. Sign-off & Verification Footer */}
      <div className="flex items-end justify-between border-t-2 border-slate-900 pt-6">
        <div className="space-y-4 text-xs">
          <div>
            <p className="font-bold text-slate-900">{receipt.recordedBy}</p>
            <p className="text-slate-500">Authorized Hospital Revenue Cashier</p>
            <p className="text-[11px] text-slate-400">Official Computer Generated Receipt — Valid Without Physical Stamp</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <ShieldCheck className="size-3.5 text-teal-600" />
            <span>Official statutory receipt linked to HospNest Financial Ledger</span>
          </div>
        </div>

        <div>
          <QrCodeBadge
            value={verificationUrl}
            size={76}
            label="Verify Payment"
          />
        </div>
      </div>
    </div>
  );
}
