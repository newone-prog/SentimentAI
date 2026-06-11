import type { StockData } from '../lib/api';

export const calculateMomentumScore = (stockData: StockData): number => {
  const factor = stockData.changePercent / 3;
  return Math.max(-1, Math.min(1, Math.tanh(factor)));
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
