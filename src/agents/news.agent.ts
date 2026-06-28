import { ResearchState, NewsItem, Source } from "./state";
import { searchWeb } from "@/lib/api-clients/tavily";

export async function newsAgent(
  state: ResearchState,
  config?: any
): Promise<Partial<ResearchState>> {
  const emitProgress = config?.configurable?.emitProgress;
  if (emitProgress) emitProgress("NewsAgent", `Fetching recent news...`);
  console.log(`[NewsAgent] Fetching news for ${state.resolvedCompanyName}`);
  const sources: Source[] = [...(state.sources || [])];

  try {
    const query = `${state.resolvedCompanyName} ${state.ticker} stock news investor recent`;
    const results = await searchWeb(query, 5);

    const newsItems: NewsItem[] = results.map((r) => ({
      title: r.title,
      url: r.url,
      source: new URL(r.url || "https://example.com").hostname.replace("www.", ""),
      publishedDate: r.publishedDate,
      summary: r.content.slice(0, 200),
    }));

    results.forEach((r) => {
      sources.push({
        url: r.url,
        title: r.title,
        agent: "NewsAgent",
      });
    });

    return { newsItems, sources };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[NewsAgent] Error:", message);
    return { newsItems: [], sources };
  }
}
