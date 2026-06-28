"use client";

import { AgentUpdate } from "@/types/research";
import { AgentCard } from "./AgentCard";
import { Loader2 } from "lucide-react";

interface StreamTimelineProps {
  updates: AgentUpdate[];
  currentState: "idle" | "streaming" | "complete" | "error";
}

const AGENT_ORDER = [
  "Resolving Company",
  "Collecting Company Information",
  "Analyzing Financial Health",
  "Reviewing Market News",
  "Evaluating Competitors",
  "Assessing Investment Risks",
  "Reviewing Valuation",
  "Reviewing Market Outlook",
  "Building Investment Thesis",
  "Assessing Data Quality",
  "Generating Research Report",
];

export function StreamTimeline({ updates, currentState }: StreamTimelineProps) {
  // Deduplicate by agent name — keep latest status
  const dedupedMap = new Map<string, AgentUpdate>();
  for (const u of updates) {
    dedupedMap.set(u.agent, u);
  }
  const deduped = Array.from(dedupedMap.values());

  // Sort by expected agent order
  const sorted = [...deduped].sort((a, b) => {
    const ai = AGENT_ORDER.indexOf(a.agent);
    const bi = AGENT_ORDER.indexOf(b.agent);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // Determine next expected agent for "Processing..." placeholder
  const completedAgents = new Set(
    deduped.filter((u) => u.status === "completed").map((u) => u.agent)
  );
  const nextAgent =
    currentState === "streaming"
      ? AGENT_ORDER.find((a) => !dedupedMap.has(a) || dedupedMap.get(a)?.status === "running")
      : null;

  if (sorted.length === 0 && currentState === "idle") return null;

  return (
    <div className="w-full space-y-2" role="list" aria-label="Agent execution timeline">
      <div className="mb-3 flex items-center gap-2">
        {currentState === "streaming" && (
          <Loader2 size={14} className="animate-spin text-primary" />
        )}
        <h3 className="text-sm font-semibold text-foreground">
          {currentState === "streaming"
            ? "Research in Progress"
            : currentState === "complete"
            ? `Research Complete — ${completedAgents.size} agents finished`
            : currentState === "error"
            ? "Research Failed"
            : ""}
        </h3>
      </div>

      {/* Agent cards with fade-in animation */}
      {sorted.map((update, idx) => (
        <div
          key={update.agent}
          className="animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          <AgentCard update={update} />
        </div>
      ))}

      {/* Processing placeholder for next expected agent */}
      {currentState === "streaming" && nextAgent && !dedupedMap.has(nextAgent) && (
        <div className="animate-in fade-in duration-500">
          <AgentCard
            update={{
              agent: nextAgent,
              status: "pending",
              message: "Waiting to start...",
              timestamp: 0,
            }}
            isPulsing
          />
        </div>
      )}
    </div>
  );
}
