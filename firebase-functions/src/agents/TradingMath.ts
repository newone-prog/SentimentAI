export class TradingMath {
  /**
   * Calculates Relative Strength Index (RSI) using Wilder's Smoothing Method
   * Typically uses a 14-period lookback.
   */
  public static calculateRSI(prices: number[], periods: number = 14): number {
    if (prices.length <= periods) return 50;

    let avgGain = 0;
    let avgLoss = 0;

    // First average gain/loss
    for (let i = 1; i <= periods; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) avgGain += diff;
      else avgLoss += Math.abs(diff);
    }

    avgGain /= periods;
    avgLoss /= periods;

    // Wilder's Smoothing
    for (let i = periods + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      let gain = 0;
      let loss = 0;
      if (diff >= 0) gain = diff;
      else loss = Math.abs(diff);

      avgGain = (avgGain * (periods - 1) + gain) / periods;
      avgLoss = (avgLoss * (periods - 1) + loss) / periods;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculates Exponential Moving Average (EMA)
   */
  public static calculateEMA(prices: number[], periods: number): number[] {
    if (prices.length < periods) return prices;

    const multiplier = 2 / (periods + 1);
    const emaArray = new Array(prices.length).fill(0);
    
    let sum = 0;
    for (let i = 0; i < periods; i++) {
      sum += prices[i];
    }
    emaArray[periods - 1] = sum / periods;

    for (let i = periods; i < prices.length; i++) {
      emaArray[i] = (prices[i] - emaArray[i - 1]) * multiplier + emaArray[i - 1];
    }

    return emaArray;
  }

  /**
   * Calculates MACD (Moving Average Convergence Divergence)
   */
  public static calculateMACD(prices: number[]): { macdLine: number; signalLine: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    
    const macdLineArr = [];
    for (let i = 26; i < prices.length; i++) {
      macdLineArr.push(ema12[i] - ema26[i]);
    }
    
    const signalLineArr = this.calculateEMA(macdLineArr, 9);
    
    const latestMacd = macdLineArr[macdLineArr.length - 1] || 0;
    const latestSignal = signalLineArr[signalLineArr.length - 1] || 0;

    return {
      macdLine: latestMacd,
      signalLine: latestSignal,
      histogram: latestMacd - latestSignal
    };
  }

  /**
   * Calculates Bollinger Bands (20-period SMA, 2 StdDev)
   */
  public static calculateBollingerBands(prices: number[], periods: number = 20, multiplier: number = 2) {
    if (prices.length < periods) return { upper: 0, middle: 0, lower: 0 };
    
    const recentPrices = prices.slice(-periods);
    const sum = recentPrices.reduce((a, b) => a + b, 0);
    const sma = sum / periods;
    
    const squaredDiffs = recentPrices.map(p => Math.pow(p - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / periods;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * multiplier),
      middle: sma,
      lower: sma - (stdDev * multiplier)
    };
  }

  /**
   * Calculates Order Blocks and Liquidity Voids based on strong impulsive moves
   */
  public static calculateOrderBlocks(prices: number[], volumes: number[]): { bullishOB: number, bearishOB: number } {
    if (prices.length < 5 || volumes.length < 5) return { bullishOB: 0, bearishOB: 0 };
    
    let bullishOB = 0;
    let bearishOB = 0;
    let maxVolume = Math.max(...volumes.slice(-20));

    // Simple Order Block heuristic:
    // Look back for massive volume spikes indicating institutional activity
    for (let i = prices.length - 2; i > Math.max(0, prices.length - 20); i--) {
      const priceChange = prices[i] - prices[i - 1];
      const percentChange = Math.abs(priceChange / prices[i-1]);

      if (volumes[i] > maxVolume * 0.8 && percentChange > 0.01) {
        if (priceChange > 0 && !bullishOB) {
          bullishOB = prices[i - 1]; // The base of the impulsive move
        } else if (priceChange < 0 && !bearishOB) {
          bearishOB = prices[i - 1]; // The top of the impulsive move
        }
      }
    }
    
    return { bullishOB, bearishOB };
  }
}
