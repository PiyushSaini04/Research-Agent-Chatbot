"use client";

import { TrendingUp, TrendingDown, AlertCircle, Minus, HelpCircle } from "lucide-react";
import { clsx } from "clsx";
import { Recommendation } from "@/types/research";

interface DecisionBadgeProps {
  recommendation: Recommendation;
  decision: "INVEST" | "PASS";
  evidenceScore: number;
  confidence: number;
  investProbability: number;
  passProbability: number;
  rationale: string[];
  keyDrivers: string[];
  isFallback?: boolean;
}

function recommendationStyles(recommendation: Recommendation) {
  switch (recommendation) {
    case "STRONG_INVEST":
      return {
        border: "border-emerald-500/50",
        bg: "bg-gradient-to-br from-emerald-950/70 to-emerald-900/30",
        text: "text-emerald-300",
        iconBg: "bg-emerald-500/20",
        icon: TrendingUp,
        iconColor: "text-emerald-400",
        gauge: "text-emerald-400",
      };
    case "INVEST":
      return {
        border: "border-emerald-500/40",
        bg: "bg-gradient-to-br from-emerald-950/60 to-emerald-900/20",
        text: "text-emerald-300",
        iconBg: "bg-emerald-500/20",
        icon: TrendingUp,
        iconColor: "text-emerald-400",
        gauge: "text-emerald-400",
      };
    case "HOLD":
      return {
        border: "border-amber-500/40",
        bg: "bg-gradient-to-br from-amber-950/50 to-amber-900/20",
        text: "text-amber-300",
        iconBg: "bg-amber-500/20",
        icon: Minus,
        iconColor: "text-amber-400",
        gauge: "text-amber-400",
      };
    case "WEAK_PASS":
      return {
        border: "border-orange-500/40",
        bg: "bg-gradient-to-br from-orange-950/50 to-orange-900/20",
        text: "text-orange-300",
        iconBg: "bg-orange-500/20",
        icon: TrendingDown,
        iconColor: "text-orange-400",
        gauge: "text-orange-400",
      };
    case "INSUFFICIENT_DATA":
      return {
        border: "border-slate-500/40",
        bg: "bg-gradient-to-br from-slate-950/60 to-slate-900/20",
        text: "text-slate-300",
        iconBg: "bg-slate-500/20",
        icon: HelpCircle,
        iconColor: "text-slate-400",
        gauge: "text-slate-400",
      };
    default:
      return {
        border: "border-red-500/40",
        bg: "bg-gradient-to-br from-red-950/60 to-red-900/20",
        text: "text-red-300",
        iconBg: "bg-red-500/20",
        icon: TrendingDown,
        iconColor: "text-red-400",
        gauge: "text-red-400",
      };
  }
}

function Gauge({
  value,
  label,
  colorClass,
}: {
  value: number;
  label: string;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-700" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - value / 100)}`}
            className={colorClass}
            style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
          />
        </svg>
        <span className={clsx("text-lg font-bold", colorClass)}>{value}%</span>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

export function DecisionBadge({
  recommendation,
  decision,
  evidenceScore,
  confidence,
  investProbability,
  passProbability,
  rationale,
  keyDrivers,
  isFallback = false,
}: DecisionBadgeProps) {
  const styles = recommendationStyles(recommendation);
  const Icon = styles.icon;
  const label = recommendation.replace(/_/g, " ");

  return (
    <div
      className={clsx("w-full rounded-2xl border p-6 transition-all", styles.border, styles.bg)}
      role="region"
      aria-label={`Recommendation: ${label}, Evidence ${evidenceScore}%, Confidence ${confidence}%`}
    >
      {isFallback && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
          Recommendation derived from fallback scoring — AI evidence engine was temporarily unavailable.
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col items-center gap-3">
          <div className={clsx("flex items-center justify-center rounded-2xl p-4", styles.iconBg)}>
            <Icon size={40} className={styles.iconColor} aria-hidden="true" />
          </div>
          <span className={clsx("text-2xl font-black tracking-wide text-center", styles.text)}>
            {label}
          </span>
          <span className="text-xs text-muted-foreground">Legacy: {decision}</span>
        </div>

        <div className="flex flex-wrap gap-6 justify-center lg:justify-start">
          <Gauge value={evidenceScore} label="Evidence Score" colorClass={styles.gauge} />
          <Gauge value={confidence} label="Confidence" colorClass="text-blue-400" />
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-border bg-background/40 px-3 py-1 text-muted-foreground">
              Invest {investProbability}%
            </span>
            <span className="rounded-full border border-border bg-background/40 px-3 py-1 text-muted-foreground">
              Pass {passProbability}%
            </span>
          </div>

          {keyDrivers.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertCircle size={14} className={styles.iconColor} aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">Key Drivers</h3>
              </div>
              <ul className="space-y-2" aria-label="Key investment drivers">
                {keyDrivers.slice(0, 3).map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className={clsx("mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full", styles.iconBg)} aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rationale.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Rationale</h3>
              <ul className="space-y-2" aria-label="Investment rationale">
                {rationale.slice(0, 3).map((point, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
