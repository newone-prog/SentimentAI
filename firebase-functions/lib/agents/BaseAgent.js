"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
const OpenRouterClient_1 = require("../utils/OpenRouterClient");
class BaseAgent {
    agentName;
    constructor(agentName) {
        this.agentName = agentName;
    }
    /**
     * Main entry point for the agent to analyze the context.
     */
    async analyze(input) {
        console.log(`[${this.agentName}] Starting analysis for ${input.context.ticker}`);
        const prompt = this.buildPrompt(input);
        const systemPrompt = `You are a professional equity research bot specialized in financial analysis. Output ONLY a valid JSON object matching this schema:
    {
      "intelligenceReport": "Markdown formatted detailed report",
      "evidenceSnippets": [
        {
          "sourceUrl": "string matching one of the sources provided",
          "sourceTitle": "string",
          "sourceTier": "A | B | C",
          "sourceConfidence": 0-100,
          "publicationDate": "string",
          "snippet": "exact quote or paraphrased fact from the source",
          "conclusionSupported": "what this proves"
        }
      ],
      "confidence": 0-100
    }
    No backticks, no markdown code blocks, no trailing comments.`;
        try {
            const response = await OpenRouterClient_1.OpenRouterClient.generate(prompt, systemPrompt);
            return this.parseResponse(response);
        }
        catch (error) {
            console.error(`[${this.agentName}] Error in analysis:`, error);
            return {
                intelligenceReport: `Error executing ${this.agentName}: ${error.message}`,
                evidenceSnippets: [],
                confidence: 0
            };
        }
    }
    parseResponse(rawResponse) {
        try {
            const parsed = OpenRouterClient_1.OpenRouterClient.parseJson(rawResponse);
            return {
                intelligenceReport: parsed.intelligenceReport || "No report generated.",
                evidenceSnippets: parsed.evidenceSnippets || [],
                confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50
            };
        }
        catch (err) {
            console.warn(`[${this.agentName}] Failed to parse JSON response. Falling back. Raw:`, rawResponse);
            return {
                intelligenceReport: rawResponse,
                evidenceSnippets: [],
                confidence: 50
            };
        }
    }
}
exports.BaseAgent = BaseAgent;
//# sourceMappingURL=BaseAgent.js.map