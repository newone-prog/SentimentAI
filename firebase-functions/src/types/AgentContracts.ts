import { ResearchContext } from "./ResearchContracts";
import { Evidence } from "./EvidenceContracts";

export interface AgentInput {
  context: ResearchContext;
  guidelines: string;
}

export interface BaseAgentResponse {
  intelligenceReport: string;
  evidenceSnippets: Evidence[];
  confidence: number;
}
