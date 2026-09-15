import React, { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  acknowledgeDoctorLabResult,
  getPatientLabTrends,
} from "@/lib/lab.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FlaskConical,
  Printer,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

interface LabResultReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  patientId: string;
  patientName: string;
  onAcknowledged?: () => void;
}

export function LabResultReviewModal({
  isOpen,
  onClose,
  order,
  patientId,
  patientName,
  onAcknowledged,
}: LabResultReviewModalProps) {
  const ackFn = useServerFn(acknowledgeDoctorLabResult);
  const trendsFn = useServerFn(getPatientLabTrends);

  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [trends, setTrends] = useState<any[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && order && patientId) {
      setLoadingTrends(true);
      trendsFn({
        data: {
          patientId,
          testName: order.testName || "Test",
        },
      })
        .then((data) => setTrends(data || []))
        .catch((e) => console.warn("Could not load trends:", e))
        .finally(() => setLoadingTrends(false));
    }
  }, [isOpen, order, patientId]);

  if (!order) return null;

  const isCritical = Boolean(order.isCritical);
  const isOutOfRange = Boolean(order.isOutOfRange);
  const isAcknowledged = Boolean(order.acknowledgedAt);

  async function handleAcknowledge() {
    setBusy(true);
    try {
      await ackFn({
        data: {
          labOrderId: order.id,
          comment: comment.trim() || undefined,
        },
      });
      toast.success("Investigation result acknowledged and added to medical review audit trail.");
      if (onAcknowledged) onAcknowledged();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to acknowledge result");
    } finally {
      setBusy(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge
              className={
                isCritical
                  ? "bg-rose-500 text-white font-bold animate-pulse"
                  : isOutOfRange
                  ? "bg-amber-500 text-white font-medium"
                  : "bg-emerald-600 text-white"
              }
            >
              {isCritical ? "CRITICAL PANIC VALUE" : isOutOfRange ? "OUT OF RANGE" : "NORMAL / WITHIN LIMITS"}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">Order #{order.id?.slice(0, 8)}</span>
          </div>

          <DialogTitle className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center justify-between">
            <span>{order.testName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Patient: <strong className="text-foreground">{patientName}</strong> · Specimen: {order.sampleType || "Blood"} · Urgency: {String(order.urgency || "routine").toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        {/* Printable Section */}
        <div ref={printRef} className="space-y-5 mt-4 print:p-6">
          {/* Main Results Card */}
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isCritical
                ? "border-rose-500/40 bg-rose-500/5"
                : isOutOfRange
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-border bg-card"
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-border/80">
              <div>
                <span className="text-[11px] uppercase font-semibold text-muted-foreground block">
                  Observed Result Value
                </span>
                <span
                  className={`font-mono text-2xl font-black ${
                    isCritical
                      ? "text-rose-600 dark:text-rose-400"
                      : isOutOfRange
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-foreground"
                  }`}
                >
                  {order.resultValue || "Pending"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{order.units || ""}</span>
                </span>
              </div>

              <div>
                <span className="text-[11px] uppercase font-semibold text-muted-foreground block">
                  Reference Range
                </span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {order.referenceRange || "Standard Adult Normal"}
                </span>
              </div>

              <div>
                <span className="text-[11px] uppercase font-semibold text-muted-foreground block">
                  Technician / Verification
                </span>
                <span className="text-xs font-medium text-foreground block">
                  {order.technicianName || "Laboratory Officer"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {order.completedAt ? new Date(order.completedAt).toLocaleString() : "Verified"}
                </span>
              </div>
            </div>

            {order.interpretation && (
              <div className="text-xs bg-background/80 rounded-xl p-3 border border-border/60">
                <span className="font-semibold text-foreground block mb-0.5">Technician Clinical Interpretation:</span>
                <p className="text-muted-foreground">{order.interpretation}</p>
              </div>
            )}

            {order.attachedFileUrl && (
              <div className="flex items-center gap-2 text-xs pt-1">
                <FileText className="h-4 w-4 text-teal-600" />
                <a
                  href={order.attachedFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-600 hover:underline font-medium"
                >
                  Download Attached Laboratory Report / Instrument Printout
                </a>
              </div>
            )}
          </div>

          {/* Historical Trend Comparison */}
          {trends.length > 1 && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  Historical Trend Comparison for {order.testName}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{trends.length} recorded tests</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {trends.slice(-4).map((t, idx) => (
                  <div key={t.id || idx} className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-center">
                    <span className="block text-[10px] text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        t.isCritical ? "text-rose-600" : t.isOutOfRange ? "text-amber-600" : "text-foreground"
                      }`}
                    >
                      {t.value} {t.units}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acknowledgement Status & Entry */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
            {isAcknowledged ? (
              <div className="flex items-start gap-3 text-xs">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 block">
                    Reviewed by {order.acknowledgedByName || "Physician"} on {new Date(order.acknowledgedAt).toLocaleString()}
                  </span>
                  {order.acknowledgementComment && (
                    <p className="text-muted-foreground mt-0.5">Doctor note: {order.acknowledgementComment}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Awaiting Doctor Clinical Acknowledgement</span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ack-comment" className="text-xs">Physician Review Notes (Optional)</Label>
                  <Textarea
                    id="ack-comment"
                    rows={2}
                    placeholder="e.g. Result noted. Adjusting antibiotic dosage accordingly..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={handlePrint} className="w-full sm:w-auto flex items-center gap-2 text-xs">
            <Printer className="h-3.5 w-3.5" />
            <span>Print Laboratory Report</span>
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
            {!isAcknowledged && (
              <Button
                size="sm"
                onClick={handleAcknowledge}
                disabled={busy}
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs flex items-center gap-1.5"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>{busy ? "Recording..." : "Mark as Reviewed"}</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
