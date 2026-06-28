import { describe, it, expect, vi, beforeEach } from 'vitest';
import { companyAgent } from '@/agents/company.agent';
import { ResearchState } from '@/agents/state';

vi.mock('@/lib/api-clients/yahoo-finance', () => ({
  getQuoteSummary: vi.fn(),
}));
vi.mock('@/lib/api-clients/fmp', () => ({
  fetchFmpCompanyProfile: vi.fn(),
}));

import { getQuoteSummary } from '@/lib/api-clients/yahoo-finance';
import { fetchFmpCompanyProfile } from '@/lib/api-clients/fmp';

describe('Company Agent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });

  it('uses meaningful FMP profile fields when Yahoo profile fields are empty or generic', async () => {
    (getQuoteSummary as any).mockResolvedValue({
      assetProfile: {
        sector: 'Unknown',
        industry: '',
        website: '',
        longBusinessSummary: '',
      },
    });
    (fetchFmpCompanyProfile as any).mockResolvedValue({
      name: 'Apple Inc.',
      description: 'Apple designs, manufactures, and markets consumer technology products.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      employees: 164000,
      website: 'https://www.apple.com',
      city: 'Cupertino',
      state: 'CA',
      country: 'US',
    });

    const state = {
      ticker: 'AAPL',
      resolvedCompanyName: 'Apple Inc.',
      sources: [],
    } as unknown as ResearchState;

    const result = await companyAgent(state);

    expect(result.companyData).toMatchObject({
      sector: 'Technology',
      industry: 'Consumer Electronics',
      employees: 164000,
      website: 'https://www.apple.com',
      headquarters: 'Cupertino, CA, US',
    });
  });
});
