import { ResearchState } from "./state";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function valuationAgent(state: ResearchState, config?: any): Promise<Partial<ResearchState>> {
  const emitProgress = config?.configurable?.emitProgress;
  if (emitProgress) emitProgress("ValuationAgent", "Analyzing valuation multiples and intrinsic value...");

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    });

    const prompt = `Based on the following financial data for ${state.resolvedCompanyName} (${state.ticker}), provide a valuation analysis.
Output JSON with these fields exactly:
"intrinsicValue": estimated intrinsic value per share (number or null)
"historicalPeAvg": estimated historical P/E average (number or null)
"sectorPeAvg": estimated sector P/E average (number or null)
"discountToFairValue": estimated discount/premium percentage to fair value (number or null, negative if overvalued)
"valuationAssessment": A 2-4 sentence paragraph assessing the valuation of the company.

Financial Data:
${JSON.stringify(state.financialData, null, 2)}`;

    const response = await model.generateContent(prompt);
    const parsed = JSON.parse(response.response.text());

    return {
      valuationData: {
        intrinsicValue: parsed.intrinsicValue || null,
        historicalPeAvg: parsed.historicalPeAvg || null,
        sectorPeAvg: parsed.sectorPeAvg || null,
        discountToFairValue: parsed.discountToFairValue || null,
        valuationAssessment: parsed.valuationAssessment || "Valuation analysis unavailable.",
      }
    };
  } catch (error) {
    console.error("[ValuationAgent] Error:", error);
    return {
      valuationData: {
        intrinsicValue: null,
        historicalPeAvg: null,
        sectorPeAvg: null,
        discountToFairValue: null,
        valuationAssessment: "Valuation analysis failed.",
      }
    };
  }
}
