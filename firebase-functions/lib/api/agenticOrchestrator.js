"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agenticOrchestratorEndpoint = void 0;
const AgenticLLM_1 = require("../services/AgenticLLM");
const MarketAgent_1 = require("../agents/MarketAgent");
const FundamentalAgent_1 = require("../agents/FundamentalAgent");
const TechnicalAgent_1 = require("../agents/TechnicalAgent");
const InformationAgent_1 = require("../agents/InformationAgent");
const HistoricalAgent_1 = require("../agents/HistoricalAgent");
const DevilsAdvocateEngine_1 = require("../engines/DevilsAdvocateEngine");
const agenticOrchestratorEndpoint = async (req, res) => {
    const { ticker, companyName, priceData, sentimentData, userQuery, mutualFundData } = req.body;
    if (!ticker) {
        return res.status(400).json({ error: "Ticker is required" });
    }
    try {
        // 1. Run Pure Algorithmic Agents (Instant Math, No LLMs)
        const marketAgent = new MarketAgent_1.MarketAgent();
        const fundamentalAgent = new FundamentalAgent_1.FundamentalAgent();
        const technicalAgent = new TechnicalAgent_1.TechnicalAgent();
        const infoAgent = new InformationAgent_1.InformationAgent();
        const historicalAgent = new HistoricalAgent_1.HistoricalAgent();
        const daEngine = new DevilsAdvocateEngine_1.DevilsAdvocateEngine();
        const marketJSON = marketAgent.analyze(priceData);
        const fundamentalJSON = fundamentalAgent.analyze(priceData, sentimentData?.fundamentals);
        const technicalJSON = technicalAgent.analyze(marketJSON, priceData);
        const infoJSON = infoAgent.analyze(sentimentData);
        const historicalJSON = historicalAgent.analyze(priceData);
        const allAgentsContext = {
            MarketAgent: marketJSON,
            FundamentalAgent: fundamentalJSON,
            TechnicalAgent: technicalJSON,
            InformationAgent: infoJSON,
            HistoricalAgent: historicalJSON
        };
        if (mutualFundData) {
            allAgentsContext["MutualFundData"] = mutualFundData;
        }
        const algoBearCase = daEngine.analyze(allAgentsContext);
        allAgentsContext["DevilsAdvocateAlgorithmicBase"] = algoBearCase;
        // 2. Build the Single LLM Prompt using the pre-computed algorithmic intelligence
        const systemPrompt = `You are a senior equity research analyst and risk director at a top-tier Indian brokerage firm. Analyze ${companyName || ticker}.
    
You are provided with highly accurate, pre-computed algorithmic intelligence from 6 dedicated quant agents (Market, Fundamental, Technical, Information, Historical, and Devil's Advocate).
DO NOT IGNORE THIS MATH. You must use their exact metrics (like P/E, trend strength, structural patterns, and algorithmic bear cases) to write your paper.
CRITICAL: Your final 'verdict' MUST perfectly match the sentiment expressed in your research paper and investment thesis.

LONG-TERM INVESTING RULES (STRICTLY ENFORCED):
1. NO SHORT SELLING: You are advising long-term equity investors. Do NOT recommend "short entries" or "cover prices".
2. BEARISH/SIDEWAYS: If the verdict is BEARISH or SIDEWAYS, advise to "AVOID", "HOLD", or provide a "WAIT FOR ACCUMULATION" zone at lower structural support levels.
3. BULLISH: If BULLISH, provide a multi-year "Accumulation Buy Zone", a "Long-Term Target Price" (1-3 years out), and a wide "Structural Stop Loss" for downside protection.
4. SIGNALS: Your Investment Thesis MUST explicitly state these levels (Buy Zone, Target, Stop Loss) based on the algorithmic data.

Return ONLY a valid JSON object matching this exact schema:
{
  "reasoning": "7-8 line executive summary synthesizing the algorithmic data",
  "verdict": "BULLISH|BEARISH|NEUTRAL|SIDEWAYS",
  "confidence": 0-100,
  "emotionalContext": "One-line market emotion",
  "disclaimer": "AI-generated analysis based on algorithmic agent data.",
  "researchPaper": "Comprehensive, deep research report formatted with markdown headers (### Header). It MUST contain EXACTLY these sections in order: 1. Company Overview, 2. Recent Developments, 3. Fundamental Analysis (cite FundamentalAgent metrics), 4. Technical Analysis (cite MarketAgent and TechnicalAgent metrics), 5. Behavioral & Historical Analysis (cite InformationAgent and HistoricalAgent), 6. Investment Thesis (CRITICAL: MUST include explicit Long-Term signals: Accumulation Buy Zone, Long-Term Target Price, Structural Stop Loss, Risk:Reward Ratio. Follow the LONG-TERM INVESTING RULES), 7. Conclusions. EACH section MUST contain EXTREMELY LONG PARAGRAPHS (250-300 words). Focus on long-term wealth creation (3-5+ years)."
}`;
        const prompt = `
    Ticker: ${ticker}
    User Query: "${userQuery || 'Analyze this stock'}"
    
    [PRE-COMPUTED ALGORITHMIC AGENT INTELLIGENCE - USE THIS FOR YOUR ANALYSIS]
    ${JSON.stringify(allAgentsContext, null, 2)}
    
    Fear & Greed: ${sentimentData?.globalFearGreed}
    
    CRITICAL INSTRUCTION: You MUST trigger a SEARCH to find any missing qualitative context regarding "${companyName || ticker}" before generating the final report. Combine the search results with the algorithmic intelligence provided above. 
    ${mutualFundData && mutualFundData.fundManagers ? `Since this is a Mutual Fund, you MUST aggressively trigger web searches to find real-time data about the Fund Managers (${mutualFundData.fundManagers.map((f) => f.name).join(', ')}). Find their historical track records, past performance in other funds, success rates, and assign an overall trust score. Include this extensively in the Fundamental Analysis section.` : ''}
    `;
        console.log(`[Orchestrator] Launching Research Paper LLM loop for ${ticker}...`);
        const result = await AgenticLLM_1.AgenticLLM.runWithTools(prompt, systemPrompt, 10);
        let research = {};
        try {
            const match = result.match(/\{[\s\S]*\}/);
            research = JSON.parse(match ? match[0] : result);
        }
        catch (e) {
            console.warn("Failed to parse Research JSON:", e);
            throw new Error("LLM failed to return valid JSON for Research Paper");
        }
        // 3. Run the Devil's Advocate LLM as a SECOND call using the generated Research Paper
        console.log(`[Orchestrator] Launching Devil's Advocate LLM for ${ticker}...`);
        const daSystemPrompt = `You are the Chief Risk Officer and Devil's Advocate at a top-tier brokerage. Your job is to relentlessly critique and find holes in investment theses. 
Analyze the provided Research Paper and Algorithmic Bear Case for ${companyName || ticker}.

Return ONLY a valid JSON object matching this exact schema:
{
  "overallBearCaseStrength": 0-100,
  "bearishSummary": "Institutional-grade summary of the bear case (200-300 words). Relentlessly attack the weak points of the company and the risks involved.",
  "userPositionAnalysis": "Address the user's query specifically and outline the worst-case scenario for their potential trade.",
  "honestAdvice": "A 2-3 sentence brutal, honest verdict on the risks.",
  "hiddenRisks": ["string array of 3-5 hidden or systemic risks"],
  "thesisBreakers": ["string array of 3-5 events that would destroy the bull thesis"],
  "worstCaseScenario": "The absolute 'black swan' scenario and what happens to the stock price.",
  "probabilityBullThesisFails": 0-100
}`;
        const daPrompt = `
    Ticker: ${ticker}
    User Query: "${userQuery || 'Analyze this stock'}"
    
    [ALGORITHMIC BEAR CASE (DEVIL's ADVOCATE BASE)]
    ${JSON.stringify(algoBearCase, null, 2)}
    
    [GENERATED RESEARCH PAPER (THE TARGET TO CRITIQUE)]
    ${research.researchPaper}
    
    CRITICAL INSTRUCTION: Synthesize the algorithmic bear case with the generated research paper. Write a highly detailed, extremely critical Devil's Advocate report.
    `;
        // No tool loops needed for DA, just direct generation based on context
        const daResult = await AgenticLLM_1.AgenticLLM.runWithTools(daPrompt, daSystemPrompt, 0);
        let devilsAdvocate = {};
        try {
            const daMatch = daResult.match(/\{[\s\S]*\}/);
            devilsAdvocate = JSON.parse(daMatch ? daMatch[0] : daResult);
        }
        catch (e) {
            console.warn("Failed to parse DA JSON:", e);
            devilsAdvocate = {
                overallBearCaseStrength: 50,
                bearishSummary: "Failed to generate detailed bear case.",
                userPositionAnalysis: "N/A",
                honestAdvice: "N/A",
                hiddenRisks: [],
                thesisBreakers: [],
                worstCaseScenario: "Unknown",
                probabilityBullThesisFails: 50
            };
        }
        return res.json({
            research,
            devilsAdvocate
        });
    }
    catch (error) {
        console.error("[agenticOrchestrator] Error:", error);
        return res.status(500).json({ error: "Failed to generate algorithmic research report" });
    }
};
exports.agenticOrchestratorEndpoint = agenticOrchestratorEndpoint;
//# sourceMappingURL=agenticOrchestrator.js.map