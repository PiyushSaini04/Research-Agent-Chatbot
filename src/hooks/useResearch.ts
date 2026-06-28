"use client";

import { useState, useCallback } from "react";
import { AgentUpdate, FinalReport } from "@/types/research";

type ResearchHookState = "idle" | "streaming" | "complete" | "error";

export function useResearch() {
  const [state, setState] = useState<ResearchHookState>("idle");
  const [agentUpdates, setAgentUpdates] = useState<AgentUpdate[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);


  const runResearch = useCallback(async (company: string) => {
    setState("streaming");
    setAgentUpdates([]);
    setFinalReport(null);
    setError(null);
    setSessionId(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body from server");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr) as {
              event: string;
              data: Record<string, unknown>;
            };

            if (parsed.event === "agent_update") {
              const update: AgentUpdate = {
                agent: String(parsed.data.agent || ""),
                status: parsed.data.status as AgentUpdate["status"],
                message: String(parsed.data.message || ""),
                timestamp: Number(parsed.data.timestamp || Date.now()),
                duration_ms: parsed.data.duration_ms as number | undefined,
              };
              setAgentUpdates((prev) => {
                // Deduplicate by agent name — keep latest
                const map = new Map(prev.map((u) => [u.agent, u]));
                map.set(update.agent, update);
                return Array.from(map.values());
              });
            } else if (parsed.event === "complete") {
              const d = parsed.data;
              const report: FinalReport = {
                sessionId: String(d.sessionId || ""),
                decision: d.decision as FinalReport["decision"],
                recommendation: (d.recommendation as FinalReport["recommendation"]) ?? "PASS",
                evidenceScore: Number(d.evidenceScore || d.investProbability || 0),
                confidence: Number(d.confidence || 0),
                investProbability: Number(d.investProbability || 0),
                passProbability: Number(d.passProbability || 0),
                rationale: (d.rationale as string[]) || [],
                keyDrivers: (d.keyDrivers as string[]) || [],
                isFallback: Boolean(d.isFallback),
                report_markdown: String(d.report_markdown || ""),
                sources: (d.sources as FinalReport["sources"]) || [],
              };
              setSessionId(String(d.sessionId || ""));
              setFinalReport(report);
              setState("complete");
            } else if (parsed.event === "error") {
              setError(String(parsed.data.message || "Unknown error"));
              setState("error");
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setState("error");
    }
  }, []);



  const loadSession = useCallback(async (loadedSessionId: string) => {
    setState("streaming"); // Show loading state
    setAgentUpdates([]);
    setFinalReport(null);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${loadedSessionId}`);
      if (!response.ok) {
        throw new Error(`Failed to load session (HTTP ${response.status})`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Reconstruct agent updates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: AgentUpdate[] = data.agentLogs.map((log: any) => ({
        agent: log.agent_name,
        status: log.status,
        message: log.output_payload?.message || "",
        timestamp: new Date(log.created_at).getTime(),
        duration_ms: log.duration_ms || undefined
      }));
      
      // Deduplicate updates by agent name
      const map = new Map<string, AgentUpdate>();
      updates.forEach(u => map.set(u.agent, u));
      setAgentUpdates(Array.from(map.values()));

      const restoredState = data.session.state || {};

      // Reconstruct final report
      if (data.report || data.session.decision || data.session.recommendation) {
        setFinalReport({
          sessionId: data.session.id,
          decision: (restoredState.decisionOutput?.decision || data.session.decision) as "INVEST" | "PASS",
          recommendation: (restoredState.decisionOutput?.recommendation || data.session.recommendation || data.session.decision) as FinalReport["recommendation"],
          evidenceScore: restoredState.decisionOutput?.evidenceScore ?? data.session.evidence_score ?? data.session.invest_probability ?? 0,
          confidence: restoredState.decisionOutput?.confidence ?? data.session.confidence ?? 0,
          investProbability: restoredState.decisionOutput?.investProbability ?? data.session.invest_probability ?? 0,
          passProbability: restoredState.decisionOutput?.passProbability ?? data.session.pass_probability ?? 0,
          rationale: restoredState.decisionOutput?.rationale || [],
          keyDrivers: restoredState.decisionOutput?.keyDrivers || [],
          isFallback: restoredState.decisionOutput?.isFallback ?? false,
          report_markdown: restoredState.reportMarkdown || data.report?.report_markdown || "",
          sources: restoredState.sources || data.report?.sources || [],
        });
      }

      setSessionId(data.session.id);
      setState("complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setState("error");
    }
  }, []);

  return {
    state,
    agentUpdates,
    finalReport,
    error,
    sessionId,
    runResearch,
    loadSession,
  };
}
