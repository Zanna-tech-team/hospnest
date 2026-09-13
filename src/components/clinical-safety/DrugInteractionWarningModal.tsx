import React, { useState } from "react";
import { AlertTriangle, ShieldAlert, XCircle, CheckCircle, Info, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DrugSafetyResult } from "@/lib/clinical-safety";

interface DrugInteractionWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  safetyResult: DrugSafetyResult | null;
  drugName: string;
  onConfirmOverride: (justification: string) => void;
}

export function DrugInteractionWarningModal({
  open,
  onOpenChange,
  safetyResult,
  drugName,
  onConfirmOverride,
}: DrugInteractionWarningModalProps) {
  const [overrideReason, setOverrideReason] = useState("");

  if (!safetyResult || !safetyResult.hasConflicts) return null;

  const isContraindicated = safetyResult.hasContraindications;

  const handleProceed = () => {
    if (!overrideReason.trim()) return;
    onConfirmOverride(overrideReason.trim());
    setOverrideReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-destructive/40">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive font-display">
            <ShieldAlert className="size-6 shrink-0" />
            <DialogTitle className="text-lg font-bold">
              {isContraindicated ? "CRITICAL CLINICAL CONTRAINDICATION" : "Prescription Safety & Interaction Alert"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Review the following medication safety conflicts for <strong>{drugName}</strong> before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs max-h-[60vh] overflow-y-auto pr-1">
          {/* 1. Allergy Conflicts */}
          {safetyResult.allergyConflicts.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="size-4" />
                Documented Patient Allergy Conflicts ({safetyResult.allergyConflicts.length})
              </h4>
              <div className="space-y-2">
                {safetyResult.allergyConflicts.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-rose-900 dark:text-rose-200">
                      <span>Allergy: {item.allergy.toUpperCase()}</span>
                      <span className="rounded bg-rose-600 px-1.5 py-0.2 text-[10px] text-white font-mono uppercase">
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Drug-Drug Interactions */}
          {safetyResult.drugInteractions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="size-4" />
                Drug-Drug Interactions ({safetyResult.drugInteractions.length})
              </h4>
              <div className="space-y-2">
                {safetyResult.drugInteractions.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200">
                      <span>{item.title}</span>
                      <span className={`rounded px-1.5 py-0.2 text-[10px] uppercase font-mono ${
                        item.severity === "contraindicated" ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                      }`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-amber-900/90 dark:text-amber-200/90">
                      <strong>Mechanism:</strong> {item.mechanism}
                    </p>
                    <p className="text-amber-800 dark:text-amber-300 font-medium bg-background/50 p-2 rounded border border-amber-500/20">
                      <strong>Clinical Recommendation:</strong> {item.clinicalAction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Clinical Override Justification */}
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2">
            <Label htmlFor="override-reason" className="font-bold text-foreground">
              Physician Override Justification (Required for Audit Trail)
            </Label>
            <Textarea
              id="override-reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Document the clinical benefit-risk assessment and monitoring plan for overriding this alert..."
              rows={2}
              className="text-xs resize-none bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              All overrides are logged to the National NDPR & Clinical Safety audit ledger with your practitioner ID.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel Prescription
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleProceed}
            disabled={!overrideReason.trim()}
            className="gap-1.5 font-bold shadow-sm"
          >
            Acknowledge & Override Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
