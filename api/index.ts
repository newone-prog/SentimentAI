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
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || process.env.VITE_TAVILY_API_KEY || '';
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || process.env.VITE_BRAVE_API_KEY || '';

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
// ── Smart Mutual Fund Search Handler (Handles abbreviations like "Pru", "PPFAS", "Smallcap", etc.)
app.get(['/mfapi/mf/search', '/api/mfapi/mf/search'], async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query) return res.json([]);

  try {
    // 1. Try upstream mfapi direct search first
    const directRes = await axios.get(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`, {
      timeout: 6000,
      validateStatus: () => true
    });
    if (directRes.status === 200 && Array.isArray(directRes.data) && directRes.data.length > 0) {
      return res.json(directRes.data);
    }

    // 2. Fallback to smart in-memory search against master schemes index
    let allSchemes = getFromCache('all_mf_schemes');
    if (!allSchemes) {
      const allRes = await axios.get('https://api.mfapi.in/mf', { timeout: 12000, validateStatus: () => true });
      if (allRes.status === 200 && Array.isArray(allRes.data)) {
        allSchemes = allRes.data;
        setInCache('all_mf_schemes', allSchemes, 86400); // Cache for 24h
      }
    }

    if (Array.isArray(allSchemes) && allSchemes.length > 0) {
      const norm = query.toLowerCase()
        .replace(/\bpru\b/g, 'prudential')
        .replace(/\bppfas\b/g, 'parag parikh')
        .replace(/\babsl\b/g, 'aditya birla')
        .replace(/\bbirla\b/g, 'aditya birla')
        .replace(/\bmosl\b/g, 'motilal oswal')
        .replace(/\bnippon\b/g, 'nippon india')
        .replace(/\bidfc\b/g, 'bandhan')
        .replace(/\bbest\b/g, '')
        .replace(/\btop\b/g, '')
        .replace(/\bmutual\b/g, '')
        .replace(/\bfunds?\b/g, '')
        .trim();

      const hasSmallCap = norm.includes('small cap') || norm.includes('smallcap');
      const hasMidCap = norm.includes('mid cap') || norm.includes('midcap');
      const hasFlexiCap = norm.includes('flexi cap') || norm.includes('flexicap');
      const hasLargeCap = norm.includes('large cap') || norm.includes('largecap');

      const keywords = norm.split(/\s+/).filter(k => k.length > 2);

      const matches = (allSchemes as any[]).filter(s => {
        const name = (s.schemeName || '').toLowerCase();
        if (hasSmallCap && !(name.includes('small cap') || name.includes('smallcap'))) return false;
        if (hasMidCap && !(name.includes('mid cap') || name.includes('midcap'))) return false;
        if (hasFlexiCap && !(name.includes('flexi cap') || name.includes('flexicap'))) return false;
        if (hasLargeCap && !(name.includes('large cap') || name.includes('largecap'))) return false;

        return keywords.every(kw => {
          if (kw === 'small' || kw === 'cap' || kw === 'smallcap') return true;
          if (kw === 'mid' || kw === 'midcap') return true;
          if (kw === 'flexi' || kw === 'flexicap') return true;
          return name.includes(kw);
        });
      });

      // Prioritize Direct Growth schemes
      matches.sort((a, b) => {
        const aDirect = /direct/i.test(a.schemeName) && /growth/i.test(a.schemeName) ? 2 : /growth/i.test(a.schemeName) ? 1 : 0;
        const bDirect = /direct/i.test(b.schemeName) && /growth/i.test(b.schemeName) ? 2 : /growth/i.test(b.schemeName) ? 1 : 0;
        return bDirect - aDirect;
      });

      return res.json(matches.slice(0, 20));
    }

    return res.json([]);
  } catch (err: any) {
    console.error('[MF Search Proxy Error]:', err.message);
    return res.json([]);
  }
});

app.use(['/mfapi', '/api/mfapi'], createProxyHandler('https://api.mfapi.in', 'mfapi'));
app.use(['/alphavantage', '/api/alphavantage'], createProxyHandler('https://www.alphavantage.co', 'alphavantage'));
app.use(['/fmp', '/api/fmp'], createProxyHandler('https://financialmodelingprep.com', 'fmp'));

// ── Dedicated Tavily Search Proxy (injects server API key if missing)
app.use(['/tavily', '/api/tavily'], async (req: Request, res: Response) => {
  try {
    const rawAuth = req.headers.authorization;
    const clientKey = (rawAuth && rawAuth !== 'Bearer ' && rawAuth !== 'Bearer undefined')
      ? rawAuth.replace(/^Bearer\s+/i, '')
      : (req.headers['x-api-key'] as string);
    const bodyKey = req.body && typeof req.body === 'object' ? req.body.api_key : undefined;
    const effectiveKey = clientKey || bodyKey || TAVILY_API_KEY;

    if (!effectiveKey) {
      return res.status(401).json({ error: 'Tavily API key not configured. Please set TAVILY_API_KEY or VITE_TAVILY_API_KEY.' });
    }

    let subPath = req.url || '';
    subPath = subPath.replace(/^(\/api)?\/tavily/i, '');
    if (!subPath.startsWith('/')) subPath = '/' + subPath;

    const payload = typeof req.body === 'object' ? { ...req.body, api_key: effectiveKey } : { api_key: effectiveKey };

    const response = await axios({
      method: req.method,
      url: `https://api.tavily.com${subPath}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      data: payload,
      validateStatus: () => true
    });

    return res.status(response.status).json(response.data);
  } catch (err: any) {
    console.error('[Tavily Proxy Error]:', err.message);
    return res.status(502).json({ error: 'Tavily proxy failed', details: err.message });
  }
});

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
