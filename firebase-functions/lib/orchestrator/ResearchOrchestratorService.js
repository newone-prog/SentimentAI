"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchOrchestratorService = void 0;
const SourceDiscoveryEngine_1 = require("../discovery/SourceDiscoveryEngine");
const SourceRankingEngine_1 = require("../quality/SourceRankingEngine");
const ResearchContextBuilder_1 = require("../context/ResearchContextBuilder");
const MarketAgent_1 = require("../agents/MarketAgent");
const FundamentalAgent_1 = require("../agents/FundamentalAgent");
const TechnicalAgent_1 = require("../agents/TechnicalAgent");
const NewsAgent_1 = require("../agents/NewsAgent");
const MacroAgent_1 = require("../agents/MacroAgent");
const DevilsAdvocateEngine_1 = require("../engines/DevilsAdvocateEngine");
const NarrativeDecouplingEngine_1 = require("../engines/NarrativeDecouplingEngine");
const OmissionAnalysisEngine_1 = require("../engines/OmissionAnalysisEngine");
const ResearchJudgeEngine_1 = require("../engines/ResearchJudgeEngine");
const ResearchPaperGenerator_1 = require("../paper/ResearchPaperGenerator");
const CacheService_1 = require("../cache/CacheService");
class ResearchOrchestratorService {
    cache = new CacheService_1.CacheService();
    discovery = new SourceDiscoveryEngine_1.SourceDiscoveryEngine();
    ranker = new SourceRankingEngine_1.SourceRankingEngine();
    contextBuilder = new ResearchContextBuilder_1.ResearchContextBuilder();
    marketAgent = new MarketAgent_1.MarketAgent();
    fundamentalAgent = new FundamentalAgent_1.FundamentalAgent();
    technicalAgent = new TechnicalAgent_1.TechnicalAgent();
    newsAgent = new NewsAgent_1.NewsAgent();
    macroAgent = new MacroAgent_1.MacroAgent();
    devilsAdvocate = new DevilsAdvocateEngine_1.DevilsAdvocateEngine();
    narrative = new NarrativeDecouplingEngine_1.NarrativeDecouplingEngine();
    omission = new OmissionAnalysisEngine_1.OmissionAnalysisEngine();
    judge = new ResearchJudgeEngine_1.ResearchJudgeEngine();
    paperGenerator = new ResearchPaperGenerator_1.ResearchPaperGenerator();
    async orchestrate(ticker, forceRefresh = false, priceData = null, sentimentData = null) {
        const cacheKey = `research-report-${ticker}`;
        if (!forceRefresh) {
            const cachedReport = await this.cache.get(cacheKey);
            if (cachedReport)
                return cachedReport;
        }
        console.log(`[ResearchOrchestratorService] Starting full pipeline for ${ticker}`);
        // 1. Source Discovery & Quality
        const rawSources = await this.discovery.discoverSources(ticker);
        const rankedSources = this.ranker.rankSources(rawSources);
        // Provide the real data passed from frontend to ContextBuilder
        const marketData = priceData || { price: 150 };
        const fundamentals = sentimentData || { peRatio: 15 };
        const technicals = sentimentData?.communitySentiment || { rsi: 65 };
        // 2. Context Builder
        const context = this.contextBuilder.buildContext(ticker, rankedSources, marketData, fundamentals, technicals);
        // 3. Parallel Agent Execution
        const agentInput = { context, guidelines: "Provide institutional-grade analysis." };
        const [marketReport, fundamentalReport, technicalReport, newsReport, macroReport, omissionReport] = await Promise.all([
            this.marketAgent.analyze(agentInput),
            this.fundamentalAgent.analyze(agentInput),
            this.technicalAgent.analyze(agentInput),
            this.newsAgent.analyze(agentInput),
            this.macroAgent.analyze(agentInput),
            this.omission.analyze(context)
        ]);
        const agentReports = {
            MarketAgent: marketReport,
            FundamentalAgent: fundamentalReport,
            TechnicalAgent: technicalReport,
            NewsAgent: newsReport,
            MacroAgent: macroReport
        };
        // 4. Secondary Engines
        const [devilsAdvocateReport, narrativeReport] = await Promise.all([
            this.devilsAdvocate.analyze(context, agentReports),
            this.narrative.analyze(newsReport, fundamentalReport)
        ]);
        // 5. Judge
        const judgeReport = await this.judge.judge(agentReports, devilsAdvocateReport, narrativeReport, omissionReport);
        // 6. Paper Generation
        const finalPaper = this.paperGenerator.generate(ticker, judgeReport, agentReports, devilsAdvocateReport);
        // 7. Save and Cache
        await this.cache.set(cacheKey, finalPaper, 24 * 60 * 60); // 24 hours
        console.log(`[ResearchOrchestratorService] Completed pipeline for ${ticker}`);
        return finalPaper;
    }
}
exports.ResearchOrchestratorService = ResearchOrchestratorService;
//# sourceMappingURL=ResearchOrchestratorService.js.map