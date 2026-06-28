import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decisionAgent } from '@/agents/decision.agent';
import { ResearchState } from '@/agents/state';
import { calculateDataQuality } from '@/lib/research/data-quality';

vi.mock('@/lib/api-clients/gemini', () => ({
  generateEvidenceScores: vi.fn(),
}));

import { generateEvidenceScores } from '@/lib/api-clients/gemini';

function richState(): ResearchState {
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
    aggregatedContext: 'Revenue (TTM): $400.00B\nOperating Margin: 30.0%\n## Key Risk Factors',
    dataQuality: calculateDataQuality({
      ...({} as ResearchState),
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
    } as ResearchState),
    decisionOutput: null,
    reportMarkdown: '',
    sources: [],
    pipelineError: null,
  };
}

describe('Decision Agent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('maps evidence score 73 to INVEST tier, not PASS', async () => {
    (generateEvidenceScores as ReturnType<typeof vi.fn>).mockResolvedValue({
      categoryScores: [
        { category: 'Business Quality', maxPoints: 25, score: 21, notes: 'Strong brand' },
        { category: 'Financial Health', maxPoints: 30, score: 26, notes: 'Solid growth' },
        { category: 'Valuation', maxPoints: 20, score: 10, notes: 'P/E missing' },
        { category: 'Risk', maxPoints: 15, score: 9, notes: 'Moderate risks' },
        { category: 'News & Momentum', maxPoints: 10, score: 7, notes: 'Positive news' },
      ],
      rationale: ['Strong profitability'],
      keyDrivers: ['Brand strength'],
    });

    const result = await decisionAgent(richState());

    expect(generateEvidenceScores).toHaveBeenCalled();
    expect(result.decisionOutput?.recommendation).toBe('INVEST');
    expect(result.decisionOutput?.evidenceScore).toBe(73);
    expect(result.decisionOutput?.investProbability).toBe(73);
    expect(result.decisionOutput?.passProbability).toBe(27);
    expect(result.decisionOutput?.isFallback).toBe(false);
  });

  it('reduces confidence when valuation metrics are missing but keeps recommendation', async () => {
    (generateEvidenceScores as ReturnType<typeof vi.fn>).mockResolvedValue({
      categoryScores: [
        { category: 'Business Quality', maxPoints: 25, score: 21, notes: '' },
        { category: 'Financial Health', maxPoints: 30, score: 26, notes: '' },
        { category: 'Valuation', maxPoints: 20, score: 10, notes: 'Partial' },
        { category: 'Risk', maxPoints: 15, score: 9, notes: '' },
        { category: 'News & Momentum', maxPoints: 10, score: 7, notes: '' },
      ],
      rationale: ['Good business'],
      keyDrivers: ['Moat'],
    });

    const result = await decisionAgent(richState());

    expect(result.decisionOutput?.recommendation).toBe('INVEST');
    expect(result.decisionOutput?.confidence).toBeLessThan(result.dataQuality?.overallCompleteness ?? 100);
    expect(result.decisionOutput?.confidence).toBeGreaterThanOrEqual(20);
  });

  it('returns INSUFFICIENT_DATA when completeness is below 40%', async () => {
    (generateEvidenceScores as ReturnType<typeof vi.fn>).mockResolvedValue({
      categoryScores: [
        { category: 'Business Quality', maxPoints: 25, score: 20, notes: '' },
        { category: 'Financial Health', maxPoints: 30, score: 25, notes: '' },
        { category: 'Valuation', maxPoints: 20, score: 15, notes: '' },
        { category: 'Risk', maxPoints: 15, score: 10, notes: '' },
        { category: 'News & Momentum', maxPoints: 10, score: 8, notes: '' },
      ],
      rationale: ['Should not matter'],
      keyDrivers: ['Ignored'],
    });

    const sparseState = {
      aggregatedContext: 'Minimal data',
      dataQuality: {
        overallCompleteness: 25,
        sections: [],
        missingMetrics: ['Revenue', 'Net Income'],
      },
    } as unknown as ResearchState;

    const result = await decisionAgent(sparseState);

    expect(result.decisionOutput?.recommendation).toBe('INSUFFICIENT_DATA');
    expect(result.decisionOutput?.evidenceScore).toBe(0);
    expect(result.decisionOutput?.confidence).toBe(0);
  });

  it('uses tier-based fallback with isFallback flag on Gemini error', async () => {
    (generateEvidenceScores as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('429 Too Many Requests quota exceeded for model gemini-2.5-flash')
    );

    const result = await decisionAgent(richState());

    expect(result.decisionOutput?.isFallback).toBe(true);
    expect(result.decisionOutput?.recommendation).not.toBe('INSUFFICIENT_DATA');
    expect(result.decisionOutput?.rationale.join(' ')).toContain('model quota was reached');
    expect(result.decisionOutput?.rationale.join(' ')).not.toContain('generativelanguage.googleapis.com');
  });
});
