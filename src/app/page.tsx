"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useResearch } from "@/hooks/useResearch";
import { SearchInput } from "@/components/research/SearchInput";
import { StreamTimeline } from "@/components/research/StreamTimeline";
import { DecisionBadge } from "@/components/research/DecisionBadge";
import { ReportRenderer } from "@/components/research/ReportRenderer";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { AlertCircle, BarChart2 } from "lucide-react";

function HomeContent() {
  const [company, setCompany] = useState("");
  const searchParams = useSearchParams();
  const { state, agentUpdates, finalReport, error, runResearch, loadSession } = useResearch();

  useEffect(() => {
    const sessionId = searchParams.get("sessionId");
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [searchParams, loadSession]);

  const handleSubmit = () => {
    if (company.trim() && state !== "streaming") {
      runResearch(company.trim());
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <BarChart2 className="text-primary" size={24} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              AI Investment Research
            </h1>
          </div>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Enter any public company and get a comprehensive INVEST / PASS decision
            powered by a 7-agent research pipeline and Google Gemini.
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-8">
          <SearchInput
            value={company}
            onChange={setCompany}
            onSubmit={handleSubmit}
            isLoading={state === "streaming"}
            disabled={state === "complete"} // Read-only if viewing past session
          />
        </div>

        {/* Error State */}
        {state === "error" && error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/20 p-4">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-300">Research Failed</p>
              <p className="text-xs text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Agent Timeline */}
        {state === "streaming" && agentUpdates.length === 0 && (
          <div className="mb-8 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Initializing Research Pipeline...</h3>
            <div className="rounded-xl border border-border p-4 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="rounded-xl border border-border p-4 bg-card/10">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-muted/50" />
                <div className="h-4 w-1/4 bg-muted/50 rounded" />
              </div>
            </div>
          </div>
        )}

        {(state === "streaming" || state === "complete" || state === "error") &&
          agentUpdates.length > 0 && (
            <div className="mb-8">
              <ErrorBoundary fallbackMessage="Failed to render research timeline.">
                <StreamTimeline updates={agentUpdates} currentState={state} />
              </ErrorBoundary>
            </div>
          )}


        {/* Decision Badge + Report */}
        {state === "complete" && finalReport && (
          <div className="space-y-6">
            <DecisionBadge
              recommendation={finalReport.recommendation}
              decision={finalReport.decision}
              evidenceScore={finalReport.evidenceScore}
              confidence={finalReport.confidence}
              investProbability={finalReport.investProbability}
              passProbability={finalReport.passProbability}
              rationale={finalReport.rationale}
              keyDrivers={finalReport.keyDrivers}
              isFallback={finalReport.isFallback}
            />
            <ErrorBoundary fallbackMessage="Failed to render research report.">
              <ReportRenderer markdown={finalReport.report_markdown} />
            </ErrorBoundary>
          </div>
        )}

        {/* Idle empty state */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-4 py-16 text-center text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <BarChart2 size={28} className="text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-medium">No research yet</p>
              <p className="text-sm mt-1 opacity-70">
                Search for any publicly traded company to begin.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
