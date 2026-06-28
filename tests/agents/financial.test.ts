import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financialAgent, mergeFinancialData, normalizeFmpFinancialData } from '@/agents/financial.agent';
import { ResearchState } from '@/agents/state';

vi.mock('@/lib/api-clients/fmp', () => ({
  fetchFmpFinancials: vi.fn(),
}));
vi.mock('@/lib/api-clients/yahoo-finance', () => ({
  getQuoteSummary: vi.fn(),
}));
vi.mock('@/lib/api-clients/finnhub', () => ({
  fetchFinnhubFinancials: vi.fn(),
}));

import { fetchFmpFinancials } from '@/lib/api-clients/fmp';
import { getQuoteSummary } from '@/lib/api-clients/yahoo-finance';
import { fetchFinnhubFinancials } from '@/lib/api-clients/finnhub';

describe('Financial Agent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses FMP as the single source for financial statement data', async () => {
    (fetchFmpFinancials as any).mockResolvedValue({
      revenue: 416161000000,
      netIncome: 112010000000,
      eps: 7.49,
      marketCap: 3000000000000,
      peRatio: 31.2,
      operatingMargin: 0.31,
    });

    const mockState = {
      ticker: 'AAPL',
      resolvedCompanyName: 'Apple Inc.',
      sources: [],
    } as unknown as ResearchState;
    const result = await financialAgent(mockState);

    expect(fetchFmpFinancials).toHaveBeenCalledWith('AAPL');
    expect(getQuoteSummary).not.toHaveBeenCalled();
    expect(fetchFinnhubFinancials).not.toHaveBeenCalled();
    expect(result.financialData).toMatchObject({
      revenue: 416161000000,
      netIncome: 112010000000,
      eps: 7.49,
      marketCap: 3000000000000,
      peRatio: 31.2,
      operatingMargin: 0.31,
    });
    expect(result.sources?.[0].agent).toBe('FinancialAgent');
  });

  it('handles FMP errors gracefully without consulting Yahoo or Finnhub', async () => {
    (fetchFmpFinancials as any).mockRejectedValue(new Error('FMP failure'));

    const mockState = { ticker: 'TEST', sources: [] } as unknown as ResearchState;
    const result = await financialAgent(mockState);

    expect(fetchFmpFinancials).toHaveBeenCalledWith('TEST');
    expect(getQuoteSummary).not.toHaveBeenCalled();
    expect(fetchFinnhubFinancials).not.toHaveBeenCalled();
    expect(result.financialData).toBeDefined();
    expect(result.financialData?.revenue).toBeNull();
  });

  it('ignores Yahoo and Finnhub values in the backward-compatible merge helper', () => {
    const result = mergeFinancialData(
      { marketCap: null, revenue: 416161000000, netIncome: 112010000000, operatingMargin: 31 },
      { marketCap: 2500000000000, revenue: 1, netIncome: 2, operatingMargin: 99 },
      { revenue: 3, netIncome: 4, operatingMargin: 0.28 }
    );

    expect(result.marketCap).toBeNull();
    expect(result.revenue).toBe(416161000000);
    expect(result.netIncome).toBe(112010000000);
    expect(result.operatingMargin).toBe(0.31);
  });

  it('preserves valid FMP revenue, net income, and EPS during normalization', () => {
    const result = normalizeFmpFinancialData({
      revenue: 60922000000,
      netIncome: 29760000000,
      eps: 2.94,
      revenueGrowthYoY: 126,
    });

    expect(result.revenue).toBe(60922000000);
    expect(result.netIncome).toBe(29760000000);
    expect(result.eps).toBe(2.94);
    expect(result.revenueGrowthYoY).toBe(1.26);
  });
});
