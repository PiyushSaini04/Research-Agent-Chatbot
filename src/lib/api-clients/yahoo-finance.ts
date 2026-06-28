const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "apidojo-yahoo-finance-v1.p.rapidapi.com";

/**
 * Detect which RapidAPI provider is configured.
 * - "apidojo" => apidojo-yahoo-finance-v1.p.rapidapi.com  (uses /auto-complete, /stock/v2/get-summary)
 * - "yf1"    => yahoo-finance1.p.rapidapi.com             (uses /v1/finance/search, /v11/finance/quoteSummary)
 */
function getProvider(): "apidojo" | "yf1" {
  if (RAPIDAPI_HOST?.includes("apidojo")) return "apidojo";
  return "yf1";
}

export async function searchTicker(
  query: string
): Promise<Array<{ ticker: string; name: string; exchange: string }>> {
  try {
    if (!RAPIDAPI_KEY) {
      console.warn("RAPIDAPI_KEY not set — using mock data");
      return [];
    }

    const provider = getProvider();
    let url: string;

    if (provider === "apidojo") {
      // Apidojo endpoint: /auto-complete
      url = `https://${RAPIDAPI_HOST}/auto-complete?q=${encodeURIComponent(query)}&region=US`;
    } else {
      // YF1 endpoint: /v1/finance/search
      url = `https://${RAPIDAPI_HOST}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0`;
    }

    console.log(`[searchTicker] Searching URL: ${url}`);
    console.log(`[searchTicker] Host: ${RAPIDAPI_HOST}, Provider: ${provider}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    });

    console.log(`[searchTicker] Response status: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[searchTicker] Response body: ${errorBody.slice(0, 500)}`);
      console.error(`Yahoo Finance search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`[searchTicker] Response body (keys): ${Object.keys(data)}`);

    let quotes: any[];

    if (provider === "apidojo") {
      // Apidojo response shape: { quotes: [...] }
      quotes = data?.quotes;
    } else {
      // YF1 response shape: { quotes: [...] }
      quotes = data?.quotes;
    }

    if (!quotes || quotes.length === 0) {
      console.log("[searchTicker] No quotes found in response");
      return [];
    }

    const results = quotes.slice(0, 5).map((q) => ({
      ticker: q.symbol || "",
      name: q.shortname || q.longname || q.name || query,
      exchange: q.exchange || q.exchDisp || "",
    })).filter(q => q.ticker && q.name);

    return results;
  } catch (error) {
    console.error("searchTicker error:", error);
    return [];
  }
}

export async function getQuoteSummary(ticker: string): Promise<unknown> {
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY environment variable is not set");
  }

  const provider = getProvider();
  let url: string;

  if (provider === "apidojo") {
    // Apidojo endpoint: /stock/v2/get-summary
    url = `https://${RAPIDAPI_HOST}/stock/v2/get-summary?symbol=${encodeURIComponent(ticker)}&region=US`;
  } else {
    // YF1 endpoint: /v11/finance/quoteSummary
    const modules = "assetProfile,financialData,defaultKeyStatistics,summaryDetail";
    url = `https://${RAPIDAPI_HOST}/v11/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;
  }

  console.log(`[getQuoteSummary] Fetching URL: ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
  });

  console.log(`[getQuoteSummary] Response status: ${response.status}`);

  if (!response.ok) {
    throw new Error(
      `Yahoo Finance quoteSummary failed for ${ticker}: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (provider === "apidojo") {
    // Apidojo returns data at the top level, not nested under quoteSummary.result[0]
    if (data?.error) {
      throw new Error(`Yahoo Finance API error: ${data.error}`);
    }
    return data;
  } else {
    // YF1 nests under quoteSummary.result[0]
    if (data?.quoteSummary?.error) {
      throw new Error(
        `Yahoo Finance API error: ${data.quoteSummary.error.description}`
      );
    }
    return data?.quoteSummary?.result?.[0] ?? null;
  }
}
