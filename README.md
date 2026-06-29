# AI Investment Research Agent

An AI-powered investment research web app that takes a company name or ticker, resolves the public company, gathers live market and business evidence, scores the data quality, and produces a final INVEST / PASS style report with probabilities, key drivers, rationale, and sources.

## Submission Links

- Live app: [https://research-agent-chatbot.vercel.app/](https://research-agent-chatbot.vercel.app/)
- GitHub repository: [https://github.com/PiyushSaini04/Research-Agent-Chatbot](https://github.com/PiyushSaini04/Research-Agent-Chatbot)
- Assignment ZIP: [ai-investment-agent-assignment.zip](https://github.com/PiyushSaini04/Research-Agent-Chatbot/raw/main/ai-investment-agent-assignment.zip)

## Overview

This project is a multi-agent research assistant for public companies. A user enters a company such as Apple, Tesla, or NVIDIA, and the backend runs a LangGraph workflow that collects company profile data, financial metrics, recent news, competitor context, risk factors, valuation signals, and macroeconomic context. The frontend streams the progress live and then renders a final recommendation and markdown report.

## How To Run It

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project
- API keys for the providers listed below

### Install

```bash
npm install
```

### Environment Variables

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

Core app variables:

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

### Supabase Setup

Run the SQL migrations in `supabase/migrations` in order, or apply the combined script:

```text
supabase/migrations/APPLY_IN_SUPABASE.sql
```

### Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Validate

```bash
npm test
npx tsc --noEmit
npm run build
```

## How It Works

The workflow is:

```text
Planner -> Parallel Research -> Aggregator -> Data Quality -> Decision -> Report
```

### Planner

Resolves the user input into a ticker and company metadata. It checks cached Supabase company records first and then falls back to search providers.

### Parallel Research

Runs seven research stages in parallel:

- Company profile: sector, industry, website, description, and headquarters details.
- Financial health: FMP-backed revenue, income, EPS, margins, cash flow, debt, and valuation ratios.
- Market news: recent company and market news.
- Competitors: peer companies and competitive positioning.
- Risk factors: business, market, and filing/news-based risks.
- Valuation: fair-value and multiple-based context.
- Market outlook: macroeconomic and sector conditions.

### Aggregator

Combines the raw research into a compact evidence summary for the decision stage.

### Data Quality

Scores how complete the evidence is before the recommendation is made. Missing high-impact financial metrics reduce confidence instead of silently producing an overconfident result.

### Decision

Produces the final recommendation, evidence score, confidence, invest/pass probabilities, key drivers, and rationale. If Gemini is unavailable or rate-limited, the app uses deterministic fallback logic instead of exposing raw provider errors to the user.

### Report

Generates the final markdown report. If narrative generation fails or times out, the app still produces a deterministic fallback report from the structured research data.

## How I Built It

- `Next.js` for the app shell, API routes, and deployment-friendly structure.
- `LangGraph` for the agent workflow and stage-based execution.
- `FMP` as the primary source of truth for financial statements and company profile fields.
- `Gemini` for reasoning, scoring, and report generation.
- `Tavily` for recent news and web research.
- `Supabase` for authentication, persistence, saved reports, company caching, and agent logs.
- `TypeScript` for type safety across the data pipeline.

## Key Decisions And Trade-Offs

- FMP is the single source of truth for financial statement fields to avoid conflicting provider merges.
- Parallel research reduces total wait time and keeps the UI responsive.
- Data quality is separated from the final decision so missing data lowers confidence instead of forcing a hard failure.
- Deterministic fallbacks keep the app usable during AI model quota or provider failures.
- Supabase persistence makes it possible to restore old sessions and review the timeline later.

Trade-offs:

- The app is a research assistant, not a licensed financial advisor.
- Live API quality affects the final report.
- The scoring model is practical and transparent, but not a full institutional valuation model.
- Some deeper features were intentionally left out to keep the assignment focused and easy to run.

## Example Runs

These examples describe the expected output style. Exact values can vary with live market data and provider availability.

### Apple Inc. (AAPL)

- Typical result: PASS or HOLD-style conservative recommendation
- Evidence: strong profitability, strong balance sheet, premium valuation, and slower growth pressure

### NVIDIA Corporation (NVDA)

- Typical result: INVEST or strong positive recommendation when evidence quality is high
- Evidence: AI demand, revenue growth, strong margins, and strong market positioning

### Tesla Inc. (TSLA)

- Typical result: PASS or cautious recommendation depending on valuation and current evidence
- Evidence: brand strength and growth potential, but valuation sensitivity, competition, margin pressure, and execution risk can reduce confidence

## What I Would Improve With More Time

- Add charts for revenue, margins, valuation, and data quality.
- Add stronger caching for repeated research runs.
- Add richer source citations in the final report.
- Add deeper historical valuation and backtesting.
- Add analyst estimate comparison and earnings transcript analysis.
- Add deployment notes for production Supabase and Vercel setup.

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

## Important Note

This project is for research and educational purposes only. It does not provide financial advice. Any investment decision should be checked with additional due diligence and professional judgment.
