import type { StockData } from '../lib/api';

export const calculateOBV = (prices: number[], volumes: number[]): number => {
  if (!prices || prices.length < 2 || !volumes || volumes.length < 1) return 0;

  let obv = 0;
  for (let i = 1; i < prices.length; i++) {
    const vol = volumes[i - 1] || 0;
    if (prices[i] > prices[i - 1]) obv += vol;
    else if (prices[i] < prices[i - 1]) obv -= vol;
  }
  return obv;
};

export const calculateOBVScore = (prices: number[], volumes: number[]): number => {
  if (!prices || prices.length < 10 || !volumes || volumes.length < 9) return 0;

  const midPoint = Math.floor(prices.length / 2);
  const earlyPrices = prices.slice(0, midPoint);
  const latePrices = prices.slice(midPoint);
  const earlyVolumes = volumes.slice(0, midPoint - 1);
  const lateVolumes = volumes.slice(midPoint - 1);

  const earlyOBV = calculateOBV(earlyPrices, earlyVolumes);
  const lateOBV = calculateOBV(latePrices, lateVolumes);

  const priceChange = latePrices[latePrices.length - 1] - earlyPrices[earlyPrices.length - 1];
  const obvChange = lateOBV - earlyOBV;

  if (priceChange > 0 && obvChange > 0) return 0.5;
  if (priceChange < 0 && obvChange < 0) return -0.5;
  if (priceChange > 0 && obvChange < 0) return -0.3;
  if (priceChange < 0 && obvChange > 0) return 0.3;
  return 0;
};

export const calculateAccumulationDistribution = (prices: number[], volumes: number[]): number => {
  if (!prices || prices.length < 2 || !volumes || volumes.length === 0) return 0;

  let adLine = 0;
  for (let i = 1; i < prices.length; i++) {
    const high = prices[i];
    const low = prices[i - 1];
    const close = prices[i];
    const vol = volumes[i - 1] || 0;

    const range = high - low;
    if (range === 0) continue;

    const clv = ((close - low) - (high - close)) / range;
    adLine += clv * vol;
  }
  return adLine;
};

export const calculateADScore = (prices: number[], volumes: number[]): number => {
  if (!prices || prices.length < 10 || !volumes || volumes.length < 9) return 0;

  const midPoint = Math.floor(prices.length / 2);
  const earlyAD = calculateAccumulationDistribution(prices.slice(0, midPoint), volumes.slice(0, midPoint - 1));
  const lateAD = calculateAccumulationDistribution(prices.slice(midPoint), volumes.slice(midPoint - 1));

  const adTrend = lateAD - earlyAD;
  const maxAbs = Math.max(Math.abs(earlyAD), Math.abs(lateAD), 1);
  return Math.max(-1, Math.min(1, adTrend / maxAbs));
};

export const calculateMomentumScore = (stockData: StockData): number => {
  if (!stockData?.history || stockData.history.length < 2) {
    const factor = (stockData?.changePercent || 0) / 3;
    return Math.max(-1, Math.min(1, Math.tanh(factor)));
  }

  const prices = stockData.history;
  const current = prices[prices.length - 1];
  const previous = prices[prices.length - 2];

  if (previous === 0) return 0;
  const rawMomentum = (current - previous) / previous;

  const atr = calculateATRFromHistory(prices);
  if (atr > 0 && current > 0) {
    const atrNorm = rawMomentum / (atr / current);
    return Math.max(-1, Math.min(1, Math.tanh(atrNorm * 3)));
  }

  return Math.max(-1, Math.min(1, Math.tanh(rawMomentum * 10)));
};

const calculateATRFromHistory = (prices: number[], period: number = 14): number => {
  if (!prices || prices.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    trueRanges.push(Math.abs(prices[i] - prices[i - 1]));
  }

  if (trueRanges.length < period) return 0;

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }
  return atr;
};

export const calculateVolumeScore = (stockData: StockData): number => {
  if (stockData.volume && stockData.volume.length >= 3 && stockData.avgVolume > 0) {
    const recentVolumes = stockData.volume.slice(-3);
    const recentAvg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const volumeRatio = recentAvg / stockData.avgVolume;

    const volumeIntensity = Math.tanh((volumeRatio - 1) * 2);
    const sign = stockData.change >= 0 ? 1 : -1;

    return Math.max(-1, Math.min(1, sign * volumeIntensity));
  }

  if (stockData.volume && stockData.volume.length > 0) {
    const volumes = stockData.volume;
    const latestVolume = volumes[volumes.length - 1];
    const olderVolume = volumes.length > 3
      ? volumes.slice(0, -3).reduce((a, b) => a + b, 0) / (volumes.length - 3)
      : latestVolume;

    if (olderVolume === 0) return 0;
    const volumeRatio = latestVolume / olderVolume;
    const volumeIntensity = Math.tanh((volumeRatio - 1) * 2);
    const sign = stockData.change >= 0 ? 1 : -1;
    return Math.max(-1, Math.min(1, sign * volumeIntensity));
  }

  const absoluteDeviation = Math.abs(stockData.changePercent);
  const volumeProxy = Math.tanh(absoluteDeviation / 2) * 0.5;
  const sign = stockData.change >= 0 ? 1 : -1;
  return sign * volumeProxy;
};

export const calculateRegressionScore = (stockData: StockData): number => {
  if (!stockData) return 0;

  const momentum = calculateMomentumScore(stockData);
  const volume = calculateVolumeScore(stockData);

  const obvScore = calculateOBVScore(stockData.history, stockData.volume);
  const adScore = calculateADScore(stockData.history, stockData.volume);

  const score = (
    (momentum * 0.35) +
    (volume * 0.25) +
    (obvScore * 0.20) +
    (adScore * 0.20)
  );

  return Math.max(-1, Math.min(1, score));
};
