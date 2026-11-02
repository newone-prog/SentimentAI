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

export interface ToolResult {
  success: boolean;
  data: any;
  summary: string;
  sources?: SourceRef[];
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

const getFavicon = (domain: string): string => `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

const toSourceRef = (domain: string, name: string, url?: string, type: SourceRef['type'] = 'api'): SourceRef => ({
  type, name, domain, url, favicon: getFavicon(domain)
});

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
      toSourceRef('query1.finance.yahoo.com', 'Yahoo Finance', undefined, 'api'),
      toSourceRef('scanner.tradingview.com', 'TradingView Scanner', undefined, 'api'),
      toSourceRef('api.marketstack.com', 'MarketStack', undefined, 'api'),
      toSourceRef('gnews.io', 'GNews', undefined, 'api'),
      toSourceRef('api.mediastack.com', 'MediaStack', undefined, 'api'),
      toSourceRef('stock.indianapi.in', 'IndianAPI', undefined, 'api')
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

// ─── TOOL 2: WEB SEARCH (Tavily if key, else DuckDuckGo) ───

export const webSearch = async (query: string, maxResults: number = 8): Promise<ToolResult> => {
  const sources: SourceRef[] = [];

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

  // Fallback: DuckDuckGo
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
      results.push({ title: links[i].title, url: href, snippet: snippets[i] || '' });
    }

    sources.push(toSourceRef('duckduckgo.com', 'DuckDuckGo', undefined, 'web'));
    return { success: true, data: results, summary: `DDG: ${results.length} results for "${query}"`, sources };
  } catch (e: any) {
    return { success: false, data: [], summary: `Web search failed: ${e.message}`, sources };
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
      return { success: false, data: null, summary: `No F&O options listed for ${normalized}`, sources: [] };
    }

    return {
      success: true,
      data: {
        ticker: normalized, spotPrice: quote?.regularMarketPrice,
        expirationDate: nearestExp ? new Date(nearestExp * 1000).toISOString().split('T')[0] : null,
        availableExpirations: expirations.map((e: number) => new Date(e * 1000).toISOString().split('T')[0]),
        calls, puts
      },
      summary: `F&O chain for ${normalized}: spot ${quote?.regularMarketPrice}, ${calls.length} calls / ${puts.length} puts for nearest expiry.`,
      sources: [toSourceRef('query1.finance.yahoo.com', 'Yahoo Finance Options', undefined, 'api')]
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
      sources: [toSourceRef('api.mfapi.in', 'MF API India', undefined, 'api')]
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
      sources: [toSourceRef('query1.finance.yahoo.com', 'Yahoo Finance', undefined, 'api')]
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

// ─── TOOL 9: CODE EXECUTION (sandboxed via Cloud Function) ───

export const executeCode = async (code: string, language: 'python' | 'javascript' = 'python', timeoutMs: number = 30000): Promise<ToolResult> => {
  try {
    const res = await fetchT('/api/codex/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, timeoutMs })
    }, timeoutMs + 5000);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Code execution failed (${res.status}): ${err}`);
    }
    const result = await res.json();
    return {
      success: true,
      data: { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, executionTimeMs: result.executionTimeMs },
      summary: `Code executed (${language}): ${result.exitCode === 0 ? 'success' : 'error'} in ${result.executionTimeMs}ms`,
      sources: [toSourceRef('codex', 'Code Executor', undefined, 'code')]
    };
  } catch (e: any) {
    return { success: false, data: null, summary: `Code execution failed: ${e.message}`, sources: [] };
  }
};

// ─── TOOL DEFINITIONS ───

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