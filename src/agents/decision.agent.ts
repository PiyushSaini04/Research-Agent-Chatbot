import { ResearchState, DecisionOutput } from "./state";
import { generateEvidenceScores } from "@/lib/api-clients/gemini";
import { calculateDataQuality } from "@/lib/research/data-quality";
import {
  buildDecisionOutput,
  fallbackCategoryScoresFromContext,
  normalizeCategoryScores,
} from "@/lib/research/evidence-scoring";

function cleanFallbackReason(message: string): string {
  if (/429|too many requests|quota|rate.?limit/i.test(message)) {
    return "AI evidence scoring was temporarily unavailable because the model quota was reached; recommendation derived from available data.";
  }

  return "AI evidence scoring was temporarily unavailable; recommendation derived from available data.";
}

export function normalizeDecisionOutput(output: DecisionOutput): DecisionOutput {
  const invest = Math.max(0, Math.min(100, Math.round(Number(output.investProbability) || 0)));
  let pass = Math.max(0, Math.min(100, Math.round(Number(output.passProbability) || 0)));

  if (invest + pass !== 100) {
    pass = 100 - invest;
  }

  return {
    ...output,
    investProbability: invest,
    passProbability: pass,
    evidenceScore: Math.max(0, Math.min(100, Math.round(Number(output.evidenceScore) || invest))),
    confidence: Math.max(0, Math.min(100, Math.round(Number(output.confidence) || 0))),
    rationale: Array.isArray(output.rationale) ? output.rationale : [],
    keyDrivers: Array.isArray(output.keyDrivers) ? output.keyDrivers : [],
    categoryScores: Array.isArray(output.categoryScores) ? output.categoryScores : [],
    isFallback: Boolean(output.isFallback),
  };
}

export async function decisionAgent(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  console.log("[DecisionAgent] Scoring investment evidence via Gemini");

  const dataQuality = state.dataQuality ?? calculateDataQuality(state);

  try {
    const geminiResult = await generateEvidenceScores(
      state.aggregatedContext,
      dataQuality.overallCompleteness
    );

    const categoryScores = normalizeCategoryScores(geminiResult.categoryScores);
    const decisionOutput = normalizeDecisionOutput(
      buildDecisionOutput({
        dataQuality,
        categoryScores,
        rationale: geminiResult.rationale,
        keyDrivers: geminiResult.keyDrivers,
        isFallback: false,
      })
    );

    console.log(
      `[DecisionAgent] Recommendation: ${decisionOutput.recommendation} (Evidence: ${decisionOutput.evidenceScore}, Confidence: ${decisionOutput.confidence}%)`
    );

    return { decisionOutput };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[DecisionAgent] Error:", message);

    const categoryScores = fallbackCategoryScoresFromContext(
      state.aggregatedContext,
      dataQuality
    );
    const fallback = normalizeDecisionOutput(
      buildDecisionOutput({
        dataQuality,
        categoryScores,
        rationale: [cleanFallbackReason(message)],
        keyDrivers: ["Available evidence reviewed", "Fallback scoring applied"],
        isFallback: true,
      })
    );

    return { decisionOutput: fallback };
  }
}
