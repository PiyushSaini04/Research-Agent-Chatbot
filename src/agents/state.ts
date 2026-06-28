import { Decision, Recommendation } from "@/types/research";

export interface CompanyData {
  name: string;
  description: string;
  sector: string;
  industry: string;
  employees: number | null;
  foundedYear: number | null;
  headquarters: string;
  website: string;
  logoUrl: string;
}

export interface FinancialData {
  // Valuation & Size
  marketCap: number | null;
  enterpriseValue: number | null;
  sharesOutstanding: number | null;

  // Income Statement
  revenue: number | null;
  revenueGrowthYoY: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;

  // Cash Flow
  freeCashFlow: number | null;
  operatingCashFlow: number | null;

  // Multiples
  peRatio: number | null;
  forwardPe: number | null;
  pegRatio: number | null;

  // Balance Sheet & Liquidity
  debt: number | null;
  debtToEquity: number | null;
  cash: number | null;
  currentRatio: number | null;
  quickRatio: number | null;

  // Returns & Margins
  roe: number | null;
  roa: number | null;
  roic: number | null;
  operatingMargin: number | null;
  netMargin: number | null;

  // Market & Trading
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  currentPrice: number | null;
  averageVolume: number | null;
  beta: number | null;

  // Analyst
  analystRating: string | null;
}

export interface ValuationData {
  intrinsicValue: number | null;
  historicalPeAvg: number | null;
  sectorPeAvg: number | null;
  discountToFairValue: number | null;
  valuationAssessment: string;
}

export interface MacroeconomicData {
  interestRateImpact: string;
  sectorHeadwinds: string;
  regulatoryEnvironment: string;
  macroAssessment: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  summary: string;
}

export interface Competitor {
  name: string;
  ticker: string;
  differentiationNote: string;
}

export interface RiskFactor {
  title: string;
  description: string;
  source: string;
}

export interface DataQualityMetric {
  label: string;
  present: boolean;
}

export interface DataQualitySection {
  name: string;
  score: number;
  present: number;
  total: number;
  metrics: DataQualityMetric[];
}

export interface DataQualityAssessment {
  overallCompleteness: number;
  sections: DataQualitySection[];
  missingMetrics: string[];
}

export interface EvidenceCategoryScore {
  category: string;
  maxPoints: number;
  score: number;
  notes: string;
}

export interface DecisionOutput {
  recommendation: Recommendation;
  evidenceScore: number;
  confidence: number;
  categoryScores: EvidenceCategoryScore[];
  decision: Decision;
  investProbability: number;
  passProbability: number;
  rationale: string[];
  keyDrivers: string[];
  isFallback: boolean;
}

export interface Source {
  url: string;
  title: string;
  agent: string;
}

export interface ResearchState {
  // Input
  companyQuery: string;
  sessionId: string;
  userId: string;

  // Planner output
  ticker: string;
  resolvedCompanyName: string;
  exchange: string;
  country: string;
  currency: string;
  plannerError: string | null;

  // Parallel agent outputs
  companyData: CompanyData | null;
  financialData: FinancialData | null;
  newsItems: NewsItem[];
  competitors: Competitor[];
  riskFactors: RiskFactor[];
  valuationData: ValuationData | null;
  macroeconomicData: MacroeconomicData | null;

  // Aggregated
  aggregatedContext: string;

  // Data quality
  dataQuality: DataQualityAssessment | null;

  // Decision
  decisionOutput: DecisionOutput | null;

  // Report
  reportMarkdown: string;

  // Sources (accumulated from all agents)
  sources: Source[];

  // Error
  pipelineError: string | null;
}
