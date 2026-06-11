import type { NewsItem } from '../lib/api';

const FINANCIAL_BULLISH = new Set([
  'upgrade', 'upgraded', 'outperform', 'overweight', 'buy', 'strong buy',
  'beat', 'beats', 'beaten', 'surpassed', 'exceeded', 'beat estimates',
  'raised', 'raises', 'hiked', 'hike', 'bullish', 'rally', 'rallied',
  'surge', 'surged', 'soaring', 'soared', 'breakthrough', 'gain', 'gained',
  'gains', 'jumped', 'jump', 'climbed', 'climb', 'profit', 'profitable',
  'dividend', 'bonus', 'buyback', 'repurchase', 'insider buying',
  'accumulation', 'accumulate', 'support', 'bounce', 'recovery', 'recovering',
  'growth', 'growing', 'expanded', 'expansion', 'record high', 'all-time high',
  'ath', 'new high', '52-week high', 'outperforming', 'positive outlook',
  'strong demand', 'revenue growth', 'margin expansion', 'turnaround',
  'undervalued', 'deep value', 'catalyst', 'bull run', 'breakout',
  'golden cross', 'macd crossover', 'oversold bounce', 'short squeeze',
  'institutional buying', 'fund buying', 'fccb conversion', 'delisting gain'
]);

const FINANCIAL_BEARISH = new Set([
  'downgrade', 'downgraded', 'underperform', 'underweight', 'sell', 'strong sell',
  'miss', 'missed', 'missing', 'below estimates', 'warning', 'warned',
  'cut', 'cuts', 'slashed', 'slash', 'bearish', 'crash', 'crashed',
  'plunge', 'plunged', 'tumbled', 'tumble', 'slump', 'slumped',
  'loss', 'losses', 'decline', 'declined', 'drop', 'dropped',
  'debt', 'default', 'bankruptcy', 'insolvency', 'restructuring',
  'insider selling', 'distribution', 'resistance', 'breakdown',
  'recession', 'contraction', 'contracting', 'record low', 'all-time low',
  '52-week low', 'negative outlook', 'weak demand', 'margin compression',
  'overvalued', 'bubble', 'correction', 'bear market', 'death cross',
  'macd crossunder', 'overbought reversal', 'short interest', 'dilution',
  'rights issue', 'promoter pledge', 'pledge shares', 'fccb default',
  'regulatory fine', 'penalty', 'fraud', 'scam', 'governance issue'
]);

const INTENSITY_WORDS: Record<string, number> = {
  'massive': 1.5, 'huge': 1.4, 'significant': 1.3, 'major': 1.3,
  'sharp': 1.3, 'steep': 1.3, 'dramatic': 1.4, 'substantial': 1.2,
  'considerable': 1.2, 'notable': 1.1, 'slight': 0.7, 'mild': 0.7,
  'modest': 0.8, 'marginal': 0.6, 'minimal': 0.5, 'tiny': 0.5
};

export const calculateFinancialSentiment = (text: string): { score: number; confidence: number; matchedTerms: string[] } => {
  if (!text || typeof text !== 'string') return { score: 0, confidence: 0, matchedTerms: [] };

  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);
  let financialScore = 0;
  let matchCount = 0;
  const matchedTerms: string[] = [];

  for (const word of words) {
    if (FINANCIAL_BULLISH.has(word)) {
      financialScore += 1;
      matchCount++;
      matchedTerms.push(word);
    } else if (FINANCIAL_BEARISH.has(word)) {
      financialScore -= 1;
      matchCount++;
      matchedTerms.push(word);
    }
  }

  for (const [term, multiplier] of Object.entries(INTENSITY_WORDS)) {
    if (text.toLowerCase().includes(term)) {
      financialScore *= multiplier;
      break;
    }
  }

  const normalizedScore = Math.max(-1, Math.min(1, financialScore / Math.max(1, matchCount)));
  const confidence = Math.min(1, matchCount / 5);

  return { score: normalizedScore, confidence, matchedTerms };
};

export const calculateSentimentScore = (newsData: NewsItem[]): number => {
  if (!newsData || newsData.length === 0) return 0;

  let totalScore = 0;
  let totalWeight = 0;

  newsData.forEach((article, index) => {
    const weight = Math.max(0.3, Math.exp(-index * 0.15));

    const financialSentiment = calculateFinancialSentiment(article.title);
    let articleScore: number;
    let articleConfidence: number;

    if (financialSentiment.confidence > 0.3) {
      articleScore = financialSentiment.score;
      articleConfidence = financialSentiment.confidence;
    } else {
      articleScore = article.score;
      articleConfidence = 0.5;
    }

    if (articleScore > 0) articleScore = Math.min(1, articleScore * 2);
    else if (articleScore < 0) articleScore = Math.max(-1, articleScore * 2);

    const adjustedWeight = weight * articleConfidence;
    totalScore += articleScore * adjustedWeight;
    totalWeight += adjustedWeight;
  });

  if (totalWeight === 0) return 0;
  return Math.max(-1, Math.min(1, totalScore / totalWeight));
};

export const getNewsIntelligenceScore = (newsData: NewsItem[]): {
  overallScore: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  avgConfidence: number;
  topBullishTerms: string[];
  topBearishTerms: string[];
} => {
  if (!newsData || newsData.length === 0) {
    return { overallScore: 0, bullishCount: 0, bearishCount: 0, neutralCount: 0, avgConfidence: 0, topBullishTerms: [], topBearishTerms: [] };
  }

  let bullish = 0, bearish = 0, neutral = 0;
  let totalConfidence = 0;
  const allBullishTerms: string[] = [];
  const allBearishTerms: string[] = [];

  for (const article of newsData) {
    const fs = calculateFinancialSentiment(article.title);
    totalConfidence += fs.confidence;

    if (fs.score > 0.1) { bullish++; allBullishTerms.push(...fs.matchedTerms); }
    else if (fs.score < -0.1) { bearish++; allBearishTerms.push(...fs.matchedTerms); }
    else { neutral++; }
  }

  const termFreq = (terms: string[]) => {
    const freq: Record<string, number> = {};
    terms.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
  };

  return {
    overallScore: calculateSentimentScore(newsData),
    bullishCount: bullish,
    bearishCount: bearish,
    neutralCount: neutral,
    avgConfidence: totalConfidence / newsData.length,
    topBullishTerms: termFreq(allBullishTerms),
    topBearishTerms: termFreq(allBearishTerms)
  };
};
