export class MarketAgent {
  public analyze(priceData: any): any {
    if (!priceData || !priceData.history || priceData.history.length === 0) {
      return { trend: "Unknown", error: "No price data provided" };
    }

    const prices: number[] = priceData.history;
    const highs: number[] = priceData.highHistory || prices;
    const lows: number[] = priceData.lowHistory || prices;
    const volumes: number[] = priceData.volume || [];
    const currentPrice = prices[prices.length - 1];

    // 1. Trend Analysis (SMA Crossover)
    const sma10 = this.calculateSMA(prices, 10);
    const sma30 = this.calculateSMA(prices, 30);
    
    let trend = "Neutral";
    let trendStrength = 50;
    
    if (sma10 > sma30) {
      trend = "Bullish";
      trendStrength = Math.min(100, 50 + ((sma10 - sma30) / sma30) * 500);
    } else if (sma10 < sma30) {
      trend = "Bearish";
      trendStrength = Math.min(100, 50 + ((sma30 - sma10) / sma30) * 500);
    }

    // 2. Market Structure
    const structure = this.analyzeMarketStructure(prices);

    // 3. Support & Resistance
    const levels = this.findSupportResistance(prices);

    // 4. Volume Analysis (Money Flow Index & AVWAP)
    const mfi = this.calculateMFI(highs, lows, prices, volumes, 14);
    const avwap = this.calculateAnchoredVWAP(highs, lows, prices, volumes);

    let institutionalAccumulation = false;
    let smartMoneyActivity = "Low";
    
    if (volumes.length > 5 && prices.length > 5) {
      const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const oldVolume = volumes.slice(0, -5).reduce((a, b) => a + b, 0) / (volumes.length - 5) || 1;
      const recentPriceChange = currentPrice - prices[prices.length - 5];
      
      if (recentVolume > oldVolume * 1.5 && recentPriceChange > 0 && mfi > 60) {
        institutionalAccumulation = true;
        smartMoneyActivity = "High Accumulation";
      } else if (recentVolume > oldVolume * 1.5 && recentPriceChange < 0 && mfi < 40) {
        institutionalAccumulation = false;
        smartMoneyActivity = "High Distribution";
      } else if (mfi > 80) {
        smartMoneyActivity = "Overbought (High Money Inflow)";
      } else if (mfi < 20) {
        smartMoneyActivity = "Oversold (High Money Outflow)";
      }
    }

    let avwapTrend = "Neutral";
    if (avwap > 0) {
      if (currentPrice > avwap * 1.02) avwapTrend = "Bullish (Above AVWAP)";
      else if (currentPrice < avwap * 0.98) avwapTrend = "Bearish (Below AVWAP)";
      else avwapTrend = "Consolidating near AVWAP";
    }

    // 5. Market Regime
    let marketRegime = "Consolidation";
    if (trend === "Bullish" && structure === "Higher Highs") marketRegime = "Expansion";
    else if (trend === "Bearish" && structure === "Lower Lows") marketRegime = "Capitulation";
    else if (trend === "Bullish" && structure === "Sideways") marketRegime = "Accumulation";
    else if (trend === "Bearish" && structure === "Sideways") marketRegime = "Distribution";

    return {
      trend,
      trendStrength: Math.round(trendStrength),
      marketStructure: structure,
      marketRegime,
      support: levels.support,
      resistance: levels.resistance,
      patterns: [this.detectBasicPatterns(prices)],
      volumeAnalysis: {
        institutionalAccumulation,
        smartMoneyActivity,
        moneyFlowIndex: Math.round(mfi * 100) / 100,
        anchoredVWAP: Math.round(avwap * 100) / 100,
        avwapTrend
      },
      confidence: 85
    };
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private analyzeMarketStructure(prices: number[]): string {
    if (prices.length < 10) return "Insufficient Data";
    const recent = prices.slice(-10);
    const start = recent[0];
    const end = recent[recent.length - 1];
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    
    if (end >= max * 0.98 && end > start) return "Higher Highs";
    if (end <= min * 1.02 && end < start) return "Lower Lows";
    return "Sideways";
  }

  private findSupportResistance(prices: number[]): { support: number[], resistance: number[] } {
    if (prices.length < 5) return { support: [], resistance: [] };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const current = prices[prices.length - 1];

    let support = min;
    let resistance = max;

    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] < prices[i-1] && prices[i] < prices[i+1]) support = Math.max(support, prices[i]);
      if (prices[i] > prices[i-1] && prices[i] > prices[i+1]) resistance = Math.min(resistance, prices[i]);
    }

    if (support >= current) support = min;
    if (resistance <= current) resistance = max;

    return { 
      support: [Math.round(support * 100) / 100], 
      resistance: [Math.round(resistance * 100) / 100] 
    };
  }

  private detectBasicPatterns(prices: number[]): string {
    if (prices.length < 5) return "None";
    const current = prices[prices.length - 1];
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    
    if (current > max * 0.98) return "Breakout";
    if (current < min * 1.02) return "Breakdown";
    
    const recent5 = prices.slice(-5);
    const var5 = Math.max(...recent5) - Math.min(...recent5);
    const old5 = prices.slice(0, 5);
    const varOld5 = Math.max(...old5) - Math.min(...old5);
    
    if (var5 < varOld5 * 0.5) return "Volatility Squeeze";
    return "Channeling";
  }

  private calculateMFI(highs: number[], lows: number[], closes: number[], volumes: number[], periods: number = 14): number {
    if (closes.length <= periods || volumes.length === 0) return 50;

    let positiveFlow = 0;
    let negativeFlow = 0;

    for (let i = closes.length - periods; i < closes.length; i++) {
      const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
      const prevTypicalPrice = (highs[i-1] + lows[i-1] + closes[i-1]) / 3;
      const rawMoneyFlow = typicalPrice * (volumes[i] || 1);

      if (typicalPrice > prevTypicalPrice) {
        positiveFlow += rawMoneyFlow;
      } else if (typicalPrice < prevTypicalPrice) {
        negativeFlow += rawMoneyFlow;
      }
    }

    if (negativeFlow === 0) return 100;
    const moneyFlowRatio = positiveFlow / negativeFlow;
    return 100 - (100 / (1 + moneyFlowRatio));
  }

  private calculateAnchoredVWAP(highs: number[], lows: number[], closes: number[], volumes: number[]): number {
    if (closes.length === 0 || volumes.length === 0) return 0;
    
    let cumulativeVolume = 0;
    let cumulativePV = 0;

    for (let i = 0; i < closes.length; i++) {
      const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
      const vol = volumes[i] || 1;
      cumulativeVolume += vol;
      cumulativePV += (typicalPrice * vol);
    }

    if (cumulativeVolume === 0) return closes[closes.length - 1];
    return cumulativePV / cumulativeVolume;
  }
}
