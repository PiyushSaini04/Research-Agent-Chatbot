# AI Investment Research Agent

An AI-powered investment research web app that turns a company name or ticker into a structured investment research report. The app resolves the company, gathers live market and business evidence, scores data quality, builds an investment thesis, and produces a final INVEST / PASS style recommendation with evidence score, confidence, key drivers, sources, and a markdown report.

Assignment ZIP:

https://github.com/PiyushSaini04/Research-Agent-Chatbot/raw/main/ai-investment-agent-assignment.zip

## Overview

The project is built as a multi-agent research assistant for public companies. A user enters a company such as Apple, Tesla, or NVIDIA. The backend runs a LangGraph workflow that collects company profile data, financial metrics, recent news, competitors, risk factors, valuation context, and macroeconomic context. The frontend streams each stage in real time and then renders the final decision and report.

Main capabilities:

- Resolve company names to the correct public ticker.
- Run seven research agents in parallel for faster analysis.
- Use FMP as the primary financial statement and company profile source.
- Use Gemini for synthesis, scoring, and report writing, with deterministic fallback behavior when model calls fail.
- Score data quality before making a recommendation.
- Persist sessions, execution logs, recommendations, reports, probabilities, sources, and restored state in Supabase.
- Provide a clean final report that can be copied, downloaded, or printed.

## How To Run It

### 1. Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project
- API keys for the providers listed below

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment variables

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GOOGLE_GEMINI_API_KEY=your_google_gemini_key
FMP_API_KEY=your_financial_modeling_prep_key
TAVILY_API_KEY=your_tavily_key

FINNHUB_API_KEY=your_finnhub_key
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=apidojo-yahoo-finance-v1.p.rapidapi.com

RATE_LIMIT_REQUESTS_PER_HOUR=10
```

Required for the core app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `FMP_API_KEY`
- `TAVILY_API_KEY`

Optional or secondary providers:

- `FINNHUB_API_KEY`
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`
- `RATE_LIMIT_REQUESTS_PER_HOUR`

### 4. Set up Supabase

Run the SQL migrations in `supabase/migrations` in order, or apply the combined script:

```text
supabase/migrations/APPLY_IN_SUPABASE.sql
```

The database stores:

- user sessions
- resolved companies
- agent execution logs
- saved reports
- final recommendation fields
- evidence score, confidence, probabilities, sources, and data quality

### 5. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 6. Run checks

```bash
npm test
npx tsc --noEmit
npm run build
```

## How It Works

The system uses this workflow:

```text
Planner
  -> Parallel Research
  -> Aggregator
  -> Data Quality
  -> Decision
  -> Report
```

### Planner

The planner resolves the user input into a company ticker, company name, exchange, country, and currency. It checks cached Supabase company records first, then uses external search providers when needed.

### Parallel Research

After the company is resolved, seven research stages run in parallel:

- Company profile: sector, industry, website, description, employees, headquarters, and basic company metadata.
- Financial health: FMP-backed revenue, income, EPS, margins, cash flow, debt, valuation ratios, market cap, and price data.
- Market news: recent company and market news from Tavily.
- Competitors: peer companies and competitive positioning.
- Risk factors: business, market, execution, and filing/news-based risks.
- Valuation: valuation multiples and fair-value context.
- Market outlook: macroeconomic and sector-level conditions.

The UI shows these stages as professional user-facing labels and marks each stage complete when its data is finished.

### Aggregator

The aggregator combines the raw research outputs into a compact context block. This gives the decision and report stages a single clean evidence package instead of scattered agent outputs.

### Data Quality

The data quality agent checks how complete the evidence is before the final decision. It scores company data, financial data, news, competition, and risk coverage. Missing high-impact financial metrics reduce confidence instead of silently producing an overconfident answer.

### Decision

The decision stage produces:

- recommendation tier
- INVEST or PASS decision
- evidence score
- confidence score
- invest probability
- pass probability
- key drivers
- rationale
- fallback warning when the AI model is unavailable

If Gemini quota or availability fails, the app uses deterministic fallback scoring instead of showing raw provider errors to the user.

### Report

The report stage generates a markdown investment research report. If AI narrative generation fails or times out, the app still creates a deterministic fallback report from the structured research data.

## API And Provider Roles

- FMP: primary source for financial statements, company profile, key metrics, quote data, and ratios.
- Gemini: company resolution assistance, evidence scoring, qualitative synthesis, valuation/risk/macroeconomic reasoning, and report narrative generation.
- Tavily: recent news and web research.
- Supabase: authentication, persistence, saved reports, session restore, companies cache, and execution logs.
- Finnhub and Yahoo/RapidAPI: secondary lookup or non-core provider support where still present in the codebase. Core financial statement values are intentionally FMP-backed.

## Key Decisions And Trade-Offs

- LangGraph was chosen because the research flow is stateful and benefits from explicit stages.
- Parallel research agents were used so the UI can stream progress and the backend can reduce total wait time.
- FMP is used as the single source of truth for financial statement fields to avoid conflicting provider merges.
- Data quality is separated from the final recommendation so missing data lowers confidence without automatically forcing a hard PASS.
- Gemini is used for narrative and synthesis, but deterministic fallbacks keep the app usable during quota or rate-limit failures.
- Supabase is used for persistence so users can restore old reports and review the agent timeline later.

Trade-offs:

- The app is a research assistant, not a licensed financial advisor.
- Live API quality affects the final report.
- The scoring model is transparent and practical, but not a full institutional valuation model.
- Some deeper features were intentionally left out to keep the assignment focused and runnable.

## Example Runs

These examples describe the expected output style. Exact values may change with market data, provider availability, and model responses.

### Apple Inc. (AAPL)

- Typical result: PASS or HOLD-style conservative recommendation
- Evidence: strong profitability, strong balance sheet, large market cap, but premium valuation and slower growth pressure the upside case
- Output includes: company profile, FMP financials, recent news, valuation discussion, data quality score, probabilities, and markdown report

### NVIDIA Corporation (NVDA)

- Typical result: INVEST or strong positive recommendation when evidence quality is high
- Evidence: AI demand, revenue growth, strong margins, and strong market positioning
- Main risks: valuation expectations, cyclicality, competition, and execution risk

### Tesla Inc. (TSLA)

- Typical result: PASS or cautious recommendation depending on valuation and current evidence
- Evidence: strong brand and growth potential, but valuation sensitivity, competition, margin pressure, and execution risk can reduce confidence

## Project Structure

```text
src/app                  Next.js pages and API routes
src/agents               LangGraph workflow and research agents
src/components           UI components for search, timeline, decision, reports, and history
src/hooks                Client research streaming hook
src/lib/api-clients      FMP, Gemini, Tavily, Finnhub, Yahoo, and SEC helpers
src/lib/research         Data quality and evidence scoring logic
src/lib/report           Markdown fallback report generation
src/lib/supabase         Supabase client/server helpers
src/types                Shared TypeScript types
supabase/migrations      Database schema and migration SQL
tests                    Unit and integration-style tests
```

## What I Would Improve With More Time

- Add charts for revenue, margins, valuation, and data quality.
- Add stronger caching for repeated research runs.
- Add OpenRouter or another model router to reduce single-provider AI quota issues.
- Add deeper historical valuation and backtesting.
- Add analyst estimate comparison and earnings transcript analysis.
- Add source-level citations directly beside each report claim.
- Add deployment documentation for Vercel and Supabase production setup.

## Important Note

This project is for research and educational purposes. It does not provide financial advice. Any investment decision should be checked against professional judgment and additional due diligence.
