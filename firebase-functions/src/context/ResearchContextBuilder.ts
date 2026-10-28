import { ResearchContext, SourceMetadata } from "../types/ResearchContracts";
import { RawSource } from "../discovery/SourceDiscoveryEngine";

export class ResearchContextBuilder {
  /**
   * Compiles the raw and ranked sources into a single unified ResearchContext.
   */
  public buildContext(
    ticker: string, 
    rankedSources: Array<{ raw: RawSource; meta: SourceMetadata }>,
    marketData: any,
    fundamentals: any,
    technicals: any
  ): ResearchContext {
    
    const context: ResearchContext = {
      ticker,
      marketData,
      fundamentals,
      technicals,
      news: [],
      transcripts: [],
      filings: [],
      sources: []
    };

    for (const item of rankedSources) {
      // Add source metadata
      context.sources.push(item.meta);

      // Route content to appropriate bucket
      if (item.raw.sourceType === "NEWS") {
        context.news.push({
          title: item.raw.title,
          url: item.raw.url,
          date: item.raw.date,
          content: item.raw.content
        });
      } else if (item.raw.sourceType === "TRANSCRIPT") {
        context.transcripts.push({
          quarter: "Unknown", // Would be extracted dynamically
          year: new Date(item.raw.date).getFullYear(),
          text: item.raw.content
        });
      } else if (item.raw.sourceType === "FILING") {
        context.filings.push({
          type: "Filing",
          date: item.raw.date,
          content: item.raw.content
        });
      }
    }

    return context;
  }
}
