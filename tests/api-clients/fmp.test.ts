import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFmpCompanyProfile, fetchFmpFinancials, firstFmpObject, hasIncomeStatementFields } from '@/lib/api-clients/fmp';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('FMP client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.FMP_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes first object from array, data array, data object, and plain object shapes', () => {
    expect(firstFmpObject([{ revenue: 1 }])).toEqual({ revenue: 1 });
    expect(firstFmpObject({ data: [{ revenue: 2 }] })).toEqual({ revenue: 2 });
    expect(firstFmpObject({ data: { revenue: 3 } })).toEqual({ revenue: 3 });
    expect(firstFmpObject({ revenue: 4 })).toEqual({ revenue: 4 });
  });

  it('maps object-shaped stable profile responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      companyName: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      website: 'https://www.apple.com',
      description: 'Apple profile',
      fullTimeEmployees: 166000,
      city: 'Cupertino',
      state: 'CA',
      country: 'US',
      beta: 1.086,
      marketCap: 4167977885680,
    })));

    const result = await fetchFmpCompanyProfile('AAPL');

    expect(result).toMatchObject({
      name: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      website: 'https://www.apple.com',
      employees: 166000,
      city: 'Cupertino',
      state: 'CA',
      country: 'US',
      marketCap: 4167977885680,
    });
  });

  it('maps array-shaped profile responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{
      companyName: 'NVIDIA Corporation',
      sector: 'Technology',
      industry: 'Semiconductors',
      website: 'https://www.nvidia.com',
      fullTimeEmployees: 29600,
    }])));

    const result = await fetchFmpCompanyProfile('NVDA');

    expect(result).toMatchObject({
      name: 'NVIDIA Corporation',
      sector: 'Technology',
      industry: 'Semiconductors',
      website: 'https://www.nvidia.com',
      employees: 29600,
    });
  });

  it('maps array-shaped income statement responses into financial data', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse([{ marketCap: 4167977885680, eps: 7.49, pe: 31.2, price: 283.78 }]))
      .mockResolvedValueOnce(jsonResponse([{ enterpriseValueTTM: 4200000000000 }]))
      .mockResolvedValueOnce(jsonResponse({ beta: 1.086, marketCap: 4167977885680 }))
      .mockResolvedValueOnce(jsonResponse([
        { revenue: 416161000000, grossProfit: 190000000000, operatingIncome: 130000000000, netIncome: 112010000000 },
        { revenue: 383285000000, netIncome: 96995000000 },
      ]))
      .mockResolvedValueOnce(jsonResponse([{ totalDebt: 1000000000, cashAndCashEquivalents: 500000000 }]))
      .mockResolvedValueOnce(jsonResponse([{ operatingCashFlow: 1200000000, freeCashFlow: 900000000 }]))
      .mockResolvedValueOnce(jsonResponse([{ debtEquityRatio: 0.4, operatingProfitMargin: 0.31, netProfitMargin: 0.27, returnOnEquity: 0.2 }]))
    );

    const result = await fetchFmpFinancials('AAPL');

    expect(result.revenue).toBe(416161000000);
    expect(result.netIncome).toBe(112010000000);
    expect(result.eps).toBe(7.49);
    expect(result.operatingMargin).toBeCloseTo(130000000000 / 416161000000);
  });

  it('maps object/data-shaped income statement responses into financial data', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse([{ marketCap: 1000, eps: 2, pe: 20, price: 50 }]))
      .mockResolvedValueOnce(jsonResponse([{ enterpriseValueTTM: 1100 }]))
      .mockResolvedValueOnce(jsonResponse({ beta: 1.1 }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ revenue: 500, operatingIncome: 100, netIncome: 80 }] }))
      .mockResolvedValueOnce(jsonResponse([{ totalDebt: 100, cashAndCashEquivalents: 50 }]))
      .mockResolvedValueOnce(jsonResponse([{ operatingCashFlow: 300, freeCashFlow: 250 }]))
      .mockResolvedValueOnce(jsonResponse([{ debtEquityRatio: 0.4, operatingProfitMargin: 0.2, netProfitMargin: 0.16, returnOnEquity: 0.18 }]))
    );

    const result = await fetchFmpFinancials('TEST');

    expect(result.revenue).toBe(500);
    expect(result.netIncome).toBe(80);
    expect(result.operatingMargin).toBe(0.2);
  });

  it('uses stable endpoints for financial statement calls', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([{ marketCap: 1000, eps: 2, pe: 20, price: 50 }]))
      .mockResolvedValueOnce(jsonResponse([{ enterpriseValueTTM: 1100 }]))
      .mockResolvedValueOnce(jsonResponse({ beta: 1.1 }))
      .mockResolvedValueOnce(jsonResponse([{ revenue: 500, operatingIncome: 100, netIncome: 80 }]))
      .mockResolvedValueOnce(jsonResponse([{ totalDebt: 200, cashAndCashEquivalents: 50 }]))
      .mockResolvedValueOnce(jsonResponse([{ operatingCashFlow: 300, freeCashFlow: 250 }]))
      .mockResolvedValueOnce(jsonResponse([{ debtEquityRatio: 0.4, operatingProfitMargin: 0.2, netProfitMargin: 0.16, returnOnEquity: 0.18 }]))
    ;
    vi.stubGlobal('fetch', fetchMock);

    await fetchFmpFinancials('TEST');

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/stable/quote?'), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/stable/key-metrics?'), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/stable/income-statement?'), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/stable/balance-sheet-statement?'), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/stable/cash-flow-statement?'), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/stable/ratios?'), expect.anything());
  });

  it('detects missing income statement fields instead of silently accepting error payloads', () => {
    expect(hasIncomeStatementFields({ revenue: 100 })).toBe(true);
    expect(hasIncomeStatementFields({ error: 'No income data' })).toBe(false);
  });

  it('throws when required statement data is missing', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse([{ marketCap: 1000, eps: 2, pe: 20, price: 50 }]))
      .mockResolvedValueOnce(jsonResponse([{ enterpriseValueTTM: 1100 }]))
      .mockResolvedValueOnce(jsonResponse({ beta: 1.1 }))
      .mockResolvedValueOnce(jsonResponse({ error: 'No income data' }))
      .mockResolvedValueOnce(jsonResponse({ error: 'No balance sheet data' }))
      .mockResolvedValueOnce(jsonResponse({ error: 'No cash flow data' }))
      .mockResolvedValueOnce(jsonResponse({ error: 'No ratios data' }))
    );

    await expect(fetchFmpFinancials('TEST')).rejects.toThrow('Income Statement API failed');
  });
});
