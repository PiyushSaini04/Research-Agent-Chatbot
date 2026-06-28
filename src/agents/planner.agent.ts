import { ResearchState } from "./state";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchFMP } from "@/lib/api-clients/fmp";
import { searchFinnhub } from "@/lib/api-clients/finnhub";
import { searchTicker as searchYahoo } from "@/lib/api-clients/yahoo-finance";
import { searchWeb } from "@/lib/api-clients/tavily";
import { createClient } from "@supabase/supabase-js";

interface Candidate {
  ticker: string;
  name: string;
  exchange: string;
  country?: string;
  currency?: string;
  provider?: string;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rankCandidates(query: string, candidates: Candidate[]): Candidate | null {
  const normalizedQuery = normalizeText(query);
  const exchangeScore = (exchange: string) => {
    const normalizedExchange = exchange.toUpperCase();
    if (/(NASDAQ|NYSE|NMS|NSE|BSE|LSE)/.test(normalizedExchange)) return 20;
    return 0;
  };

  return [...candidates].sort((a, b) => {
    const score = (candidate: Candidate) => {
      const normalizedName = normalizeText(candidate.name);
      const normalizedTicker = normalizeText(candidate.ticker);
      let value = 0;
      if (normalizedTicker === normalizedQuery) value += 50;
      if (normalizedName === normalizedQuery) value += 45;
      if (normalizedName.includes(normalizedQuery)) value += 35;
      if (normalizedTicker.startsWith(normalizedQuery)) value += 20;
      value += exchangeScore(candidate.exchange);
      return value;
    };

    return score(b) - score(a);
  })[0] ?? null;
}

export async function plannerAgent(
  state: ResearchState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any
): Promise<Partial<ResearchState>> {
  const emitProgress = config?.configurable?.emitProgress;
  
  if (state.ticker) {
    return {};
  }
  
  const query = state.companyQuery.trim();
  console.log(`[PlannerAgent] Searching ticker for: ${query}`);
  if (emitProgress) emitProgress("PlannerAgent", `Resolving ticker for: ${query}`);

  try {
    // 1. Check Supabase Cache First
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: cached } = await supabase
        .from("companies")
        .select("*")
        .or(`ticker.ilike.${query},name.ilike.%${query}%`)
        .limit(1)
        .single();
        
      if (cached) {
        console.log(`[PlannerAgent] Found in cache: ${cached.ticker} - ${cached.name}`);
        if (emitProgress) emitProgress("PlannerAgent", `Resolved from cache: ${cached.name} (${cached.ticker})`);
        return {
          ticker: cached.ticker,
          resolvedCompanyName: cached.name,
          exchange: cached.exchange || "Unknown",
          country: cached.country || "Unknown",
          currency: cached.currency || "USD",
          plannerError: null,
        };
      }
    }

    // 2. Waterfall Search Providers
    type SearchProvider = {
      name: string;
      search: (q: string) => Promise<Candidate[]>;
    };

    const providers: SearchProvider[] = [
      { name: "FMP", search: searchFMP },
      { name: "Finnhub", search: searchFinnhub },
      { name: "Yahoo Finance", search: searchYahoo },
      { 
        name: "Tavily (Fallback)", 
        search: async (q: string) => {
          const results = await searchWeb(`${q} stock ticker symbol exchange`, 3);
          const text = results.map(r => r.title + " " + r.content).join("\n");
          if (!text) return [];
          
          const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
          const prompt = `Extract the most likely stock ticker for "${q}" based on these search results. Return JSON with { "ticker": "SYMBOL", "name": "Company Name", "exchange": "Exchange Name" }. If none found, return empty fields.\n\nResults:\n${text}`;
          const res = await model.generateContent(prompt);
          try {
            const parsed = JSON.parse(res.response.text());
            if (parsed.ticker) return [parsed];
          } catch (e) {
            // ignore
          }
          return [];
        }
      }
    ];

    let selectedCandidate: Candidate | null = null;
    let selectedCountry = "Unknown";
    let selectedCurrency = "USD";
    
    const allCandidates: Candidate[] = [];

    for (const provider of providers) {
      if (emitProgress) emitProgress("PlannerAgent", `Searching ${provider.name}...`);
      console.log(`[PlannerAgent] Querying provider: ${provider.name}`);

      const providerResult = await provider.search(query);
      const candidates = Array.isArray(providerResult)
        ? providerResult
        : providerResult
          ? [providerResult]
          : [];

      if (candidates.length > 0) {
        console.log(`[PlannerAgent] ${provider.name} returned ${candidates.length} candidates:`, candidates);
        allCandidates.push(...candidates.map((candidate) => ({ ...candidate, provider: provider.name })));
      } else {
        console.log(`[PlannerAgent] ${provider.name} returned 0 candidates.`);
      }
    }

    const dedupedCandidates = Array.from(
      new Map(
        allCandidates
          .filter((candidate) => candidate.ticker && candidate.name)
          .map((candidate) => [candidate.ticker.toUpperCase(), candidate])
      ).values()
    );

    if (dedupedCandidates.length > 0) {
      const prompt = `You are a financial data assistant. The user searched for "${query}".
Evaluate this combined list of candidate companies returned by multiple providers.
Select the BEST match for the user's query.
Rank them using: company name similarity, exchange prominence, country, ticker quality, and active listing likelihood.

Candidates:
${JSON.stringify(dedupedCandidates, null, 2)}

Output a JSON object with:
"selectedTicker": The ticker of the best match (or null if none are acceptable)
"selectedName": The name of the best match
"exchange": The exchange of the best match
"country": The primary country of the exchange or company headquarters (e.g., "USA", "India", "UK")
"currency": The 3-letter currency code the stock is traded in (e.g., "USD", "INR", "GBP")
"confidenceScore": 0-100 score indicating how confident you are that this is the intended company
"reason": A brief explanation of why this candidate was selected over others

Only select a candidate if you are reasonably confident it matches the user's intent.`;

      try {
        if (!process.env.GOOGLE_GEMINI_API_KEY) {
          throw new Error("GOOGLE_GEMINI_API_KEY not configured");
        }
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        });
        const aiResponse = await model.generateContent(prompt);
        const parsed = JSON.parse(aiResponse.response.text());

        console.log("[PlannerAgent] Gemini combined evaluation:", parsed);

        if (parsed.selectedTicker && parsed.confidenceScore >= 70) {
          selectedCandidate = {
            ticker: parsed.selectedTicker,
            name: parsed.selectedName,
            exchange: parsed.exchange,
          };
          selectedCountry = parsed.country || "Unknown";
          selectedCurrency = parsed.currency || "USD";
        }
      } catch (error) {
        console.warn("[PlannerAgent] Gemini ranking failed, using deterministic ranking:", error);
      }

      if (!selectedCandidate) {
        selectedCandidate = rankCandidates(query, dedupedCandidates);
        selectedCountry = selectedCandidate?.country || "Unknown";
        selectedCurrency = selectedCandidate?.currency || "USD";
      }
    }

    if (!selectedCandidate) {
      return {
        plannerError: `Could not definitively resolve ticker for "${query}". Please provide a more specific company name or a direct ticker symbol.`,
      };
    }

    if (emitProgress) {
      emitProgress("PlannerAgent", `Resolved: ${selectedCandidate.name} (${selectedCandidate.ticker})`);
    }

    return {
      ticker: selectedCandidate.ticker,
      resolvedCompanyName: selectedCandidate.name,
      exchange: selectedCandidate.exchange || "Unknown",
      country: selectedCountry,
      currency: selectedCurrency,
      plannerError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[PlannerAgent] Error:", message);
    return {
      plannerError: `PlannerAgent failed: ${message}`,
    };
  }
}
