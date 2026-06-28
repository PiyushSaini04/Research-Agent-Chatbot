import { ResearchState, RiskFactor, Source } from "./state";
import { searchSECFilings } from "@/lib/api-clients/sec-edgar";
import { searchWeb } from "@/lib/api-clients/tavily";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function riskAgent(
  state: ResearchState,
  config?: any
): Promise<Partial<ResearchState>> {
  const emitProgress = config?.configurable?.emitProgress;
  if (emitProgress) emitProgress("RiskAgent", "Scanning SEC filings and news for risk factors...");
  console.log(`[RiskAgent] Fetching risk factors for ${state.ticker}`);
  const sources: Source[] = [...(state.sources || [])];

  try {
    const [secFilings, webResults] = await Promise.all([
      searchSECFilings(state.ticker, "risk factors"),
      searchWeb(`${state.ticker} ${state.resolvedCompanyName} SEC 10-K risk factors investment risks`, 3),
    ]);

    const contextItems: string[] = [];

    secFilings.forEach((filing) => {
      sources.push({ url: filing.url, title: filing.title, agent: "RiskAgent" });
      contextItems.push(`SEC Filing (${filing.title}): ${filing.content}`);
    });

    webResults.forEach((result) => {
      sources.push({ url: result.url, title: result.title, agent: "RiskAgent" });
      contextItems.push(`Web Result (${result.title}): ${result.content}`);
    });

    const searchContext = contextItems.join("\n\n");

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    });

    const prompt = `Based on the following excerpts from SEC filings and news, identify the top 5 risk factors for ${state.resolvedCompanyName}.
Output a JSON array of objects, where each object has these fields exactly:
"title": The risk title (e.g., "Regulatory Compliance")
"description": A 1-2 sentence description of the risk.
"source": The source URL if applicable, or an empty string.

Excerpts:
${searchContext}`;

    const response = await model.generateContent(prompt);
    const parsed = JSON.parse(response.response.text());
    
    let riskFactors: RiskFactor[] = Array.isArray(parsed) ? parsed : [];

    if (riskFactors.length === 0) {
      riskFactors = [
        {
          title: "Market Competition Risk",
          description: `${state.resolvedCompanyName} faces intense competition in its sector that could impact market share and profitability.`,
          source: "",
        },
        {
          title: "Macroeconomic Risk",
          description: "Exposure to economic downturns, interest rate changes, and geopolitical uncertainties.",
          source: "",
        }
      ];
    }

    return { riskFactors: riskFactors.slice(0, 5), sources };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[RiskAgent] Error:", message);
    return { riskFactors: [], sources };
  }
}
