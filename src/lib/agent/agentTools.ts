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

export interface ToolResult {
  success: boolean;
  data: any;
  summary: string;
}

const TIMEOUT = 20000;

const fetchT = async (url: string, options: RequestInit = {}, timeout: number = TIMEOUT): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

// ─── TOOL 1: RUN FULL STOCK ANALYSIS (the webapp's own engine) ───

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
      return { success: false, data: null, summary: `Could not fetch data for ${ticker}` };
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
        rsi: indicators.rsi,
        stochRSI: indicators.stochRSI,
        macd: indicators.macd,
        macdSignal: indicators.macdSignal,
        macdHistogram: indicators.macdHistogram,
        sma20: indicators.sma20,
        sma50: indicators.sma50,
        bollingerPercentB: indicators.bollingerPercentB,
        atr: indicators.atr,
        adx: indicators.adx,
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
          title: n.title,
          sentiment: n.category,
          source: n.source
        }))
      },
      marketRegime: regime
    };

    const verdictHint =
      data.technical.technicalScore > 0.1 && data.sentiment.newsSentimentScore > 0 ? 'BULLISH signals' :
      data.technical.technicalScore < -0.1 && data.sentiment.newsSentimentScore < 0 ? 'BEARISH signals' :
      'mixed signals';

    return {
      success: true,
      data,
      summary: `Analysis for ${data.company} (${normalized}): ₹${data.price} (${data.changePercent > 0 ? '+' : ''}${data.changePercent}%) — RSI ${data.technical.rsi}, ADX ${data.technical.adx} (${regime} regime), trend ${data.technical.trendDirection}, news sentiment ${data.sentiment.newsSentimentScore}, ${verdictHint}. ${stockData.isSynthetic ? 'WARNING: synthetic/demo data — live feed unavailable.' : 'Live data.'}`
    };
  } catch (e: any) {
    return { success: false, data: null, summary: `Analysis failed for ${ticker}: ${e.message}` };
  }
};

// ─── TOOL 2: WEB SEARCH (free, no API key needed) ───

export const webSearch = async (query: string, maxResults: number = 8): Promise<ToolResult> => {
  try {
    const url = `/api/ddg/html/?q=${encodeURIComponent(query)}`;
    const res = await fetchT(url, { headers: { 'Accept': 'text/html' } });

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
      results.push({
        title: links[i].title,
        url: href,
        snippet: snippets[i] || ''
      });
    }

    if (results.length === 0) {
      return { success: false, data: [], summary: `No search results found for "${query}"` };
    }

    return {
      success: true,
      data: results,
      summary: `Found ${results.length} results for "${query}": ` + results.slice(0, 3).map(r => `"${r.title}" (${r.url})`).join('; ')
    };
  } catch (e: any) {
    return { success: false, data: [], summary: `Web search failed: ${e.message}` };
  }
};

// ─── TOOL 3: READ FULL WEBPAGE (Jina AI Reader — free crawler) ───

export const readWebpage = async (url: string): Promise<ToolResult> => {
  try {
    const jinaUrl = `/api/jina/${url}`;
    const res = await fetchT(jinaUrl, { headers: { 'Accept': 'text/plain' } }, 25000);

    if (!res.ok) throw new Error(`Failed to read page (${res.status})`);
    const text = await res.text();

    const truncated = text.substring(0, 8000);
    const summary = `Read ${text.length} chars from ${url}. First 200: "${text.substring(0, 200).replace(/\n/g, ' ')}..."`;

    return { success: true, data: { url, content: truncated, totalLength: text.length }, summary };
  } catch (e: any) {
    return { success: false, data: null, summary: `Webpage read failed for ${url}: ${e.message}` };
  }
};

// ─── TOOL 4: F&O OPTIONS CHAIN (Yahoo Finance) ───

export const getFNOChain = async (ticker: string): Promise<ToolResult> => {
  try {
    const normalized = ticker.includes('.') ? ticker : `${ticker.toUpperCase()}.NS`;
    const url = `/api/yahoo1/v7/finance/options/${encodeURIComponent(normalized)}`;
    const res = await fetchT(url, { headers: { 'Accept': 'application/json' } });

    if (!res.ok) throw new Error(`Options fetch failed (${res.status})`);
    const data = await res.json();

    const result = data?.optionChain?.result?.[0];
    if (!result) throw new Error('No options chain data');

    const quote = result.quote;
    const expirations = result.expirationDates?.slice(0, 3) || [];
    const nearestExp = expirations[0];
    const options = (result.options || []).find((o: any) => o.expirationDate === nearestExp);

    const calls = (options?.calls || []).slice(0, 10).map((c: any) => ({
      strike: c.strike, lastPrice: c.lastPrice, volume: c.volume,
      openInterest: c.openInterest, impliedVolatility: c.impliedVolatility
    }));
    const puts = (options?.puts || []).slice(0, 10).map((p: any) => ({
      strike: p.strike, lastPrice: p.lastPrice, volume: p.volume,
      openInterest: p.openInterest, impliedVolatility: p.impliedVolatility
    }));

    if (calls.length === 0 && puts.length === 0) {
      return { success: false, data: null, summary: `No F&O options listed for ${normalized}` };
    }

    return {
      success: true,
      data: {
        ticker: normalized,
        spotPrice: quote?.regularMarketPrice,
        expirationDate: nearestExp ? new Date(nearestExp * 1000).toISOString().split('T')[0] : null,
        availableExpirations: expirations.map((e: number) => new Date(e * 1000).toISOString().split('T')[0]),
        calls,
        puts
      },
      summary: `F&O chain for ${normalized}: spot ${quote?.regularMarketPrice}, ${calls.length} calls / ${puts.length} puts for nearest expiry. Top call OI: ${calls.sort((a: any, b: any) => (b.openInterest || 0) - (a.openInterest || 0))[0]?.openInterest || 0}, top put OI: ${puts.sort((a: any, b: any) => (b.openInterest || 0) - (a.openInterest || 0))[0]?.openInterest || 0}.`
    };
  } catch (e: any) {
    return { success: false, data: null, summary: `F&O fetch failed for ${ticker}: ${e.message}` };
  }
};

// ─── TOOL 5: MUTUAL FUND DATA (mfapi.in — free, no key) ───

export const getMutualFund = async (fundName: string): Promise<ToolResult> => {
  try {
    const searchRes = await fetchT(`/api/mfapi/mf/search?q=${encodeURIComponent(fundName)}`);
    if (!searchRes.ok) throw new Error(`MF search failed (${searchRes.status})`);
    const schemes = await searchRes.json();

    if (!Array.isArray(schemes) || schemes.length === 0) {
      return { success: false, data: null, summary: `No mutual funds found matching "${fundName}"` };
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
      summary: `Found ${funds.length} mutual funds for "${fundName}". Top: ${funds[0]?.schemeName} — NAV ${funds[0]?.latestNAV}, 1Y return ${funds[0]?.oneYearReturnPercent ?? 'N/A'}%`
    };
  } catch (e: any) {
    return { success: false, data: null, summary: `Mutual fund fetch failed for "${fundName}": ${e.message}` };
  }
};

// ─── TOOL 6: CRYPTO / COMMODITY / GLOBAL QUOTE (Yahoo) ───

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
      data: {
        symbol,
        name: meta.shortName || symbol,
        price: parseFloat(current.toFixed(2)),
        changePercent: parseFloat((((current - prev) / prev) * 100).toFixed(2)),
        currency: meta.currency,
        fiveDayHistory: closes.slice(-5).map((p: number) => parseFloat(p.toFixed(2)))
      },
      summary: `${meta.shortName || symbol}: ${current} ${meta.currency} (${(((current - prev) / prev) * 100).toFixed(2)}% today)`
    };
  } catch (e: any) {
    return { success: false, data: null, summary: `Quote failed for ${symbol}: ${e.message}` };
  }
};

// ─── TOOL REGISTRY ───

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'run_stock_analysis',
      description: 'Run the SentimentAI webapp\'s full analysis pipeline on an Indian equity stock (NSE/BSE). Returns price, RSI, MACD, Bollinger, ADX, ATR, news sentiment, Fear & Greed, TradingView community sentiment, and market regime. Use this when the user asks to analyze any share/stock. Ticker format: RELIANCE.NS or bare RELIANCE (auto-appended .NS).',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'Stock ticker, e.g. "RELIANCE.NS", "TCS", "INFY.NS"' },
          company_name: { type: 'string', description: 'Optional company full name to improve news search' }
        },
        required: ['ticker']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the entire internet via DuckDuckGo. Use for ANY information not covered by other tools: latest news, earnings, company events, market rumors, regulatory updates, sector news, or anything else you decide you need.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query, e.g. "Reliance Industries Q3 earnings 2026"' },
          max_results: { type: 'number', description: 'Max results (default 8, max 10)' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_webpage',
      description: 'Crawl and read the FULL content of any webpage URL as clean text. Use after web_search when you need to read the complete article/page content — e.g., to verify facts, read an earnings report, or extract detailed data from a search result.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full URL to crawl, e.g. "https://example.com/article"' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_fno_chain',
      description: 'Get the F&O (Futures & Options) derivatives chain for an Indian stock: calls, puts, strikes, open interest, implied volatility, and available expiries. Use when the user asks about options, F&O, derivatives, or options strategies.',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'Stock ticker, e.g. "NIFTY", "BANKNIFTY", "RELIANCE.NS"' }
        },
        required: ['ticker']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_mutual_fund',
      description: 'Search Indian mutual funds and get NAV, fund house, category, and 1-year returns. Use when the user asks about mutual funds, SIPs, or fund schemes.',
      parameters: {
        type: 'object',
        properties: {
          fund_name: { type: 'string', description: 'Fund name or keywords, e.g. "Blue Chip", "SBI Small Cap", "Parag Parikh"' }
        },
        required: ['fund_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_global_quote',
      description: 'Get a quote for ANY global instrument via Yahoo Finance: crypto (BTC-INR), commodities (GOLDM.BO / futures), indices (^NSEI, ^BSESN, ^GSPC), forex (USDINR=X), or international stocks. Use for non-equity instruments.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Yahoo symbol, e.g. "BTC-INR", "^NSEI", "USDINR=X", "GOLDBEES.NS"' }
        },
        required: ['symbol']
      }
    }
  }
];

export const TOOL_EXECUTORS: Record<string, (args: any) => Promise<ToolResult>> = {
  run_stock_analysis: (args) => runStockAnalysis(args.ticker, args.company_name),
  web_search: (args) => webSearch(args.query, args.max_results),
  read_webpage: (args) => readWebpage(args.url),
  get_fno_chain: (args) => getFNOChain(args.ticker),
  get_mutual_fund: (args) => getMutualFund(args.fund_name),
  get_global_quote: (args) => getGlobalQuote(args.symbol)
};
