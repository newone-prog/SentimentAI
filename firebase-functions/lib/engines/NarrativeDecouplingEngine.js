"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NarrativeDecouplingEngine = void 0;
const OpenRouterClient_1 = require("../utils/OpenRouterClient");
class NarrativeDecouplingEngine {
    async analyze(newsReport, fundamentalReport) {
        console.log(`[NarrativeDecouplingEngine] Decoupling narrative for asset`);
        const prompt = this.buildPrompt(newsReport, fundamentalReport);
        const systemPrompt = `You are a quantitative narrative analyst. Measure the divergence between news sentiment (hype) and financial numbers. Output ONLY a valid JSON object matching this schema:
    {
      "narrativeScore": 0-100,
      "realityScore": 0-100,
      "hypeScore": 0-100,
      "fearScore": 0-100,
      "meanReversionProbability": 0-100,
      "narrativeRiskLevel": "LOW | MEDIUM | HIGH | CRITICAL"
    }`;
        try {
            const response = await OpenRouterClient_1.OpenRouterClient.generate(prompt, systemPrompt);
            const parsed = OpenRouterClient_1.OpenRouterClient.parseJson(response);
            return {
                narrativeScore: typeof parsed.narrativeScore === "number" ? parsed.narrativeScore : 50,
                realityScore: typeof parsed.realityScore === "number" ? parsed.realityScore : 50,
                hypeScore: typeof parsed.hypeScore === "number" ? parsed.hypeScore : 0,
                fearScore: typeof parsed.fearScore === "number" ? parsed.fearScore : 0,
                meanReversionProbability: typeof parsed.meanReversionProbability === "number" ? parsed.meanReversionProbability : 50,
                narrativeRiskLevel: parsed.narrativeRiskLevel || "MEDIUM"
            };
        }
        catch (error) {
            console.error("[NarrativeDecouplingEngine] Error in narrative analysis:", error);
            return {
                narrativeScore: 50,
                realityScore: 50,
                hypeScore: 0,
                fearScore: 0,
                meanReversionProbability: 50,
                narrativeRiskLevel: "MEDIUM"
            };
        }
    }
    buildPrompt(news, fundamentals) {
        return `
      News Intelligence Report:
      ${news.intelligenceReport}
      
      Fundamental Intelligence Report:
      ${fundamentals.intelligenceReport}
      
      Evaluate if the news/media is overhyping the stock relative to actual earnings, cash flows, and growth rates, or if there is excessive fear that represents a value buying opportunity.
    `;
    }
}
exports.NarrativeDecouplingEngine = NarrativeDecouplingEngine;
//# sourceMappingURL=NarrativeDecouplingEngine.js.map