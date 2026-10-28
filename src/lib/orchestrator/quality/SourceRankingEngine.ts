import type { RawSource } from '../discovery/SourceDiscoveryEngine';
import type { SourceMetadata } from '../types/ResearchContracts';

export class SourceRankingEngine {
  /**
   * Ranks sources based on their origin, type, and reliability.
   */
  public rankSources(rawSources: RawSource[]): Array<{ raw: RawSource; meta: SourceMetadata }> {
    return rawSources.map((source) => {
      let tier: "A" | "B" | "C" = "C";
      let trustScore = 20;

      // Basic heuristic for ranking
      if (source.sourceType === "TRANSCRIPT" || source.sourceType === "FILING" || source.sourceType === "REPORT") {
        tier = "A";
        trustScore = 100;
      } else if (source.sourceType === "NEWS") {
        tier = "B";
        trustScore = 80;
      } else {
        tier = "C";
        trustScore = 20;
      }

      return {
        raw: source,
        meta: {
          url: source.url,
          title: source.title,
          tier,
          trustScore,
          publicationDate: source.date
        }
      };
    });
  }
}
