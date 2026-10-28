"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchJudgeEngine = void 0;
const OpenRouterClient_1 = require("../utils/OpenRouterClient");
class ResearchJudgeEngine {
    async judge(agentReports, devilsAdvocate, narrative, omission) {
        console.log(`[ResearchJudgeEngine] Judging the evidence and compiling verdict...`);
        const prompt = this.buildPrompt(agentReports, devilsAdvocate, narrative, omission);
        const systemPrompt = `You are the Chief Investment Officer (CIO) of a major investment fund. Review all these inputs, resolve conflicts (e.g. bullish technicals vs bearish macro), and deliver a final verdict. Output ONLY a valid JSON object matching this schema:
    {
      "finalVerdict": "BULLISH | BEARISH | NEUTRAL",
      "confidenceScore": 0-100,
      "executiveSummary": "2-3 sentences: Key verdict and why. State your verdict clearly.",
      "investmentThesis": "Should a trader BUY, SELL, or HOLD? Give specific entry/exit price levels from the data. State risk factors.",
      "conflictsResolved": ["resolved conflict 1", "resolved conflict 2"],
      "keyDrivers": ["driver 1", "driver 2"],
      "riskMitigations": ["mitigation 1", "mitigation 2"]
    }`;
        try {
            const response = await OpenRouterClient_1.OpenRouterClient.generate(prompt, systemPrompt);
            const parsed = OpenRouterClient_1.OpenRouterClient.parseJson(response);
            return {
                finalVerdict: parsed.finalVerdict || "NEUTRAL",
                confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 50,
                executiveSummary: parsed.executiveSummary || "",
                investmentThesis: parsed.investmentThesis || "",
                conflictsResolved: parsed.conflictsResolved || [],
                keyDrivers: parsed.keyDrivers || [],
                riskMitigations: parsed.riskMitigations || []
            };
        }
        catch (error) {
            console.error("[ResearchJudgeEngine] Error in judging:", error);
            return {
                finalVerdict: "NEUTRAL",
                confidenceScore: 50,
                executiveSummary: "Error evaluating report.",
                investmentThesis: "",
                conflictsResolved: [`Failed to resolve: ${error.message}`],
                keyDrivers: [],
                riskMitigations: []
            };
        }
    }
    buildPrompt(agentReports, devilsAdvocate, narrative, omission) {
        return `
      Domain Agent Reports:
      ${JSON.stringify(agentReports)}
      
      Devil's Advocate Bear Thesis:
      ${JSON.stringify(devilsAdvocate)}
      
      Narrative Decoupling (Hype check):
      ${JSON.stringify(narrative)}
      
      Forensic Omission analysis:
      ${JSON.stringify(omission)}
      
      Summarize the data, resolve contradictions, and weigh statements based on evidence. Make a final decisive call (BULLISH, BEARISH, or NEUTRAL).
    `;
    }
}
exports.ResearchJudgeEngine = ResearchJudgeEngine;
//# sourceMappingURL=ResearchJudgeEngine.js.map