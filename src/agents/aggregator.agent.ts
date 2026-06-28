import { ResearchState } from "./state";

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

function formatCurrency(val: number | null): string {
  if (val === null) return "N/A";
  if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toFixed(2)}`;
}

function formatPercent(val: number | null): string {
  if (val === null) return "N/A";
  return `${(val * 100).toFixed(1)}%`;
}

export async function aggregatorAgent(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  console.log(`[AggregatorAgent] Building aggregated context`);

  const sections: string[] = [];

  // Company section — 500 token budget (~2000 chars)
  if (state.companyData) {
    const c = state.companyData;
    const companySection = `## Company Overview
Name: ${c.name}
Sector: ${c.sector} | Industry: ${c.industry}
Employees: ${c.employees?.toLocaleString() ?? "N/A"}
Headquarters: ${c.headquarters}
Website: ${c.website}
Description: ${truncate(c.description, 400)}`;
    sections.push(companySection);
  }

  // Financial section — 400 token budget (~1600 chars)
  if (state.financialData) {
    const f = state.financialData;
    const financialSection = `## Financial Snapshot
Market Cap: ${formatCurrency(f.marketCap)}
Revenue (TTM): ${formatCurrency(f.revenue)}
Net Income: ${formatCurrency(f.netIncome)}
EPS: ${f.eps !== null ? `$${f.eps.toFixed(2)}` : "N/A"}
P/E Ratio: ${f.peRatio !== null ? f.peRatio.toFixed(1) : "N/A"}
Debt/Equity: ${f.debtToEquity !== null ? f.debtToEquity.toFixed(2) : "N/A"}
Operating Margin: ${formatPercent(f.operatingMargin)}
Revenue YoY Growth: ${formatPercent(f.revenueGrowthYoY)}
Current Price: ${f.currentPrice !== null ? `$${f.currentPrice.toFixed(2)}` : "N/A"}
52W High: ${f.fiftyTwoWeekHigh !== null ? `$${f.fiftyTwoWeekHigh.toFixed(2)}` : "N/A"} | 52W Low: ${f.fiftyTwoWeekLow !== null ? `$${f.fiftyTwoWeekLow.toFixed(2)}` : "N/A"}`;
    sections.push(financialSection);
  }

  if (state.valuationData) {
    const v = state.valuationData;
    const valSection = `## Valuation Analysis
Intrinsic Value: ${v.intrinsicValue !== null ? `$${v.intrinsicValue.toFixed(2)}` : "N/A"}
Historical P/E Avg: ${v.historicalPeAvg !== null ? v.historicalPeAvg.toFixed(2) : "N/A"}
Sector P/E Avg: ${v.sectorPeAvg !== null ? v.sectorPeAvg.toFixed(2) : "N/A"}
Discount/Premium to Fair Value: ${v.discountToFairValue !== null ? `${v.discountToFairValue.toFixed(1)}%` : "N/A"}
Assessment: ${v.valuationAssessment}`;
    sections.push(valSection);
  }

  if (state.macroeconomicData) {
    const m = state.macroeconomicData;
    const macroSection = `## Macroeconomic Context
Interest Rate Impact: ${m.interestRateImpact}
Sector Headwinds/Tailwinds: ${m.sectorHeadwinds}
Regulatory Environment: ${m.regulatoryEnvironment}
Overall Assessment: ${m.macroAssessment}`;
    sections.push(macroSection);
  }

  // News section — 600 token budget (~2400 chars)
  if (state.newsItems && state.newsItems.length > 0) {
    const newsLines = state.newsItems
      .slice(0, 5)
      .map((n) => `- [${n.publishedDate || "Recent"}] ${n.title}: ${truncate(n.summary, 150)}`)
      .join("\n");
    sections.push(`## Recent News\n${newsLines}`);
  }

  // Competition section — 400 token budget (~1600 chars)
  if (state.competitors && state.competitors.length > 0) {
    const compLines = state.competitors
      .slice(0, 3)
      .map((c) => `- ${c.name}${c.ticker ? ` (${c.ticker})` : ""}: ${truncate(c.differentiationNote, 150)}`)
      .join("\n");
    sections.push(`## Competitive Landscape\n${compLines}`);
  }

  // Risk section — 600 token budget (~2400 chars)
  if (state.riskFactors && state.riskFactors.length > 0) {
    const riskLines = state.riskFactors
      .slice(0, 5)
      .map((r) => `- ${r.title}: ${truncate(r.description, 200)}`)
      .join("\n");
    sections.push(`## Key Risk Factors\n${riskLines}`);
  }

  const aggregatedContext = `# Investment Research: ${state.resolvedCompanyName} (${state.ticker}) — ${state.exchange}

${sections.join("\n\n")}

---
Research conducted on: ${new Date().toISOString().split("T")[0]}
Total sources: ${state.sources?.length ?? 0}`;

  return { aggregatedContext };
}
