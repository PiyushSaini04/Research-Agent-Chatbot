import { ResearchState } from "./state";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function macroeconomicAgent(state: ResearchState, config?: any): Promise<Partial<ResearchState>> {
  const emitProgress = config?.configurable?.emitProgress;
  if (emitProgress) emitProgress("MacroeconomicAgent", "Evaluating macroeconomic conditions and sector headwinds...");

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    });

    const prompt = `Evaluate the macroeconomic environment for ${state.resolvedCompanyName} (${state.ticker}) operating in ${state.country}.
Consider its sector and current global economic trends (e.g., inflation, interest rates, supply chain).
Output JSON with these fields exactly:
"interestRateImpact": A 1-2 sentence description of how current interest rates affect the company.
"sectorHeadwinds": A 1-2 sentence description of broader sector headwinds or tailwinds.
"regulatoryEnvironment": A 1-2 sentence description of the regulatory landscape affecting this company.
"macroAssessment": A summary paragraph of the overall macroeconomic risks and opportunities.`;

    const response = await model.generateContent(prompt);
    const parsed = JSON.parse(response.response.text());

    return {
      macroeconomicData: {
        interestRateImpact: parsed.interestRateImpact || "Data unavailable",
        sectorHeadwinds: parsed.sectorHeadwinds || "Data unavailable",
        regulatoryEnvironment: parsed.regulatoryEnvironment || "Data unavailable",
        macroAssessment: parsed.macroAssessment || "Macroeconomic assessment unavailable.",
      }
    };
  } catch (error) {
    console.error("[MacroeconomicAgent] Error:", error);
    return {
      macroeconomicData: {
        interestRateImpact: "Analysis failed",
        sectorHeadwinds: "Analysis failed",
        regulatoryEnvironment: "Analysis failed",
        macroAssessment: "Analysis failed",
      }
    };
  }
}
