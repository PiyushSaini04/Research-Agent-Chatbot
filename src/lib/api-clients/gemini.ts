import { GoogleGenerativeAI } from "@google/generative-ai";
import { EvidenceCategoryScore } from "@/agents/state";

export interface GeminiEvidenceResponse {
  categoryScores: EvidenceCategoryScore[];
  rationale: string[];
  keyDrivers: string[];
}

const EVIDENCE_SYSTEM_PROMPT = `You are an evidence-based institutional investment analyst.
Your role is to SCORE investment evidence using a structured rubric based ONLY on the data provided.
Do not speculate or hallucinate.

CRITICAL INSTRUCTIONS:
- Score each category independently using the rubric below.
- Missing metrics should reduce the score WITHIN that category partially — never zero the entire analysis.
- If P/E, FCF, OCF, or Intrinsic Value are missing, score Valuation partially (e.g. 10/20) using available metrics.
- Do NOT output invest/pass decisions or probabilities — code derives those from your scores.
- Note assumptions and data gaps in each category's "notes" field.

RUBRIC (total 100 points):
1. Business Quality (max 25): brand, competitive moat, management, market position, differentiation
2. Financial Health (max 30): revenue growth, net income, margins, debt levels, profitability
3. Valuation (max 20): P/E, intrinsic value, discount to fair value, relative valuation
4. Risk (max 15): identified risk factors, macro risks, balance sheet risks
5. News & Momentum (max 10): recent news sentiment, market momentum, catalysts

Your output must be valid JSON with exactly these fields:
{
  "categoryScores": [
    { "category": "Business Quality", "maxPoints": 25, "score": 0-25, "notes": "..." },
    { "category": "Financial Health", "maxPoints": 30, "score": 0-30, "notes": "..." },
    { "category": "Valuation", "maxPoints": 20, "score": 0-20, "notes": "..." },
    { "category": "Risk", "maxPoints": 15, "score": 0-15, "notes": "..." },
    { "category": "News & Momentum", "maxPoints": 10, "score": 0-10, "notes": "..." }
  ],
  "rationale": ["reason1", "reason2", "reason3"],
  "keyDrivers": ["driver1", "driver2"]
}`;

export async function generateEvidenceScores(
  context: string,
  dataCompleteness: number
): Promise<GeminiEvidenceResponse> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY environment variable is not set");
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: EVIDENCE_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const prompt = `Score the investment evidence for this company using the rubric.
Overall data completeness: ${dataCompleteness}%

Research data:
${context}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as GeminiEvidenceResponse;

  parsed.categoryScores = Array.isArray(parsed.categoryScores) ? parsed.categoryScores : [];
  parsed.rationale = Array.isArray(parsed.rationale) ? parsed.rationale : [];
  parsed.keyDrivers = Array.isArray(parsed.keyDrivers) ? parsed.keyDrivers : [];

  return parsed;
}

// Backward-compatible alias for tests that still reference the old function name
export async function generateInvestmentDecision(context: string): Promise<GeminiEvidenceResponse> {
  const completenessMatch = context.match(/Overall Completeness:\s*(\d+)%/);
  const completeness = completenessMatch ? Number(completenessMatch[1]) : 50;
  return generateEvidenceScores(context, completeness);
}
