import { ResearchState } from "./state";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateMarkdownReport } from "@/lib/report/markdown-generator";
import { formatDataQualitySection } from "@/lib/research/data-quality";

const REPORT_TIMEOUT_MS = 45_000;

function isQuotaOrRateLimitError(message: string): boolean {
  return /429|too many requests|quota|rate.?limit/i.test(message);
}

function fallbackReport(state: ResearchState, message: string): string {
  const note = isQuotaOrRateLimitError(message)
    ? "AI narrative generation was temporarily unavailable because the model quota was reached. The report below was generated from the collected research data."
    : "AI narrative generation was temporarily unavailable. The report below was generated from the collected research data.";

  return `> ${note}\n\n${generateMarkdownReport(state)}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`Report generation timed out after ${timeoutMs / 1000}s`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout!);
  }
}

export async function reportAgent(
  state: ResearchState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any
): Promise<Partial<ResearchState>> {
  const emitProgress = config?.configurable?.emitProgress;
  if (emitProgress) emitProgress("ReportAgent", "Synthesizing institutional equity research report...");
  console.log("[ReportAgent] Generating markdown report via Gemini");

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.2 },
    });

    const dataQualityBlock = state.dataQuality
      ? formatDataQualitySection(state.dataQuality, state.decisionOutput)
      : "";

    const prompt = `You are an institutional equity research analyst.
Write a professional, comprehensive investment research report for ${state.resolvedCompanyName} (${state.ticker}).

Use the following data:
${state.aggregatedContext}

Recommendation: ${state.decisionOutput?.recommendation?.replace(/_/g, " ") ?? "Pending"}
Evidence Score: ${state.decisionOutput?.evidenceScore ?? 0}/100
Confidence: ${state.decisionOutput?.confidence ?? 0}%
Invest Probability: ${state.decisionOutput?.investProbability ?? 0}% | Pass Probability: ${state.decisionOutput?.passProbability ?? 0}%
Rationale: ${state.decisionOutput?.rationale.join("; ") ?? ""}
Key Drivers: ${state.decisionOutput?.keyDrivers.join("; ") ?? ""}

${dataQualityBlock}

CRITICAL REQUIREMENTS:
- Output ONLY valid markdown. Do not include markdown code block backticks at the very beginning/end of your response (e.g., no \`\`\`markdown).
- Do NOT output placeholders. Base the analysis ONLY on the data provided.
- Force industry-specific, non-generic conclusions. Contextualize the metrics within the specific industry/sector of the company.
- Avoid generic boilerplate text and repetitive wording. Make each report uniquely tailored to the company's specific situation, risks, and catalysts.
- Include data tables and metric comparisons where appropriate.
- Mention specific numbers from the financials.
- Explain how missing data affects confidence but does not automatically invalidate a positive recommendation.

REQUIRED SECTIONS (exactly these headers):
# Executive Summary
# Data Quality
# Company Overview
# Business Model
# Financial Analysis (Subsections: Revenue, Profitability, Margins, Cash Flow, Balance Sheet, Liquidity, Debt, Valuation)
# Stock Performance
# Competitive Landscape
# SWOT Analysis
# Recent News
# Risk Assessment
# Investment Thesis
# Bull Case
# Bear Case
# Catalysts
# Final Recommendation

Write the report now:`;

    const response = await withTimeout(model.generateContent(prompt), REPORT_TIMEOUT_MS);
    let reportMarkdown = response.response.text();

    if (reportMarkdown.startsWith("```markdown")) {
      reportMarkdown = reportMarkdown.replace(/^```markdown\n?/, "").replace(/\n?```$/, "");
    }

    console.log(`[ReportAgent] Report generated: ${reportMarkdown.length} chars`);
    return { reportMarkdown };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ReportAgent] Error:", message);
    return { reportMarkdown: fallbackReport(state, message) };
  }
}
