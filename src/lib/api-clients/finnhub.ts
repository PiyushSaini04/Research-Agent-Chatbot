import { FinancialData } from "@/agents/state";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

function safeNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export async function fetchFinnhubFinancials(ticker: string): Promise<Partial<FinancialData>> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error("FINNHUB_API_KEY not found in environment");

  const [quoteRes, metricRes] = await Promise.all([
    fetch(`${FINNHUB_BASE_URL}/quote?symbol=${ticker}&token=${apiKey}`),
    fetch(`${FINNHUB_BASE_URL}/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`)
  ]);

  if (!quoteRes.ok || !metricRes.ok) {
    throw new Error(`Finnhub API Error: ${quoteRes.status} ${metricRes.status}`);
  }

  const quote = await quoteRes.json();
  const metricData = await metricRes.json();
  const m = metricData?.metric || {};

  // CRITICAL: Finnhub returns marketCapitalization in millions of USD.
  // We normalize to raw dollars to match FMP and Yahoo Finance.
  const mktCapMillions = safeNumber(m.marketCapitalization);
  const marketCap = mktCapMillions !== null ? mktCapMillions * 1_000_000 : null;

  // sharesOutstanding is also in millions in Finnhub
  const sharesMillions = safeNumber(m["sharesOutstanding"]);
  const sharesOutstanding = sharesMillions !== null ? sharesMillions * 1_000_000 : null;

  return {
    // Valuation & Size — normalized from millions to raw dollars
    marketCap,
    enterpriseValue: null,
    sharesOutstanding,

    // Income Statement — Finnhub basic tier doesn't provide absolute revenue figures
    revenue: null,
    revenueGrowthYoY: safeNumber(m.revenueGrowthTTMYoy),
    grossProfit: null,
    operatingIncome: null,
    netIncome: null,
    eps: safeNumber(m.epsTTM),

    // Cash Flow
    freeCashFlow: null,
    operatingCashFlow: null,

    // Multiples
    peRatio: safeNumber(m.peTTM),
    forwardPe: null,
    pegRatio: null,

    // Balance Sheet & Liquidity
    debt: null,
    debtToEquity: safeNumber(m.totalDebtToEquityQuarterly),
    cash: null,
    currentRatio: safeNumber(m.currentRatioQuarterly),
    quickRatio: safeNumber(m.quickRatioQuarterly),

    // Returns & Margins
    roe: safeNumber(m.roeTTM),
    roa: safeNumber(m.roaTTM),
    roic: safeNumber(m.roiTTM),
    operatingMargin: safeNumber(m.operatingMarginTTM),
    netMargin: safeNumber(m.netProfitMarginTTM),

    // Market & Trading
    dividendYield: safeNumber(m.dividendYieldIndicatedAnnual),
    fiftyTwoWeekHigh: safeNumber(m["52WeekHigh"]),
    fiftyTwoWeekLow: safeNumber(m["52WeekLow"]),
    currentPrice: safeNumber(quote.c),
    averageVolume: safeNumber(m["10DayAverageTradingVolume"]) !== null
      ? safeNumber(m["10DayAverageTradingVolume"])! * 1_000_000  // volume is in millions
      : null,
    beta: safeNumber(m.beta),

    // Analyst
    analystRating: null,
  };
}

export async function searchFinnhub(query: string): Promise<Array<{ ticker: string; name: string; exchange: string }>> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  
  try {
    const res = await fetch(`${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(query)}&token=${apiKey}`);
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.result || !Array.isArray(data.result)) return [];
    
    return data.result.map((item: any) => ({
      ticker: item.symbol,
      name: item.description,
      exchange: item.type || "" // Finnhub often returns 'Common Stock' or empty here, but doesn't have an explicit exchange name field in the basic search
    })).filter((item: any) => item.ticker && item.name);
  } catch (error) {
    console.error("Finnhub search error:", error);
    return [];
  }
}
