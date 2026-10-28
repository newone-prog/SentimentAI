

export class SourceDiscoveryEngine {
  /**
   * Discovers and retrieves raw sources from various endpoints based on a ticker.
   * This is a stub for the full implementation that would query DuckDuckGo,
   * Google Programmable Search, AlphaVantage, or scrape Investor Relations pages.
   */
  public async discoverSources(ticker: string, customQueries?: string[]): Promise<RawSource[]> {
    console.log(`[SourceDiscoveryEngine] Discovering real-time sources for ${ticker} via DuckDuckGo...`);
    
    // Default fallback query if the LLM doesn't provide specific ones
    const queries = customQueries && customQueries.length > 0 
        ? customQueries 
        : [`${ticker} stock company news analysis fundamentals`];

    const sources: RawSource[] = [];

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const query of queries) {
        const path = `/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        
        let proxyUrl: string;
        let isJson = false;

        // Use the built-in Vite proxy locally. This is 100% reliable and doesn't hit 3rd party rate limits.
        if (import.meta.env.DEV) {
          proxyUrl = `/api/googlenews${path}`;
        } else {
          // Fallback to allorigins in production, but add a 1.5s delay to prevent Cloudflare 520/522 block
          proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://news.google.com${path}`)}`;
          isJson = true;
          await delay(1500); 
        }
        
        try {
          const response = await fetch(proxyUrl);
          if (!response.ok) {
            console.warn(`[SourceDiscoveryEngine] Warning: Proxy returned ${response.status} for query "${query}". Skipping.`);
            continue;
          }
          
          let xmlText = "";
          if (isJson) {
             const data = await response.json();
             if (!data || !data.contents) continue;
             xmlText = data.contents;
          } else {
             xmlText = await response.text();
          }

          // Parse the raw RSS XML natively
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const items = xmlDoc.querySelectorAll("item");
          
          if (items && items.length > 0) {
            Array.from(items).forEach((item: Element, index: number) => {
              if (index >= 7) return; // Limit to Top 7 results per query
              
              const title = item.querySelector("title")?.textContent || "No title";
              const url = item.querySelector("link")?.textContent || "";
              const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();

              // De-duplicate
              if (!sources.some(s => s.url === url || s.title === title)) {
                sources.push({
                  url: url,
                  title: title,
                  // Google News RSS description contains messy HTML, so we rely on the highly-descriptive title for context
                  content: `Headline: ${title}. Published: ${pubDate}`,
                  date: pubDate,
                  sourceType: "NEWS"
                });
              }
            });
          }
        } catch (error) {
          console.warn(`[SourceDiscoveryEngine] Non-critical error fetching search results for query "${query}":`, error);
        }
    }

    if (sources.length === 0) {
      // Fallback if all network requests fail
      sources.push({
        url: `https://finance.yahoo.com/quote/${ticker}`,
        title: `Fallback: ${ticker} Information`,
        content: `Could not reach search engine. Proxied network error. Analyzing based on internal API data only for ${ticker}.`,
        date: new Date().toISOString(),
        sourceType: "UNKNOWN"
      });
    } else {
      console.log(`[SourceDiscoveryEngine] Successfully scraped ${sources.length} unique sources from the internet across ${queries.length} queries.`);
    }

    return sources;
  }
}

export interface RawSource {
  url: string;
  title: string;
  content: string;
  date: string;
  sourceType: "TRANSCRIPT" | "FILING" | "NEWS" | "REPORT" | "FORUM" | "UNKNOWN";
}
