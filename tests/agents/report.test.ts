import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportAgent } from '@/agents/report.agent';
import { ResearchState } from '@/agents/state';

const generateContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function () {
    return {
      getGenerativeModel: vi.fn(() => ({
        generateContent,
      })),
    };
  }),
}));

describe('Report Agent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
  });

  it('passes aggregated context and decision details into the report prompt', async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () => '# Executive Summary\nReport body',
      },
    });

    const state = {
      resolvedCompanyName: 'Apple Inc.',
      ticker: 'AAPL',
      aggregatedContext: '## Financial Snapshot\nRevenue (TTM): $100.00B',
      decisionOutput: {
        recommendation: 'INVEST',
        evidenceScore: 70,
        confidence: 72,
        categoryScores: [],
        decision: 'INVEST',
        investProbability: 70,
        passProbability: 30,
        rationale: ['Strong profitability'],
        keyDrivers: ['Services growth'],
        isFallback: false,
      },
    } as unknown as ResearchState;

    const result = await reportAgent(state);
    const prompt = generateContent.mock.calls[0][0] as string;

    expect(prompt).toContain('Apple Inc. (AAPL)');
    expect(prompt).toContain('Revenue (TTM): $100.00B');
    expect(prompt).toContain('Recommendation: INVEST');
    expect(prompt).toContain('Evidence Score: 70/100');
    expect(prompt).toContain('Strong profitability');
    expect(result.reportMarkdown).toContain('# Executive Summary');
  });
});
