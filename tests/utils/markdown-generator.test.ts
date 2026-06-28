import { describe, it, expect } from 'vitest';
import { generateMarkdownReport } from '@/lib/report/markdown-generator';
import { ResearchState } from '@/agents/state';

describe('Markdown Generator', () => {
  it('generates a formatted markdown report from a complete state', () => {
    const mockState = {
      resolvedCompanyName: 'Apple Inc.',
      ticker: 'AAPL',
      decisionOutput: {
        recommendation: 'INVEST',
        evidenceScore: 90,
        confidence: 85,
        categoryScores: [],
        decision: 'INVEST',
        investProbability: 90,
        passProbability: 10,
        rationale: ['Strong balance sheet', 'High growth'],
        keyDrivers: ['iPhone cycle', 'Services revenue'],
        isFallback: false,
      },
      companyData: {
        name: 'Apple Inc.',
        description: 'Technology company',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        employees: 100000,
        foundedYear: null,
        headquarters: 'Cupertino, CA',
        website: 'https://apple.com',
        logoUrl: ''
      },
      financialData: {
        revenue: 300000000000,
        netIncome: 100000000000,
        eps: 5.5,
        peRatio: 30,
        debtToEquity: 1.2,
        currentPrice: 150.00,
        fiftyTwoWeekHigh: 160.00,
        fiftyTwoWeekLow: 110.00,
      },
      newsItems: [{ title: 'Great earnings', source: 'Bloomberg', publishedDate: '2025-01-01', url: 'https://test.com', summary: 'Earnings beat' }],
      competitors: [{ name: 'Microsoft', ticker: 'MSFT', differentiationNote: 'Cloud focus' }],
      riskFactors: [{ title: 'Regulatory risk', description: 'Regulatory risk summary', source: 'https://test.com/risk' }]
    } as unknown as ResearchState;

    const report = generateMarkdownReport(mockState);

    expect(report).toContain('# Apple Inc. (AAPL) — Investment Research Report');
    expect(report).toContain('## Executive Summary');
    expect(report).toContain('**INVEST**');
    expect(report).toContain('90/100');
    expect(report).toContain('Strong balance sheet');
    expect(report).toContain('Great earnings');
    expect(report).toContain('Regulatory risk');
  });

  it('handles missing data gracefully', () => {
    const mockState = {
      resolvedCompanyName: 'Unknown',
      ticker: 'UNK',
      decisionOutput: {
        recommendation: 'PASS',
        evidenceScore: 0,
        confidence: 0,
        categoryScores: [],
        decision: 'PASS',
        investProbability: 0,
        passProbability: 100,
        rationale: [],
        keyDrivers: [],
        isFallback: false,
      }
    } as unknown as ResearchState;

    const report = generateMarkdownReport(mockState);
    
    expect(report).toContain('# Unknown (UNK) — Investment Research Report');
    expect(report).toContain('**PASS**');
    expect(report).toContain('*No recent news available.*');
  });
});
