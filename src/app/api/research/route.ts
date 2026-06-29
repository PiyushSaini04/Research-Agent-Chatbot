import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSSEStream } from "@/lib/stream/sse-emitter";
import { buildResearchGraph } from "@/agents/graph";

export const runtime = "nodejs";
export const maxDuration = 120;

const STAGE_LABELS: Record<string, string> = {
  PlannerAgent: "Resolving Company",
  CompanyAgent: "Collecting Company Information",
  FinancialAgent: "Analyzing Financial Health",
  NewsAgent: "Reviewing Market News",
  CompetitionAgent: "Evaluating Competitors",
  RiskAgent: "Assessing Investment Risks",
  ValuationAgent: "Reviewing Valuation",
  MacroeconomicAgent: "Reviewing Market Outlook",
  AggregatorAgent: "Building Investment Thesis",
  DataQualityAgent: "Assessing Data Quality",
  DecisionAgent: "Building Investment Thesis",
  ReportAgent: "Generating Research Report",
  planner: "Resolving Company",
  parallel_research: "Collecting Research Evidence",
  aggregator: "Building Investment Thesis",
  data_quality: "Assessing Data Quality",
  decision: "Building Investment Thesis",
  report: "Generating Research Report",
};

function displayStageName(agent: string): string {
  return STAGE_LABELS[agent] || agent;
}

const PARALLEL_STAGES = [
  "Collecting Company Information",
  "Analyzing Financial Health",
  "Reviewing Market News",
  "Evaluating Competitors",
  "Assessing Investment Risks",
  "Reviewing Valuation",
  "Reviewing Market Outlook",
];

function hasLimitedData(stage: string, output: Record<string, unknown>): boolean {
  switch (stage) {
    case "Collecting Company Information":
      return !output.companyData;
    case "Analyzing Financial Health":
      return !output.financialData;
    case "Reviewing Market News":
      return !Array.isArray(output.newsItems) || output.newsItems.length === 0;
    case "Evaluating Competitors":
      return !Array.isArray(output.competitors) || output.competitors.length === 0;
    case "Assessing Investment Risks":
      return !Array.isArray(output.riskFactors) || output.riskFactors.length === 0;
    case "Reviewing Valuation":
      return !output.valuationData;
    case "Reviewing Market Outlook":
      return !output.macroeconomicData;
    default:
      return false;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized Login Required" }, { status: 401 });
  }

  // Parse and validate body
  let body: { company?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let company = "";
  const sessionId = body.sessionId || crypto.randomUUID();

  if (!body.sessionId) {
    const rawCompany = body.company || "";
    company = rawCompany
      .replace(/<[^>]*>/g, "")
      .replace(/[^\w\s\.\-\&\']/g, "")
      .trim()
      .slice(0, 100);

    if (!company) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    // Create new session record
    await supabase.from("research_sessions").insert({
      id: sessionId,
      user_id: user.id,
      company_query: company,
      status: "running",
      created_at: new Date().toISOString(),
    });
  } else {
    // Validate session belongs to user
    const { data: sessionData, error } = await supabase
      .from("research_sessions")
      .select("status, state, company_query")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (error || !sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Update status to running
    await supabase.from("research_sessions").update({ status: "running" }).eq("id", sessionId);
    company = sessionData.company_query;
  }

  // Open SSE stream
  const { stream, emit, close } = createSSEStream();

  const startTime = Date.now();

  // Run graph in background (non-blocking)
  (async () => {
    try {
      // Helper to log agent updates to the DB with full structured data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emitAndLog = async (event: string, payload: any) => {
        const isAgentUpdate = event === "agent_update";
        const normalizedPayload = isAgentUpdate
          ? { ...payload, agent: displayStageName(String(payload.agent || "")) }
          : typeof payload === "string"
            ? {
                agent: displayStageName(event),
                status: "running",
                message: payload,
                timestamp: Date.now(),
              }
            : payload;
        const normalizedEvent = isAgentUpdate ? event : "agent_update";

        emit(normalizedEvent, normalizedPayload);
        if (normalizedEvent === "agent_update") {
          try {
            await supabase
              .from("agent_execution_logs")
              .insert({
                session_id: sessionId,
                agent_name: normalizedPayload.agent,
                status: normalizedPayload.status,
                input_payload: normalizedPayload.input_payload || null,
                output_payload: {
                  message: normalizedPayload.message,
                  ...(normalizedPayload.output_payload || {}),
                },
                api_calls_made: normalizedPayload.api_calls_made || [],
                llm_calls: normalizedPayload.llm_calls || 0,
                duration_ms: normalizedPayload.duration_ms || null,
                created_at: new Date(normalizedPayload.timestamp || Date.now()).toISOString(),
              });
          } catch (err) {
            console.error("Log error:", err);
          }
        }
      };

      await emitAndLog("agent_update", {
        agent: "Resolving Company",
        status: "running",
        message: `Resolving ticker for "${company}"...`,
        timestamp: Date.now(),
      });

      const graph = buildResearchGraph();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let lastState: any = {
        companyQuery: company,
        sessionId,
        userId: user.id,
      };

      if (body.sessionId) {
        // Fetch existing state for resumed sessions
        const { data: sessionRecord } = await supabase
          .from("research_sessions")
          .select("state")
          .eq("id", sessionId)
          .single();

        if (sessionRecord?.state) {
          lastState = sessionRecord.state;
        }
      }

      // Stream graph execution
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const chunk of await graph.stream(lastState as any, {
        streamMode: "updates",
        configurable: { emitProgress: emitAndLog }
      })) {
        const nodeName = Object.keys(chunk)[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodeOutput = (chunk as any)[nodeName] || {};
        lastState = { ...lastState, ...nodeOutput };

        if (nodeName === "error") {
          await emitAndLog("agent_update", {
            agent: "Resolving Company",
            status: "failed",
            message: nodeOutput.pipelineError || "Pipeline error",
            timestamp: Date.now(),
            duration_ms: Date.now() - startTime,
          });
          continue;
        }

        const agentNameMap: Record<string, string> = {
          planner: "Resolving Company",
          parallel_research: "Collecting Research Evidence",
          aggregator: "Building Investment Thesis",
          data_quality: "Assessing Data Quality",
          decision: "Building Investment Thesis",
          report: "Generating Research Report",
        };

        const agentDisplayName = agentNameMap[nodeName] || nodeName;

        if (nodeName === "planner") {
          if (nodeOutput.plannerError) {
            await emitAndLog("agent_update", {
              agent: "Resolving Company",
              status: "failed",
              message: nodeOutput.plannerError,
              timestamp: Date.now(),
              duration_ms: Date.now() - startTime,
            });
          } else {
            await emitAndLog("agent_update", {
              agent: "Resolving Company",
              status: "completed",
              message: `Resolved: ${nodeOutput.resolvedCompanyName} (${nodeOutput.ticker}) on ${nodeOutput.exchange}`,
              timestamp: Date.now(),
              duration_ms: Date.now() - startTime,
              output_payload: {
                ticker: nodeOutput.ticker,
                resolvedCompanyName: nodeOutput.resolvedCompanyName,
                exchange: nodeOutput.exchange,
                country: nodeOutput.country,
                currency: nodeOutput.currency,
              },
              api_calls_made: ["Yahoo Finance Search", "Gemini 2.5 Flash (ticker resolution)"],
              llm_calls: 1,
            });

            // ── Upsert the resolved company into the companies table ──
            if (nodeOutput.ticker) {
              await supabase.from("companies").upsert({
                ticker: nodeOutput.ticker,
                name: nodeOutput.resolvedCompanyName,
                exchange: nodeOutput.exchange,
                country: nodeOutput.country,
                currency: nodeOutput.currency,
                last_researched_at: new Date().toISOString(),
              }, { onConflict: "ticker" });
            }

            for (const stage of PARALLEL_STAGES) {
              await emitAndLog("agent_update", {
                agent: stage,
                status: "running",
                message: "Research in progress...",
                timestamp: Date.now(),
              });
            }
          }
        } else if (nodeName === "parallel_research") {
          const sourcesCount = nodeOutput.sources?.length ?? 0;
          // Check how many financial fields are non-null to include in log
          const fin = nodeOutput.financialData || {};
          const nonNullFinancials = Object.values(fin).filter(v => v !== null).length;
          const totalFinancials = Object.keys(fin).length;

          for (const stage of PARALLEL_STAGES) {
            const limited = hasLimitedData(stage, nodeOutput);
            await emitAndLog("agent_update", {
              agent: stage,
              status: "completed",
              message: limited ? "Completed with limited data" : "Completed",
              timestamp: Date.now(),
              duration_ms: Date.now() - startTime,
              output_payload: {
                sources_count: sourcesCount,
                financial_fields_populated: `${nonNullFinancials}/${totalFinancials}`,
                has_company_data: !!nodeOutput.companyData,
                has_financial_data: !!nodeOutput.financialData,
                news_items: nodeOutput.newsItems?.length ?? 0,
                competitors: nodeOutput.competitors?.length ?? 0,
                risk_factors: nodeOutput.riskFactors?.length ?? 0,
              },
              api_calls_made: ["Yahoo Finance", "FMP", "Finnhub", "Tavily", "SEC EDGAR", "Wikipedia"],
            });
          }

          // Log the aggregated context snippet to help debug N/A values
          const fin2 = lastState.financialData || {};
          console.log(`[route] Financial data summary after parallel_research:`, {
            marketCap: fin2.marketCap,
            revenue: fin2.revenue,
            netIncome: fin2.netIncome,
            eps: fin2.eps,
            operatingMargin: fin2.operatingMargin,
            netMargin: fin2.netMargin,
            peRatio: fin2.peRatio,
            debtToEquity: fin2.debtToEquity,
          });

        } else if (nodeName === "aggregator") {
          await emitAndLog("agent_update", {
            agent: "Building Investment Thesis",
            status: "running",
            message: "Aggregating and summarizing research data...",
            timestamp: Date.now(),
          });
          await emitAndLog("agent_update", {
            agent: "Building Investment Thesis",
            status: "completed",
            message: "Context aggregated within token budget",
            timestamp: Date.now(),
            duration_ms: Date.now() - startTime,
            output_payload: {
              context_length_chars: nodeOutput.aggregatedContext?.length ?? 0,
            },
          });
        } else if (nodeName === "data_quality") {
          const dq = nodeOutput.dataQuality;
          await emitAndLog("agent_update", {
            agent: "Assessing Data Quality",
            status: "running",
            message: "Measuring research data completeness...",
            timestamp: Date.now(),
          });
          await emitAndLog("agent_update", {
            agent: "Assessing Data Quality",
            status: "completed",
            message: dq
              ? `Data completeness: ${dq.overallCompleteness}%`
              : "Data quality assessed",
            timestamp: Date.now(),
            duration_ms: Date.now() - startTime,
            output_payload: dq
              ? {
                  overallCompleteness: dq.overallCompleteness,
                  missingMetrics: dq.missingMetrics,
                  sections: dq.sections,
                }
              : {},
          });
          await emitAndLog("agent_update", {
            agent: "Building Investment Thesis",
            status: "running",
            message: "Scoring evidence and forming investment recommendation...",
            timestamp: Date.now(),
          });
        } else if (nodeName === "decision") {
          const dec = nodeOutput.decisionOutput;
          await emitAndLog("agent_update", {
            agent: "Building Investment Thesis",
            status: "completed",
            message: dec
              ? `Recommendation: ${dec.recommendation.replace(/_/g, " ")} (Evidence: ${dec.evidenceScore}, Confidence: ${dec.confidence}%)`
              : "Decision generated",
            timestamp: Date.now(),
            duration_ms: Date.now() - startTime,
            output_payload: dec
              ? {
                  recommendation: dec.recommendation,
                  evidenceScore: dec.evidenceScore,
                  confidence: dec.confidence,
                  decision: dec.decision,
                  investProbability: dec.investProbability,
                  passProbability: dec.passProbability,
                  rationale: dec.rationale,
                  keyDrivers: dec.keyDrivers,
                  categoryScores: dec.categoryScores,
                  isFallback: dec.isFallback,
                }
              : {},
            api_calls_made: ["Gemini 2.5 Flash (evidence scoring)"],
            llm_calls: 1,
          });
          await emitAndLog("agent_update", {
            agent: "Generating Research Report",
            status: "running",
            message: "Writing the final investment research report...",
            timestamp: Date.now(),
          });
        } else if (nodeName === "report") {
          const reportLen = nodeOutput.reportMarkdown?.length ?? 0;
          await emitAndLog("agent_update", {
            agent: "Generating Research Report",
            status: "completed",
            message: `Report generated successfully (${reportLen} characters)`,
            timestamp: Date.now(),
            duration_ms: Date.now() - startTime,
            output_payload: {
              report_length_chars: reportLen,
            },
            api_calls_made: ["Gemini 2.5 Flash (report)"],
            llm_calls: 1,
          });

          // Emit complete event to the client
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const finalState = lastState as any;
          const totalDuration = Date.now() - startTime;

          emit("complete", {
            sessionId,
            decision: finalState.decisionOutput?.decision ?? null,
            recommendation: finalState.decisionOutput?.recommendation ?? null,
            evidenceScore: finalState.decisionOutput?.evidenceScore ?? null,
            confidence: finalState.decisionOutput?.confidence ?? null,
            investProbability: finalState.decisionOutput?.investProbability ?? null,
            passProbability: finalState.decisionOutput?.passProbability ?? null,
            rationale: finalState.decisionOutput?.rationale ?? [],
            keyDrivers: finalState.decisionOutput?.keyDrivers ?? [],
            isFallback: finalState.decisionOutput?.isFallback ?? false,
            report_markdown: finalState.reportMarkdown ?? "",
            sources: finalState.sources ?? [],
            duration_ms: totalDuration,
          });

          // ── Insert into saved_reports table ──
          if (finalState.ticker && finalState.companyData) {
            const { error: companyUpdateError } = await supabase.from("companies").upsert({
              ticker: finalState.ticker,
              name: finalState.companyData.name || finalState.resolvedCompanyName,
              exchange: finalState.exchange,
              currency: finalState.currency,
              sector: finalState.companyData.sector,
              industry: finalState.companyData.industry,
              description: finalState.companyData.description,
              last_researched_at: new Date().toISOString(),
            }, { onConflict: "ticker" });

            if (companyUpdateError) {
              console.error("[route] companies update error:", companyUpdateError);
            }
          }

          const { error: reportInsertError } = await supabase.from("saved_reports").insert({
            session_id: sessionId,
            user_id: user.id,
            report_markdown: finalState.reportMarkdown ?? "",
            sources: finalState.sources ?? [],
            decision: finalState.decisionOutput?.decision ?? null,
            recommendation: finalState.decisionOutput?.recommendation ?? null,
            evidence_score: finalState.decisionOutput?.evidenceScore ?? null,
            confidence: finalState.decisionOutput?.confidence ?? null,
            data_quality: finalState.dataQuality ?? null,
            invest_probability: finalState.decisionOutput?.investProbability ?? null,
            pass_probability: finalState.decisionOutput?.passProbability ?? null,
            created_at: new Date().toISOString(),
          });

          if (reportInsertError) {
            console.error("[route] saved_reports insert error:", reportInsertError);
          }

          // ── Update session record ──
          const { error: sessionUpdateError } = await supabase
            .from("research_sessions")
            .update({
              status: "completed",
              decision: finalState.decisionOutput?.decision ?? null,
              recommendation: finalState.decisionOutput?.recommendation ?? null,
              evidence_score: finalState.decisionOutput?.evidenceScore ?? null,
              confidence: finalState.decisionOutput?.confidence ?? null,
              invest_probability: finalState.decisionOutput?.investProbability ?? null,
              pass_probability: finalState.decisionOutput?.passProbability ?? null,
              total_duration_ms: totalDuration,
              completed_at: new Date().toISOString(),
              state: finalState,
            })
            .eq("id", sessionId);

          if (sessionUpdateError) {
            console.error("[route] research_sessions update error:", sessionUpdateError);
          }
        } else {
          await emitAndLog("agent_update", {
            agent: agentDisplayName,
            status: "completed",
            message: `${agentDisplayName} completed`,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[API/research] Pipeline error:", message);

      emit("error", {
        message: `Research pipeline failed: ${message}`,
        sessionId,
      });

      await supabase
        .from("research_sessions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
