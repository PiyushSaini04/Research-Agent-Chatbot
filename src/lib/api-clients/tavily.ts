import { tavily } from "@tavily/core";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

export async function searchWeb(
  query: string,
  maxResults: number = 5
): Promise<Array<{ url: string; title: string; content: string; publishedDate: string }>> {
  try {
    if (!process.env.TAVILY_API_KEY) {
      console.warn("TAVILY_API_KEY not set — returning empty results");
      return [];
    }

    const response = await client.search(query, {
      searchDepth: "advanced",
      includeAnswer: false,
      maxResults,
    });

    return (response.results || []).map((r) => ({
      url: r.url || "",
      title: r.title || "",
      content: (r.content || "").slice(0, 500),
      publishedDate: r.publishedDate || "",
    }));
  } catch (error) {
    console.error("Tavily searchWeb error:", error);
    return [];
  }
}
