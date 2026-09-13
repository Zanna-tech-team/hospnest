import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Flame, HeartPulse, Info, ShieldAlert } from "lucide-react";
import { calculateNews2Score, type News2Input, type News2Result } from "@/lib/clinical-safety";
import { Badge } from "@/components/ui/badge";

interface News2ScoreBadgeProps {
  vitals: News2Input;
  showDetails?: boolean | undefined;
  className?: string | undefined;
  onClick?: () => void;
}

export function News2ScoreBadge({ vitals, showDetails = false, className = "", onClick }: News2ScoreBadgeProps) {
  const result = calculateNews2Score(vitals);

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-all ${result.badgeClass} ${onClick ? "cursor-pointer hover:opacity-90" : ""} ${className}`}
    >
      <div className="flex items-center gap-1.5 font-bold">
        {result.riskLevel === "high" ? (
          <Flame className="size-4 text-rose-600 animate-bounce" />
        ) : result.riskLevel === "medium" ? (
          <AlertTriangle className="size-4 text-amber-600" />
        ) : result.riskLevel === "low_medium" ? (
          <AlertCircle className="size-4 text-amber-500" />
        ) : (
          <HeartPulse className="size-4 text-emerald-600" />
        )}
        <span className="font-mono font-black text-sm">NEWS2: {result.totalScore}</span>
      </div>

      <span className="font-semibold">{result.riskLabel}</span>

      {showDetails && (
        <span className="text-[11px] opacity-80 hidden sm:inline">
          • {result.monitoringFrequency}
        </span>
      )}
    </div>
  );
}
