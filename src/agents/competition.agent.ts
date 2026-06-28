import { ResearchState, Competitor, Source } from "./state";
import { searchWeb } from "@/lib/api-clients/tavily";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function competitionAgent(
  state: ResearchState,
  config?: any
): Promise<Partial<ResearchState>> {
  const emitProgress = config?.configurable?.emitProgress;
  if (emitProgress) emitProgress("CompetitionAgent", "Identifying top competitors and market positioning...");
  console.log(`[CompetitionAgent] Finding competitors for ${state.resolvedCompanyName}`);
  const sources: Source[] = [...(state.sources || [])];

  try {
    const sector = state.companyData?.sector || "technology";
    const query = `${state.resolvedCompanyName} competitors ${sector} market share comparison`;
    const results = await searchWeb(query, 5);

    results.forEach((r) => {
      sources.push({ url: r.url, title: r.title, agent: "CompetitionAgent" });
    });

    const searchContext = results.map(r => `Title: ${r.title}\nContent: ${r.content}`).join("\n\n");

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    });

    const prompt = `Based on the following search results about ${state.resolvedCompanyName}, identify up to 3 major competitors.
Output a JSON array of objects, where each object has these fields exactly:
"name": The competitor's name
"ticker": The competitor's stock ticker (or empty string if private/unknown)
"differentiationNote": A 1-2 sentence description of how they differentiate from ${state.resolvedCompanyName}.

Search Results:
${searchContext}`;

    const response = await model.generateContent(prompt);
    const parsed = JSON.parse(response.response.text());
    
    let competitors: Competitor[] = Array.isArray(parsed) ? parsed : [];
    
    // Ensure fallback
    if (competitors.length === 0) {
      competitors = [{
        name: "Unknown",
        ticker: "",
        differentiationNote: "Competitor data could not be parsed."
      }];
    }

    return { competitors: competitors.slice(0, 3), sources };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CompetitionAgent] Error:", message);
    return { competitors: [], sources };
  }
}
