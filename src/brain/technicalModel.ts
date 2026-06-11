
export const calculateSMA = (data: number[], period: number): number[] => {
  if (!data || data.length < period) return [];
  const sma: number[] = [];
  for (let i = 0; i <= data.length - period; i++) {
    const slice = data.slice(i, i + period);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    sma.push(parseFloat(avg.toFixed(4)));
  }
  return sma;
};

export const calculateEMA = (data: number[], period: number): number[] => {
  if (!data || data.length < period) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prevEma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < data.length - period; i++) {
    const val = data[i + period];
    prevEma = (val - prevEma) * k + prevEma;
    ema.push(parseFloat(prevEma.toFixed(4)));
  }
  return ema;
};

export const calculateRSI = (data: number[], period: number = 14): number => {
  if (!data || data.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return parseFloat(rsi.toFixed(2));
};

export const calculateStochRSI = (data: number[], rsiPeriod: number = 14, stochPeriod: number = 14): number => {
  if (!data || data.length < rsiPeriod + stochPeriod) return 50;

  const rsiValues: number[] = [];
  for (let i = rsiPeriod + 1; i <= data.length; i++) {
    rsiValues.push(calculateRSI(data.slice(0, i), rsiPeriod));
  }

  if (rsiValues.length < stochPeriod) return 50;

  const recentRSI = rsiValues.slice(-stochPeriod);
  const minRSI = Math.min(...recentRSI);
  const maxRSI = Math.max(...recentRSI);
  const range = maxRSI - minRSI;

  if (range === 0) return 50;
  return parseFloat((((rsiValues[rsiValues.length - 1] - minRSI) / range) * 100).toFixed(2));
};

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

export const calculateMACD = (data: number[]): MACDResult => {
  if (!data || data.length < 35) return { macd: 0, signal: 0, histogram: 0 };

  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);

  if (!ema12.length || !ema26.length) return { macd: 0, signal: 0, histogram: 0 };

  const diff = ema26.length - ema12.length;
  const alignedEma12 = diff > 0 ? ema12.slice(diff) : ema12;

  const macdLine: number[] = [];
  for (let i = 0; i < ema26.length; i++) {
    macdLine.push(alignedEma12[i] - ema26[i]);
  }

  const signalLine = calculateEMA(macdLine, 9);
  if (!signalLine.length) return { macd: 0, signal: 0, histogram: 0 };

  const macdVal = macdLine[macdLine.length - 1];
  const signalVal = signalLine[signalLine.length - 1];

  return {
    macd: parseFloat(macdVal.toFixed(4)),
    signal: parseFloat(signalVal.toFixed(4)),
    histogram: parseFloat((macdVal - signalVal).toFixed(4))
  };
};

export interface BollingerBands {
  upper: number;
  lower: number;
  middle: number;
  percentB: number;
  bandwidth: number;
}

export const calculateBollingerBands = (data: number[], period: number = 20, stdDev: number = 2): BollingerBands => {
  if (!data || data.length < period) return { upper: 0, lower: 0, middle: 0, percentB: 0.5, bandwidth: 0 };
  const slice = data.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / (period - 1);
  const std = Math.sqrt(variance);
  const upper = sma + stdDev * std;
  const lower = sma - stdDev * std;
  const current = data[data.length - 1];
  const bandwidth = upper - lower;
  const percentB = bandwidth > 0 ? (current - lower) / bandwidth : 0.5;

  return {
    upper: parseFloat(upper.toFixed(4)),
    lower: parseFloat(lower.toFixed(4)),
    middle: parseFloat(sma.toFixed(4)),
    percentB: parseFloat(Math.max(0, Math.min(1, percentB)).toFixed(4)),
    bandwidth: parseFloat((bandwidth / sma * 100).toFixed(4))
  };
};

export const calculateATR = (data: number[], period: number = 14): number => {
  if (!data || data.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const highLow = Math.abs(data[i] - data[i - 1]);
    trueRanges.push(highLow);
  }

  if (trueRanges.length < period) return 0;

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return parseFloat(atr.toFixed(4));
};

export const calculateADX = (data: number[], period: number = 14): number => {
  if (!data || data.length < period * 2 + 1) return 25;

  let prevPlusDM = 0;
  let prevMinusDM = 0;
  let prevTR = 0;

  for (let i = 1; i <= period; i++) {
    const upMove = (data[i] || 0) - (data[i - 1] || 0);
    const downMove = (data[i - 1] || 0) - (data[i] || 0);
    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
    prevPlusDM += plusDM;
    prevMinusDM += minusDM;
    prevTR += Math.abs((data[i] || 0) - (data[i - 1] || 0));
  }

  let smoothPlusDM = prevPlusDM / period;
  let smoothMinusDM = prevMinusDM / period;
  let smoothTR = prevTR / period;

  let prevDX = 0;

  for (let i = period + 1; i < data.length; i++) {
    const upMove = (data[i] || 0) - (data[i - 1] || 0);
    const downMove = (data[i - 1] || 0) - (data[i] || 0);
    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
    const tr = Math.abs((data[i] || 0) - (data[i - 1] || 0));

    smoothPlusDM = (smoothPlusDM * (period - 1) + plusDM) / period;
    smoothMinusDM = (smoothMinusDM * (period - 1) + minusDM) / period;
    smoothTR = (smoothTR * (period - 1) + tr) / period;

    const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;

    prevDX = i === period + 1 ? dx : (prevDX * (period - 1) + dx) / period;
  }

  return parseFloat(Math.max(0, Math.min(100, prevDX)).toFixed(2));
};

export interface TechnicalIndicators {
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
  trendDirection: 'STRONG_UPTREND' | 'UPTREND' | 'DOWNTREND' | 'STRONG_DOWNTREND' | 'SIDEWAYS' | 'UNKNOWN';
  score: number;
}

export const calculateTechnicalScore = (prices: number[]): number => {
  if (!prices || prices.length < 20) return 0;

  const current = prices[prices.length - 1];
  const previous = prices[prices.length - 2] || current;

  const rsi = calculateRSI(prices, 14);
  const adx = calculateADX(prices, 14);
  const bb = calculateBollingerBands(prices, 20);

  let rsiScore = 0;
  if (rsi > 70) rsiScore = -0.5;
  else if (rsi > 60) rsiScore = 0.2;
  else if (rsi > 50) rsiScore = 0.4;
  else if (rsi > 40) rsiScore = 0.1;
  else if (rsi > 30) rsiScore = -0.1;
  else rsiScore = -0.4;

  if (adx > 25 && rsi < 30) {
    rsiScore = -0.6;
  } else if (adx < 20 && rsi < 30) {
    rsiScore = 0.3;
  }

  let bbScore = 0;
  if (bb.percentB > 1) bbScore = -0.6;
  else if (bb.percentB > 0.8) bbScore = -0.3;
  else if (bb.percentB > 0.6) bbScore = 0.1;
  else if (bb.percentB > 0.4) bbScore = 0.2;
  else if (bb.percentB > 0.2) bbScore = 0.3;
  else if (bb.percentB > 0) bbScore = 0.1;
  else bbScore = 0.4;

  if (adx < 20) bbScore *= 0.3;

  const { macd, signal: macdSignal } = calculateMACD(prices);
  let macdScore = 0;
  if (macdSignal !== 0 && !isNaN(macdSignal)) {
    const ratio = (macd - macdSignal) / Math.abs(macdSignal);
    macdScore = Math.max(-1, Math.min(1, ratio));
  }
  if (adx < 20) macdScore *= 0.3;

  const sma20 = calculateSMA(prices, 20);
  const sma20Val = sma20[sma20.length - 1] || 0;
  let trendScore = 0;
  if (sma20Val > 0) {
    const ratio = (current - sma20Val) / sma20Val;
    trendScore = Math.tanh(ratio * 10);
  }
  if (adx > 25) trendScore *= 1.3;
  else if (adx < 20) trendScore *= 0.4;

  const momentum = (current - previous) / (previous || 1);
  const atrVal = calculateATR(prices, 14);
  const atrNormMomentum = atrVal > 0 ? momentum / (atrVal / current) : momentum * 50;
  const momentumScore = Math.tanh(atrNormMomentum * 3);

  const adxScore = adx > 40 ? 0.3 : adx > 25 ? 0.15 : adx > 20 ? 0 : -0.1;

  const score = (
    (rsiScore * 0.20) +
    (bbScore * 0.15) +
    (macdScore * 0.15) +
    (trendScore * 0.20) +
    (momentumScore * 0.15) +
    (adxScore * 0.15)
  );

  return Math.max(-1, Math.min(1, score));
};

export const getAllTechnicalIndicators = (prices: number[]): TechnicalIndicators => {
  if (!prices || prices.length < 20) {
    return {
      sma20: 0, sma50: 0, ema12: 0, ema26: 0, rsi: 50, stochRSI: 50,
      macd: 0, macdSignal: 0, macdHistogram: 0,
      upperBand: 0, lowerBand: 0, middleBand: 0, bollingerPercentB: 0.5, bollingerBandwidth: 0,
      atr: 0, adx: 25,
      trendDirection: 'UNKNOWN', score: 0
    };
  }

  const sma20Arr = calculateSMA(prices, 20);
  const sma50Arr = calculateSMA(prices, 50);
  const ema12Arr = calculateEMA(prices, 12);
  const ema26Arr = calculateEMA(prices, 26);
  const rsi = calculateRSI(prices, 14);
  const stochRSI = calculateStochRSI(prices, 14, 14);
  const macdResult = calculateMACD(prices);
  const bb = calculateBollingerBands(prices, 20);
  const atr = calculateATR(prices, 14);
  const adx = calculateADX(prices, 14);

  const sma20Val = sma20Arr[sma20Arr.length - 1] || 0;
  const sma50Val = sma50Arr[sma50Arr.length - 1] || 0;

  let trendDirection: TechnicalIndicators['trendDirection'] = 'UNKNOWN';
  if (adx > 25) {
    if (sma20Val > sma50Val * 1.02) trendDirection = 'STRONG_UPTREND';
    else if (sma20Val > sma50Val) trendDirection = 'UPTREND';
    else if (sma20Val < sma50Val * 0.98) trendDirection = 'STRONG_DOWNTREND';
    else if (sma20Val < sma50Val) trendDirection = 'DOWNTREND';
    else trendDirection = 'SIDEWAYS';
  } else {
    trendDirection = 'SIDEWAYS';
  }

  return {
    sma20: sma20Val,
    sma50: sma50Val,
    ema12: ema12Arr[ema12Arr.length - 1] || 0,
    ema26: ema26Arr[ema26Arr.length - 1] || 0,
    rsi,
    stochRSI,
    macd: macdResult.macd,
    macdSignal: macdResult.signal,
    macdHistogram: macdResult.histogram,
    upperBand: bb.upper,
    lowerBand: bb.lower,
    middleBand: bb.middle,
    bollingerPercentB: bb.percentB,
    bollingerBandwidth: bb.bandwidth,
    atr,
    adx,
    trendDirection,
    score: calculateTechnicalScore(prices)
  };
};
