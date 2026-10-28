import { SourceMetadata } from "./ResearchContracts";

// Define Firestore Timestamp locally if admin SDK is not yet imported to keep types clean
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
  isEqual(other: FirestoreTimestamp): boolean;
  valueOf(): string;
}

export interface ResearchReport {
  id: string; // Ticker + Timestamp
  ticker: string;
  executiveSummary: string;
  technicalAnalysis: string;
  fundamentalAndNewsAnalysis: string;
  behavioralAnalysis: string;
  investmentThesis: string;
  finalVerdict: "BULLISH" | "BEARISH" | "NEUTRAL" | "SIDEWAYS";
  confidenceScore: number;
  createdAt: FirestoreTimestamp | Date;
}

export interface ResearchContextDocument {
  id: string;
  ticker: string;
  marketData: any;
  fundamentals: any;
  technicals: any;
  news: Array<{ title: string; url: string; date: string; content: string }>;
  transcripts: Array<{ quarter: string; year: number; text: string }>;
  filings: Array<{ type: string; date: string; content: string }>;
  sources: SourceMetadata[];
  expiresAt: FirestoreTimestamp | Date;
}

export interface SourceCache {
  urlHash: string;
  content: string;
  extractedText: string;
  expiresAt: FirestoreTimestamp | Date;
}

export interface SourceMetadataDocument {
  urlHash: string;
  trustScore: number; // 0-100
  tier: "A" | "B" | "C";
  reliability: string;
}

export interface Collections {
  researchReports: ResearchReport;
  researchContexts: ResearchContextDocument;
  sourceCache: SourceCache;
  sourceMetadata: SourceMetadataDocument;
  devilsAdvocateReports: any; // Expand later
  narrativeReports: any; // Expand later
  omissionReports: any; // Expand later
  judgeReports: any; // Expand later
  agentReports: any; // Expand later
  researchHistory: any; // Expand later
}
