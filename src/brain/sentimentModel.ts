import Sentiment from 'sentiment';
import type { NewsItem } from '../lib/api';

const sentiment = new Sentiment();

/**
 * Calculates a normalized sentiment score between -1 and 1 based on recent news articles.
 * Assumes articles are sorted by recency. Emphasizes recent news polarity.
 */
export const calculateSentimentScore = (newsData: NewsItem[]): number => {
    if (!newsData || newsData.length === 0) return 0;

    let totalScore = 0;
    let totalWeight = 0;

    // Weight recent news heavier (index 0 is newest)
    newsData.forEach((article, index) => {
        // Basic decay weight: newer articles have higher impact
        const weight = Math.max(0.1, 1 - (index * 0.1));

        // Use the `sentiment` npm package to score the headline
        const analysis = sentiment.analyze(article.title);

        // Normalize individual headline score roughly between -1 and 1
        // (A typical score ranges from -5 to +5 depending on word count)
        const normalizedArticleScore = Math.max(-1, Math.min(1, analysis.score / 3));

        totalScore += normalizedArticleScore * weight;
        totalWeight += weight;
    });

    if (totalWeight === 0) return 0;

    // Final average sentiment bounded between -1 and 1
    return Math.max(-1, Math.min(1, totalScore / totalWeight));
};
