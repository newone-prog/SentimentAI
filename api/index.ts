import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import endpoints from compiled firebase-functions library
const { agenticOrchestratorEndpoint } = require('../firebase-functions/lib/api/agenticOrchestrator.js');
const { traderOrchestratorEndpoint } = require('../firebase-functions/lib/api/traderOrchestrator.js');
const { webScraperEndpoint } = require('../firebase-functions/lib/api/webScraper.js');
const { optionsChainEndpoint } = require('../firebase-functions/lib/api/optionsChainApi.js');
const { scrapeMutualFundNews } = require('../firebase-functions/lib/scraper.js');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

// In-memory cache fallback for Serverless environment
const memCache = new Map<string, { data: any; expiresAt: number }>();

const getFromCache = (key: string) => {
  const item = memCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return item.data;
};

const setInCache = (key: string, data: any, ttlSeconds: number) => {
  memCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
};

// API Keys from environment variables
const NVIDIA_NIM_KEY = process.env.NVIDIA_NIM_KEY || process.env.VITE_NVIDIA_NIM_KEY || '';
const OPENROUTER_KEY = process.env.OPENROUTER_KEY || process.env.VITE_OPENROUTER_KEY || '';
const INDIANAPI_KEY = process.env.INDIANAPI_KEY || process.env.VITE_INDIANAPI_KEY || '';

// ── Generic Reverse Proxy Handler Factory
const createProxyHandler = (
  targetBase: string,
  prefix: string,
  customHeaders?: Record<string, string>,
  pathRewrite?: (path: string) => string
) => {
  return async (req: Request, res: Response) => {
    try {
      let subPath = req.url || '';
      const prefixRegex = new RegExp(`^(/api)?/${prefix}`, 'i');
      if (prefixRegex.test(subPath)) {
        subPath = subPath.replace(prefixRegex, '');
      }
      if (pathRewrite) {
        subPath = pathRewrite(subPath);
      }
      const targetUrl = `${targetBase.replace(/\/$/, '')}${subPath.startsWith('/') ? '' : '/'}${subPath}`;

      const forwardHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': (req.headers.accept as string) || '*/*',
        ...(customHeaders || {})
      };

      if (req.headers.authorization && req.headers.authorization !== 'Bearer ' && req.headers.authorization !== 'Bearer undefined') {
        forwardHeaders['Authorization'] = req.headers.authorization as string;
      }
      if (req.headers['content-type']) {
        forwardHeaders['Content-Type'] = req.headers['content-type'] as string;
      }

      const response = await axios({
        method: req.method,
        url: targetUrl,
        headers: forwardHeaders,
        data: ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) ? req.body : undefined,
        responseType: 'arraybuffer',
        validateStatus: () => true
      });

      const contentType = response.headers['content-type'];
      if (contentType) res.setHeader('content-type', String(contentType));
      return res.status(response.status).send(response.data);
    } catch (err: any) {
      console.error(`[Proxy Error -> ${targetBase}]:`, err.message);
      return res.status(502).json({ error: 'Proxy request failed', details: err.message });
    }
  };
};

// ── Generic URL Proxy Handler: /api/proxy?url=...
const genericProxyHandler = async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).json({ error: "Missing 'url' query parameter" });

  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': (req.headers.accept as string) || '*/*'
    };

    if (req.headers.authorization) forwardHeaders['Authorization'] = req.headers.authorization as string;
    if (req.headers['content-type']) forwardHeaders['Content-Type'] = req.headers['content-type'] as string;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: forwardHeaders,
      data: ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) ? req.body : undefined,
      responseType: 'arraybuffer',
      validateStatus: () => true
    });

    const contentType = response.headers['content-type'];
    if (contentType) res.setHeader('content-type', String(contentType));
    return res.status(response.status).send(response.data);
  } catch (err: any) {
    console.error(`[Generic Proxy Error -> ${targetUrl}]:`, err.message);
    return res.status(502).json({ error: 'Generic proxy failed', details: err.message });
  }
};

// ── External Financial & News Proxies
app.use(['/yahoo1', '/api/yahoo1'], createProxyHandler('https://query1.finance.yahoo.com', 'yahoo1'));
app.use(['/yahoo2', '/api/yahoo2'], createProxyHandler('https://query2.finance.yahoo.com', 'yahoo2'));
app.use(['/groww', '/api/groww'], createProxyHandler('https://groww.in', 'groww'));
app.use(['/gnews', '/api/gnews'], createProxyHandler('https://gnews.io/api', 'gnews'));
app.use(['/mediastack', '/api/mediastack'], createProxyHandler('https://api.mediastack.com', 'mediastack'));
app.use(['/marketstack', '/api/marketstack'], createProxyHandler('http://api.marketstack.com', 'marketstack'));
app.use(['/indianapi', '/api/indianapi'], createProxyHandler('https://stock.indianapi.in', 'indianapi', {
  'X-API-Key': INDIANAPI_KEY
}));
app.use(['/tradingview', '/api/tradingview'], createProxyHandler('https://scanner.tradingview.com', 'tradingview', {
  'Origin': 'https://www.tradingview.com',
  'Referer': 'https://www.tradingview.com/'
}));
app.use(['/googlenews', '/api/googlenews'], createProxyHandler('https://news.google.com', 'googlenews'));
app.use(['/jina', '/api/jina'], createProxyHandler('https://r.jina.ai', 'jina'));
app.use(['/ddg', '/api/ddg'], createProxyHandler('https://html.duckduckgo.com', 'ddg'));
app.use(['/mfapi', '/api/mfapi'], createProxyHandler('https://api.mfapi.in', 'mfapi'));
app.use(['/alphavantage', '/api/alphavantage'], createProxyHandler('https://www.alphavantage.co', 'alphavantage'));
app.use(['/fmp', '/api/fmp'], createProxyHandler('https://financialmodelingprep.com', 'fmp'));
app.use(['/tavily', '/api/tavily'], createProxyHandler('https://api.tavily.com', 'tavily'));
app.all(['/proxy', '/api/proxy'], genericProxyHandler);

// ── LLM Direct Secure Proxies (injects server API keys automatically if client doesn't provide them)
app.use(['/llm/nvidia', '/api/llm/nvidia'], async (req: Request, res: Response) => {
  try {
    const targetUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
    const authHeader = (req.headers.authorization && req.headers.authorization !== 'Bearer ' && req.headers.authorization !== 'Bearer undefined')
      ? req.headers.authorization
      : `Bearer ${NVIDIA_NIM_KEY}`;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      data: req.body,
      validateStatus: () => true
    });
    return res.status(response.status).json(response.data);
  } catch (err: any) {
    console.error('[LLM NVIDIA Proxy Error]:', err.message);
    return res.status(502).json({ error: 'NVIDIA NIM Proxy failed', details: err.message });
  }
});

app.use(['/llm/openrouter', '/api/llm/openrouter'], async (req: Request, res: Response) => {
  try {
    let subPath = req.url || '';
    subPath = subPath.replace(/^(\/api)?\/llm\/openrouter/i, '');
    if (!subPath || subPath === '/') subPath = '/chat/completions';
    const targetUrl = `https://openrouter.ai/api/v1${subPath.startsWith('/') ? '' : '/'}${subPath}`;

    const authHeader = (req.headers.authorization && req.headers.authorization !== 'Bearer ' && req.headers.authorization !== 'Bearer undefined')
      ? req.headers.authorization
      : `Bearer ${OPENROUTER_KEY}`;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
        'HTTP-Referer': 'https://stocksentimentai.app',
        'X-Title': 'SentimentAI v3',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      data: req.body,
      validateStatus: () => true
    });
    return res.status(response.status).json(response.data);
  } catch (err: any) {
    console.error('[LLM OpenRouter Proxy Error]:', err.message);
    return res.status(502).json({ error: 'OpenRouter Proxy failed', details: err.message });
  }
});

// ── Backend Endpoints
app.post(['/scrape-data', '/api/scrape-data'], webScraperEndpoint);
app.post(['/agentic-orchestrate', '/api/agentic-orchestrate'], agenticOrchestratorEndpoint);
app.post(['/trader-orchestrate', '/api/trader-orchestrate'], traderOrchestratorEndpoint);
app.get(['/options-chain', '/api/options-chain'], optionsChainEndpoint);

// ── Mutual Fund Cache Endpoints
app.get(['/cache/mf-search', '/api/cache/mf-search'], async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: "Missing 'q' query parameter" });

    const cacheKey = `mf_search_${q.toLowerCase().trim()}`;
    const cached = getFromCache(cacheKey);
    if (cached) return res.json(cached);

    const url = `https://groww.in/v1/api/search/v3/query/global/st_p_query?page=0&query=${encodeURIComponent(q)}&size=5&web=true`;
    const resp = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    setInCache(cacheKey, resp.data, 86400); // 24 hours
    return res.json(resp.data);
  } catch (error: any) {
    return res.status(500).json({ error: 'MF Search failed', details: error.message });
  }
});

app.get(['/cache/mf-details', '/api/cache/mf-details'], async (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: "Missing 'id' query parameter" });

    const cacheKey = `mf_details_${id}`;
    const cached = getFromCache(cacheKey);
    if (cached) return res.json(cached);

    const url = `https://groww.in/v1/api/data/mf/web/v2/scheme/search/${encodeURIComponent(id)}`;
    const resp = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    setInCache(cacheKey, resp.data, 86400); // 24 hours
    return res.json(resp.data);
  } catch (error: any) {
    return res.status(500).json({ error: 'MF Details fetch failed', details: error.message });
  }
});

app.get(['/cache/mf-news', '/api/cache/mf-news'], async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: "Missing 'q' query parameter" });

    const cacheKey = `mf_news_${q.toLowerCase().trim()}`;
    const cached = getFromCache(cacheKey);
    if (cached) return res.json(cached);

    const data = await scrapeMutualFundNews(q);
    setInCache(cacheKey, data, 900); // 15 mins
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: 'MF News scraper failed', details: error.message });
  }
});

app.get(['/cache/mf-history', '/api/cache/mf-history'], async (req: Request, res: Response) => {
  try {
    const amfi = req.query.amfi as string;
    if (!amfi) return res.status(400).json({ error: "Missing 'amfi' query parameter" });

    const cacheKey = `mf_history_${amfi}`;
    const cached = getFromCache(cacheKey);
    if (cached) return res.json(cached);

    const resp = await axios.get(`https://api.mfapi.in/mf/${amfi}`);
    setInCache(cacheKey, resp.data, 86400);
    return res.json(resp.data);
  } catch (error: any) {
    return res.status(500).json({ error: 'MF History fetch failed', details: error.message });
  }
});

// ── Symbol Report Cache
app.get(['/cache/:symbol', '/api/cache/:symbol'], (req: Request, res: Response) => {
  const symbol = req.params.symbol;
  const cached = getFromCache(`report_${symbol}`);
  return res.json({ cached: !!cached, data: cached || null });
});

app.post(['/cache/:symbol', '/api/cache/:symbol'], (req: Request, res: Response) => {
  const symbol = req.params.symbol;
  setInCache(`report_${symbol}`, req.body, 21600); // 6 hours
  return res.json({ success: true, message: 'Cached successfully' });
});

// ── Health Check
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };

export default function handler(req: any, res: any) {
  return app(req, res);
}
