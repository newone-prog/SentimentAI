import { fetchIntradayStockData, fetchStockData } from '../api';
import { API_CONFIG, hasBackendProxy } from '../apiConfig';
import { CacheService } from './cache/CacheService';

export class TraderOrchestratorService {
  public static async executeAlgorithmicTradeAnalysis(
    ticker: string,
    companyName: string,
    onProgress: (step: string, details?: string) => void,
    optionsChain: any = null
  ) {
    const cache = new CacheService();
    const cacheKey = `trader-analysis-${ticker}`;
    const cached = await cache.get<any>(cacheKey);
    
    if (cached) {
      onProgress('Cache Hit', `Found recent algorithmic trader analysis for ${ticker}...`);
      return cached;
    }

    onProgress('Trader Setup', `Initializing high-frequency trading data for ${ticker}...`);

    // 1. Fetch Intraday and Daily Data
    onProgress('Data Extraction', `Fetching 15-minute intraday tick data for algorithmic processing...`);
    const intradayData = await fetchIntradayStockData(ticker, '15m', onProgress);
    
    onProgress('Data Extraction', `Fetching baseline structural price limits...`);
    const dailyData = await fetchStockData(ticker, companyName, onProgress);

    // 2. Delegate to Secure Backend
    onProgress('Secure Sandbox', `Delegating intraday math and LLM generation to secure backend orchestration...`);
    
    const backendUrl = hasBackendProxy ? '/api/trader-orchestrate' : `${API_CONFIG.FIREBASE_FUNCTIONS_URL}/trader-orchestrate`;

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          companyName,
          intradayData,
          dailyData,
          optionsChain
        })
      });

      if (!response.ok) {
        throw new Error(`Trader Backend Error: ${response.status}`);
      }

      const result = await response.json();
      await cache.set(cacheKey, result, 7200); // Cache for 2 hours
      
      onProgress('Trader Finalized', 'Algorithmic trading plan generated successfully.');

      return {
        success: true,
        data: {
          ...result.data,
          optionSignals: result.data.optionSignals || []
        },
        isTraderMode: true
      };

    } catch (e: any) {
      console.error("Trader Orchestration Error:", e);
      return {
        success: false,
        data: {
          verdict: "NEUTRAL",
          reasoning: "Secure backend failed to produce structured data.",
          confidence: 0,
          optionSignals: []
        },
        isTraderMode: true
      };
    }
  }
}
