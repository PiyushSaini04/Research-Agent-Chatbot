import { describe, it, expect, vi, beforeEach } from 'vitest';
import { plannerAgent } from '@/agents/planner.agent';
import { ResearchState } from '@/agents/state';

// Mock the Yahoo Finance client
vi.mock('@/lib/api-clients/yahoo-finance', () => ({
  searchTicker: vi.fn(),
}));
vi.mock('@/lib/api-clients/fmp', () => ({
  searchFMP: vi.fn(),
}));
vi.mock('@/lib/api-clients/finnhub', () => ({
  searchFinnhub: vi.fn(),
}));
vi.mock('@/lib/api-clients/tavily', () => ({
  searchWeb: vi.fn(),
}));
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            selectedTicker: 'AAPL',
            selectedName: 'Apple Inc.',
            exchange: 'NASDAQ',
            country: 'USA',
            currency: 'USD',
            confidenceScore: 95,
            reason: 'Best name match'
          })
        }
      })
    }))
  }))
}));

import { searchTicker } from '@/lib/api-clients/yahoo-finance';
import { searchFMP } from '@/lib/api-clients/fmp';
import { searchFinnhub } from '@/lib/api-clients/finnhub';
import { searchWeb } from '@/lib/api-clients/tavily';

describe('Planner Agent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
    (searchFMP as any).mockResolvedValue([]);
    (searchFinnhub as any).mockResolvedValue([]);
    (searchTicker as any).mockResolvedValue([]);
    (searchWeb as any).mockResolvedValue([]);
  });

  it('resolves a valid ticker and updates state', async () => {
    // Setup mock return
    (searchTicker as any).mockResolvedValue([{
      ticker: 'AAPL',
      name: 'Apple Inc.',
      exchange: 'NMS'
    }]);

    const mockState = { companyQuery: 'Apple' } as ResearchState;
    const result = await plannerAgent(mockState);

    expect(searchTicker).toHaveBeenCalledWith('Apple');
    expect(result).toEqual({
      ticker: 'AAPL',
      resolvedCompanyName: 'Apple Inc.',
      exchange: 'NMS',
      country: 'Unknown',
      currency: 'USD',
      plannerError: null
    });
  });

  it('returns a plannerError if ticker cannot be found', async () => {
    (searchTicker as any).mockResolvedValue([]);

    const mockState = { companyQuery: 'UnknownCompany123' } as ResearchState;
    const result = await plannerAgent(mockState);

    expect(result).toHaveProperty('plannerError');
    expect(result.plannerError).toContain('Could not definitively resolve ticker');
  });
});
