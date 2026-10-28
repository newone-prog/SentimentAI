// Core Intelligence Types for SentimentAI

// ---------------------------------------------------------
// 1. Core Data Structures
// ---------------------------------------------------------
export interface HistoricalCandle {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose?: number;
  volume: number;
  deliverableVolume?: number;
}

// ---------------------------------------------------------
// 2. Evidence Engine Types
// ---------------------------------------------------------
export interface Evidence {
  evidenceId: string;
  sourceType: "ANNUAL_REPORT" | "QUARTERLY_REPORT" | "EARNINGS_CALL" | "NEWS" | "SEBI_FILING" | "MACRO_DATA" | "WEB_SEARCH";
  sourceName: string;
  sourceUrl?: string;
  date: string;
  pageOrTimestamp?: string;
  extractedText: string;
  confidence: number;
}

export interface Fact {
  statement: string;
  evidenceId: string;
}

// ---------------------------------------------------------
// 3. Timeline Engine Types
// ---------------------------------------------------------
export interface TimelineEvent {
  date: string;
  timestamp: number;
  eventType: "IPO" | "SPLIT" | "BONUS" | "ACQUISITION" | "EARNINGS" | "LEADERSHIP_CHANGE" | "CAPEX" | "MACRO_SHOCK" | "OTHER";
  title: string;
  description: string;
  impactScale: number; // -10 to +10
}

// ---------------------------------------------------------
// 4. Knowledge Graph Types
// ---------------------------------------------------------
export interface KnowledgeNode {
  id: string;
  label: string;
  type: "COMPANY" | "SECTOR" | "PRODUCT" | "MACRO_FACTOR" | "COMPETITOR" | "POLICY";
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relationship: string; // e.g., "OPERATES_IN", "COMPETES_WITH", "IMPACTED_BY"
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// ---------------------------------------------------------
// Engine 1: Market Intelligence (Web Worker Output)
// ---------------------------------------------------------
export interface TrendIntelligence {
  primaryTrend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  primaryTrendStrength: number; // 0-100
  secondaryTrend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  trendStability: number;
}

export interface MarketStructureIntelligence {
  currentPhase: "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN";
  recentStructureBreaks: "BOS_BULLISH" | "BOS_BEARISH" | "CHOCH_BULLISH" | "CHOCH_BEARISH" | "NONE";
  supportZones: number[];
  resistanceZones: number[];
}

export interface VolumeIntelligence {
  volumeTrend: "EXPANDING" | "CONTRACTING" | "FLAT";
  institutionalActivity: "ACCUMULATION" | "DISTRIBUTION" | "NEUTRAL";
  volumeDivergence: boolean;
}

export interface MarketIntelligenceOutput {
  ticker: string;
  timestamp: number;
  trend: TrendIntelligence;
  marketStructure: MarketStructureIntelligence;
  volume: VolumeIntelligence;
  // Patterns, Candles, Volatility, Liquidity etc to be added
  overallConfidence: number;
}

// ---------------------------------------------------------
// Engine 4: Historical Intelligence (Web Worker Output)
// ---------------------------------------------------------
export interface HistoricalSimilarity {
  periodStart: string;
  periodEnd: string;
  similarityScore: number; // 0-100
  subsequentReturn1M: number;
  subsequentReturn3M: number;
  context: string; // e.g., "High inflation regime, post-earnings dip"
}

export interface MarketMemory {
  typicalCorrectionPercent: number;
  averageRecoveryDays: number;
  strongestMonths: string[];
  weakestMonths: string[];
  typicalPostEarningsMovePercent: number;
  highVixReaction: string;
}

export interface HistoricalIntelligenceOutput {
  ticker: string;
  marketMemory: MarketMemory;
  similarPeriods: HistoricalSimilarity[];
}

// ---------------------------------------------------------
// Overall Structured Intelligence Context
// ---------------------------------------------------------
export interface StructuredIntelligenceContext {
  ticker: string;
  companyName: string;
  timestamp: number;
  marketIntelligence: MarketIntelligenceOutput;
  historicalIntelligence: HistoricalIntelligenceOutput;
  // businessIntelligence: BusinessIntelligenceOutput;
  // informationIntelligence: InformationIntelligenceOutput;
  timeline: TimelineEvent[];
  knowledgeGraph: KnowledgeGraph;
  evidenceLedger: Evidence[];
}
