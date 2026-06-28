import { ResearchState } from "./state";
import {
  calculateDataQuality,
  formatDataQualitySummary,
} from "@/lib/research/data-quality";

export async function dataQualityAgent(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  console.log("[DataQualityAgent] Calculating data completeness");

  const dataQuality = calculateDataQuality(state);
  const summaryBlock = formatDataQualitySummary(dataQuality);

  const aggregatedContext = state.aggregatedContext
    ? `${state.aggregatedContext}\n\n${summaryBlock}`
    : summaryBlock;

  console.log("[DataQualityAgent] Completeness:", {
    overall: dataQuality.overallCompleteness,
    missing: dataQuality.missingMetrics,
  });

  return {
    dataQuality,
    aggregatedContext,
  };
}
