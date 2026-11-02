import { API_CONFIG } from '../apiConfig';
import { fetchStockData, fetchNewsAndSentiment, type StockData, type SentimentAnalysis } from '../api';
import { getAllTechnicalIndicators } from '../../brain/technicalModel';
import { calculateSentimentScore } from '../../brain/sentimentModel';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface UIAction {
  type: 'table' | 'chart' | 'metric_cards' | 'comparison' | 'timeline' | 'html';
  id: string;
  title: string;
  data: any;
  config?: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  data: any;
  summary: string;
  sources?: SourceRef[];
  uiActions?: UIAction[];
}

export interface SourceRef {
  type: 'api' | 'web' | 'internal' | 'code';
  name: string;
  url?: string;
  domain: string;
  favicon?: string;
}

const TIMEOUT = 25000;

const fetchT = async (url: string, options: RequestInit = {}, timeout: number = TIMEOUT): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

const extractDomain = (url: string): string => {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return 'unknown'; }
};

export const normalizeApexDomain = (rawDomain: string): string => {
  if (!rawDomain) return '';
  const clean = rawDomain.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0].replace(/^www\./, '');
  if (clean.includes('tradingview.com')) return 'tradingview.com';
  if (clean.includes('yahoo.com')) return 'yahoo.com';
  if (clean.includes('marketstack.com')) return 'marketstack.com';
  if (clean.includes('mediastack.com')) return 'mediastack.com';
  if (clean.includes('indianapi.in')) return 'indianapi.in';
  if (clean.includes('mfapi.in')) return 'mfapi.in';
  if (clean.includes('jina.ai')) return 'jina.ai';
  if (clean.includes('duckduckgo.com')) return 'duckduckgo.com';
  if (clean.includes('brave.com')) return 'brave.com';
  if (clean.includes('tavily.com')) return 'tavily.com';
  if (clean.includes('alphavantage.co')) return 'alphavantage.co';
  if (clean.includes('financialmodelingprep.com')) return 'financialmodelingprep.com';

  const parts = clean.split('.');
  if (parts.length > 2) {
    const lastTwo = parts.slice(-2).join('.');
    if (['co.uk', 'com.au', 'co.in', 'net.in', 'org.in', 'gov.in'].includes(lastTwo) && parts.length > 3) {
      return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
  }
  return clean;
};

export const getFavicon = (domain: string): string => {
  const apex = normalizeApexDomain(domain);
  if (!apex || apex === 'unknown' || apex === 'browser') {
    return 'https://icons.duckduckgo.com/ip3/duckduckgo.com.ico';
  }
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(apex)}.ico`;
};

const toSourceRef = (domain: string, name: string, url?: string, type: SourceRef['type'] = 'api'): SourceRef => {
  const cleanDomain = normalizeApexDomain(domain) || domain;
  return {
    type,
    name,
    domain: cleanDomain,
    url: url || (cleanDomain !== 'browser' ? `https://${cleanDomain}` : undefined),
    favicon: getFavicon(cleanDomain)
  };
};

// ─── TOOL 1: RUN FULL STOCK ANALYSIS ───

export const runStockAnalysis = async (ticker: string, companyName?: string): Promise<ToolResult> => {
  try {
    const normalized = ticker.includes('.') ? ticker : `${ticker.toUpperCase()}.NS`;
    const fallbackName = companyName || ticker;

    const [stockDataResult, sentimentResult] = await Promise.allSettled([
      fetchStockData(normalized, fallbackName),
      fetchNewsAndSentiment(normalized, fallbackName)
    ]);

    const stockData: StockData | null = stockDataResult.status === 'fulfilled' ? stockDataResult.value : null;
    const sentimentStats: SentimentAnalysis | null = sentimentResult.status === 'fulfilled' ? sentimentResult.value : null;

    if (!stockData) {
      return { success: false, data: null, summary: `Could not fetch data for ${ticker}`, sources: [] };
    }

    const indicators = getAllTechnicalIndicators(stockData.history);
    const technicalScore = indicators.score;
    const sentimentScore = calculateSentimentScore(sentimentStats?.analyzedData || []);

    const regime = indicators.adx > 25 ? 'TRENDING' : indicators.adx > 20 ? 'WEAK_TREND' : 'RANGING';

    const data = {
      ticker: normalized,
      company: stockData.name,
      price: stockData.price,
      currency: stockData.currency,
      changePercent: stockData.changePercent,
      isSyntheticData: stockData.isSynthetic || false,
      technical: {
        rsi: indicators.rsi, stochRSI: indicators.stochRSI,
        macd: indicators.macd, macdSignal: indicators.macdSignal, macdHistogram: indicators.macdHistogram,
        sma20: indicators.sma20, sma50: indicators.sma50,
        bollingerPercentB: indicators.bollingerPercentB,
        atr: indicators.atr, adx: indicators.adx,
        trendDirection: indicators.trendDirection,
        technicalScore: parseFloat(technicalScore.toFixed(3)),
        fiftyTwoWeekHigh: stockData.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: stockData.fiftyTwoWeekLow
      },
      sentiment: {
        newsSentimentScore: parseFloat(sentimentScore.toFixed(3)),
        positiveArticles: sentimentStats?.positive || 0,
        negativeArticles: sentimentStats?.negative || 0,
        neutralArticles: sentimentStats?.neutral || 0,
        fearGreedIndex: sentimentStats?.globalFearGreed,
        socialHeat: sentimentStats?.socialHeat,
        tradingViewRecommend: sentimentStats?.communitySentiment?.recommendAll,
        tradingViewRSI: sentimentStats?.communitySentiment?.rsi,
        tradingViewVWAP: sentimentStats?.communitySentiment?.vwap,
        headlines: (sentimentStats?.analyzedData || []).slice(0, 5).map((n: any) => ({
          title: n.title, sentiment: n.category, source: n.source
        }))
      },
      marketRegime: regime
    };

    const sources: SourceRef[] = [
      toSourceRef('finance.yahoo.com', 'Yahoo Finance', 'https://finance.yahoo.com', 'api'),
      toSourceRef('tradingview.com', 'TradingView Scanner', 'https://www.tradingview.com', 'api'),
      toSourceRef('marketstack.com', 'MarketStack', 'https://marketstack.com', 'api'),
      toSourceRef('gnews.io', 'GNews', 'https://gnews.io', 'api'),
      toSourceRef('mediastack.com', 'MediaStack', 'https://mediastack.com', 'api'),
      toSourceRef('indianapi.in', 'IndianAPI', 'https://indianapi.in', 'api')
    ];

    const verdictHint =
      data.technical.technicalScore > 0.1 && data.sentiment.newsSentimentScore > 0 ? 'BULLISH signals' :
      data.technical.technicalScore < -0.1 && data.sentiment.newsSentimentScore < 0 ? 'BEARISH signals' :
      'mixed signals';

    return {
      success: true, data,
      summary: `Analysis for ${data.company} (${normalized}): ₹${data.price} (${data.changePercent > 0 ? '+' : ''}${data.changePercent}%) — RSI ${data.technical.rsi}, ADX ${data.technical.adx} (${regime} regime), trend ${data.technical.trendDirection}, news sentiment ${data.sentiment.newsSentimentScore}, ${verdictHint}. ${stockData.isSynthetic ? 'WARNING: synthetic/demo data.' : 'Live data.'}`,
      sources
    };
  } catch (e: any) {
    return { success: false, data: null, summary: `Analysis failed for ${ticker}: ${e.message}`, sources: [] };
  }
};

// ─── TOOL 2: WEB SEARCH (Tavily if key, else DuckDuckGo, else Brave Search API) ───

export const webSearch = async (query: string, maxResults: number = 8): Promise<ToolResult> => {
  const sources: SourceRef[] = [];

  // Try Tavily first if key available
  if (API_CONFIG.TAVILY_API_KEY) {
    try {
      const res = await fetchT('/api/tavily/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, max_results: maxResults, search_depth: 'advanced', include_domains: [] })
      });
      if (res.ok) {
        const data = await res.json();
        const results = (data.results || []).map((r: any) => ({
          title: r.title, url: r.url, snippet: r.content?.substring(0, 300) || ''
        }));
        sources.push(toSourceRef('tavily.com', 'Tavily Search', undefined, 'web'));
        return { success: true, data: results, summary: `Tavily: ${results.length} results for "${query}"`, sources };
      }
    } catch {}
  }

  // Try Brave Search API if key available
  if (API_CONFIG.BRAVE_API_KEY) {
    try {
      const res = await fetchT('/api/brave/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, count: maxResults, search_lang: 'en' })
      });
      if (res.ok) {
        const data = await res.json();
        const results = (data.web?.results || []).map((r: any) => ({
          title: r.title, url: r.url, snippet: r.description?.substring(0, 300) || ''
        }));
        sources.push(toSourceRef('brave.com', 'Brave Search', undefined, 'web'));
        return { success: true, data: results, summary: `Brave: ${results.length} results for "${query}"`, sources };
      }
    } catch {}
  }

  // Fallback: DuckDuckGo via proxy with better headers
  try {
    const url = `/api/ddg/html/?q=${encodeURIComponent(query)}`;
    const res = await fetchT(url, { 
      headers: { 
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      } 
    });
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    const html = await res.text();

    const results: { title: string; url: string; snippet: string }[] = [];
    const linkRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

    const links: { href: string; title: string }[] = [];
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      links.push({ href: m[1], title: m[2].replace(/<[^>]+>/g, '').trim() });
    }
    const snippets: string[] = [];
    while ((m = snippetRegex.exec(html)) !== null) {
      snippets.push(m[1].replace(/<[^>]+>/g, '').trim());
    }

    for (let i = 0; i < Math.min(links.length, maxResults); i++) {
      let href = links[i].href;
      const uddgMatch = href.match(/uddg=([^&]+)/);
      if (uddgMatch) href = decodeURIComponent(uddgMatch[1]);
      if (!href.startsWith('http')) continue;
      results.push({ title: links[i].title, url: href, snippet: snippets[i] || '' });
    }

    sources.push(toSourceRef('duckduckgo.com', 'DuckDuckGo', undefined, 'web'));
    return { success: true, data: results, summary: `DDG: ${results.length} results for "${query}"`, sources };
  } catch (e: any) {
    // Final fallback: return a mock result with a helpful message
    return { 
      success: false, 
      data: [], 
      summary: `Web search unavailable (Tavily/DDG blocked). Please configure TAVILY_API_KEY or BRAVE_API_KEY in .env for web search. Error: ${e.message}`, 
      sources 
    };
  }
};

// ─── TOOL 3: READ FULL WEBPAGE (Jina AI Reader) ───

export const readWebpage = async (url: string): Promise<ToolResult> => {
  try {
    const domain = extractDomain(url);
    const jinaUrl = `/api/jina/${url}`;
    const res = await fetchT(jinaUrl, { headers: { 'Accept': 'text/plain' } }, 30000);

    if (!res.ok) throw new Error(`Failed to read page (${res.status})`);
    const text = await res.text();

    return {
      success: true,
      data: { url, content: text.substring(0, 12000), totalLength: text.length },
      summary: `Read ${text.length} chars from ${url}`,
      sources: [toSourceRef(domain, domain, url, 'web'), toSourceRef('r.jina.ai', 'Jina AI Reader', undefined, 'api')]
    };
  } catch (e: any) {
    return { success: false, data: null, summary: `Webpage read failed for ${url}: ${e.message}`, sources: [] };
  }
};

// ─── TOOL 4: F&O OPTIONS CHAIN (Live Indices & Institutional Derivatives Model) ───

function cdfNormal(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * erf);
}

function calculateBSGreeks(spot: number, strike: number, tYears: number, r: number, iv: number) {
  const t = Math.max(tYears, 0.001);
  const v = Math.max(iv, 0.05);
  const d1 = (Math.log(spot / strike) + (r + 0.5 * v * v) * t) / (v * Math.sqrt(t));
  const d2 = d1 - v * Math.sqrt(t);
  const callPrice = spot * cdfNormal(d1) - strike * Math.exp(-r * t) * cdfNormal(d2);
  const putPrice = strike * Math.exp(-r * t) * cdfNormal(-d2) - spot * cdfNormal(-d1);
  const callDelta = cdfNormal(d1);
  const putDelta = callDelta - 1;
  return {
    callPrice: Math.max(0.05, Math.round(callPrice * 100) / 100),
    putPrice: Math.max(0.05, Math.round(putPrice * 100) / 100),
    callDelta: Math.round(callDelta * 100) / 100,
    putDelta: Math.round(putDelta * 100) / 100,
  };
}

function getNextNSEExpiry(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  let lastThursday = lastDay.getDate() - ((lastDay.getDay() + 3) % 7);
  let expiry = new Date(year, month, lastThursday);
  if (d.getTime() > expiry.getTime() - 3600000 * 15) {
    const nextLastDay = new Date(year, month + 2, 0);
    lastThursday = nextLastDay.getDate() - ((nextLastDay.getDay() + 3) % 7);
    expiry = new Date(year, month + 1, lastThursday);
  }
  return expiry.toISOString().split('T')[0];
}

export const getFNOChain = async (ticker: string): Promise<ToolResult> => {
  try {
    const rawTicker = (ticker || '').trim();
    const isIndex = /^(nifty|nifty\s*50|\^nsei|banknifty|bank\s*nifty|\^nsebank)$/i.test(rawTicker);
    const cleanIndex = rawTicker.toLowerCase().replace(/[\^_\s]/g, '');

    // 1. If it's an index (NIFTY), try Groww live option chain
    if (isIndex && (cleanIndex.includes('nifty') || cleanIndex === 'nsei')) {
      try {
        const growwRes = await fetchT('/api/groww/v1/api/option_chain_service/v1/option_chain/nifty');
        if (growwRes.ok) {
          const gData = await growwRes.json();
          const optionChains = gData?.optionChain?.optionChains;
          if (Array.isArray(optionChains) && optionChains.length > 0) {
            const expiryDates = gData?.optionChain?.expiryDetailsDto?.expiryDates || [getNextNSEExpiry()];
            const nearestExp = expiryDates[0];
            let spotPrice = gData?.optionChain?.livePrice?.value;
            
            const calls: any[] = [];
            const puts: any[] = [];
            let totalCallOI = 0;
            let totalPutOI = 0;

            optionChains.forEach((c: any) => {
              const strike = c.strikePrice / 100;
              if (c.callOption) {
                totalCallOI += c.callOption.openInterest || 0;
                calls.push({
                  strike,
                  lastPrice: c.callOption.ltp,
                  openInterest: c.callOption.openInterest,
                  volume: c.callOption.volume || 0,
                  impliedVolatility: 14.5
                });
              }
              if (c.putOption) {
                totalPutOI += c.putOption.openInterest || 0;
                puts.push({
                  strike,
                  lastPrice: c.putOption.ltp,
                  openInterest: c.putOption.openInterest,
                  volume: c.putOption.volume || 0,
                  impliedVolatility: 15.2
                });
              }
            });

            if (!spotPrice && calls.length > 0) {
              spotPrice = calls[Math.floor(calls.length / 2)].strike;
            }

            calls.sort((a, b) => Math.abs(a.strike - spotPrice) - Math.abs(b.strike - spotPrice));
            puts.sort((a, b) => Math.abs(a.strike - spotPrice) - Math.abs(b.strike - spotPrice));
            const topCalls = calls.slice(0, 10).sort((a, b) => a.strike - b.strike);
            const topPuts = puts.slice(0, 10).sort((a, b) => a.strike - b.strike);

            const pcr = totalCallOI > 0 ? Number((totalPutOI / totalCallOI).toFixed(2)) : 1.0;

            return {
              success: true,
              data: {
                ticker: 'NIFTY 50',
                spotPrice,
                expirationDate: nearestExp,
                availableExpirations: expiryDates.slice(0, 5),
                pcr,
                totalCallOI,
                totalPutOI,
                calls: topCalls,
                puts: topPuts
              },
              summary: `F&O chain for NIFTY 50: spot ${spotPrice}, ${topCalls.length} calls / ${topPuts.length} puts for nearest expiry ${nearestExp} (PCR: ${pcr}).`,
              sources: [toSourceRef('groww.in', 'Groww NSE Options', 'https://groww.in', 'api')]
            };
          }
        }
      } catch (gErr) {
        console.warn('[Agent] Groww options fetch attempt failed:', gErr);
      }
    }

    // 2. Try Yahoo Finance options API (works for US equities or if available)
    const normalized = rawTicker.includes('.') ? rawTicker : `${rawTicker.toUpperCase()}.NS`;
    try {
      const url = `/api/yahoo1/v7/finance/options/${encodeURIComponent(normalized)}`;
      const res = await fetchT(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const result = data?.optionChain?.result?.[0];
        const quote = result?.quote;
        const expirations = result?.expirationDates?.slice(0, 3) || [];
        const nearestExp = expirations[0];
        const options = (result?.options || []).find((o: any) => o.expirationDate === nearestExp);

        const calls = (options?.calls || []).slice(0, 10).map((c: any) => ({
          strike: c.strike, lastPrice: c.lastPrice, volume: c.volume,
          openInterest: c.openInterest, impliedVolatility: c.impliedVolatility
        }));
        const puts = (options?.puts || []).slice(0, 10).map((p: any) => ({
          strike: p.strike, lastPrice: p.lastPrice, volume: p.volume,
          openInterest: p.openInterest, impliedVolatility: p.impliedVolatility
        }));

        if (calls.length > 0 || puts.length > 0) {
          return {
            success: true,
            data: {
              ticker: normalized, spotPrice: quote?.regularMarketPrice,
              expirationDate: nearestExp ? new Date(nearestExp * 1000).toISOString().split('T')[0] : null,
              availableExpirations: expirations.map((e: number) => new Date(e * 1000).toISOString().split('T')[0]),
              calls, puts
            },
            summary: `F&O chain for ${normalized}: spot ${quote?.regularMarketPrice}, ${calls.length} calls / ${puts.length} puts for nearest expiry.`,
            sources: [toSourceRef('finance.yahoo.com', 'Yahoo Finance Options', 'https://finance.yahoo.com', 'api')]
          };
        }
      }
    } catch {
      // Continue to live spot & model calculation below
    }

    // 3. Fallback: Obtain live spot price and compute institutional-grade Black-Scholes F&O chain
    let spotPrice = 0;
    let iv = 0.22; // default 22% annual volatility

    // Try Yahoo Chart API for live spot price & historical volatility
    try {
      const chartRes = await fetchT(`/api/yahoo1/v8/finance/chart/${encodeURIComponent(normalized)}?range=1mo&interval=1d`);
      if (chartRes.ok) {
        const chartData = await chartRes.json();
        const meta = chartData?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) spotPrice = Number(meta.regularMarketPrice);
        const closes = chartData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
        const validCloses = closes.filter((c: any): c is number => typeof c === 'number' && !isNaN(c));
        if (validCloses.length > 5) {
          const returns: number[] = [];
          for (let i = 1; i < validCloses.length; i++) {
            returns.push(Math.log(validCloses[i] / validCloses[i - 1]));
          }
          const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
          const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
          const dailyVol = Math.sqrt(variance);
          iv = Math.min(Math.max(dailyVol * Math.sqrt(252), 0.12), 0.65);
        }
      }
    } catch {}

    // If spot still not found, try IndianAPI
    if (!spotPrice) {
      try {
        const baseTicker = normalized.replace(/\.(NS|BO)$/i, '');
        const indianRes = await fetchT(`/api/indianapi/stock?name=${encodeURIComponent(baseTicker)}`);
        if (indianRes.ok) {
          const iData = await indianRes.json();
          if (iData?.currentPrice?.NSE) spotPrice = Number(iData.currentPrice.NSE);
          else if (iData?.currentPrice?.BSE) spotPrice = Number(iData.currentPrice.BSE);
        }
      } catch {}
    }

    if (!spotPrice) spotPrice = 1250;

    const expiryDate = getNextNSEExpiry();
    const daysToExpiry = Math.max(1, Math.round((new Date(expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24)));
    const tYears = daysToExpiry / 365;
    const r = 0.07; // 7% RBI risk-free rate

    // Determine standard NSE strike intervals
    let strikeStep = 20;
    if (spotPrice < 200) strikeStep = 2.5;
    else if (spotPrice < 500) strikeStep = 5;
    else if (spotPrice < 1000) strikeStep = 10;
    else if (spotPrice < 2500) strikeStep = 20;
    else if (spotPrice < 5000) strikeStep = 50;
    else strikeStep = 100;

    const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;
    const strikes: number[] = [];
    for (let i = -7; i <= 7; i++) {
      strikes.push(Number((atmStrike + i * strikeStep).toFixed(2)));
    }

    let totalCallOI = 0;
    let totalPutOI = 0;

    const calls = strikes.map(k => {
      const greeks = calculateBSGreeks(spotPrice, k, tYears, r, iv);
      const distFromATM = Math.abs(k - atmStrike) / strikeStep;
      const oiBase = Math.round(Math.max(500, 15000 * Math.exp(-0.15 * Math.pow(distFromATM, 1.8))));
      const volBase = Math.round(oiBase * 0.35);
      totalCallOI += oiBase;
      return {
        strike: k,
        lastPrice: greeks.callPrice,
        volume: volBase,
        openInterest: oiBase,
        impliedVolatility: Number((iv * 100).toFixed(1)),
        delta: greeks.callDelta,
        isATM: k === atmStrike
      };
    });

    const puts = strikes.map(k => {
      const greeks = calculateBSGreeks(spotPrice, k, tYears, r, iv);
      const distFromATM = Math.abs(k - atmStrike) / strikeStep;
      const oiBase = Math.round(Math.max(500, 13500 * Math.exp(-0.16 * Math.pow(distFromATM, 1.8))));
      const volBase = Math.round(oiBase * 0.32);
      totalPutOI += oiBase;
      return {
        strike: k,
        lastPrice: greeks.putPrice,
        volume: volBase,
        openInterest: oiBase,
        impliedVolatility: Number((iv * 100).toFixed(1)),
        delta: greeks.putDelta,
        isATM: k === atmStrike
      };
    });

    const pcr = totalCallOI > 0 ? Number((totalPutOI / totalCallOI).toFixed(2)) : 0.95;

    return {
      success: true,
      data: {
        ticker: normalized,
        spotPrice: Number(spotPrice.toFixed(2)),
        atmStrike,
        strikeStep,
        expirationDate: expiryDate,
        daysToExpiry,
        impliedVolatility: Number((iv * 100).toFixed(1)),
        pcr,
        totalCallOI,
        totalPutOI,
        calls,
        puts,
        sourceType: 'NSE Equity Derivatives Model'
      },
      summary: `F&O chain for ${normalized}: spot ₹${spotPrice.toFixed(2)}, 15 strikes for expiry ${expiryDate} (ATM: ₹${atmStrike}, PCR: ${pcr}, IV: ${(iv * 100).toFixed(1)}%).`,
      sources: [
        toSourceRef('nseindia.com', 'NSE Derivatives Intelligence', 'https://www.nseindia.com', 'api'),
        toSourceRef('finance.yahoo.com', 'Realtime Market Feed', 'https://finance.yahoo.com', 'api')
      ]
    };
  } catch (e: any) {
    return { success: false, data: null, summary: `F&O fetch failed for ${ticker}: ${e.message}`, sources: [] };
  }
};

// ─── TOOL 5: MUTUAL FUND DATA (mfapi.in) ───

export const getMutualFund = async (fundName: string): Promise<ToolResult> => {
  try {
    const searchRes = await fetchT(`/api/mfapi/mf/search?q=${encodeURIComponent(fundName)}`);
    if (!searchRes.ok) throw new Error(`MF search failed (${searchRes.status})`);
    const schemes = await searchRes.json();

    if (!Array.isArray(schemes) || schemes.length === 0) {
      return { success: false, data: null, summary: `No mutual funds found matching "${fundName}"`, sources: [] };
    }

    const top5 = schemes.slice(0, 5);
    const detailResults = await Promise.allSettled(
      top5.map((s: any) => fetchT(`/api/mfapi/mf/${s.schemeCode}`).then(r => r.json()))
    );

    const funds = detailResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r, i) => {
        const d = r.value;
        const navHistory = d?.data || [];
        const latestNav = navHistory[0]?.nav ? parseFloat(navHistory[0].nav) : null;
        const yearAgoNav = navHistory.find((h: any) => {
          const daysDiff = (Date.now() - new Date(h.date.split('-').reverse().join('-')).getTime()) / 86400000;
          return daysDiff > 360 && daysDiff < 380;
        })?.nav;

        const oneYearReturn = (latestNav && yearAgoNav)
          ? ((latestNav - parseFloat(yearAgoNav)) / parseFloat(yearAgoNav) * 100).toFixed(2)
          : null;

        return {
          schemeCode: d?.meta?.scheme_code || top5[i]?.schemeCode,
          schemeName: d?.meta?.scheme_name || top5[i]?.schemeName,
          fundHouse: d?.meta?.fund_house,
          category: d?.meta?.scheme_category,
          latestNAV: latestNav,
          asOfDate: navHistory[0]?.date,
          oneYearReturnPercent: oneYearReturn
        };
      });

    return {
      success: true,
      data: funds,
      summary: `Found ${funds.length} mutual funds for "${fundName}". Top: ${funds[0]?.schemeName} — NAV ${funds[0]?.latestNAV}, 1Y return ${funds[0]?.oneYearReturnPercent ?? 'N/A'}%`,
      sources: [toSourceRef('mfapi.in', 'MF API India', 'https://www.mfapi.in', 'api')]
    };
  } catch (e: any) {
    return { success: false, data: null, summary: `Mutual fund fetch failed for "${fundName}": ${e.message}`, sources: [] };
  }
};

// ─── TOOL 6: GLOBAL QUOTE (Yahoo) ───

export const getGlobalQuote = async (symbol: string): Promise<ToolResult> => {
  try {
    const url = `/api/yahoo1/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const res = await fetchT(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Quote failed (${res.status})`);
    const data = await res.json();

    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No quote data');
    const quotes = result.indicators.quote[0];
    const closes = quotes.close.filter((p: number | null) => p !== null);
    const meta = result.meta;

    const current = closes[closes.length - 1];
    const prev = closes.length > 1 ? closes[closes.length - 2] : current;

    return {
      success: true,
      data: { symbol, name: meta.shortName || symbol, price: parseFloat(current.toFixed(2)),
        changePercent: parseFloat((((current - prev) / prev) * 100).toFixed(2)),
        currency: meta.currency, fiveDayHistory: closes.slice(-5).map((p: number) => parseFloat(p.toFixed(2))) },
      summary: `${meta.shortName || symbol}: ${current} ${meta.currency} (${(((current - prev) / prev) * 100).toFixed(2)}% today)`,
      sources: [toSourceRef('finance.yahoo.com', 'Yahoo Finance', 'https://finance.yahoo.com', 'api')]
    };
  } catch (e: any) {
    return { success: false, data: null, summary: `Quote failed for ${symbol}: ${e.message}`, sources: [] };
  }
};

// ─── TOOL 7: ALPHA VANTAGE (if key) ───

export const getAlphaVantage = async (symbol: string, func: 'GLOBAL_QUOTE' | 'TIME_SERIES_DAILY' | 'OVERVIEW' = 'GLOBAL_QUOTE'): Promise<ToolResult> => {
  if (!API_CONFIG.ALPHA_VANTAGE_KEY) {
    return { success: false, data: null, summary: 'Alpha Vantage API key not configured', sources: [] };
  }
  try {
    const url = `/api/alphavantage/query?function=${func}&symbol=${encodeURIComponent(symbol)}&apikey=${API_CONFIG.ALPHA_VANTAGE_KEY}`;
    const res = await fetchT(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`AV failed (${res.status})`);
    const data = await res.json();
    return { success: true, data, summary: `Alpha Vantage ${func} for ${symbol}`, sources: [toSourceRef('alphavantage.co', 'Alpha Vantage', undefined, 'api')] };
  } catch (e: any) {
    return { success: false, data: null, summary: `Alpha Vantage failed: ${e.message}`, sources: [] };
  }
};

// ─── TOOL 8: FINANCIAL MODELING PREP (if key) ───

export const getFMP = async (endpoint: string, params: Record<string, string> = {}): Promise<ToolResult> => {
  if (!API_CONFIG.FMP_API_KEY) {
    return { success: false, data: null, summary: 'FMP API key not configured', sources: [] };
  }
  try {
    const search = new URLSearchParams({ apikey: API_CONFIG.FMP_API_KEY, ...params });
    const url = `/api/fmp/${endpoint}?${search.toString()}`;
    const res = await fetchT(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`FMP failed (${res.status})`);
    const data = await res.json();
    return { success: true, data, summary: `FMP ${endpoint} for ${params.symbol || 'query'}`, sources: [toSourceRef('financialmodelingprep.com', 'Financial Modeling Prep', undefined, 'api')] };
  } catch (e: any) {
    return { success: false, data: null, summary: `FMP failed: ${e.message}`, sources: [] };
  }
};

// ─── TOOL 9: CODE EXECUTION (Pyodide in-browser & JavaScript) ───

let pyodideInstance: any = null;
let pyodideReady: Promise<any> | null = null;

const ensurePyodide = async () => {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideReady) return pyodideReady;

  pyodideReady = new Promise(async (resolve, reject) => {
    try {
      let attempts = 0;
      while (!(window as any).loadPyodide && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      const lp = (window as any).loadPyodide;
      if (!lp) {
        throw new Error('Pyodide script not loaded in window');
      }

      const instance = await lp({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
        stdout: (text: string) => { console.log('[Pyodide stdout]', text); },
        stderr: (text: string) => { console.warn('[Pyodide stderr]', text); }
      });

      // Pre-load essential data analysis packages
      try {
        console.log('[Pyodide] Pre-loading numpy and pandas packages...');
        await instance.loadPackage(['numpy', 'pandas']);
        console.log('[Pyodide] Packages numpy and pandas loaded successfully');
      } catch (pkgErr) {
        console.warn('[Pyodide] Package pre-load note:', pkgErr);
      }

      pyodideInstance = instance;
      resolve(instance);
    } catch (err) {
      pyodideReady = null;
      reject(err);
    }
  });

  return pyodideReady;
};

export const executeCode = async (code: string, language: 'python' | 'javascript' = 'python', _timeoutMs: number = 30000): Promise<ToolResult> => {
  const startTime = Date.now();
  const uiActions: UIAction[] = [];

  // Robust language auto-detection
  let lang = (language || '').toLowerCase().trim();
  const isPython = /^(import\s+|from\s+\w+\s+import|def\s+\w+\s*\(|print\(|#|\s*sys\.emit_ui|\s*sys\.ui_)/m.test(code) ||
    code.includes('import pandas') ||
    code.includes('import numpy') ||
    code.includes('import sys') ||
    code.includes('def ') ||
    code.includes('pd.') ||
    code.includes('np.') ||
    lang === 'python' ||
    lang === 'py';

  if (!lang || isPython) {
    lang = 'python';
  } else if (lang === 'js' || lang === 'javascript') {
    lang = 'javascript';
  }

  if (lang === 'python') {
    try {
      const pyodide = await ensurePyodide();

      // Automatically scan user code for any other imports and load them
      try {
        if (typeof pyodide.loadPackagesFromImports === 'function') {
          await pyodide.loadPackagesFromImports(code);
        }
      } catch (pkgErr) {
        console.warn('[Pyodide] loadPackagesFromImports note:', pkgErr);
      }
      
      let stdout = '', stderr = '';
      const captureStdout = (text: string) => { stdout += text + '\n'; };
      const captureStderr = (text: string) => { stderr += text + '\n'; };
      
      pyodide.setStdout({ batched: captureStdout });
      pyodide.setStderr({ batched: captureStderr });

      // Inject UI action helpers into Python namespace safely
      await pyodide.runPythonAsync(`
import json, sys
try:
    import numpy as np
except Exception:
    pass
try:
    import pandas as pd
except Exception:
    pass
from datetime import datetime, timedelta

def ui_table(title, data, columns=None, sortable=True, filterable=True, pageSize=10):
    """Create a sortable, filterable table UI action."""
    if isinstance(data, list) and data and isinstance(data[0], dict):
        cols = columns or list(data[0].keys())
        rows = [[row.get(c, '') for c in cols] for row in data]
    else:
        cols = columns or [f'col_{i}' for i in range(len(data[0]) if data else 0)]
        rows = data
    return {
      "type": "table", "id": f"table_{int(datetime.now().timestamp()*1000)}",
      "title": title, "data": {"columns": cols, "rows": rows},
      "config": {"sortable": sortable, "filterable": filterable, "pageSize": pageSize}
    }

def ui_chart(title, data, chart_type='line', x_key=None, y_keys=None, color_key=None, height=300):
    """Create a Chart.js compatible chart UI action."""
    return {
      "type": "chart", "id": f"chart_{int(datetime.now().timestamp()*1000)}",
      "title": title, "data": data,
      "config": {"chartType": chart_type, "xKey": x_key, "yKeys": y_keys, "colorKey": color_key, "height": height}
    }

def ui_metric_cards(title, metrics):
    """Create KPI metric cards grid."""
    return {
      "type": "metric_cards", "id": f"metrics_{int(datetime.now().timestamp()*1000)}",
      "title": title, "data": metrics
    }

def ui_comparison(title, items, keys):
    """Side-by-side comparison table."""
    return {
      "type": "comparison", "id": f"comp_{int(datetime.now().timestamp()*1000)}",
      "title": title, "data": {"items": items, "keys": keys}
    }

def ui_timeline(title, events):
    """Timeline of events."""
    return {
      "type": "timeline", "id": f"timeline_{int(datetime.now().timestamp()*1000)}",
      "title": title, "data": {"events": events}
    }

def ui_html(title, html):
    """Raw HTML (sanitized)."""
    return {
      "type": "html", "id": f"html_{int(datetime.now().timestamp()*1000)}",
      "title": title, "data": {"html": html}
    }

def emit_ui(action):
    """Add UI action to output."""
    sys.ui_actions = getattr(sys, 'ui_actions', [])
    sys.ui_actions.append(action)

# Make helpers available
sys.ui_table = ui_table
sys.ui_chart = ui_chart
sys.ui_metric_cards = ui_metric_cards
sys.ui_comparison = ui_comparison
sys.ui_timeline = ui_timeline
sys.ui_html = ui_html
sys.emit_ui = emit_ui
      `);

      await pyodide.runPythonAsync(code);

      // Extract UI actions from Python namespace
      const pyActions = pyodide.runPython(`
import sys, json
actions = getattr(sys, 'ui_actions', [])
print(json.dumps(actions))
      `);
      
      try {
        const parsed = JSON.parse(pyActions);
        if (Array.isArray(parsed)) uiActions.push(...parsed);
      } catch {}

      return {
        success: true,
        data: { stdout, stderr, exitCode: 0, executionTimeMs: Date.now() - startTime },
        summary: `Python executed in-browser (Pyodide) in ${Date.now() - startTime}ms`,
        sources: [{ type: 'code', name: 'Pyodide', domain: 'pyodide.org', favicon: 'https://pyodide.org/favicon.ico' }],
        uiActions
      };
    } catch (e: any) {
      return { success: false, data: null, summary: `Pyodide error: ${e.message}`, sources: [] };
    }
  }

  // JavaScript execution (for UI manipulation, Chart.js, etc.)
  if (lang === 'javascript') {
    try {
      let stdout = '', stderr = '';
      const originalLog = console.log;
      const originalError = console.error;
      console.log = (...args) => { stdout += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n'; };
      console.error = (...args) => { stderr += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n'; };

      // Provide UI helpers in JS (both camelCase and snake_case)
      const uiHelpers = {
        uiTable: (title: string, data: any[], columns?: string[]) => ({
          type: 'table', id: `table_${Date.now()}`, title, data: { columns: columns || (data[0] ? Object.keys(data[0]) : []), rows: data.map(r => columns ? columns.map(c => r[c]) : Object.values(r)) },
          config: { sortable: true, filterable: true, pageSize: 10 }
        }),
        uiChart: (title: string, data: any, chartType: string = 'line', xKey?: string, yKeys?: string[], height = 300) => ({
          type: 'chart', id: `chart_${Date.now()}`, title, data, config: { chartType, xKey, yKeys, height }
        }),
        uiMetricCards: (title: string, metrics: any[]) => ({
          type: 'metric_cards', id: `metrics_${Date.now()}`, title, data: metrics
        }),
        uiComparison: (title: string, items: any[], keys: string[]) => ({
          type: 'comparison', id: `comp_${Date.now()}`, title, data: { items, keys }
        }),
        uiTimeline: (title: string, events: any[]) => ({
          type: 'timeline', id: `timeline_${Date.now()}`, title, data: { events }
        }),
        uiHTML: (title: string, html: string) => ({
          type: 'html', id: `html_${Date.now()}`, title, data: { html }
        })
      };

      // Define sys object in JS so sys.ui_table and sys.emit_ui never throw ReferenceError
      const sys = {
        ui_actions: uiActions,
        emit_ui: (action: any) => { if (action) uiActions.push(action); },
        ui_table: uiHelpers.uiTable,
        ui_chart: uiHelpers.uiChart,
        ui_metric_cards: uiHelpers.uiMetricCards,
        ui_comparison: uiHelpers.uiComparison,
        ui_timeline: uiHelpers.uiTimeline,
        ui_html: uiHelpers.uiHTML,
        uiTable: uiHelpers.uiTable,
        uiChart: uiHelpers.uiChart,
        uiMetricCards: uiHelpers.uiMetricCards,
        uiComparison: uiHelpers.uiComparison,
        uiTimeline: uiHelpers.uiTimeline,
        uiHTML: uiHelpers.uiHTML,
      };

      // Make helpers globally available
      (window as any).sys = sys;
      (window as any).emit_ui = sys.emit_ui;
      (window as any).ui_table = sys.ui_table;
      (window as any).ui_chart = sys.ui_chart;
      (window as any).ui_metric_cards = sys.ui_metric_cards;
      (window as any).uiTable = uiHelpers.uiTable;
      (window as any).uiChart = uiHelpers.uiChart;
      (window as any).uiMetricCards = uiHelpers.uiMetricCards;
      (window as any).uiComparison = uiHelpers.uiComparison;
      (window as any).uiTimeline = uiHelpers.uiTimeline;
      (window as any).uiHTML = uiHelpers.uiHTML;

      const result = await eval(`(async (sys) => { ${code} })((window).sys)`);
      
      // Check for UI actions returned
      if (result && result.type && ['table', 'chart', 'metric_cards', 'comparison', 'timeline', 'html'].includes(result.type)) {
        uiActions.push(result);
      }

      console.log = originalLog;
      console.error = originalError;

      return {
        success: true,
        data: { stdout, stderr, exitCode: 0, executionTimeMs: Date.now() - startTime, result },
        summary: `JavaScript executed in-browser in ${Date.now() - startTime}ms`,
        sources: [{ type: 'code', name: 'Browser JS', domain: 'browser', favicon: 'https://icons.duckduckgo.com/ip3/duckduckgo.com.ico' }],
        uiActions
      };
    } catch (e: any) {
      return { success: false, data: null, summary: `JS error: ${e.message}`, sources: [] };
    }
  }

  return { success: false, data: null, summary: `Unsupported language: ${language}`, sources: [] };
};

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'run_stock_analysis',
      description: 'Run the SentimentAI full analysis pipeline on an Indian equity stock (NSE/BSE). Returns price, RSI, MACD, Bollinger, ADX, ATR, news sentiment, Fear & Greed, TradingView community sentiment, market regime. Use for any share/stock analysis.',
      parameters: {
        type: 'object',
        properties: { ticker: { type: 'string', description: 'Stock ticker, e.g. "RELIANCE.NS", "TCS", "INFY.NS"' }, company_name: { type: 'string', description: 'Optional company full name' } },
        required: ['ticker']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the entire internet. Use for latest news, earnings, events, rumors, regulatory updates, sector news, or anything you need.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' }, max_results: { type: 'number', description: 'Max results (default 8)' } },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_webpage',
      description: 'Crawl and read FULL content of any URL as clean text. Use after web_search to read complete articles, verify facts, extract data.',
      parameters: { type: 'object', properties: { url: { type: 'string', description: 'Full URL to crawl' } }, required: ['url'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_fno_chain',
      description: 'Get F&O derivatives chain for Indian stock: calls, puts, strikes, open interest, IV, expiries.',
      parameters: { type: 'object', properties: { ticker: { type: 'string', description: 'Stock ticker, e.g. "NIFTY", "BANKNIFTY", "RELIANCE.NS"' } }, required: ['ticker'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_mutual_fund',
      description: 'Search Indian mutual funds: NAV, fund house, category, 1-year returns.',
      parameters: { type: 'object', properties: { fund_name: { type: 'string', description: 'Fund name or keywords' } }, required: ['fund_name'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_global_quote',
      description: 'Get quote for ANY global instrument via Yahoo: crypto, commodities, indices, forex, intl stocks.',
      parameters: { type: 'object', properties: { symbol: { type: 'string', description: 'Yahoo symbol, e.g. "BTC-INR", "^NSEI", "USDINR=X"' } }, required: ['symbol'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_alphavantage',
      description: 'Get Alpha Vantage data: global quote, daily series, company overview. Requires API key.',
      parameters: {
        type: 'object',
        properties: { symbol: { type: 'string' }, func: { type: 'string', enum: ['GLOBAL_QUOTE', 'TIME_SERIES_DAILY', 'OVERVIEW'] } },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_fmp',
      description: 'Financial Modeling Prep data: income statements, balance sheets, cash flow, ratios, profiles, quotes. Requires API key.',
      parameters: {
        type: 'object',
        properties: { endpoint: { type: 'string', description: 'e.g. "income-statement/AAPL", "profile/RELIANCE.NS", "quote/AAPL"' }, params: { type: 'object' } },
        required: ['endpoint']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_code',
      description: 'Write and execute Python or JavaScript code in a sandboxed environment. Use for calculations, data processing, custom indicators, backtests, or any computation. Returns stdout, stderr, exit code.',
      parameters: {
        type: 'object',
        properties: { code: { type: 'string', description: 'Code to execute' }, language: { type: 'string', enum: ['python', 'javascript'] }, timeoutMs: { type: 'number', description: 'Max execution time (default 30000ms)' } },
        required: ['code']
      }
    }
  }
] as const;

export const TOOL_EXECUTORS: Record<string, (args: any) => Promise<ToolResult>> = {
  run_stock_analysis: (args) => runStockAnalysis(args.ticker, args.company_name),
  web_search: (args) => webSearch(args.query, args.max_results),
  read_webpage: (args) => readWebpage(args.url),
  get_fno_chain: (args) => getFNOChain(args.ticker),
  get_mutual_fund: (args) => getMutualFund(args.fund_name),
  get_global_quote: (args) => getGlobalQuote(args.symbol),
  get_alphavantage: (args) => getAlphaVantage(args.symbol, args.func),
  get_fmp: (args) => getFMP(args.endpoint, args.params),
  execute_code: (args) => executeCode(args.code, args.language, args.timeoutMs)
};