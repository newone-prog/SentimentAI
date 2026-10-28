export interface Evidence {
  sourceUrl: string;
  sourceTitle: string;
  sourceTier: "A" | "B" | "C";
  sourceConfidence: number;
  publicationDate: string;
  snippet: string;
  conclusionSupported: string;
}
