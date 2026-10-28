

export interface SourceMetadata {
  url: string;
  title: string;
  tier: "A" | "B" | "C";
  trustScore: number;
  publicationDate: string;
}

export interface ResearchContext {
  ticker: string;
  marketData: Record<string, any>;
  fundamentals: Record<string, any>;
  technicals: Record<string, any>;
  news: Array<{ title: string; url: string; date: string; content: string }>;
  transcripts: Array<{ quarter: string; year: number; text: string }>;
  filings: Array<{ type: string; date: string; content: string }>;
  sources: SourceMetadata[];
}
