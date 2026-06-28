import {
  DecisionOutput,
  DataQualityAssessment,
  DataQualityMetric,
  DataQualitySection,
  ResearchState,
} from "@/agents/state";

const SECTION_WEIGHTS: Record<string, number> = {
  "Company Profile": 0.25,
  "Financial Metrics": 0.4,
  "News": 0.15,
  "Competition": 0.1,
  "Risk": 0.1,
};

const HIGH_IMPACT_METRICS = ["P/E", "Free Cash Flow", "Operating Cash Flow", "Intrinsic Value"];

function isPresentString(val: string | null | undefined): boolean {
  return typeof val === "string" && val.trim().length > 0 && val.trim().toLowerCase() !== "unknown";
}

function isPresentNumber(val: number | null | undefined): boolean {
  return val !== null && val !== undefined && Number.isFinite(val);
}

function buildSection(name: string, metrics: DataQualityMetric[]): DataQualitySection {
  const present = metrics.filter((m) => m.present).length;
  const total = metrics.length;
  const score = total > 0 ? Math.round((present / total) * 100) : 0;
  return { name, score, present, total, metrics };
}

export function calculateDataQuality(state: ResearchState): DataQualityAssessment {
  const companyMetrics: DataQualityMetric[] = [];
  if (state.companyData) {
    const c = state.companyData;
    companyMetrics.push(
      { label: "Sector", present: isPresentString(c.sector) },
      { label: "Industry", present: isPresentString(c.industry) },
      { label: "Employees", present: isPresentNumber(c.employees) },
      { label: "Description", present: isPresentString(c.description) },
      { label: "Website", present: isPresentString(c.website) },
    );
  } else {
    companyMetrics.push(
      { label: "Sector", present: false },
      { label: "Industry", present: false },
      { label: "Employees", present: false },
      { label: "Description", present: false },
      { label: "Website", present: false },
    );
  }

  const financialMetrics: DataQualityMetric[] = [];
  const f = state.financialData;
  const v = state.valuationData;
  financialMetrics.push(
    { label: "Market Cap", present: isPresentNumber(f?.marketCap) },
    { label: "Revenue", present: isPresentNumber(f?.revenue) },
    { label: "Net Income", present: isPresentNumber(f?.netIncome) },
    { label: "EPS", present: isPresentNumber(f?.eps) },
    { label: "Current Price", present: isPresentNumber(f?.currentPrice) },
    { label: "Revenue Growth", present: isPresentNumber(f?.revenueGrowthYoY) },
    { label: "Debt/Equity", present: isPresentNumber(f?.debtToEquity) },
    { label: "Operating Margin", present: isPresentNumber(f?.operatingMargin) },
    { label: "P/E", present: isPresentNumber(f?.peRatio) },
    { label: "Free Cash Flow", present: isPresentNumber(f?.freeCashFlow) },
    { label: "Operating Cash Flow", present: isPresentNumber(f?.operatingCashFlow) },
    { label: "ROIC", present: isPresentNumber(f?.roic) },
    { label: "Intrinsic Value", present: isPresentNumber(v?.intrinsicValue) },
  );

  const hasNews = state.newsItems && state.newsItems.length > 0;
  const hasNewsSummary = hasNews && state.newsItems.some((n) => isPresentString(n.summary));
  const newsMetrics: DataQualityMetric[] = [
    { label: "Latest News", present: hasNews },
    { label: "Sentiment", present: hasNewsSummary },
  ];

  const competitionMetrics: DataQualityMetric[] = [
    { label: "Competitors", present: state.competitors && state.competitors.length > 0 },
  ];

  const riskMetrics: DataQualityMetric[] = [
    { label: "Risk Factors", present: state.riskFactors && state.riskFactors.length > 0 },
  ];

  const sections = [
    buildSection("Company Profile", companyMetrics),
    buildSection("Financial Metrics", financialMetrics),
    buildSection("News", newsMetrics),
    buildSection("Competition", competitionMetrics),
    buildSection("Risk", riskMetrics),
  ];

  let overallCompleteness = 0;
  for (const section of sections) {
    const weight = SECTION_WEIGHTS[section.name] ?? 0;
    overallCompleteness += section.score * weight;
  }
  overallCompleteness = Math.round(overallCompleteness);

  const missingMetrics = sections
    .flatMap((s) => s.metrics.filter((m) => !m.present).map((m) => m.label));

  return {
    overallCompleteness,
    sections,
    missingMetrics,
  };
}

export function formatDataQualitySummary(assessment: DataQualityAssessment): string {
  const sectionLines = assessment.sections
    .map((s) => `${s.name}: ${s.score}% (${s.present}/${s.total})`)
    .join("\n");

  const missingLine =
    assessment.missingMetrics.length > 0
      ? assessment.missingMetrics.join(", ")
      : "None";

  return `## Data Quality Summary
Overall Completeness: ${assessment.overallCompleteness}%
${sectionLines}
Missing: ${missingLine}`;
}

export function formatDataQualityBar(completeness: number): string {
  const filled = Math.round(completeness / 10);
  const empty = 10 - filled;
  return `${"█".repeat(filled)}${"░".repeat(empty)} ${completeness}%`;
}

export function formatDataQualitySection(
  assessment: DataQualityAssessment,
  decisionOutput: DecisionOutput | null
): string {
  const available = assessment.sections
    .flatMap((s) => s.metrics.filter((m) => m.present).map((m) => m.label));

  const missing =
    assessment.missingMetrics.length > 0
      ? assessment.missingMetrics.map((m) => `• ${m}`).join("\n")
      : "• None";

  const recommendation = decisionOutput?.recommendation ?? "Pending";
  const evidenceScore = decisionOutput?.evidenceScore ?? 0;
  const confidence = decisionOutput?.confidence ?? assessment.overallCompleteness;

  return `# Data Quality

${formatDataQualityBar(assessment.overallCompleteness)}

**Available:** ${available.join(", ")}

**Missing:**
${missing}

**Confidence:** ${confidence}%${assessment.missingMetrics.length > 0 ? " — reduced due to missing metrics." : ""}
**Recommendation:** ${recommendation.replace(/_/g, " ")} (Evidence Score: ${evidenceScore}/100)`;
}

export function getHighImpactMissingMetrics(assessment: DataQualityAssessment): string[] {
  return assessment.missingMetrics.filter((m) => HIGH_IMPACT_METRICS.includes(m));
}
