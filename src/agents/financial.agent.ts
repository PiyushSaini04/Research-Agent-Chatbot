import { ResearchState, FinancialData, Source } from "./state";
import { fetchFmpFinancials } from "@/lib/api-clients/fmp";

const EMPTY_FINANCIALS: FinancialData = {
  marketCap: null, enterpriseValue: null, sharesOutstanding: null,
  revenue: null, revenueGrowthYoY: null, grossProfit: null, operatingIncome: null, netIncome: null, eps: null,
  freeCashFlow: null, operatingCashFlow: null,
  peRatio: null, forwardPe: null, pegRatio: null,
  debt: null, debtToEquity: null, cash: null, currentRatio: null, quickRatio: null,
  roe: null, roa: null, roic: null, operatingMargin: null, netMargin: null,
  dividendYield: null, fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null, currentPrice: null, averageVolume: null, beta: null,
  analystRating: null,
};

const RATIO_FIELDS = new Set<keyof FinancialData>([
  "revenueGrowthYoY",
  "roe",
  "roa",
  "roic",
  "operatingMargin",
  "netMargin",
  "dividendYield",
]);

function normalizeRatio(val: number | null): number | null {
  if (val === null) return null;
  return Math.abs(val) > 1.5 ? val / 100 : val;
}

function isValidFinancialValue(key: keyof FinancialData, val: FinancialData[keyof FinancialData]): boolean {
  if (val === null || typeof val !== "number") return true;
  if (!Number.isFinite(val)) return false;
  if (key === "marketCap" && val < 0) return false;
  if (key === "sharesOutstanding" && val < 0) return false;
  if (key === "averageVolume" && val < 0) return false;
  if (RATIO_FIELDS.has(key) && (val < -1 || val > 10)) return false;
  if (key === "debtToEquity" && (val < -10 || val > 1000)) return false;
  if (key === "peRatio" && (val < -1000 || val > 10000)) return false;
  return true;
}

export function normalizeFmpFinancialData(fmpData: Partial<FinancialData>): FinancialData {
  const merged: Partial<FinancialData> = {};
  const keys = Object.keys(EMPTY_FINANCIALS) as Array<keyof FinancialData>;

  for (const key of keys) {
    let val = fmpData[key] ?? null;

    if (typeof val === "number" && RATIO_FIELDS.has(key)) {
      val = normalizeRatio(val);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    merged[key] = isValidFinancialValue(key, val as any) ? (val as any) : null;
  }

  return { ...EMPTY_FINANCIALS, ...merged };
}

// Backward-compatible helper. Financial statements now intentionally use FMP only.
export function mergeFinancialData(
  fmpData: Partial<FinancialData>,
  _finnhubData: Partial<FinancialData>,
  _yahooData: Partial<FinancialData>
): FinancialData {
  return normalizeFmpFinancialData(fmpData);
}

export async function financialAgent(
  state: ResearchState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any
): Promise<Partial<ResearchState>> {
  console.log(`[FinancialAgent] Fetching FMP financials for ${state.ticker}`);
  const emitProgress = config?.configurable?.emitProgress;
  const sources: Source[] = [...(state.sources || [])];

  if (!state.ticker) {
    console.error("[FinancialAgent] Missing ticker; cannot fetch FMP financials");
    return { financialData: { ...EMPTY_FINANCIALS }, sources };
  }

  if (emitProgress) {
    emitProgress("FinancialAgent", "Fetching financial statement data from Financial Modeling Prep...");
  }

  try {
    const fmpData = await fetchFmpFinancials(state.ticker);
    const financialData = normalizeFmpFinancialData(fmpData);

    sources.push({
      url: "https://financialmodelingprep.com/",
      title: `${state.resolvedCompanyName || state.ticker} Financials (FMP)`,
      agent: "FinancialAgent",
    });

    console.log("[FinancialAgent] FMP normalized financial data:", {
      marketCap: financialData.marketCap,
      revenue: financialData.revenue,
      netIncome: financialData.netIncome,
      eps: financialData.eps,
      revenueGrowthYoY: financialData.revenueGrowthYoY,
      operatingMargin: financialData.operatingMargin,
      netMargin: financialData.netMargin,
      peRatio: financialData.peRatio,
      currentPrice: financialData.currentPrice,
    });

    return { financialData, sources };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[FinancialAgent] FMP error:", message);
    return { financialData: { ...EMPTY_FINANCIALS }, sources };
  }
}
