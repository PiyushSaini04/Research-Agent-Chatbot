import { Annotation, StateGraph, END, START } from "@langchain/langgraph";
import {
  ResearchState,
  CompanyData,
  FinancialData,
  NewsItem,
  Competitor,
  RiskFactor,
  DecisionOutput,
  Source,
  ValuationData,
  MacroeconomicData,
  DataQualityAssessment,
} from "./state";
import { plannerAgent } from "./planner.agent";
import { companyAgent } from "./company.agent";
import { financialAgent } from "./financial.agent";
import { newsAgent } from "./news.agent";
import { competitionAgent } from "./competition.agent";
import { riskAgent } from "./risk.agent";
import { valuationAgent } from "./valuation.agent";
import { macroeconomicAgent } from "./macroeconomic.agent";
import { aggregatorAgent } from "./aggregator.agent";
import { dataQualityAgent } from "./data-quality.agent";
import { decisionAgent } from "./decision.agent";
import { reportAgent } from "./report.agent";

// Replace-reducer: always use the latest value written
const replace = <T>(_a: T, b: T): T => b ?? _a;

// Define the graph state using Annotation
const GraphAnnotation = Annotation.Root({
  companyQuery: Annotation<string>({ default: () => "", value: replace }),
  sessionId: Annotation<string>({ default: () => "", value: replace }),
  userId: Annotation<string>({ default: () => "", value: replace }),
  ticker: Annotation<string>({ default: () => "", value: replace }),
  resolvedCompanyName: Annotation<string>({ default: () => "", value: replace }),
  exchange: Annotation<string>({ default: () => "", value: replace }),
  country: Annotation<string>({ default: () => "", value: replace }),
  currency: Annotation<string>({ default: () => "", value: replace }),
  plannerError: Annotation<string | null>({ default: () => null, value: replace }),
  companyData: Annotation<CompanyData | null>({ default: () => null, value: replace }),
  financialData: Annotation<FinancialData | null>({ default: () => null, value: replace }),
  newsItems: Annotation<NewsItem[]>({ default: () => [], value: replace }),
  competitors: Annotation<Competitor[]>({ default: () => [], value: replace }),
  riskFactors: Annotation<RiskFactor[]>({ default: () => [], value: replace }),
  valuationData: Annotation<ValuationData | null>({ default: () => null, value: replace }),
  macroeconomicData: Annotation<MacroeconomicData | null>({ default: () => null, value: replace }),
  aggregatedContext: Annotation<string>({ default: () => "", value: replace }),
  dataQuality: Annotation<DataQualityAssessment | null>({ default: () => null, value: replace }),
  decisionOutput: Annotation<DecisionOutput | null>({ default: () => null, value: replace }),
  reportMarkdown: Annotation<string>({ default: () => "", value: replace }),
  sources: Annotation<Source[]>({
    default: () => [],
    value: (_a: Source[], b: Source[]) => b ?? _a,
  }),
  pipelineError: Annotation<string | null>({ default: () => null, value: replace }),
});

type GraphState = typeof GraphAnnotation.State;

function traceStateBoundary(label: string, state: Partial<ResearchState>) {
  console.log(`[Trace][${label}]`, {
    ticker: state.ticker,
    resolvedCompanyName: state.resolvedCompanyName,
    company: state.companyData
      ? {
          name: state.companyData.name,
          sector: state.companyData.sector,
          industry: state.companyData.industry,
        }
      : null,
    financials: state.financialData
      ? {
          marketCap: state.financialData.marketCap,
          revenue: state.financialData.revenue,
          netIncome: state.financialData.netIncome,
          eps: state.financialData.eps,
          operatingMargin: state.financialData.operatingMargin,
          netMargin: state.financialData.netMargin,
          peRatio: state.financialData.peRatio,
          currentPrice: state.financialData.currentPrice,
        }
      : null,
    counts: {
      newsItems: state.newsItems?.length ?? 0,
      competitors: state.competitors?.length ?? 0,
      riskFactors: state.riskFactors?.length ?? 0,
      sources: state.sources?.length ?? 0,
    },
    aggregatedContextChars: state.aggregatedContext?.length ?? 0,
    dataQuality: state.dataQuality
      ? {
          overallCompleteness: state.dataQuality.overallCompleteness,
          missing: state.dataQuality.missingMetrics.length,
        }
      : null,
    decision: state.decisionOutput
      ? {
          recommendation: state.decisionOutput.recommendation,
          evidenceScore: state.decisionOutput.evidenceScore,
          confidence: state.decisionOutput.confidence,
          decision: state.decisionOutput.decision,
          investProbability: state.decisionOutput.investProbability,
          passProbability: state.decisionOutput.passProbability,
        }
      : null,
    reportChars: state.reportMarkdown?.length ?? 0,
  });
}

// Parallel research node — runs all 7 data agents concurrently
// Each agent receives a CLEAN state snapshot (without prior sources)
// to avoid sources being included 7× from each agent's initialization.
async function parallelResearchNode(
  state: GraphState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any
): Promise<Partial<ResearchState>> {
  console.log("[Graph] Running parallel research agents");
  traceStateBoundary("before_parallel_research", state as ResearchState);

  // Pass state WITHOUT sources to agents so they don't duplicate existing sources
  const stateForAgents: ResearchState = { ...(state as ResearchState), sources: [] };

  const [
    companyResult,
    financialResult,
    newsResult,
    competitionResult,
    riskResult,
    valuationResult,
    macroResult,
  ] = await Promise.all([
    state.companyData ? Promise.resolve({ companyData: state.companyData, sources: [] as Source[] }) : companyAgent(stateForAgents, config),
    state.financialData ? Promise.resolve({ financialData: state.financialData, sources: [] as Source[] }) : financialAgent(stateForAgents, config),
    state.newsItems?.length ? Promise.resolve({ newsItems: state.newsItems, sources: [] as Source[] }) : newsAgent(stateForAgents, config),
    state.competitors?.length ? Promise.resolve({ competitors: state.competitors, sources: [] as Source[] }) : competitionAgent(stateForAgents, config),
    state.riskFactors?.length ? Promise.resolve({ riskFactors: state.riskFactors, sources: [] as Source[] }) : riskAgent(stateForAgents, config),
    state.valuationData ? Promise.resolve({ valuationData: state.valuationData, sources: [] as Source[] }) : valuationAgent(stateForAgents, config),
    state.macroeconomicData ? Promise.resolve({ macroeconomicData: state.macroeconomicData, sources: [] as Source[] }) : macroeconomicAgent(stateForAgents, config),
  ]);

  // Log state after each agent for debugging
  console.log("[Graph][parallel_research] financialData summary:", {
    marketCap: financialResult.financialData?.marketCap,
    revenue: financialResult.financialData?.revenue,
    netIncome: financialResult.financialData?.netIncome,
    eps: financialResult.financialData?.eps,
    operatingMargin: financialResult.financialData?.operatingMargin,
    peRatio: financialResult.financialData?.peRatio,
  });

  // Merge sources from all agents + existing state sources, then deduplicate
  const allSources: Source[] = [
    ...(state.sources ?? []),
    ...(companyResult.sources ?? []),
    ...(financialResult.sources ?? []),
    ...(newsResult.sources ?? []),
    ...(competitionResult.sources ?? []),
    ...(riskResult.sources ?? []),
    ...(valuationResult.sources ?? []),
    ...(macroResult.sources ?? []),
  ];

  const seen = new Set<string>();
  const uniqueSources = allSources.filter((s) => {
    if (!s.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  const output = {
    companyData: companyResult.companyData ?? null,
    financialData: financialResult.financialData ?? null,
    newsItems: newsResult.newsItems ?? [],
    competitors: competitionResult.competitors ?? [],
    riskFactors: riskResult.riskFactors ?? [],
    valuationData: valuationResult.valuationData ?? null,
    macroeconomicData: macroResult.macroeconomicData ?? null,
    sources: uniqueSources,
  };

  traceStateBoundary("after_parallel_research", output);

  return output;
}

// Error node
async function errorNode(state: GraphState): Promise<Partial<ResearchState>> {
  console.error("[Graph] Pipeline error:", state.plannerError);
  return { pipelineError: state.plannerError ?? "Unknown pipeline error" };
}

// Conditional routing after planner
function plannerConditional(
  state: GraphState
): "parallel_research" | "error" {
  return state.plannerError ? "error" : "parallel_research";
}

// Wrap typed agent to accept GraphState and config
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapAgent(fn: (s: ResearchState, config?: any) => Promise<Partial<ResearchState>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (state: GraphState, config?: any): Promise<Partial<ResearchState>> => {
    traceStateBoundary(`before_${fn.name || "agent"}`, state as ResearchState);
    const output = await fn(state as ResearchState, config);
    traceStateBoundary(`after_${fn.name || "agent"}`, { ...(state as ResearchState), ...output });
    return output;
  };
}

// Build and compile the research graph
export function buildResearchGraph() {
  const graph = new StateGraph(GraphAnnotation)
    .addNode("planner", wrapAgent(plannerAgent))
    .addNode("parallel_research", parallelResearchNode)
    .addNode("aggregator", wrapAgent(aggregatorAgent))
    .addNode("data_quality", wrapAgent(dataQualityAgent))
    .addNode("decision", wrapAgent(decisionAgent))
    .addNode("report", wrapAgent(reportAgent))
    .addNode("error", errorNode)
    .addEdge(START, "planner")
    .addConditionalEdges("planner", plannerConditional, {
      parallel_research: "parallel_research",
      error: "error",
    })
    .addEdge("error", END)
    .addEdge("parallel_research", "aggregator")
    .addEdge("aggregator", "data_quality")
    .addEdge("data_quality", "decision")
    .addEdge("decision", "report")
    .addEdge("report", END);

  return graph.compile();
}
