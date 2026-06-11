import type { StockData, SentimentAnalysis } from '../lib/api';
import { calculateSentimentScore } from './sentimentModel';
import { calculateTechnicalScore, getAllTechnicalIndicators } from './technicalModel';
import { calculateMomentumScore, calculateVolumeScore } from './regressionModel';

export interface AIVerdictResult {
  verdict: "BULLISH" | "BEARISH" | "NEUTRAL";
  verdictClass: "verdict-bullish" | "verdict-bearish" | "verdict-neutral";
  finalScore: number;
  technicalIndicators?: {
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    upperBand: number;
    lowerBand: number;
    middleBand: number;
    trendDirection: string;
  };
}

const calculateCommunityScore = (communitySentiment: SentimentAnalysis['communitySentiment']): number => {
  if (!communitySentiment) return 0;

  const recommend = communitySentiment.recommendAll;

  let rsiScore: number;
  const rsi = communitySentiment.rsi;
  if (rsi >= 70) rsiScore = -0.6;          // Overbought → Bearish
  else if (rsi >= 60) rsiScore = 0.2;      // Recovering from overbought
  else if (rsi >= 50) rsiScore = 0.4;      // Neutral-bullish
  else if (rsi >= 40) rsiScore = 0.1;      // Neutral
  else if (rsi >= 30) rsiScore = 0.5;      // Deep value zone
  else rsiScore = 0.8;                     // Oversold (<30) → Contrarian bullish

  let stochScore: number;
  const stochAvg = (communitySentiment.stochK + communitySentiment.stochD) / 2;
  if (stochAvg >= 80) stochScore = -0.6;    // Overbought zone
  else if (stochAvg >= 60) stochScore = 0.3; // Healthy
  else if (stochAvg >= 40) stochScore = 0.1; // Neutral
  else if (stochAvg >= 20) stochScore = 0.5; // Deep value
  else stochScore = 0.7;                    // Severely oversold (<20) → Contrarian bullish

  let macdScore: number;
  const macdDiff = communitySentiment.macd - communitySentiment.macdSignal;
  if (communitySentiment.macd === 0 && communitySentiment.macdSignal === 0) {
    macdScore = 0;
  } else {
    macdScore = Math.max(-1, Math.min(1, macdDiff / (Math.abs(communitySentiment.macdSignal) || 1)));
  }

  const combined = (recommend * 0.40) + (rsiScore * 0.25) + (stochScore * 0.20) + (macdScore * 0.15);

  return Math.max(-1, Math.min(1, combined));
};

const calculateAnalystScore = (indianDetails: SentimentAnalysis['indianDetails']): number => {
  if (!indianDetails?.recommendation) return 0;
  const rec = indianDetails.recommendation.toLowerCase();
  if (rec.includes('strong buy') || rec.includes('buy')) return 0.8;
  if (rec.includes('outperform') || rec.includes('overweight')) return 0.5;
  if (rec.includes('hold') || rec.includes('neutral') || rec.includes('equal')) return 0;
  if (rec.includes('underperform') || rec.includes('underweight')) return -0.5;
  if (rec.includes('sell') || rec.includes('strong sell')) return -0.8;
  return 0;
};

export const analyzeStock = async (stockData: StockData | null, sentimentStats: SentimentAnalysis | null): Promise<AIVerdictResult> => {
  if (!stockData) {
    return { verdict: "NEUTRAL", verdictClass: "verdict-neutral", finalScore: 0 };
  }

  try {
    // Gather all indicators in parallel
    const [technicalScore, indicators] = await Promise.all([
      calculateTechnicalScore(stockData.history),
      Promise.resolve(getAllTechnicalIndicators(stockData.history))
    ]);

    const sentimentScore = calculateSentimentScore(sentimentStats?.analyzedData || []);

    const momentumScore = calculateMomentumScore(stockData);
    const volumeScore = calculateVolumeScore(stockData);
    const communityScore = calculateCommunityScore(sentimentStats?.communitySentiment);
    const analystScore = calculateAnalystScore(sentimentStats?.indianDetails);

    const macroScore = sentimentStats?.globalFearGreed
      ? (sentimentStats.globalFearGreed - 50) / 50
      : 0;

    const socialMultiplier = sentimentStats?.socialHeat
      ? 1 + (Math.abs(sentimentStats.socialHeat - 50) / 100)
      : 1;

    const finalScore = (
      (technicalScore * 0.25) +
      (sentimentScore * 0.10) +
      (momentumScore * 0.15) +
      (volumeScore * 0.10) +
      (communityScore * 0.25) +
      (analystScore * 0.05) +
      (macroScore * 0.10)
    ) * socialMultiplier;

    console.log(`[AI Engine v3.2] ${stockData.name} Analysis`);
    console.log(`  Technical (25%): ${technicalScore.toFixed(3)}`);
    console.log(`  Sentiment-News (10%): ${sentimentScore.toFixed(3)}`);
    console.log(`  Community-TV (25%): ${communityScore.toFixed(3)}`);
    console.log(`  Momentum (15%): ${momentumScore.toFixed(3)}`);
    console.log(`  Volume (10%): ${volumeScore.toFixed(3)}`);
    console.log(`  Analyst (5%): ${analystScore.toFixed(3)}`);
    console.log(`  Macro-F&G (10%): ${macroScore.toFixed(3)}`);
    console.log(`  Social Multiplier: ${socialMultiplier.toFixed(3)}x`);
    console.log(`  ==========> FINAL SCORE: ${finalScore.toFixed(3)}`);

    let verdict: "BULLISH" | "BEARISH" | "NEUTRAL";
    let vClass: "verdict-bullish" | "verdict-bearish" | "verdict-neutral";

    if (finalScore > 0.05) {
      verdict = "BULLISH"; vClass = "verdict-bullish";
    } else if (finalScore < -0.05) {
      verdict = "BEARISH"; vClass = "verdict-bearish";
    } else {
      verdict = "NEUTRAL"; vClass = "verdict-neutral";
    }

    return {
      verdict,
      verdictClass: vClass,
      finalScore,
      technicalIndicators: {
        sma20: indicators.sma20,
        sma50: indicators.sma50,
        ema12: indicators.ema12,
        ema26: indicators.ema26,
        rsi: indicators.rsi,
        macd: indicators.macd,
        macdSignal: indicators.macdSignal,
        macdHistogram: indicators.macdHistogram,
        upperBand: indicators.upperBand,
        lowerBand: indicators.lowerBand,
        middleBand: indicators.middleBand,
        trendDirection: indicators.trendDirection
      }
    };
  } catch (e) {
    console.error("AI Ensemble Execution failed, defaulting to Neutral.", e);
    return { verdict: "NEUTRAL", verdictClass: "verdict-neutral", finalScore: 0 };
  }
};
