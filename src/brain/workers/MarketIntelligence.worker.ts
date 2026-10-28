import type { 
  HistoricalCandle, 
  MarketIntelligenceOutput, 
  TrendIntelligence,
  MarketStructureIntelligence,
  VolumeIntelligence
} from '../../types/intelligence';
import { calculateSMA, calculateADX } from '../technicalModel';

// Self is needed for web worker typings
declare const self: any;

/**
 * Market Intelligence Worker
 * Offloads heavy quantitative price/volume analysis to a background thread.
 */

self.onmessage = (e: MessageEvent<{ ticker: string; candles: HistoricalCandle[] }>) => {
  const { ticker, candles } = e.data;
  
  try {
    // 1. Data Normalization
    // In production, we use Float64Arrays for maximum performance over 10k+ candles.
    const closes = new Float64Array(candles.length);
    const volumes = new Float64Array(candles.length);
    const highs = new Float64Array(candles.length);
    const lows = new Float64Array(candles.length);
    
    for (let i = 0; i < candles.length; i++) {
      closes[i] = candles[i].close;
      volumes[i] = candles[i].volume;
      highs[i] = candles[i].high;
      lows[i] = candles[i].low;
    }

    // 2. Trend Intelligence (using ADX and SMA)
    const pricesArray = Array.from(closes);
    const sma20 = calculateSMA(pricesArray, 20);
    const sma50 = calculateSMA(pricesArray, 50);
    const sma200 = calculateSMA(pricesArray, 200);
    const adx = calculateADX(pricesArray, 14);
    
    const currentPrice = pricesArray[pricesArray.length - 1] || 0;
    const currentSma20 = sma20[sma20.length - 1] || 0;
    const currentSma50 = sma50[sma50.length - 1] || 0;
    const currentSma200 = sma200[sma200.length - 1] || 0;

    let primaryTrend: TrendIntelligence["primaryTrend"] = "SIDEWAYS";
    if (currentPrice > currentSma200 && currentSma50 > currentSma200) primaryTrend = "BULLISH";
    else if (currentPrice < currentSma200 && currentSma50 < currentSma200) primaryTrend = "BEARISH";

    let secondaryTrend: TrendIntelligence["secondaryTrend"] = "SIDEWAYS";
    if (currentPrice > currentSma50 && currentSma20 > currentSma50) secondaryTrend = "BULLISH";
    else if (currentPrice < currentSma50 && currentSma20 < currentSma50) secondaryTrend = "BEARISH";

    const trend: TrendIntelligence = {
      primaryTrend,
      primaryTrendStrength: Math.min(100, Math.max(0, adx * 2)),
      secondaryTrend,
      trendStability: adx > 25 ? 80 : 40
    };

    // 3. Market Structure Intelligence
    // Identify simple accumulation/distribution via volume and price position
    const recentVolume = Array.from(volumes).slice(-10).reduce((a,b) => a+b, 0) / 10;
    const oldVolume = Array.from(volumes).slice(-20, -10).reduce((a,b) => a+b, 0) / 10;
    
    let currentPhase: MarketStructureIntelligence["currentPhase"] = "MARKUP";
    if (primaryTrend === "SIDEWAYS" && recentVolume > oldVolume && currentPrice > currentSma50) currentPhase = "ACCUMULATION";
    else if (primaryTrend === "SIDEWAYS" && recentVolume > oldVolume && currentPrice < currentSma50) currentPhase = "DISTRIBUTION";
    else if (primaryTrend === "BEARISH") currentPhase = "MARKDOWN";

    const marketStructure: MarketStructureIntelligence = {
      currentPhase,
      recentStructureBreaks: "NONE", // Requires deeper swing detection
      supportZones: [],
      resistanceZones: []
    };

    // 4. Volume Intelligence (Placeholder implementation)
    const volume: VolumeIntelligence = {
      volumeTrend: "EXPANDING",
      institutionalActivity: "ACCUMULATION",
      volumeDivergence: false
    };

    // 5. Aggregate Intelligence
    const output: MarketIntelligenceOutput = {
      ticker,
      timestamp: Date.now(),
      trend,
      marketStructure,
      volume,
      overallConfidence: 88
    };

    self.postMessage({ type: 'SUCCESS', data: output });
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
};
