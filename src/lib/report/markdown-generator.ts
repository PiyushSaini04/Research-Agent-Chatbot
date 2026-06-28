import { ResearchState } from "@/agents/state";
import { formatDataQualitySection } from "@/lib/research/data-quality";

function fmt(val: number | null, prefix = "", suffix = ""): string {
  if (val === null || val === undefined) return "N/A";
  if (prefix === "$") {
    if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toFixed(2)}`;
  }
  if (suffix === "%") return `${(val * 100).toFixed(1)}%`;
  return `${val}${suffix}`;
}

export function generateMarkdownReport(state: ResearchState): string {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const c = state.companyData;
  const f = state.financialData;
  const d = state.decisionOutput;
  const recommendation = d?.recommendation ?? "UNKNOWN";
  const decision = d?.decision ?? "UNKNOWN";
  const evidenceScore = d?.evidenceScore ?? 0;
  const confidence = d?.confidence ?? 0;
  const investProbability = d?.investProbability ?? 0;
  const passProbability = d?.passProbability ?? 0;
  const rationale = d?.rationale ?? [];
  const keyDrivers = d?.keyDrivers ?? [];

  const isPositive =
    recommendation === "STRONG_INVEST" ||
    recommendation === "INVEST" ||
    recommendation === "HOLD" ||
    decision === "INVEST";
  const decisionEmoji = isPositive ? "🟢" : recommendation === "INSUFFICIENT_DATA" ? "⚪" : "🔴";
  const recommendationLabel = recommendation.replace(/_/g, " ");

  // ── 1. Title ─────────────────────────────────────────────────────────
  const title = `# ${state.resolvedCompanyName} (${state.ticker}) — Investment Research Report`;

  // ── 2. Executive Summary ──────────────────────────────────────────────
  const execSummary = `## Executive Summary

| Field | Value |
|-------|-------|
| **Recommendation** | ${decisionEmoji} **${recommendationLabel}** |
| **Evidence Score** | ${evidenceScore}/100 |
| **Confidence** | ${confidence}% |
| **Invest Probability** | ${investProbability}% |
| **Pass Probability** | ${passProbability}% |
| **Exchange** | ${state.exchange} |
| **Research Date** | ${now} |
| **Ticker** | ${state.ticker} |

> ${recommendation === "INSUFFICIENT_DATA"
    ? `Insufficient data (${state.dataQuality?.overallCompleteness ?? 0}% completeness) to produce a reliable recommendation for **${state.resolvedCompanyName}**.`
    : isPositive
      ? `Based on comprehensive analysis, **${state.resolvedCompanyName}** receives a **${recommendationLabel}** recommendation with ${evidenceScore}/100 evidence score and ${confidence}% confidence.`
      : `Based on comprehensive analysis, we recommend **${recommendationLabel}** on **${state.resolvedCompanyName}** with ${evidenceScore}/100 evidence score.`
  }`;

  const dataQualitySection = state.dataQuality
    ? formatDataQualitySection(state.dataQuality, d)
    : "## Data Quality\n\n*Data quality assessment unavailable.*";

  // ── 3. Company Overview ───────────────────────────────────────────────
  const companySection = c
    ? `## Company Overview

| Attribute | Details |
|-----------|---------|
| **Sector** | ${c.sector} |
| **Industry** | ${c.industry} |
| **Employees** | ${c.employees?.toLocaleString() ?? "N/A"} |
| **Headquarters** | ${c.headquarters || "N/A"} |
| **Website** | ${c.website ? `[${c.website}](${c.website})` : "N/A"} |

${c.description}`
    : `## Company Overview\n\n*Company data unavailable.*`;

  // ── 4. Financial Snapshot ─────────────────────────────────────────────
  const financialSection = f
    ? `## Financial Snapshot

| Metric | Value |
|--------|-------|
| **Market Cap** | ${fmt(f.marketCap, "$")} |
| **Revenue (TTM)** | ${fmt(f.revenue, "$")} |
| **Net Income** | ${fmt(f.netIncome, "$")} |
| **EPS** | ${f.eps !== null ? `$${f.eps.toFixed(2)}` : "N/A"} |
| **P/E Ratio** | ${f.peRatio !== null ? f.peRatio.toFixed(1) : "N/A"} |
| **Debt/Equity** | ${f.debtToEquity !== null ? f.debtToEquity.toFixed(2) : "N/A"} |
| **Operating Margin** | ${fmt(f.operatingMargin, "", "%")} |
| **Revenue Growth YoY** | ${fmt(f.revenueGrowthYoY, "", "%")} |
| **Current Price** | ${f.currentPrice !== null ? `$${f.currentPrice.toFixed(2)}` : "N/A"} |
| **52W High** | ${f.fiftyTwoWeekHigh !== null ? `$${f.fiftyTwoWeekHigh.toFixed(2)}` : "N/A"} |
| **52W Low** | ${f.fiftyTwoWeekLow !== null ? `$${f.fiftyTwoWeekLow.toFixed(2)}` : "N/A"} |`
    : `## Financial Snapshot\n\n*Financial data unavailable.*`;

  // ── 5. Recent News ────────────────────────────────────────────────────
  const newsLines =
    state.newsItems && state.newsItems.length > 0
      ? state.newsItems
          .slice(0, 5)
          .map(
            (n) =>
              `### ${n.title}\n- **Source:** ${n.source}\n- **Date:** ${n.publishedDate || "Recent"}\n- **Summary:** ${n.summary}\n- **Link:** [Read more](${n.url})`
          )
          .join("\n\n")
      : "*No recent news available.*";

  const newsSection = `## Recent News\n\n${newsLines}`;

  // ── 6. Competitive Landscape ──────────────────────────────────────────
  const competitionLines =
    state.competitors && state.competitors.length > 0
      ? state.competitors
          .slice(0, 3)
          .map(
            (comp) =>
              `- **${comp.name}**${comp.ticker ? ` (${comp.ticker})` : ""}: ${comp.differentiationNote}`
          )
          .join("\n")
      : "*No competitor data available.*";

  const competitionSection = `## Competitive Landscape\n\n${competitionLines}`;

  // ── 7. Key Risk Factors ───────────────────────────────────────────────
  const riskLines =
    state.riskFactors && state.riskFactors.length > 0
      ? state.riskFactors
          .slice(0, 5)
          .map((r) => `### ${r.title}\n${r.description}${r.source ? `\n\n*Source: [Filing](${r.source})*` : ""}`)
          .join("\n\n")
      : "*No risk factors identified.*";

  const riskSection = `## Key Risk Factors\n\n${riskLines}`;

  // ── 8. Investment Decision ────────────────────────────────────────────
  const rationaleList = rationale.map((r) => `- ${r}`).join("\n");
  const keyDriversList = keyDrivers.map((k) => `- ${k}`).join("\n");

  const decisionSection = `## Investment Decision

**${decisionEmoji} ${recommendationLabel}** — Evidence: ${evidenceScore}/100 | Confidence: ${confidence}% | Invest: ${investProbability}% | Pass: ${passProbability}%

### Rationale
${rationaleList || "- No rationale provided."}

### Key Drivers
${keyDriversList || "- No key drivers identified."}`;

  // ── 9. Sources ────────────────────────────────────────────────────────
  const sourcesList =
    state.sources && state.sources.length > 0
      ? state.sources
          .filter((s) => s.url)
          .map((s, i) => `${i + 1}. [${s.title}](${s.url}) *(${s.agent})*`)
          .join("\n")
      : "*No sources recorded.*";

  const sourcesSection = `## Sources\n\n${sourcesList}`;

  // ── Assemble ──────────────────────────────────────────────────────────
  return [
    title,
    execSummary,
    dataQualitySection,
    companySection,
    financialSection,
    newsSection,
    competitionSection,
    riskSection,
    decisionSection,
    sourcesSection,
  ].join("\n\n---\n\n");
}
