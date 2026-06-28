import { FinancialData } from "@/agents/state";

const FMP_V3_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_STABLE_BASE_URL = "https://financialmodelingprep.com/stable";

type JsonObject = Record<string, unknown>;

function safeNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function responseShape(value: unknown): string {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value && typeof value === "object") return `object(${Object.keys(value as JsonObject).join(",")})`;
  return typeof value;
}

export function firstFmpObject(value: unknown): JsonObject {
  if (Array.isArray(value)) {
    return (value[0] && typeof value[0] === "object" ? value[0] : {}) as JsonObject;
  }

  if (value && typeof value === "object") {
    const objectValue = value as JsonObject;
    const data = objectValue.data;
    const results = objectValue.results;

    if (Array.isArray(data)) return (data[0] || {}) as JsonObject;
    if (data && typeof data === "object") return data as JsonObject;
    if (Array.isArray(results)) return (results[0] || {}) as JsonObject;
    if (results && typeof results === "object") return results as JsonObject;

    return objectValue;
  }

  return {};
}

function secondFmpObject(value: unknown): JsonObject | null {
  if (Array.isArray(value)) {
    return (value[1] && typeof value[1] === "object" ? value[1] : null) as JsonObject | null;
  }

  if (value && typeof value === "object") {
    const objectValue = value as JsonObject;
    const data = objectValue.data;
    const results = objectValue.results;

    if (Array.isArray(data)) return (data[1] || null) as JsonObject | null;
    if (Array.isArray(results)) return (results[1] || null) as JsonObject | null;
  }

  return null;
}

function pickNumber(obj: JsonObject, ...keys: string[]): number | null {
  for (const key of keys) {
    const val = safeNumber(obj[key]);
    if (val !== null) return val;
  }
  return null;
}

export function hasIncomeStatementFields(income: JsonObject): boolean {
  return pickNumber(income, "revenue", "netIncome", "grossProfit", "operatingIncome") !== null;
}

async function readJsonOrNull(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function stableUrl(path: string, ticker: string, apiKey: string, params: Record<string, string> = {}): string {
  const search = new URLSearchParams({
    symbol: ticker,
    apikey: apiKey,
    ...params,
  });
  return `${FMP_STABLE_BASE_URL}/${path}?${search.toString()}`;
}

export async function fetchFmpFinancials(ticker: string): Promise<Partial<FinancialData>> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error("FMP_API_KEY not found in environment");

  const headers = { "Content-Type": "application/json" };

  const [quoteRes, metricsRes, profileRes, incomeRes, balanceRes, cashFlowRes, ratiosRes] = await Promise.all([
    fetch(stableUrl("quote", ticker, apiKey), { headers }),
    fetch(stableUrl("key-metrics", ticker, apiKey, { period: "annual", limit: "1" }), { headers }),
    fetch(stableUrl("profile", ticker, apiKey), { headers }),
    fetch(stableUrl("income-statement", ticker, apiKey, { period: "annual", limit: "2" }), { headers }),
    fetch(stableUrl("balance-sheet-statement", ticker, apiKey, { period: "annual", limit: "1" }), { headers }),
    fetch(stableUrl("cash-flow-statement", ticker, apiKey, { period: "annual", limit: "1" }), { headers }),
    fetch(stableUrl("ratios", ticker, apiKey, { period: "annual", limit: "1" }), { headers }),
  ]);

  if (!quoteRes.ok) {
    throw new Error(`FMP API Error: quote=${quoteRes.status}`);
  }

  const quoteData = await readJsonOrNull(quoteRes);
  const metricsData = metricsRes.ok ? await readJsonOrNull(metricsRes) : null;
  const profileData = profileRes.ok ? await readJsonOrNull(profileRes) : null;
  const incomeData = incomeRes.ok ? await readJsonOrNull(incomeRes) : null;
  const balanceData = balanceRes.ok ? await readJsonOrNull(balanceRes) : null;
  const cashFlowData = cashFlowRes.ok ? await readJsonOrNull(cashFlowRes) : null;
  const ratiosData = ratiosRes.ok ? await readJsonOrNull(ratiosRes) : null;

  const quote = firstFmpObject(quoteData);
  const metrics = firstFmpObject(metricsData);
  const profile = firstFmpObject(profileData);
  const income = firstFmpObject(incomeData);
  const prevIncome = secondFmpObject(incomeData);
  const balance = firstFmpObject(balanceData);
  const cashFlow = firstFmpObject(cashFlowData);
  const ratios = firstFmpObject(ratiosData);

  console.log("[FMP] response shapes", {
    quote: responseShape(quoteData),
    metrics: metricsRes.ok ? responseShape(metricsData) : `http(${metricsRes.status})`,
    profile: profileRes.ok ? responseShape(profileData) : `http(${profileRes.status})`,
    income: incomeRes.ok ? responseShape(incomeData) : `http(${incomeRes.status})`,
    balance: balanceRes.ok ? responseShape(balanceData) : `http(${balanceRes.status})`,
    cashFlow: cashFlowRes.ok ? responseShape(cashFlowData) : `http(${cashFlowRes.status})`,
    ratios: ratiosRes.ok ? responseShape(ratiosData) : `http(${ratiosRes.status})`,
  });

  if (!incomeRes.ok || !hasIncomeStatementFields(income)) {
    console.warn("[FMP] Missing income statement data", {
      ticker,
      status: incomeRes.status,
      shape: responseShape(incomeData),
      keys: Object.keys(income),
    });
    throw new Error(`Income Statement API failed: status=${incomeRes.status}`);
  }

  let revenueGrowthYoY: number | null = null;
  const revenue = pickNumber(income, "revenue");
  const prevRevenue = prevIncome ? pickNumber(prevIncome, "revenue") : null;
  if (revenue !== null && prevRevenue !== null && prevRevenue !== 0) {
    revenueGrowthYoY = (revenue - prevRevenue) / Math.abs(prevRevenue);
  }

  const sharesOutstanding = pickNumber(quote, "sharesOutstanding");
  const marketCap = pickNumber(quote, "marketCap") ?? pickNumber(profile, "marketCap", "mktCap");
  const freeCashFlowPerShare = pickNumber(metrics, "freeCashFlowPerShareTTM", "freeCashFlowPerShare");
  const operatingCashFlowPerShare = pickNumber(metrics, "operatingCashFlowPerShareTTM", "operatingCashFlowPerShare");
  const cashPerShare = pickNumber(metrics, "cashPerShareTTM", "cashPerShare");

  const mapped = {
    marketCap,
    enterpriseValue: pickNumber(metrics, "enterpriseValueTTM", "enterpriseValue"),
    sharesOutstanding,
    revenue,
    revenueGrowthYoY,
    grossProfit: pickNumber(income, "grossProfit"),
    operatingIncome: pickNumber(income, "operatingIncome"),
    netIncome: pickNumber(income, "netIncome"),
    eps: pickNumber(quote, "eps") ?? pickNumber(income, "eps", "epsDiluted"),
    freeCashFlow: pickNumber(cashFlow, "freeCashFlow") ?? (
      freeCashFlowPerShare !== null && sharesOutstanding !== null
        ? freeCashFlowPerShare * sharesOutstanding
        : null
    ),
    operatingCashFlow: pickNumber(cashFlow, "operatingCashFlow") ?? (
      operatingCashFlowPerShare !== null && sharesOutstanding !== null
        ? operatingCashFlowPerShare * sharesOutstanding
        : null
    ),
    peRatio: pickNumber(quote, "pe", "peRatio"),
    forwardPe: null,
    pegRatio: pickNumber(metrics, "pegRatioTTM", "pegRatio"),
    debt: pickNumber(metrics, "netDebtTTM", "netDebt")
      ?? pickNumber(balance, "totalDebt")
      ?? (
        pickNumber(metrics, "debtToEquityTTM", "debtToEquity") !== null && marketCap !== null
          ? pickNumber(metrics, "debtToEquityTTM", "debtToEquity")! * marketCap
          : null
      ),
    debtToEquity: pickNumber(metrics, "debtToEquityTTM", "debtToEquity")
      ?? pickNumber(ratios, "debtEquityRatio", "debtToEquityRatio"),
    cash: pickNumber(balance, "cashAndCashEquivalents", "cashAndShortTermInvestments")
      ?? (
        cashPerShare !== null && sharesOutstanding !== null
          ? cashPerShare * sharesOutstanding
          : null
      ),
    currentRatio: pickNumber(metrics, "currentRatioTTM", "currentRatio")
      ?? pickNumber(ratios, "currentRatio"),
    quickRatio: pickNumber(metrics, "quickRatioTTM", "quickRatio")
      ?? pickNumber(ratios, "quickRatio"),
    roe: pickNumber(metrics, "roeTTM", "returnOnEquity")
      ?? pickNumber(ratios, "returnOnEquity"),
    roa: pickNumber(metrics, "returnOnTangibleAssetsTTM", "returnOnAssets")
      ?? pickNumber(ratios, "returnOnAssets"),
    roic: pickNumber(metrics, "roicTTM", "roic"),
    operatingMargin: revenue !== null && pickNumber(income, "operatingIncome") !== null
      ? pickNumber(income, "operatingIncome")! / revenue!
      : pickNumber(metrics, "operatingProfitMarginTTM", "operatingProfitMargin")
        ?? pickNumber(ratios, "operatingProfitMargin"),
    netMargin: revenue !== null && pickNumber(income, "netIncome") !== null
      ? pickNumber(income, "netIncome")! / revenue!
      : pickNumber(metrics, "netIncomeMarginTTM", "netProfitMargin")
        ?? pickNumber(ratios, "netProfitMargin"),
    dividendYield: pickNumber(metrics, "dividendYieldTTM", "dividendYield")
      ?? pickNumber(ratios, "dividendYield"),
    fiftyTwoWeekHigh: pickNumber(quote, "yearHigh", "fiftyTwoWeekHigh"),
    fiftyTwoWeekLow: pickNumber(quote, "yearLow", "fiftyTwoWeekLow"),
    currentPrice: pickNumber(quote, "price") ?? pickNumber(profile, "price"),
    averageVolume: pickNumber(quote, "avgVolume", "averageVolume"),
    beta: pickNumber(profile, "beta") ?? pickNumber(quote, "beta"),
    analystRating: profile.dcfDiff ? (safeNumber(profile.dcfDiff)! > 0 ? "undervalued" : "overvalued") : null,
  } satisfies Partial<FinancialData>;

  console.log("[FMP] mapped financial values", {
    revenue: mapped.revenue,
    netIncome: mapped.netIncome,
    eps: mapped.eps,
    marketCap: mapped.marketCap,
    operatingMargin: mapped.operatingMargin,
    sector: profile.sector,
    industry: profile.industry,
    website: profile.website,
  });

  return mapped;
}

export interface FmpCompanyProfile {
  name: string;
  description: string;
  sector: string;
  industry: string;
  employees: number | null;
  website: string;
  city: string;
  state: string;
  country: string;
  beta: number | null;
  marketCap: number | null;
}

export async function fetchFmpCompanyProfile(ticker: string): Promise<Partial<FmpCompanyProfile>> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error("FMP_API_KEY not found in environment");

  const res = await fetch(stableUrl("profile", ticker, apiKey), {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`FMP profile API Error: ${res.status}`);
  }

  const data = await readJsonOrNull(res);
  const profile = firstFmpObject(data);

  console.log("[FMP] profile response shape", {
    ticker,
    shape: responseShape(data),
    mapped: {
      sector: profile.sector,
      industry: profile.industry,
      website: profile.website,
      employees: profile.fullTimeEmployees,
    },
  });

  return {
    name: String(profile.companyName || profile.companyNameLong || ""),
    description: String(profile.description || ""),
    sector: String(profile.sector || ""),
    industry: String(profile.industry || ""),
    employees: safeNumber(profile.fullTimeEmployees),
    website: String(profile.website || ""),
    city: String(profile.city || ""),
    state: String(profile.state || ""),
    country: String(profile.country || ""),
    beta: safeNumber(profile.beta),
    marketCap: safeNumber(profile.marketCap ?? profile.mktCap),
  };
}

export async function searchFMP(query: string): Promise<Array<{ ticker: string; name: string; exchange: string; country?: string; currency?: string }>> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(`${FMP_V3_BASE_URL}/search?query=${encodeURIComponent(query)}&limit=10&apikey=${apiKey}`);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      ticker: item.symbol,
      name: item.name,
      exchange: item.stockExchange || item.exchangeShortName || "",
      currency: item.currency,
    })).filter(item => item.ticker && item.name);
  } catch (error) {
    console.error("FMP search error:", error);
    return [];
  }
}
