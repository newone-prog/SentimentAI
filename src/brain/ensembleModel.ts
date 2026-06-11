import type { StockData, SentimentAnalysis, CommunitySentiment } from '../lib/api';
import { calculateSentimentScore, getNewsIntelligenceScore } from './sentimentModel';
import { getAllTechnicalIndicators } from './technicalModel';
import { calculateMomentumScore, calculateVolumeScore, calculateOBVScore, calculateADScore } from './regressionModel';

export interface AIVerdictResult {
  verdict: "BULLISH" | "BEARISH" | "NEUTRAL";
  verdictClass: "verdict-bullish" | "verdict-bearish" | "verdict-neutral";
  finalScore: number;
  confidence: number;
  technicalIndicators?: {
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
    rsi: number;
    stochRSI: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    upperBand: number;
    lowerBand: number;
    middleBand: number;
    bollingerPercentB: number;
    bollingerBandwidth: number;
    atr: number;
    adx: number;
    trendDirection: string;
  };
  breakdown?: {
    technical: number;
    sentiment: number;
    momentum: number;
    volume: number;
    community: number;
    analyst: number;
    macro: number;
    obv: number;
    ad: number;
  };
}

const getRegime = (adx: number, rsi: number): 'trending' | 'ranging' => {
  if (adx > 25) return 'trending';
  if (adx > 20 && (rsi > 60 || rsi < 40)) return 'trending';
  return 'ranging';
};

const calculateCommunityScore = (
  communitySentiment: CommunitySentiment | null | undefined,
  currentPrice: number
): number => {
  if (!communitySentiment) return 0;

  const recommend = communitySentiment.recommendAll;
  const rsi = communitySentiment.rsi;
  const adx = 25;
  const regime = getRegime(adx, rsi);

  let rsiScore: number;
  if (regime === 'trending') {
    if (rsi >= 70) rsiScore = 0.3;
    else if (rsi >= 60) rsiScore = 0.5;
    else if (rsi >= 50) rsiScore = 0.3;
    else if (rsi >= 40) rsiScore = -0.1;
    else if (rsi >= 30) rsiScore = -0.4;
    else rsiScore = -0.6;
  } else {
    if (rsi >= 70) rsiScore = -0.5;
    else if (rsi >= 60) rsiScore = -0.2;
    else if (rsi >= 50) rsiScore = 0.1;
    else if (rsi >= 40) rsiScore = 0.2;
    else if (rsi >= 30) rsiScore = 0.4;
    else rsiScore = 0.6;
  }

  let stochScore: number;
  const stochAvg = (communitySentiment.stochK + communitySentiment.stochD) / 2;
  if (stochAvg >= 80) stochScore = regime === 'trending' ? 0.2 : -0.6;
  else if (stochAvg >= 60) stochScore = 0.3;
  else if (stochAvg >= 40) stochScore = 0.1;
  else if (stochAvg >= 20) stochScore = regime === 'trending' ? -0.2 : 0.5;
  else stochScore = regime === 'trending' ? -0.4 : 0.7;

  let macdScore: number;
  const macdDiff = communitySentiment.macd - communitySentiment.macdSignal;
  if (communitySentiment.macd === 0 && communitySentiment.macdSignal === 0) {
    macdScore = 0;
  } else {
    macdScore = Math.max(-1, Math.min(1, macdDiff / (Math.abs(communitySentiment.macdSignal) || 1)));
  }

  let vwapScore = 0;
  if (communitySentiment.vwap > 0 && currentPrice > 0) {
    const vwapRatio = (currentPrice - communitySentiment.vwap) / communitySentiment.vwap;
    vwapScore = Math.max(-1, Math.min(1, vwapRatio * 10));
  }

  const combined = (recommend * 0.30) + (rsiScore * 0.20) + (stochScore * 0.15) + (macdScore * 0.15) + (vwapScore * 0.20);

  return Math.max(-1, Math.min(1, combined));
};

const calculateAnalystScore = (indianDetails: SentimentAnalysis['indianDetails']): number => {
  if (!indianDetails?.recommendation) return 0;
  const rec = indianDetails.recommendation.toLowerCase();
  if (rec.includes('strong buy')) return 0.9;
  if (rec.includes('buy')) return 0.7;
  if (rec.includes('outperform') || rec.includes('overweight')) return 0.5;
  if (rec.includes('hold') || rec.includes('neutral') || rec.includes('equal')) return 0;
  if (rec.includes('underperform') || rec.includes('underweight')) return -0.5;
  if (rec.includes('sell')) return -0.7;
  if (rec.includes('strong sell')) return -0.9;
  return 0;
};

export const analyzeStock = async (stockData: StockData | null, sentimentStats: SentimentAnalysis | null): Promise<AIVerdictResult> => {
  if (!stockData) {
    return { verdict: "NEUTRAL", verdictClass: "verdict-neutral", finalScore: 0, confidence: 0 };
  }

  try {
    const indicators = getAllTechnicalIndicators(stockData.history);
    const technicalScore = indicators.score;
    const sentimentScore = calculateSentimentScore(sentimentStats?.analyzedData || []);
    const newsIntel = getNewsIntelligenceScore(sentimentStats?.analyzedData || []);

    const momentumScore = calculateMomentumScore(stockData);
    const volumeScore = calculateVolumeScore(stockData);
    const obvScore = calculateOBVScore(stockData.history, stockData.volume);
    const adScore = calculateADScore(stockData.history, stockData.volume);

    const currentPrice = stockData.price;
    const communityScore = calculateCommunityScore(sentimentStats?.communitySentiment, currentPrice);
    const analystScore = calculateAnalystScore(sentimentStats?.indianDetails);

    const macroScore = sentimentStats?.globalFearGreed
      ? (sentimentStats.globalFearGreed - 50) / 50
      : 0;

    const regime = getRegime(indicators.adx, indicators.rsi);

    let bbModifier = 0;
    if (indicators.bollingerPercentB > 1) bbModifier = -0.15;
    else if (indicators.bollingerPercentB < 0) bbModifier = 0.15;
    else if (indicators.bollingerPercentB > 0.8) bbModifier = -0.08;
    else if (indicators.bollingerPercentB < 0.2) bbModifier = 0.08;

    let adxModifier = 0;
    if (indicators.adx > 40) adxModifier = technicalScore > 0 ? 0.1 : -0.1;
    else if (indicators.adx < 15) adxModifier = -0.05;

    const effectiveTechnical = Math.max(-1, Math.min(1, technicalScore + bbModifier + adxModifier));

    let socialMultiplier = 1;
    if (sentimentStats?.socialHeat !== undefined && sentimentStats.socialHeat !== 50) {
      const deviation = (sentimentStats.socialHeat - 50) / 50;
      const direction = Math.sign(deviation);
      const magnitude = Math.abs(deviation);
      socialMultiplier = 1 + (direction * magnitude * 0.3);
      socialMultiplier = Math.max(0.7, Math.min(1.3, socialMultiplier));
    }

    const weights = regime === 'trending'
      ? { technical: 0.25, sentiment: 0.15, momentum: 0.15, volume: 0.05, community: 0.15, analyst: 0.05, macro: 0.05, obv: 0.10, ad: 0.05 }
      : { technical: 0.15, sentiment: 0.20, momentum: 0.10, volume: 0.05, community: 0.15, analyst: 0.05, macro: 0.10, obv: 0.10, ad: 0.10 };

    const finalScore = (
      (effectiveTechnical * weights.technical) +
      (sentimentScore * weights.sentiment) +
      (momentumScore * weights.momentum) +
      (volumeScore * weights.volume) +
      (communityScore * weights.community) +
      (analystScore * weights.analyst) +
      (macroScore * weights.macro) +
      (obvScore * weights.obv) +
      (adScore * weights.ad)
    ) * socialMultiplier;

    const clampedScore = Math.max(-1, Math.min(1, finalScore));

    const positiveSignals = [effectiveTechnical, sentimentScore, momentumScore, communityScore, obvScore, adScore].filter(s => s > 0.1).length;
    const negativeSignals = [effectiveTechnical, sentimentScore, momentumScore, communityScore, obvScore, adScore].filter(s => s < -0.1).length;
    const totalActiveSignals = positiveSignals + negativeSignals;
    const signalAgreement = totalActiveSignals > 0 ? Math.abs(positiveSignals - negativeSignals) / totalActiveSignals : 0;
    const baseConfidence = Math.min(95, 30 + (signalAgreement * 50) + (Math.abs(clampedScore) * 20));

    let verdict: "BULLISH" | "BEARISH" | "NEUTRAL";
    let vClass: "verdict-bullish" | "verdict-bearish" | "verdict-neutral";

    if (clampedScore > 0.10) {
      verdict = "BULLISH"; vClass = "verdict-bullish";
    } else if (clampedScore < -0.10) {
      verdict = "BEARISH"; vClass = "verdict-bearish";
    } else {
      verdict = "NEUTRAL"; vClass = "verdict-neutral";
    }

    if (regime === 'trending' && Math.abs(clampedScore) > 0.05) {
      if (clampedScore > 0.05) { verdict = "BULLISH"; vClass = "verdict-bullish"; }
      else if (clampedScore < -0.05) { verdict = "BEARISH"; vClass = "verdict-bearish"; }
    }

    console.log(`[AI Engine v4.0] ${stockData.name} Analysis (${regime} regime)`);
    console.log(`  Technical (${(weights.technical * 100).toFixed(0)}%): ${effectiveTechnical.toFixed(3)} (raw: ${technicalScore.toFixed(3)}, BB mod: ${bbModifier.toFixed(3)}, ADX mod: ${adxModifier.toFixed(3)})`);
    console.log(`  Sentiment-News (${(weights.sentiment * 100).toFixed(0)}%): ${sentimentScore.toFixed(3)} (bullish:${newsIntel.bullishCount} bearish:${newsIntel.bearishCount} conf:${newsIntel.avgConfidence.toFixed(2)})`);
    console.log(`  Community-TV (${(weights.community * 100).toFixed(0)}%): ${communityScore.toFixed(3)}`);
    console.log(`  Momentum (${(weights.momentum * 100).toFixed(0)}%): ${momentumScore.toFixed(3)}`);
    console.log(`  Volume (${(weights.volume * 100).toFixed(0)}%): ${volumeScore.toFixed(3)}`);
    console.log(`  OBV (${(weights.obv * 100).toFixed(0)}%): ${obvScore.toFixed(3)}`);
    console.log(`  A/D (${(weights.ad * 100).toFixed(0)}%): ${adScore.toFixed(3)}`);
    console.log(`  Analyst (${(weights.analyst * 100).toFixed(0)}%): ${analystScore.toFixed(3)}`);
    console.log(`  Macro-F&G (${(weights.macro * 100).toFixed(0)}%): ${macroScore.toFixed(3)}`);
    console.log(`  Social Multiplier: ${socialMultiplier.toFixed(3)}x (directional)`);
    console.log(`  RSI: ${indicators.rsi} | StochRSI: ${indicators.stochRSI} | ADX: ${indicators.adx} | BB%: ${indicators.bollingerPercentB}`);
    console.log(`  ==========> FINAL: ${clampedScore.toFixed(3)} → ${verdict} (confidence: ${Math.round(baseConfidence)}%)`);

    return {
      verdict,
      verdictClass: vClass,
      finalScore: clampedScore,
      confidence: Math.round(baseConfidence),
      technicalIndicators: {
        sma20: indicators.sma20,
        sma50: indicators.sma50,
        ema12: indicators.ema12,
        ema26: indicators.ema26,
        rsi: indicators.rsi,
        stochRSI: indicators.stochRSI,
        macd: indicators.macd,
        macdSignal: indicators.macdSignal,
        macdHistogram: indicators.macdHistogram,
        upperBand: indicators.upperBand,
        lowerBand: indicators.lowerBand,
        middleBand: indicators.middleBand,
        bollingerPercentB: indicators.bollingerPercentB,
        bollingerBandwidth: indicators.bollingerBandwidth,
        atr: indicators.atr,
        adx: indicators.adx,
        trendDirection: indicators.trendDirection
      },
      breakdown: {
        technical: effectiveTechnical,
        sentiment: sentimentScore,
        momentum: momentumScore,
        volume: volumeScore,
        community: communityScore,
        analyst: analystScore,
        macro: macroScore,
        obv: obvScore,
        ad: adScore
      }
    };
  } catch (e) {
    console.error("AI Ensemble Execution failed, defaulting to Neutral.", e);
    return { verdict: "NEUTRAL", verdictClass: "verdict-neutral", finalScore: 0, confidence: 0 };
  }
};
