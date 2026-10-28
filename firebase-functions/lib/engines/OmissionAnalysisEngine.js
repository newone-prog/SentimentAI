"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OmissionAnalysisEngine = void 0;
const OpenRouterClient_1 = require("../utils/OpenRouterClient");
class OmissionAnalysisEngine {
    async analyze(context) {
        console.log(`[OmissionAnalysisEngine] Analyzing omissions for ${context.ticker}`);
        const prompt = this.buildPrompt(context);
        const systemPrompt = `You are a forensic financial analyst. Compare current earnings call transcripts or news with previous quarters/years. Detect topics, products, segment guidance, or challenges that management has quietly stopped discussing. Output ONLY a valid JSON object matching this schema:
    {
      "omissionAlerts": ["alert 1", "alert 2"],
      "confidenceScore": 0-100,
      "potentialHiddenRisks": ["risk 1", "risk 2"]
    }`;
        try {
            // If there are no transcripts to compare, return empty/graceful degrade
            if (!context.transcripts || context.transcripts.length === 0) {
                return {
                    omissionAlerts: ["No historical transcripts available for comparisons."],
                    confidenceScore: 100,
                    potentialHiddenRisks: []
                };
            }
            const response = await OpenRouterClient_1.OpenRouterClient.generate(prompt, systemPrompt);
            const parsed = OpenRouterClient_1.OpenRouterClient.parseJson(response);
            return {
                omissionAlerts: parsed.omissionAlerts || [],
                confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 50,
                potentialHiddenRisks: parsed.potentialHiddenRisks || []
            };
        }
        catch (error) {
            console.error("[OmissionAnalysisEngine] Error in omission analysis:", error);
            return {
                omissionAlerts: [],
                confidenceScore: 0,
                potentialHiddenRisks: [`Failed to analyze transcript omissions: ${error.message}`]
            };
        }
    }
    buildPrompt(context) {
        return `
      Ticker: ${context.ticker}
      Transcripts: ${JSON.stringify(context.transcripts)}
      
      Compare older transcripts with the most recent one. Look for disappearing business lines, pivots, or metrics that were previously highlighted but are now ignored.
    `;
    }
}
exports.OmissionAnalysisEngine = OmissionAnalysisEngine;
//# sourceMappingURL=OmissionAnalysisEngine.js.map