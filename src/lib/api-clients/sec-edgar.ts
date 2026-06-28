const SEC_EDGAR_BASE = "https://efts.sec.gov/LATEST/search-index";
const USER_AGENT = "InvestmentAgent contact@yourapp.com";

export interface SECFiling {
  url: string;
  title: string;
  content: string;
}

export async function searchSECFilings(
  ticker: string,
  query: string
): Promise<SECFiling[]> {
  try {
    const params = new URLSearchParams({
      q: `"${ticker}" ${query}`,
      dateRange: "custom",
      startdt: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      enddt: new Date().toISOString().split("T")[0],
      forms: "10-K",
      hits: "hits.hits._source.period_of_report,hits.hits._source.display_names,hits.hits._source.file_date,hits.hits._source.form_type,hits.hits._id",
    });

    const url = `${SEC_EDGAR_BASE}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`SEC EDGAR search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const hits = data?.hits?.hits || [];

    return hits.slice(0, 3).map(
      (hit: {
        _id: string;
        _source: {
          display_names?: string[];
          form_type?: string;
          period_of_report?: string;
        };
      }) => {
        const source = hit._source;
        const entityName = source?.display_names?.[0] || ticker;
        const formType = source?.form_type || "10-K";
        const period = source?.period_of_report || "";
        const filingUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-K&dateb=&owner=include&count=10`;

        return {
          url: filingUrl,
          title: `${entityName} — ${formType} (${period})`,
          content: `SEC ${formType} filing for ${entityName}. Period: ${period}. Filing ID: ${hit._id}`,
        };
      }
    );
  } catch (error) {
    console.error("SEC EDGAR search error:", error);
    return [];
  }
}
