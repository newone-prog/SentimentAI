"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.researchEndpoint = void 0;
// Mocking Firebase Functions entrypoints
const ResearchOrchestratorService_1 = require("../orchestrator/ResearchOrchestratorService");
const orchestrator = new ResearchOrchestratorService_1.ResearchOrchestratorService();
/**
 * Example export for Firebase Functions:
 * export const research = functions.https.onRequest(async (req, res) => { ... })
 */
const researchEndpoint = async (req, res) => {
    const { ticker, forceRefresh, priceData, sentimentData } = req.body;
    if (!ticker) {
        return res.status(400).send("Ticker is required");
    }
    try {
        const report = await orchestrator.orchestrate(ticker, forceRefresh, priceData, sentimentData);
        res.status(200).json(report);
    }
    catch (error) {
        console.error("Research failed:", error);
        res.status(500).send("Internal Server Error");
    }
};
exports.researchEndpoint = researchEndpoint;
//# sourceMappingURL=research.js.map