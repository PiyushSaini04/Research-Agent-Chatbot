import Link from "next/link";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown, Calendar, ExternalLink, Minus, HelpCircle } from "lucide-react";
import { Recommendation } from "@/types/research";

interface SessionCardProps {
  session: {
    id: string;
    company_query: string;
    status: string;
    decision: string | null;
    recommendation: string | null;
    confidence: number | null;
    evidence_score: number | null;
    invest_probability: number | null;
    created_at: string;
    total_duration_ms: number | null;
  };
}

function recommendationBadge(recommendation: string | null, decision: string | null) {
  const rec = recommendation ?? decision;
  if (!rec) return null;

  const isInvest = rec === "INVEST" || rec === "STRONG_INVEST" || rec === "HOLD";
  const isInsufficient = rec === "INSUFFICIENT_DATA";
  const isHold = rec === "HOLD";

  const Icon = isInsufficient ? HelpCircle : isHold ? Minus : isInvest ? TrendingUp : TrendingDown;
  const label = rec.replace(/_/g, " ");

  return (
    <div
      className={clsx(
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold flex-shrink-0",
        isInsufficient
          ? "bg-slate-500/15 text-slate-400 border border-slate-500/30"
          : isHold
            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            : isInvest
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/15 text-red-400 border border-red-500/30"
      )}
    >
      <Icon size={11} />
      {label}
    </div>
  );
}

export function SessionCard({ session }: SessionCardProps) {
  const recommendation = (session.recommendation ?? session.decision) as Recommendation | null;
  const isPositive =
    recommendation === "STRONG_INVEST" ||
    recommendation === "INVEST" ||
    recommendation === "HOLD" ||
    session.decision === "INVEST";
  const confidence = session.confidence ?? session.evidence_score ?? session.invest_probability;
  const date = new Date(session.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group relative rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
      <Link href={`/?sessionId=${session.id}`} className="block mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-base hover:text-primary transition-colors">
              {session.company_query}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Calendar size={11} />
              {date}
              {session.total_duration_ms && (
                <span>· {(session.total_duration_ms / 1000).toFixed(0)}s</span>
              )}
            </div>
          </div>

          {recommendationBadge(session.recommendation, session.decision)}

          {!session.decision && !session.recommendation && (
            <span
              className={clsx(
                "rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0",
                session.status === "running"
                  ? "bg-blue-500/15 text-blue-400"
                  : "bg-slate-500/15 text-slate-400"
              )}
            >
              {session.status}
            </span>
          )}
        </div>
      </Link>

      {confidence !== null && confidence !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Confidence</span>
            <span className="font-medium">{confidence}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-500",
                isPositive ? "bg-emerald-500" : "bg-red-500"
              )}
              style={{ width: `${confidence}%` }}
              aria-label={`Confidence: ${confidence}%`}
            />
          </div>
        </div>
      )}

      <Link
        href={`/report/${session.id}`}
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        aria-label={`View full report for ${session.company_query}`}
      >
        <ExternalLink size={12} />
        View Full Report
      </Link>
    </div>
  );
}
