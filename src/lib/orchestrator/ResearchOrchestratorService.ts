import { SourceDiscoveryEngine } from "./discovery/SourceDiscoveryEngine";
import { SourceRankingEngine } from "./quality/SourceRankingEngine";
import { ResearchContextBuilder } from "./context/ResearchContextBuilder";
import { CacheService } from "./cache/CacheService";
import type { ResearchReport } from './types/FirestoreSchema';

export class ResearchOrchestratorService {
  private cache = new CacheService();
  private discovery = new SourceDiscoveryEngine();
  private ranker = new SourceRankingEngine();
  private contextBuilder = new ResearchContextBuilder();

  public async orchestrate(
    ticker: string, 
    forceRefresh = false, 
    priceData: any = null, 
    sentimentData: any = null,
    onProgress?: (step: string, details?: string) => void
  ): Promise<ResearchReport> {
    const cacheKey = `research-report-${ticker}`;

    if (!forceRefresh) {
      onProgress?.('Initializing', `Checking cache for existing ${ticker} research...`);
      const cachedReport = await this.cache.get<ResearchReport>(cacheKey);
      if (cachedReport) {
        onProgress?.('Cache Hit', 'Found recent report. Loading from memory...');
        return cachedReport;
      }
    }

    onProgress?.('Planning', 'Generating specific deep-dive search queries based on current market context...');
    console.log(`[ResearchOrchestratorService] Starting full pipeline for ${ticker}`);

    // 1. Planning Pass (Agentic Search Query Generation)
    const { OpenRouterClient } = await import("./utils/OpenRouterClient");
    
    const currentYear = new Date().getFullYear();
    const planningSystemPrompt = `You are a research assistant. The current year is ${currentYear}. The user wants to write a deep-dive investment report on ${ticker}. Generate up to 5 highly specific DuckDuckGo search queries to fetch real-time data about recent news, earnings calls, dividend announcements, or controversies for the year ${currentYear}. Output ONLY a valid JSON array of strings. Do not output anything else. Example: ["${ticker} latest earnings call transcript ${currentYear}", "${ticker} dividend history", "${ticker} recent controversies ${currentYear}"]`;
    
    const planningPrompt = `Generate the 5 search queries for ${ticker}.`;
    
    let customQueries: string[] = [];
    try {
      const planningResponse = await OpenRouterClient.generate(planningPrompt, planningSystemPrompt);
      customQueries = OpenRouterClient.parseJson(planningResponse);
      if (!Array.isArray(customQueries)) customQueries = [];
      onProgress?.('Web Scraping', `Executing ${customQueries.length || 1} distinct search queries on the open web...`);
    } catch (e) {
      onProgress?.('Web Scraping', 'Planning pass failed. Executing default fallback queries...');
    }

    // 2. Source Discovery & Quality (Scraping Phase)
    const rawSources = await this.discovery.discoverSources(ticker, customQueries);
    onProgress?.('Data Ingestion', `Discovered ${rawSources.length} raw sources. Filtering and ranking by institutional quality...`);
    
    const rankedSources = this.ranker.rankSources(rawSources);
    onProgress?.('Contextualizing', `Contextualizing ${rankedSources.length} high-quality sources with real-time price & technical data...`);

    // Provide the real data passed from frontend to ContextBuilder
    const marketData = priceData || { price: 150 };
    const fundamentals = sentimentData || { peRatio: 15 };
    const technicals = sentimentData?.communitySentiment || { rsi: 65 };

    // 2. Context Builder
    const context = this.contextBuilder.buildContext(ticker, rankedSources, marketData, fundamentals, technicals);

    // 3. Single-Call Monolithic Execution
    onProgress?.('LLM Analysis', 'Fusing data. Executing monolithic institutional LLM analysis. This may take a moment...');
    
    const guidelines = "Provide institutional-grade long-term value investing analysis. Focus on a 1-5 year horizon, intrinsic value, margin of safety, and structural growth. Ignore short-term noise and day-trading momentum.";
    
    const systemPrompt = `You are the Chief Investment Officer (CIO) of a major institutional value investing fund (think Berkshire Hathaway). You have been provided with comprehensive data including Market Action, Fundamentals, Technicals, and live internet search results (news, earnings, and SEC filings scraped from DuckDuckGo).
    Analyze the data and output ONLY a valid JSON object matching this schema:
    {
      "finalVerdict": "STRONG_BUY | ACCUMULATE | HOLD | REDUCE | AVOID",
      "confidenceScore": 0-100,
      "executiveSummary": "2-3 sentences: Key long-term verdict and why. State your verdict clearly.",
      "marketReport": "Analyze the broader market cycles, institutional accumulation/distribution patterns. Focus on multi-year time horizons.",
      "fundamentalReport": "Analyze revenue growth, profitability, debt-to-equity, PEG ratio. Focus on intrinsic value, economic moat, and margin of safety.",
      "technicalReport": "Analyze long-term moving averages (e.g., 200-day SMA), structural support/resistance. Contrast short-term noise with overarching long-term trend.",
      "newsReport": "Analyze structural shifts, regulatory risks, and events that alter the company's long-term economic moat.",
      "investmentThesis": "Should a long-term investor ACCUMULATE, HOLD, or REDUCE? Discuss intrinsic value margin of safety and multi-year growth runway. Do NOT provide short-term entry/exit levels."
    }
    Ensure all string values are properly wrapped in double quotes and newlines (\\n) are escaped.`;

    const prompt = `
      Ticker: ${ticker}
      Guidelines: ${guidelines}
      
      --- CONTEXT ---
      ${JSON.stringify(context, null, 2)}
      
      Generate the comprehensive JSON report.
    `;
    
    let parsed: any = {};
    try {
      const response = await OpenRouterClient.generate(prompt, systemPrompt);
      onProgress?.('Finalizing', 'Synthesizing output and structuring research paper...');
      parsed = OpenRouterClient.parseJson(response);
    } catch (error) {
      throw error;
    }

    // 4. Transform output into Final ResearchReport format
    const finalPaper: ResearchReport = {
      id: `${ticker}-${Date.now()}`,
      ticker,
      executiveSummary: parsed.executiveSummary || "Analysis generation failed.",
      technicalAnalysis: parsed.technicalReport || "No technical analysis available.",
      fundamentalAndNewsAnalysis: (parsed.fundamentalReport || "") + "\n\n" + (parsed.newsReport || ""),
      behavioralAnalysis: parsed.marketReport || "No market/behavioral analysis available.",
      investmentThesis: parsed.investmentThesis || "No thesis available.",
      finalVerdict: parsed.finalVerdict || "NEUTRAL",
      confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 50,
      createdAt: new Date()
    };

    // 5. Save and Cache
    await this.cache.set(cacheKey, finalPaper, 24 * 60 * 60); // 24 hours

    onProgress?.('Complete', 'Analysis generated successfully.');
    return finalPaper;
  }
}
