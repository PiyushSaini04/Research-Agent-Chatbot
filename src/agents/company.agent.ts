import { ResearchState, CompanyData, Source } from "./state";
import { getQuoteSummary } from "@/lib/api-clients/yahoo-finance";
import { fetchFmpCompanyProfile, FmpCompanyProfile } from "@/lib/api-clients/fmp";

function firstMeaningful(...values: Array<string | null | undefined>): string {
  return values.find((value) => {
    const normalized = value?.trim().toLowerCase();
    return normalized && normalized !== "unknown" && normalized !== "n/a";
  })?.trim() || "";
}

async function fetchWikipediaDescription(companyName: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      companyName
    )}`;
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "InvestmentResearchAgent/1.0" },
    });

    if (!response.ok) return "";

    const data = await response.json();
    return (data.extract || "").slice(0, 500);
  } catch {
    return "";
  }
}

export async function companyAgent(
  state: ResearchState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any
): Promise<Partial<ResearchState>> {
  const emitProgress = config?.configurable?.emitProgress;
  if (emitProgress) emitProgress("CompanyAgent", "Fetching company profile...");
  console.log(`[CompanyAgent] Fetching profile for ${state.ticker}`);
  const sources: Source[] = [...(state.sources || [])];

  try {
    const [summary, fmpProfile] = await Promise.all([
      getQuoteSummary(state.ticker).catch((error) => {
        console.warn("[CompanyAgent] Yahoo profile error:", error);
        return null;
      }),
      fetchFmpCompanyProfile(state.ticker).catch((error) => {
        console.warn("[CompanyAgent] FMP profile error:", error);
        return {} as Partial<FmpCompanyProfile>;
      }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedSummary = summary as any;
    const profile = typedSummary?.assetProfile || {};

    const wikiDesc = await fetchWikipediaDescription(state.resolvedCompanyName);
    const website = firstMeaningful(fmpProfile.website, profile.website);
    const headquarters = [
      firstMeaningful(fmpProfile.city, profile.city),
      firstMeaningful(fmpProfile.state, profile.state),
      firstMeaningful(fmpProfile.country, profile.country),
    ].filter(Boolean).join(", ");

    const description =
      firstMeaningful(fmpProfile.description)?.slice(0, 500) ||
      firstMeaningful(profile.longBusinessSummary)?.slice(0, 500) ||
      wikiDesc ||
      "No description available.";

    const companyData: CompanyData = {
      name: state.resolvedCompanyName || fmpProfile.name || state.ticker,
      description,
      sector: firstMeaningful(fmpProfile.sector, profile.sector) || "Unknown",
      industry: firstMeaningful(fmpProfile.industry, profile.industry) || "Unknown",
      employees: fmpProfile.employees || profile.fullTimeEmployees || null,
      foundedYear: null,
      headquarters: headquarters || "Unknown",
      website,
      logoUrl: website ? `https://logo.clearbit.com/${website.replace(/https?:\/\//, "")}` : "",
    };

    if (profile.website) {
      sources.push({
        url: `https://finance.yahoo.com/quote/${state.ticker}`,
        title: `${state.resolvedCompanyName} Yahoo Finance Profile`,
        agent: "CompanyAgent",
      });
    }

    if (wikiDesc) {
      sources.push({
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(state.resolvedCompanyName)}`,
        title: `${state.resolvedCompanyName} Wikipedia`,
        agent: "CompanyAgent",
      });
    }

    if (fmpProfile.name || fmpProfile.sector || fmpProfile.industry) {
      sources.push({
        url: "https://financialmodelingprep.com/",
        title: `${state.resolvedCompanyName} Profile (FMP)`,
        agent: "CompanyAgent",
      });
    }

    console.log("[CompanyAgent] Normalized company data:", {
      name: companyData.name,
      sector: companyData.sector,
      industry: companyData.industry,
      employees: companyData.employees,
      website: companyData.website,
      headquarters: companyData.headquarters,
    });

    return { companyData, sources };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CompanyAgent] Error:", message);

    const fallback: CompanyData = {
      name: state.resolvedCompanyName || state.ticker,
      description: "Company profile unavailable.",
      sector: "Unknown",
      industry: "Unknown",
      employees: null,
      foundedYear: null,
      headquarters: "Unknown",
      website: "",
      logoUrl: "",
    };

    return { companyData: fallback, sources };
  }
}
