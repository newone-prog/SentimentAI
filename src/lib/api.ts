import Sentiment from 'sentiment';
import { API_CONFIG, hasBackendProxy } from './apiConfig';

const sentimentAnalyzer = new Sentiment();

export interface StockData {
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  history: number[];
  volume: number[];
  avgVolume: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  isSynthetic?: boolean;
}

export interface NewsItem {
  title: string;
  category: 'Positive' | 'Negative' | 'Neutral';
  url: string;
  score: number;
  source?: string;
  emotion?: string;
  content?: string;
}

export interface CommunitySentiment {
  recommendAll: number;
  recommendOther: number;
  recommendMA: number;
  rsi: number;
  stochK: number;
  stochD: number;
  macd: number;
  macdSignal: number;
  volatility: number;
  volume: number;
  vwap: number;
}

export interface AnalystNews {
  title: string;
  url: string;
  source: string;
  date?: string;
}

export interface CorporateAction {
  type: string;
  detail: string;
  date: string;
}

export interface IndianStockDetails {
  recentNews: AnalystNews[];
  corporateActions: CorporateAction[];
  analystView: string;
  recommendation?: string;
}

export interface MarketStackEOD {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adj_high?: number | null;
  adj_low?: number | null;
  adj_close?: number | null;
  adj_open?: number | null;
  adj_volume?: number | null;
  split_factor?: number;
  dividend?: number;
  symbol?: string;
  exchange?: string;
}

export interface MarketStackSplit {
  date: string;
  split_factor: number;
  symbol?: string;
}

export interface MarketStackDividend {
  date: string;
  dividend: number;
  symbol?: string;
}

export interface MarketStackTicker {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  has_intraday: boolean;
  has_eod: boolean;
  country?: string;
  stock_exchange?: { name: string; acronym: string; city: string; country: string };
}

export interface MarketStackData {
  eod: MarketStackEOD[];
  splits: MarketStackSplit[];
  dividends: MarketStackDividend[];
  ticker?: MarketStackTicker;
}

export interface DeepMarketData {
  marketStack?: MarketStackData;
  indianDetails?: IndianStockDetails;
}

export interface SentimentAnalysis {
  avgScore: number;
  positive: number;
  negative: number;
  neutral: number;
  analyzedData: NewsItem[];
  globalFearGreed?: number;
  socialHeat?: number;
  communitySentiment?: CommunitySentiment;
  indianDetails?: IndianStockDetails;
  marketData?: DeepMarketData;
}

const DEFAULT_TIMEOUT = 15000;

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = DEFAULT_TIMEOUT): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
};

const safeJsonParse = async (res: Response, isProxied: boolean): Promise<any> => {
  if (import.meta.env.DEV || isProxied) {
    return await res.json();
  }
  const wrapper = await res.json();
  if (wrapper?.contents) return JSON.parse(wrapper.contents);
  throw new Error('Empty proxy response');
};

export const fetchIndianStockDetails = async (ticker: string): Promise<IndianStockDetails | null> => {
  try {
    const baseTicker = ticker.replace(/\.(NS|BO)$/, '');

    if (import.meta.env.PROD && !hasBackendProxy) {
      console.warn('Production mode without backend proxy — API keys may be exposed.');
    }

    const url = `/api/indianapi/stock?name=${encodeURIComponent(baseTicker)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data) return null;

    const rawActions = data.stockCorporateActionData || {};
    const flattenedActions: CorporateAction[] = [];

    if (rawActions.dividend) {
      rawActions.dividend.forEach((d: any) => flattenedActions.push({ type: 'Dividend', detail: d.details || 'Dividend payout', date: d.date }));
    }
    if (rawActions.split) {
      rawActions.split.forEach((s: any) => flattenedActions.push({ type: 'Split', detail: s.details || 'Stock split', date: s.date }));
    }
    if (rawActions.bonus) {
      rawActions.bonus.forEach((b: any) => flattenedActions.push({ type: 'Bonus', detail: b.details || 'Bonus issue', date: b.date }));
    }

    return {
      recentNews: (data.recentNews || []).map((n: any) => ({
        title: n.headline || n.title,
        url: n.url && n.url.startsWith('/') ? `https://www.livemint.com${n.url}` : (n.url || n.link || '#'),
        source: n.source || 'LiveMint/IndianAPI',
        date: n.date
      })),
      corporateActions: flattenedActions,
      analystView: data.analystView || 'Recent performance remains in focus for market participants.',
      recommendation: data.analystRecommendation || (data.peerCompanyList?.[0]?.overallRating ? `Peer Insight: ${data.peerCompanyList[0].overallRating}` : undefined)
    };
  } catch (e) {
    console.warn("IndianAPI Fetch Failed:", e);
    return null;
  }
};

const resolveMarketStackSymbol = (ticker: string): string => {
  const base = ticker.replace(/\.(NS|BO)$/, '');
  if (ticker.endsWith('.BO')) return `${base}.XBOM`;
  return `${base}.XNSE`;
};

export const fetchMarketStackData = async (ticker: string): Promise<MarketStackData | null> => {
  if (!API_CONFIG.MARKETSTACK_API_KEY) {
    console.warn('MarketStack API key not configured. Skipping.');
    return null;
  }

  try {
    const symbol = resolveMarketStackSymbol(ticker);
    const key = API_CONFIG.MARKETSTACK_API_KEY;
    const results: MarketStackData = { eod: [], splits: [], dividends: [] };

    const eodUrl = import.meta.env.DEV
      ? `/api/marketstack/v1/eod?access_key=${key}&symbols=${symbol}&limit=30`
      : `http://api.marketstack.com/v1/eod?access_key=${key}&symbols=${symbol}&limit=30`;
    console.info(`[MarketStack] Fetching EOD for ${symbol}...`);
    try {
      const eodRes = await fetchWithTimeout(eodUrl, {}, 12000);
      if (eodRes.ok) {
        const eodData = await eodRes.json();
        if (eodData?.data) results.eod = eodData.data;
        console.info(`[MarketStack] EOD: ${results.eod.length} records`);
      } else {
        console.warn(`[MarketStack] EOD failed: ${eodRes.status}`);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') console.warn('[MarketStack] EOD timeout');
      else console.warn("MarketStack EOD fetch failed:", e);
    }

    const splitsUrl = import.meta.env.DEV
      ? `/api/marketstack/v1/splits?access_key=${key}&symbols=${symbol}&limit=10`
      : `http://api.marketstack.com/v1/splits?access_key=${key}&symbols=${symbol}&limit=10`;
    try {
      const splitsRes = await fetchWithTimeout(splitsUrl, {}, 10000);
      if (splitsRes.ok) {
        const splitsData = await splitsRes.json();
        if (splitsData?.data) results.splits = splitsData.data;
        console.info(`[MarketStack] Splits: ${results.splits.length} records`);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') console.warn('[MarketStack] Splits timeout');
      else console.warn("MarketStack Splits fetch failed:", e);
    }

    const divUrl = import.meta.env.DEV
      ? `/api/marketstack/v1/dividends?access_key=${key}&symbols=${symbol}&limit=10`
      : `http://api.marketstack.com/v1/dividends?access_key=${key}&symbols=${symbol}&limit=10`;
    try {
      const divRes = await fetchWithTimeout(divUrl, {}, 10000);
      if (divRes.ok) {
        const divData = await divRes.json();
        if (divData?.data) results.dividends = divData.data;
        console.info(`[MarketStack] Dividends: ${results.dividends.length} records`);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') console.warn('[MarketStack] Dividends timeout');
      else console.warn("MarketStack Dividends fetch failed:", e);
    }

    if (results.eod.length === 0 && results.splits.length === 0 && results.dividends.length === 0) {
      return null;
    }

    return results;
  } catch (e) {
    console.warn("MarketStack fetch collapsed:", e);
    return null;
  }
};

export const fetchEquityFearGreedIndex = async (): Promise<number> => {
  try {
    const niftyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?range=5d&interval=1d`;
    const proxyUrl = getProxyUrl(niftyUrl, 'yahoo1');
    const res = await fetchWithTimeout(proxyUrl, { headers: { 'Accept': 'application/json' } }, 10000);
    if (!res.ok) return 50;

    const data = await safeJsonParse(res, import.meta.env.DEV);

    if (!data?.chart?.result?.[0]) return 50;
    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    const closes: number[] = quotes.close.filter((p: number | null) => p !== null);
    if (closes.length < 2) return 50;

    const currentPrice = closes[closes.length - 1];
    const fiveDayAgo = closes[0];
    const momentum = ((currentPrice - fiveDayAgo) / fiveDayAgo) * 100;

    const highs: number[] = quotes.high.filter((p: number | null) => p !== null);
    const lows: number[] = quotes.low.filter((p: number | null) => p !== null);
    const avgRange = highs.reduce((sum: number, h: number, i: number) => sum + (h - (lows[i] || h)), 0) / highs.length;
    const volatility = (avgRange / currentPrice) * 100;

    let momentumScore = 50;
    if (momentum > 5) momentumScore = 90;
    else if (momentum > 3) momentumScore = 78;
    else if (momentum > 1.5) momentumScore = 65;
    else if (momentum > 0.5) momentumScore = 55;
    else if (momentum > -0.5) momentumScore = 50;
    else if (momentum > -1.5) momentumScore = 42;
    else if (momentum > -3) momentumScore = 30;
    else if (momentum > -5) momentumScore = 18;
    else momentumScore = 10;

    let volatilityScore = 50;
    if (volatility < 0.8) volatilityScore = 72;
    else if (volatility < 1.2) volatilityScore = 62;
    else if (volatility < 1.8) volatilityScore = 52;
    else if (volatility < 2.5) volatilityScore = 42;
    else if (volatility < 3.5) volatilityScore = 30;
    else volatilityScore = 18;

    const fearGreed = Math.round(momentumScore * 0.65 + volatilityScore * 0.35);
    return Math.max(0, Math.min(100, fearGreed));
  } catch (e) {
    return 50;
  }
};

export const fetchTradingViewSentiment = async (ticker: string): Promise<{ socialHeat: number; communitySentiment: CommunitySentiment }> => {
  const defaultResult = { socialHeat: 50, communitySentiment: { recommendAll: 0, recommendOther: 0, recommendMA: 0, rsi: 50, stochK: 50, stochD: 50, macd: 0, macdSignal: 0, volatility: 0, volume: 0, vwap: 0 } };

  try {
    const baseTicker = ticker.replace(/\.(NS|BO)$/, '');
    const tvTicker = `NSE:${baseTicker}`;

    const body = JSON.stringify({
      symbols: { tickers: [tvTicker] },
      columns: [
        'Recommend.All', 'Recommend.Other', 'Recommend.MA',
        'RSI', 'Stoch.K', 'Stoch.D',
        'MACD.macd', 'MACD.signal',
        'Volatility.D', 'volume', 'VWAP'
      ]
    });

    const scanUrl = import.meta.env.DEV
      ? '/api/tradingview/india/scan'
      : 'https://scanner.tradingview.com/india/scan';

    const res = await fetchWithTimeout(scanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    }, 10000);

    if (!res.ok) return defaultResult;
    const data = await res.json();
    const d = data?.data?.[0]?.d;
    if (!d) return defaultResult;

    const communitySentiment: CommunitySentiment = {
      recommendAll: d[0] ?? 0,
      recommendOther: d[1] ?? 0,
      recommendMA: d[2] ?? 0,
      rsi: d[3] ?? 50,
      stochK: d[4] ?? 50,
      stochD: d[5] ?? 50,
      macd: d[6] ?? 0,
      macdSignal: d[7] ?? 0,
      volatility: d[8] ?? 0,
      volume: d[9] ?? 0,
      vwap: d[10] ?? 0,
    };

    const recommendNorm = (communitySentiment.recommendAll + 1) / 2;
    const socialHeat = Math.round(Math.max(0, Math.min(100, recommendNorm * 100)));

    return { socialHeat, communitySentiment };
  } catch (e: any) {
    if (e?.name === 'AbortError') console.warn('[TradingView] Scan timeout');
    return defaultResult;
  }
};

export const generateStableChartData = (ticker: string, basePrice: number): number[] => {
  const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variance = basePrice * 0.05;
  return Array.from({ length: 30 }, (_, i) => {
    const p = basePrice + Math.sin(i * 0.3 + hash) * variance + (Math.sin(hash + i) * variance * 0.3);
    return parseFloat(p.toFixed(2));
  });
};

export const getProxyUrl = (targetUrl: string, apiAlias: 'yahoo1' | 'yahoo2' | 'groww' | 'mediastack') => {
  if (import.meta.env.DEV) {
    try {
      const urlObj = new URL(targetUrl);
      return `/api/${apiAlias}${urlObj.pathname}${urlObj.search}`;
    } catch (e) {
      return targetUrl;
    }
  }
  return `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
};

export const fetchStockData = async (ticker: string, fallbackName: string): Promise<StockData | null> => {
  try {
    const rawUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1mo&interval=1d`;
    const proxyUrl = getProxyUrl(rawUrl, 'yahoo1');

    const res = await fetchWithTimeout(proxyUrl, { headers: { 'Accept': 'application/json' } }, 15000);
    if (!res.ok) throw new Error("Yahoo Finance Network Error");

    const data = await safeJsonParse(res, import.meta.env.DEV);

    if (data.chart && data.chart.error) throw new Error(data.chart.error.description);
    if (!data.chart || !data.chart.result) throw new Error("Format error or missing chart data.");

    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    const meta = result.meta;

    const closePrices: number[] = quotes.close.filter((p: number | null) => p !== null);
    if (closePrices.length === 0) throw new Error("No pricing data found");

    const volumeArray: number[] = quotes.volume
      ? quotes.volume.filter((v: number | null) => v !== null).map((v: number) => Number(v))
      : [];
    const avgVolume = volumeArray.length > 0
      ? Math.round(volumeArray.reduce((a: number, b: number) => a + b, 0) / volumeArray.length)
      : 0;

    const currency_code = meta.currency || 'USD';
    const currentPrice = closePrices[closePrices.length - 1];
    const previousPrice = closePrices.length > 1 ? closePrices[closePrices.length - 2] : currentPrice;

    const change = currentPrice - previousPrice;
    const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
    const actualName = meta.longName || meta.shortName || fallbackName || ticker;

    return {
      name: actualName,
      price: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      currency: currency_code,
      history: closePrices.slice(-30).map(p => parseFloat(p.toFixed(2))),
      volume: volumeArray.slice(-30),
      avgVolume,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? parseFloat(meta.fiftyTwoWeekHigh.toFixed(2)) : undefined,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? parseFloat(meta.fiftyTwoWeekLow.toFixed(2)) : undefined,
    };
  } catch (error) {
    const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const basePrice = 100 + (hash % 2000);
    const history = generateStableChartData(ticker, basePrice);

    const currentPrice = history[history.length - 1];
    const previousPrice = history[history.length - 2];
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;

    return {
      name: fallbackName || ticker.split('.')[0],
      price: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      currency: ticker.endsWith('.NS') || ticker.endsWith('.BO') ? 'INR' : 'USD',
      history: history,
      volume: [],
      avgVolume: 0,
      isSynthetic: true,
    };
  }
};

export const fetchGNewsArticles = async (query: string, companyName: string): Promise<{ title: string; url: string; source?: string; content?: string }[]> => {
  if (!API_CONFIG.GNEWS_API_KEY) {
    console.warn('GNews API key not configured. Skipping GNews fetch.');
    return [];
  }

  try {
    const queryTerm = companyName || query;
    const strictNewsQuery = `"${queryTerm}" AND (stock OR share OR market)`;
    const gNewsUrl = import.meta.env.DEV
      ? `/api/gnews/v4/search?q=${encodeURIComponent(strictNewsQuery)}&lang=en&max=15&apikey=${API_CONFIG.GNEWS_API_KEY}`
      : `https://gnews.io/api/v4/search?q=${encodeURIComponent(strictNewsQuery)}&lang=en&max=15&apikey=${API_CONFIG.GNEWS_API_KEY}`;

    const gNewsRes = await fetchWithTimeout(gNewsUrl, {}, 10000);

    if (gNewsRes.status === 429) {
      console.warn("GNews Rate Limited (429). Falling back...");
      return [];
    }

    if (gNewsRes.ok) {
      const gNewsData = await gNewsRes.json();
      if (gNewsData.articles && gNewsData.articles.length > 0) {
        return gNewsData.articles.map((item: any) => ({
          title: item.title,
          url: item.url || '#',
          source: item.source?.name || 'Google News',
          content: item.content || item.description || ''
        }));
      }
    }
    return [];
  } catch (e: any) {
    if (e?.name === 'AbortError') console.warn('[GNews] Fetch timeout');
    else console.warn("GNews fetch failed:", e);
    return [];
  }
};

export const fetchNewsAndSentiment = async (searchQuery: string, companyName?: string): Promise<SentimentAnalysis | null> => {
  try {
    let rawArticles: { title: string; url: string; source?: string; content?: string }[] = [];

    const [fearGreed, tvData, indianDetails, marketStackData] = await Promise.allSettled([
      fetchEquityFearGreedIndex(),
      fetchTradingViewSentiment(searchQuery),
      fetchIndianStockDetails(searchQuery),
      fetchMarketStackData(searchQuery)
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

    const tvResult = tvData as { socialHeat: number; communitySentiment: CommunitySentiment } | null;
    const { socialHeat = 50, communitySentiment } = tvResult || { socialHeat: 50, communitySentiment: undefined };

    // 1. Primary: GNews (with full article content)
    rawArticles = await fetchGNewsArticles(searchQuery, companyName || '');

    // 2. Secondary: MediaStack
    if (rawArticles.length === 0) {
      try {
        if (!API_CONFIG.MEDIASTACK_API_KEY) {
          console.warn('MediaStack API key not configured. Skipping MediaStack fetch.');
        } else {
          const queryTerm = companyName || searchQuery;
          const mediaUrl = `https://api.mediastack.com/v1/news?access_key=${API_CONFIG.MEDIASTACK_API_KEY}&keywords=${encodeURIComponent(queryTerm)}&languages=en&limit=15`;
          const proxyMediaUrl = getProxyUrl(mediaUrl, 'mediastack');
          const mediaRes = await fetchWithTimeout(proxyMediaUrl, {}, 10000);

          if (mediaRes.status === 429) {
            console.warn("MediaStack Rate Limited (429). Bypassing...");
          } else if (mediaRes.ok) {
            let mediaData;
            if (import.meta.env.DEV) mediaData = await mediaRes.json();
            else {
              const wrapper = await mediaRes.json();
              if (wrapper.contents) mediaData = JSON.parse(wrapper.contents);
            }
            if (mediaData && mediaData.data) {
              rawArticles = mediaData.data.map((item: any) => ({
                title: item.title,
                url: item.url || '#',
                source: item.source || 'Regional Feed',
                content: item.description || ''
              }));
            }
          }
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') console.warn('[MediaStack] Fetch timeout');
      }
    }

    // 3. Tertiary: IndianAPI recentNews
    if (rawArticles.length === 0 && indianDetails && (indianDetails as IndianStockDetails)?.recentNews?.length > 0) {
      console.info("GNews + MediaStack empty — using IndianAPI recentNews");
      const indianDet = indianDetails as IndianStockDetails;
      rawArticles = indianDet.recentNews.map(n => ({ title: n.title, url: n.url, source: n.source }));
    }

    // 4. Quaternary: MarketStack EOD-based synthetic headlines
    if (rawArticles.length === 0 && marketStackData && (marketStackData as MarketStackData)?.eod?.length > 0) {
      console.info("All news APIs exhausted — generating MarketStack EOD-based intelligence summaries");
      const ms = marketStackData as MarketStackData;
      const eod = ms.eod;
      const latest = eod[0];
      const prev = eod.length > 1 ? eod[1] : null;
      if (latest) {
        const change = prev ? ((latest.close - prev.close) / prev.close * 100).toFixed(2) : '0.00';
        const direction = parseFloat(change) >= 0 ? 'gained' : 'lost';
        rawArticles.push({ title: `${searchQuery} ${direction} ${Math.abs(parseFloat(change))}% closing at ${latest.close}`, url: '#', source: 'MarketStack EOD' });
        if (ms.dividends.length > 0) {
          const d = ms.dividends[0];
          rawArticles.push({ title: `${searchQuery} declared dividend of ${d.dividend} on ${d.date}`, url: '#', source: 'MarketStack Dividends' });
        }
        if (ms.splits.length > 0) {
          const s = ms.splits[0];
          rawArticles.push({ title: `${searchQuery} stock split factor ${s.split_factor}x on ${s.date}`, url: '#', source: 'MarketStack Splits' });
        }
        if (eod.length >= 7) {
          const weekAgo = eod[6];
          const weeklyChange = ((latest.close - weekAgo.close) / weekAgo.close * 100).toFixed(2);
          rawArticles.push({ title: `${searchQuery} weekly performance: ${weeklyChange}% move from ${weekAgo.close} to ${latest.close}`, url: '#', source: 'MarketStack EOD' });
        }
        if (eod.length >= 30) {
          const monthAgo = eod[eod.length - 1];
          const monthlyHigh = Math.max(...eod.map(d => d.high));
          const monthlyLow = Math.min(...eod.map(d => d.low));
          const monthlyChange = ((latest.close - monthAgo.close) / monthAgo.close * 100).toFixed(2);
          rawArticles.push({ title: `${searchQuery} 30-day range: ${monthlyLow}-${monthlyHigh}, monthly change ${monthlyChange}%`, url: '#', source: 'MarketStack EOD' });
        }
      }
    }

    if (rawArticles.length === 0 && (!indianDetails || !(indianDetails as IndianStockDetails)?.recentNews?.length)) {
      return {
        avgScore: 0, positive: 0, negative: 0, neutral: 1,
        analyzedData: [{ title: "Awaiting real-time intelligence stream...", category: "Neutral", url: "#", score: 0 }],
        globalFearGreed: fearGreed as number || 50,
        socialHeat,
        communitySentiment: communitySentiment || undefined,
        indianDetails: (indianDetails as IndianStockDetails) || undefined,
        marketData: { marketStack: (marketStackData as MarketStackData) || undefined, indianDetails: (indianDetails as IndianStockDetails) || undefined }
      };
    }

    let positive = 0, negative = 0, neutral = 0, total_score = 0;
    const analyzedData: NewsItem[] = [];
    const seenTitles = new Set<string>();

    const processArticle = (title: string, url: string, source?: string, content?: string) => {
      if (!title || title === '[Removed]') return;
      const normalizedTitle = title.toLowerCase().trim().substring(0, 80);
      if (seenTitles.has(normalizedTitle)) return;
      seenTitles.add(normalizedTitle);

      const analysis = sentimentAnalyzer.analyze(title);
      const comparativeScore = analysis.comparative;

      total_score += comparativeScore;

      let category: 'Positive' | 'Negative' | 'Neutral' = 'Neutral';
      let emotion = "Stability";

      if (comparativeScore > 0.1) { category = 'Positive'; positive++; emotion = "Euphoria"; }
      else if (comparativeScore < -0.1) { category = 'Negative'; negative++; emotion = "Panic"; }
      else if (Math.abs(comparativeScore) < 0.05) { neutral++; emotion = "Uncertainty"; }
      else { emotion = "Cautious"; }

      analyzedData.push({ title, score: comparativeScore, category, url, source, emotion, content });
    };

    for (const article of rawArticles) {
      processArticle(article.title, article.url, article.source, article.content);
    }

    if (indianDetails && (indianDetails as IndianStockDetails)?.recentNews?.length > 0) {
      for (const n of (indianDetails as IndianStockDetails).recentNews) {
        processArticle(n.title, n.url, n.source);
      }
    }

    const validCount = analyzedData.length || 1;
    const avgScore = total_score / validCount;

    return {
      avgScore,
      positive,
      negative,
      neutral,
      analyzedData: analyzedData.length > 0 ? analyzedData : [{ title: "Awaiting real-time intelligence stream...", category: "Neutral", url: "#", score: 0 }],
      globalFearGreed: fearGreed as number || 50,
      socialHeat,
      communitySentiment: communitySentiment || undefined,
      indianDetails: (indianDetails as IndianStockDetails) || undefined,
      marketData: {
        marketStack: (marketStackData as MarketStackData) || undefined,
        indianDetails: (indianDetails as IndianStockDetails) || undefined
      }
    };
  } catch (error) {
    console.error("Multi-node intel fetch collapsed:", error);
    return null;
  }
};
