import {
  DataQualityAssessment,
  DecisionOutput,
  EvidenceCategoryScore,
} from "@/agents/state";
import { Decision, Recommendation } from "@/types/research";
import { getHighImpactMissingMetrics } from "./data-quality";

const INSUFFICIENT_DATA_THRESHOLD = 40;
const CONFIDENCE_PENALTY_PER_METRIC = 5;
const CONFIDENCE_FLOOR = 20;

export const EVIDENCE_CATEGORIES = [
  { category: "Business Quality", maxPoints: 25 },
  { category: "Financial Health", maxPoints: 30 },
  { category: "Valuation", maxPoints: 20 },
  { category: "Risk", maxPoints: 15 },
  { category: "News & Momentum", maxPoints: 10 },
] as const;

export function mapEvidenceScoreToRecommendation(score: number): Recommendation {
  if (score >= 80) return "STRONG_INVEST";
  if (score >= 65) return "INVEST";
  if (score >= 50) return "HOLD";
  if (score >= 35) return "WEAK_PASS";
  return "PASS";
}

export function mapRecommendationToLegacyDecision(recommendation: Recommendation): Decision {
  if (recommendation === "STRONG_INVEST" || recommendation === "INVEST" || recommendation === "HOLD") {
    return "INVEST";
  }
  return "PASS";
}

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function normalizeCategoryScores(
  rawScores: Partial<EvidenceCategoryScore>[]
): EvidenceCategoryScore[] {
  return EVIDENCE_CATEGORIES.map((expected) => {
    const match = rawScores.find(
      (s) => s.category?.toLowerCase() === expected.category.toLowerCase()
    );
    const score = clampScore(Number(match?.score) || 0, 0, expected.maxPoints);
    return {
      category: expected.category,
      maxPoints: expected.maxPoints,
      score,
      notes: match?.notes?.trim() || "",
    };
  });
}

export function sumEvidenceScore(categoryScores: EvidenceCategoryScore[]): number {
  return clampScore(categoryScores.reduce((sum, c) => sum + c.score, 0));
}

export function calculateConfidence(
  dataQuality: DataQualityAssessment,
  categoryScores: EvidenceCategoryScore[]
): number {
  if (dataQuality.overallCompleteness < INSUFFICIENT_DATA_THRESHOLD) {
    return 0;
  }

  let confidence = dataQuality.overallCompleteness;
  const highImpactMissing = getHighImpactMissingMetrics(dataQuality);
  confidence -= highImpactMissing.length * CONFIDENCE_PENALTY_PER_METRIC;

  const valuation = categoryScores.find((c) => c.category === "Valuation");
  if (valuation && valuation.score < valuation.maxPoints * 0.5) {
    confidence -= 3;
  }

  return clampScore(confidence, CONFIDENCE_FLOOR, 100);
}

export interface BuildDecisionInput {
  dataQuality: DataQualityAssessment;
  categoryScores: EvidenceCategoryScore[];
  rationale: string[];
  keyDrivers: string[];
  isFallback?: boolean;
}

export function buildDecisionOutput(input: BuildDecisionInput): DecisionOutput {
  const { dataQuality, categoryScores, rationale, keyDrivers, isFallback = false } = input;

  if (dataQuality.overallCompleteness < INSUFFICIENT_DATA_THRESHOLD) {
    return {
      recommendation: "INSUFFICIENT_DATA",
      evidenceScore: 0,
      confidence: 0,
      categoryScores,
      decision: "PASS",
      investProbability: 0,
      passProbability: 100,
      rationale,
      keyDrivers,
      isFallback,
    };
  }

  const evidenceScore = sumEvidenceScore(categoryScores);
  const recommendation = mapEvidenceScoreToRecommendation(evidenceScore);
  const confidence = calculateConfidence(dataQuality, categoryScores);
  const investProbability = evidenceScore;
  const passProbability = 100 - investProbability;

  return {
    recommendation,
    evidenceScore,
    confidence,
    categoryScores,
    decision: mapRecommendationToLegacyDecision(recommendation),
    investProbability,
    passProbability,
    rationale,
    keyDrivers,
    isFallback,
  };
}

export function fallbackCategoryScoresFromContext(
  context: string,
  dataQuality: DataQualityAssessment
): EvidenceCategoryScore[] {
  const hasRevenue = /Revenue \(TTM\): (?!N\/A)/i.test(context);
  const hasMargin = /Operating Margin: (?!N\/A)/i.test(context);
  const hasPe = /P\/E Ratio: (?!N\/A)/i.test(context);
  const hasIntrinsic = /Intrinsic Value: (?!N\/A)/i.test(context);
  const hasRisks = /Key Risk Factors/i.test(context);
  const hasNews = /## Recent News/i.test(context);
  const hasCompetition = /## Competitive Landscape/i.test(context);
  const hasCompany = /## Company Overview/i.test(context);

  const financialSection = dataQuality.sections.find((s) => s.name === "Financial Metrics");
  const financialRatio = financialSection ? financialSection.score / 100 : 0.3;

  return normalizeCategoryScores([
    {
      category: "Business Quality",
      score: hasCompany && hasCompetition ? 18 : hasCompany ? 14 : 8,
      notes: "Fallback estimate from available company and competition data.",
    },
    {
      category: "Financial Health",
      score: Math.round(30 * financialRatio),
      notes: "Fallback estimate from financial data completeness.",
    },
    {
      category: "Valuation",
      score: hasPe && hasIntrinsic ? 16 : hasPe || hasIntrinsic ? 10 : 6,
      notes: "Partial valuation scoring — some metrics unavailable.",
    },
    {
      category: "Risk",
      score: hasRisks ? 10 : 4,
      notes: "Fallback estimate from risk section presence.",
    },
    {
      category: "News & Momentum",
      score: hasNews ? 7 : 3,
      notes: "Fallback estimate from news coverage.",
    },
  ]);
}
