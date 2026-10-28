"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchPaperGenerator = void 0;
class ResearchPaperGenerator {
    /**
     * Compiles all reports into the final institutional research paper.
     */
    generate(ticker, judgeReport, agentReports, devilsAdvocate) {
        console.log(`[ResearchPaperGenerator] Generating final paper for ${ticker}`);
        return {
            id: `${ticker}-${Date.now()}`,
            ticker,
            executiveSummary: judgeReport.executiveSummary || `The final verdict for ${ticker} is ${judgeReport.finalVerdict} with a confidence of ${judgeReport.confidenceScore}%.`,
            technicalAnalysis: agentReports["TechnicalAgent"]?.intelligenceReport || "No technical analysis available.",
            fundamentalAndNewsAnalysis: (agentReports["FundamentalAgent"]?.intelligenceReport || "No fundamental analysis.") + "\n\n" + (agentReports["NewsAgent"]?.intelligenceReport || ""),
            behavioralAnalysis: agentReports["MarketAgent"]?.intelligenceReport || "No behavioral analysis available.",
            investmentThesis: judgeReport.investmentThesis || `Driven by ${judgeReport.keyDrivers.join(", ")}...`,
            finalVerdict: judgeReport.finalVerdict,
            confidenceScore: judgeReport.confidenceScore,
            createdAt: new Date()
        };
    }
}
exports.ResearchPaperGenerator = ResearchPaperGenerator;
//# sourceMappingURL=ResearchPaperGenerator.js.map