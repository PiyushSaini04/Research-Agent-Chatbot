import { plannerAgent } from "../src/agents/planner.agent";
import { ResearchState } from "../src/agents/state";
import { loadEnvConfig } from "@next/env";
import path from "path";

// Load Next.js environment variables
loadEnvConfig(process.cwd());

async function runTests() {
  const testCases = [
    "Apple",
    "Infosys",
    "Tata Steel",
    "Reliance Industries",
    "Microsoft",
    "Alphabet",
    "HDFC Bank",
    "RandomObscureCompanyThatDoesNotExist12345"
  ];

  console.log("=========================================");
  console.log("Starting PlannerAgent Dynamic Search Tests");
  console.log("=========================================\n");

  for (const tc of testCases) {
    console.log(`\n▶ Testing Query: "${tc}"`);
    const mockState: ResearchState = {
      // Input
      companyQuery: tc,
      sessionId: "test-session",
      userId: "test-user",

      // Planner output
      ticker: "",
      resolvedCompanyName: "",
      exchange: "",
      country: "",
      currency: "",
      plannerError: null,

      // Parallel agent outputs
      companyData: null,
      financialData: null,
      newsItems: [],
      competitors: [],
      riskFactors: [],
      valuationData: null,
      macroeconomicData: null,

      // Aggregated
      aggregatedContext: "",

      // Data quality
      dataQuality: null,

      // Decision
      decisionOutput: null,

      // Report
      reportMarkdown: "",

      // Sources
      sources: [],

      // Error
      pipelineError: null,
    };

    const startTime = Date.now();
    const result = await plannerAgent(mockState, {
      configurable: {
        emitProgress: (agent: string, msg: string) => {
          console.log(`  [Progress] ${msg}`);
        }
      }
    });
    const duration = Date.now() - startTime;

    if (result.plannerError) {
      console.log(`  ❌ Failed: ${result.plannerError}`);
    } else {
      console.log(`  ✅ Success in ${duration}ms`);
      console.log(`     Ticker:   ${result.ticker}`);
      console.log(`     Name:     ${result.resolvedCompanyName}`);
      console.log(`     Exchange: ${result.exchange}`);
      console.log(`     Country:  ${result.country}`);
      console.log(`     Currency: ${result.currency}`);
    }
  }
}

runTests().catch(console.error);
