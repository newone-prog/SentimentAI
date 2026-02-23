import type { StockData } from '../lib/api';

/**
 * Momentum Score (-1 to 1)
 * Calculates the short-term directional strength using recent price changes bounded by hyperbolic tangent.
 */
export const calculateMomentumScore = (stockData: StockData): number => {
    // Basic short term percentage direction map
    // E.g. A stock up 5% today has massive momentum, a stock down 2% has negative momentum
    const factor = stockData.changePercent / 3; // Normalize roughly (say +/- 3% is extreme)

    // S-curve bounding so even +50% drops don't exceed -1 math constraints
    return Math.max(-1, Math.min(1, Math.tanh(factor)));
};

/**
 * Volume Score (-1 to 1) 
 * Estimates trade volume participation weight. If volume is high, strength is validated.
 * Note: Since the base Yahoo Chart API returned in api.ts doesn't fetch real volume arrays directly without an extra lookup, 
 * we use the relative price deviation magnitude as a simulated proxy for volume volatility strength.
 */
export const calculateVolumeScore = (stockData: StockData): number => {
    // Simulated proxy: Larger price swings (either direction) indicate high participation volume 
    // If the price change percent is very low (0.1%), volume score is near 0 (neutral participation).
    // Bounded natively to the + side (since strong volume validates the existing trend direction).

    const absoluteDeviation = Math.abs(stockData.changePercent);
    const volumeProxy = Math.tanh(absoluteDeviation / 2); // 0 to +1 

    // We make volume score sign match the momentum sign (direction validation)
    const sign = stockData.change >= 0 ? 1 : -1;

    return sign * volumeProxy;
};
