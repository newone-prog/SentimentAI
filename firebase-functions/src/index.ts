require('dotenv').config();
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import axios from "axios";
import { agenticOrchestratorEndpoint } from "./api/agenticOrchestrator";
import { traderOrchestratorEndpoint } from "./api/traderOrchestrator";
import { webScraperEndpoint } from "./api/webScraper";
import { optionsChainEndpoint } from "./api/optionsChainApi";

// ── Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

import { MongoClient, ServerApiVersion } from "mongodb";
import { MongoCacheService } from "./MongoCache";
import { MongoReportCacheService } from "./MongoReportCache";
import { scrapeMutualFundNews } from "./scraper";

// ── Initialize MongoDB
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
let mongoDbInstance: any = null;
export let apiCache: MongoCacheService;
export let reportCache: MongoReportCacheService;

async function initMongo() {
  if (mongoDbInstance) return;
  try {
    await client.connect();
    mongoDbInstance = client.db("sentimentai_cache");
    apiCache = new MongoCacheService(mongoDbInstance);
    reportCache = new MongoReportCacheService(mongoDbInstance);
    console.log("Successfully connected to MongoDB and initialized caches");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}
initMongo();

export const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

// ── Middleware: Validate Bearer Token (Firebase Auth)
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    (req as any).user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// ── Helper: Generic proxy to external API
type QueryParams = Record<string, string | number | boolean | undefined>;
const proxyFetch = async (baseUrl: string, params: QueryParams, apiKey: string): Promise<any> => {
  const urlObj = new URL(baseUrl);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) urlObj.searchParams.set(k, String(v));
  });
  const response = await fetch(urlObj.toString(), {
    headers: { "Accept": "application/json", ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}) },
  });
  if (!response.ok) throw new Error(`External API error: ${response.status} ${response.statusText}`);
  return await response.json();
};

// ── Helper: Server-side HTTP reverse proxy (replaces third-party CORS proxies like allorigins)
const createProxyHandler = (
  targetBase: string,
  customHeaders?: Record<string, string>,
  pathRewrite?: (path: string) => string
) => {
  return async (req: Request, res: Response) => {
    try {
      let subPath = req.url || '';
      if (pathRewrite) {
        subPath = pathRewrite(subPath);
      }
      const targetUrl = `${targetBase.replace(/\/$/, '')}${subPath.startsWith('/') ? '' : '/'}${subPath}`;

      const forwardHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': (req.headers.accept as string) || '*/*',
        ...(customHeaders || {})
      };

      if (req.headers.authorization) {
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

// Generic proxy endpoint: /proxy?url=...
const genericProxyHandler = async (req: Request, res: Response): Promise<any> => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: "Invalid URL protocol" });
    }

    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': (req.headers.accept as string) || '*/*'
    };

    if (req.headers.authorization) {
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
    console.error(`[Generic Proxy Error -> ${targetUrl}]:`, err.message);
    return res.status(502).json({ error: 'Generic proxy failed', details: err.message });
  }
};

// ── Mount reverse proxy routes for external finance and search APIs
app.use(["/yahoo1", "/api/yahoo1"], createProxyHandler("https://query1.finance.yahoo.com"));
app.use(["/yahoo2", "/api/yahoo2"], createProxyHandler("https://query2.finance.yahoo.com"));
app.use(["/groww", "/api/groww"], createProxyHandler("https://groww.in"));
app.use(["/gnews", "/api/gnews"], createProxyHandler("https://gnews.io/api"));
app.use(["/mediastack", "/api/mediastack"], createProxyHandler("https://api.mediastack.com"));
app.use(["/marketstack", "/api/marketstack"], createProxyHandler("http://api.marketstack.com"));
app.use(["/indianapi", "/api/indianapi"], createProxyHandler("https://stock.indianapi.in", {
  'X-API-Key': process.env.INDIANAPI_KEY || ''
}));
app.use(["/tradingview", "/api/tradingview"], createProxyHandler("https://scanner.tradingview.com", {
  'Origin': 'https://www.tradingview.com',
  'Referer': 'https://www.tradingview.com/'
}));
app.use(["/googlenews", "/api/googlenews"], createProxyHandler("https://news.google.com"));
app.use(["/llm/nvidia", "/api/llm/nvidia"], createProxyHandler("https://integrate.api.nvidia.com", undefined, () => "/v1/chat/completions"));
app.use(["/llm/openrouter", "/api/llm/openrouter"], createProxyHandler("https://openrouter.ai/api/v1"));
app.all(["/proxy", "/api/proxy"], genericProxyHandler);

/* ─── API LAYER ───────────────────────────────────────────────────────────── */

// POST /agentic-orchestrate — Parallel Agentic Web Scraper LLM Topology
app.post("/agentic-orchestrate", agenticOrchestratorEndpoint);

// POST /trader-orchestrate — Short-Term Algorithmic Trader Pipeline
app.post("/trader-orchestrate", traderOrchestratorEndpoint);

// GET /options-chain — Fetches NSE Options Chain data
app.get("/options-chain", optionsChainEndpoint);

// POST /scrape-data — Web Scraper Fallback
app.post("/scrape-data", webScraperEndpoint);

// POST /analyze — Full AI Research Pipeline (Original)
app.post("/analyze", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { symbol, companyName } = req.body;
    if (!symbol) return res.status(400).json({ error: "'symbol' is required" });

    // 1. Check Firestore cache
    const cacheDoc = db.collection("analyses").doc(`${symbol}_latest`);
    const cached = await cacheDoc.get();
    if (cached.exists) {
      const data = cached.data() as any;
      const ttl = 6 * 60 * 60 * 1000; // 6 hours
      if (Date.now() - data.generatedAt.toMillis() < ttl) {
        return res.json({ cached: true, data });
      }
    }

    // 2. Fetch fresh data in parallel
    const [marketData, newsData, indicators] = await Promise.all([
      getMarketData(symbol),
      getNews(companyName || symbol),
      getTechnicalIndicators(symbol)
    ]);

    // 3. Build AI context
    const context = {
      symbol,
      company: companyName || symbol,
      marketData,
      news: newsData,
      technicals: indicators,
      fetchedAt: new Date().toISOString()
    };

    // 4. Send to LLM (proxy to backend)
    const aiResult = await getLLMAnalysis(context);

    // 5. Store in Firestore & return
    const payload = {
      ...aiResult,
      symbol,
      company: companyName || symbol,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 6 * 60 * 60 * 1000))
    };
    await cacheDoc.set(payload, { merge: true });
    return res.json({ cached: false, data: payload });

  } catch (error: any) {
    console.error("Analyze error:", error.message);
    return res.status(500).json({ error: "AI Analysis failed", details: error.message });
  }
});

// GET /market — Proxy market data (caches internally) (Original)
app.get("/market", async (req: Request, res: Response) => {
  try {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== "string") {
      return res.status(400).json({ error: "'symbol' query param is required" });
    }
    const data = await getMarketData(symbol);
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: "Market data failed", details: error.message });
  }
});

// GET /news — Proxy news data (Original)
app.get("/news", async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "'q' query param is required" });
    }
    const data = await getNews(q);
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: "News fetch failed", details: error.message });
  }
});

// GET /cache/mf-search — Mutual Fund Search using Groww
app.get("/cache/mf-search", async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "'q' query param is required" });
    }
    const cacheKey = `mf_search_${q.replace(/[^a-z0-9]/gi, '_')}`;
    const cached = await apiCache?.get(cacheKey); // 24h cache is handled by set
    if (cached) return res.json(cached);

    const url = `https://groww.in/v1/api/search/v3/query/global/st_p_query?page=0&query=${encodeURIComponent(q)}&size=5&web=true`;
    const data = await proxyFetch(url, {}, "");
    await apiCache?.set(cacheKey, data, 24 * 60 * 60);
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: "MF Search failed", details: error.message });
  }
});

// GET /cache/mf-details — Mutual Fund Details using Groww
app.get("/cache/mf-details", async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "'id' query param is required" });
    }
    const cacheKey = `mf_details_${id.replace(/[^a-z0-9]/gi, '_')}`;
    const cached = await apiCache?.get(cacheKey); // 24h cache is handled by set
    if (cached) return res.json(cached);

    const url = `https://groww.in/v1/api/data/mf/web/v2/scheme/search/${id}`;
    const data = await proxyFetch(url, {}, "");
    await apiCache?.set(cacheKey, data, 24 * 60 * 60);
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: "MF Details fetch failed", details: error.message });
  }
});

// GET /cache/mf-news — Powerful Custom Web Scraper for Mutual Fund News
app.get("/cache/mf-news", async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "'q' query param is required" });
    }
    const cacheKey = `mf_news_${q.replace(/[^a-z0-9]/gi, '_')}`;
    const cached = await apiCache?.get(cacheKey);
    if (cached) return res.json(cached);

    const data = await scrapeMutualFundNews(q);
    await apiCache?.set(cacheKey, data, 15 * 60); // cache for 15 minutes
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: "MF News scraper failed", details: error.message });
  }
});

// GET /cache/mf-history — Mutual Fund Historical NAV
app.get("/cache/mf-history", async (req: Request, res: Response) => {
  try {
    const { amfi } = req.query;
    if (!amfi || typeof amfi !== "string") {
      return res.status(400).json({ error: "'amfi' query param is required" });
    }
    const cacheKey = `mf_history_${amfi}`;
    const cached = await apiCache?.get(cacheKey);
    if (cached) return res.json(cached);

    const data = await proxyFetch(`https://api.mfapi.in/mf/${amfi}`, {}, "");
    // Extract history and format to ascending chronological order of numbers (NAV prices)
    if (data?.data && Array.isArray(data.data)) {
      // mfapi returns data newest first. We reverse it so oldest is first.
      const history = data.data.reverse().map((item: any) => parseFloat(item.nav)).filter((val: number) => !isNaN(val));
      await apiCache?.set(cacheKey, history, 24 * 60 * 60);
      return res.json(history);
    }
    
    return res.status(404).json({ error: "No historical data found" });
  } catch (error: any) {
    return res.status(500).json({ error: "MF History fetch failed", details: error.message });
  }
});

/* ─── INTERNAL HELPERS ───────────────────────────────────────────────────── */

async function getMarketData(symbol: string): Promise<any> {
  const cacheKey = `market_${symbol}`;
  const cached = await apiCache?.get(cacheKey);
  if (cached) return cached;

  // Yahoo Finance proxy
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  const data = await proxyFetch(yahooUrl, { interval: "1d", range: "1mo" }, "");
  await apiCache?.set(cacheKey, data, 300); // 5 min
  return data;
}

async function getNews(query: string): Promise<any> {
  const cacheKey = `news_${query}`;
  const cached = await apiCache?.get(cacheKey);
  if (cached) return cached;

  const newsKey = process.env.GNEWS_API_KEY || "";
  const newsUrl = "https://gnews.io/api/v4/search";
  const data = await proxyFetch(newsUrl, { q: query, lang: "en", max: "10", apikey: newsKey }, "");
  await apiCache?.set(cacheKey, data, 900); // 15 min
  return data;
}

async function getTechnicalIndicators(symbol: string): Promise<any> {
  const cacheKey = `tech_${symbol}`;
  const cached = await apiCache?.get(cacheKey);
  if (cached) return cached;

  // Placeholder: connect to real technical provider or compute manually
  const mockIndicators = {
    rsi: 50 + Math.random() * 40 - 20,
    macd: Math.random() - 0.5,
    stochastic: Math.random() * 100,
    volume: Math.floor(Math.random() * 1000000),
    ema20: Math.random() * 100,
    ema50: Math.random() * 100
  };
  await apiCache?.set(cacheKey, mockIndicators, 300);
  return mockIndicators;
}

async function getLLMAnalysis(context: any): Promise<any> {
  // Proxy to NVIDIA NIM or OpenRouter securely
  const nvidiaKey = process.env.NVIDIA_NIM_KEY || "";
  const openRouterKey = process.env.OPENROUTER_KEY || "";
  const model = "openai/gpt-oss-20b";

  const prompt = `You are a senior equity research analyst. Analyze ONLY the data provided. Return valid JSON.
Company: ${context.company}
Symbol: ${context.symbol}
Price: ${context.marketData?.chart?.result?.[0]?.meta?.regularMarketPrice || "N/A"}
RSI: ${context.technicals?.rsi}
MACD: ${context.technicals?.macd}
News Headlines: ${context.news?.articles?.map((a: any) => a.title).join("; ") || "N/A"}

CRITICAL RULE: If RSI < 30 or Stochastic < 20, lean BULLISH (oversold bounce). If RSI > 70 or Stochastic > 80, lean BEARISH (overbought pullback).

Return JSON: { "verdict": "BULLISH|BEARISH|NEUTRAL|SIDEWAYS", "confidence": 0-100, "reasoning": "...", "researchPaper": "..." }`;

  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: "You are a JSON-only response engine. Output ONLY valid JSON. No markdown, no code blocks." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" }
  });

  // Try NVIDIA first, fallback to OpenRouter
  const urls = [
    { url: "https://integrate.api.nvidia.com/v1/chat/completions", key: nvidiaKey, label: "NVIDIA" },
    { url: "https://openrouter.ai/api/v1/chat/completions", key: openRouterKey, label: "OpenRouter" }
  ];

  for (const provider of urls) {
    if (!provider.key) continue;
    try {
      const resp = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${provider.key}`
        },
        body
      });
      if (!resp.ok) continue;
      const json = await resp.json();
      const choice = json.choices?.[0]?.message;
      const content = choice?.content || choice?.reasoning_content || choice?.reasoning || "";
      const parsed = JSON.parse(content);
      return { ...parsed, source: provider.label };
    } catch (e) {
      console.warn(`${provider.label} failed, trying next...`);
    }
  }
  return { verdict: "NEUTRAL", confidence: 0, reasoning: "All LLM nodes offline", researchPaper: "" };
}

/* ─── EXPORT ──────────────────────────────────────────────────────────────── */
export const api = functions.runWith({ timeoutSeconds: 540, memory: "1GB" }).https.onRequest(app);

// GET /cache/:symbol
app.get("/cache/:symbol", async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol as string;
    if (!reportCache) {
      return res.json({ cached: false, data: null });
    }
    const cached = await reportCache.get(symbol);
    if (cached) {
      return res.json({ cached: true, data: cached });
    }
    return res.json({ cached: false, data: null });
  } catch (error: any) {
    console.error("Cache GET error:", error.message);
    return res.status(500).json({ error: "Failed to read cache" });
  }
});

// POST /cache/:symbol
app.post("/cache/:symbol", async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol as string;
    const payload = req.body;
    if (!reportCache) {
      return res.json({ success: false, message: "Cache unavailable" });
    }
    await reportCache.save(symbol, payload);
    return res.json({ success: true, message: "Cached successfully" });
  } catch (error: any) {
    console.error("Cache POST error:", error.message);
    return res.status(500).json({ error: "Failed to write cache" });
  }
});

