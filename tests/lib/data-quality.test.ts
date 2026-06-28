import { describe, it, expect } from 'vitest';
import { calculateDataQuality, getHighImpactMissingMetrics } from '@/lib/research/data-quality';
import { ResearchState } from '@/agents/state';

function appleLikeState(): ResearchState {
  return {
    companyQuery: 'Apple',
    sessionId: 's1',
    userId: 'u1',
    ticker: 'AAPL',
    resolvedCompanyName: 'Apple Inc.',
    exchange: 'NASDAQ',
    country: 'US',
    currency: 'USD',
    plannerError: null,
    companyData: {
      name: 'Apple Inc.',
      description: 'Technology leader',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      employees: 160000,
      foundedYear: null,
      headquarters: 'Cupertino, CA',
      website: 'https://apple.com',
      logoUrl: '',
    },
    financialData: {
      marketCap: 3000000000000,
      enterpriseValue: null,
      sharesOutstanding: null,
      revenue: 400000000000,
      revenueGrowthYoY: 0.05,
      grossProfit: null,
      operatingIncome: null,
      netIncome: 100000000000,
      eps: 6.5,
      freeCashFlow: null,
      operatingCashFlow: null,
      peRatio: null,
      forwardPe: null,
      pegRatio: null,
      debt: null,
      debtToEquity: 1.5,
      cash: null,
      currentRatio: null,
      quickRatio: null,
      roe: null,
      roa: null,
      roic: null,
      operatingMargin: 0.3,
      netMargin: null,
      dividendYield: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      currentPrice: 180,
      averageVolume: null,
      beta: null,
      analystRating: null,
    },
    newsItems: [{ title: 'News', url: 'https://a.com', source: 'Reuters', publishedDate: '2025-01-01', summary: 'Positive' }],
    competitors: [{ name: 'Microsoft', ticker: 'MSFT', differentiationNote: 'Cloud' }],
    riskFactors: [{ title: 'Regulation', description: 'Risk', source: 'https://sec.gov' }],
    valuationData: null,
    macroeconomicData: null,
    aggregatedContext: '',
    dataQuality: null,
    decisionOutput: null,
    reportMarkdown: '',
    sources: [],
    pipelineError: null,
  };
}

describe('Data Quality', () => {
  it('scores apple-like state around 70-90% with known missing metrics', () => {
    const assessment = calculateDataQuality(appleLikeState());

    expect(assessment.overallCompleteness).toBeGreaterThanOrEqual(70);
    expect(assessment.overallCompleteness).toBeLessThanOrEqual(92);
    expect(assessment.missingMetrics).toEqual(
      expect.arrayContaining(['P/E', 'Free Cash Flow', 'Operating Cash Flow', 'Intrinsic Value'])
    );
  });

  it('does not zero financial section when only P/E is missing', () => {
    const assessment = calculateDataQuality(appleLikeState());
    const financial = assessment.sections.find((s) => s.name === 'Financial Metrics');

    expect(financial).toBeDefined();
    expect(financial!.present).toBeGreaterThan(5);
    expect(financial!.score).toBeGreaterThan(40);
  });

  it('flags high-impact missing metrics for confidence penalty', () => {
    const assessment = calculateDataQuality(appleLikeState());
    const highImpact = getHighImpactMissingMetrics(assessment);

    expect(highImpact).toContain('P/E');
    expect(highImpact).toContain('Free Cash Flow');
  });

  it('produces low completeness for sparse micro-cap state', () => {
    const sparse = {
      ...appleLikeState(),
      companyData: null,
      financialData: null,
      newsItems: [],
      competitors: [],
      riskFactors: [],
      valuationData: null,
    };

    const assessment = calculateDataQuality(sparse);
    expect(assessment.overallCompleteness).toBeLessThan(40);
  });
});
