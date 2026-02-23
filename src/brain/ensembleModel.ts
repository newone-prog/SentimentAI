import type { StockData, SentimentAnalysis } from '../lib/api';
import { calculateSentimentScore } from './sentimentModel';
import { predictTechnicalScore } from './technicalModel';
import { calculateMomentumScore, calculateVolumeScore } from './regressionModel';

export interface AIVerdictResult {
    verdict: "BULLISH" | "BEARISH" | "NEUTRAL";
    verdictClass: "verdict-bullish" | "verdict-bearish" | "verdict-neutral";
}

/**
 * Orchestrates all 4 prediction branches: Technical (TFJS), Sentiment (Vader/NPM), Momentum, and Volume.
 * Runs non-blocking math and scales against a weighted algorithm.
 */
export const analyzeStock = async (stockData: StockData | null, sentimentStats: SentimentAnalysis | null): Promise<AIVerdictResult> => {
    // Default fallback cleanly
    if (!stockData) {
        return { verdict: "NEUTRAL", verdictClass: "verdict-neutral" };
    }

    try {
        // Run predictions sequentially/parallel where possible without freezing the UI thread
        const [technicalScore, sentimentScore] = await Promise.all([
            predictTechnicalScore(stockData.history),
            calculateSentimentScore(sentimentStats?.analyzedData || [])
        ]);

        const momentumScore = calculateMomentumScore(stockData);
        const volumeScore = calculateVolumeScore(stockData);

        // Core AI Ensemble Weighting Vector
        const finalScore =
            (technicalScore * 0.40) +
            (momentumScore * 0.25) +
            (sentimentScore * 0.20) +
            (volumeScore * 0.15);

        // Silent debugging requirement for developer validation (do not render in UI)
        console.log(`[AI Engine] ${stockData.name} Analysis`);
        console.log(`  └ Technical (TFJS): ${technicalScore.toFixed(3)}`);
        console.log(`  └ Momentum:         ${momentumScore.toFixed(3)}`);
        console.log(`  └ Sentiment:        ${sentimentScore.toFixed(3)}`);
        console.log(`  └ Volume:           ${volumeScore.toFixed(3)}`);
        console.log(`  ============> FINAL SCORE: ${finalScore.toFixed(3)}`);

        // Evaluation Boundaries
        if (finalScore > 0.3) {
            return { verdict: "BULLISH", verdictClass: "verdict-bullish" };
        } else if (finalScore < -0.3) {
            return { verdict: "BEARISH", verdictClass: "verdict-bearish" };
        } else {
            return { verdict: "NEUTRAL", verdictClass: "verdict-neutral" };
        }
    } catch (e) {
        console.error("AI Ensemble Execution failed, defaulting to Neutral.", e);
        return { verdict: "NEUTRAL", verdictClass: "verdict-neutral" };
    }
};
