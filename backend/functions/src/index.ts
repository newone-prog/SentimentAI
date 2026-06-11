import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import NodeCache from "node-cache";

// ── Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ── Initialize In-Memory Cache (replaced by Firestore in prod)
const myCache = new NodeCache({ stdTTL: 300 }); // 5 min default

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

// ── Middleware: Validate Bearer Token (Firebase Auth)
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || "";
  const token    = authHeader.replace("Bearer ", "");
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

/* ─── API LAYER ───────────────────────────────────────────────────────────── */

// POST /api/analyze — Full AI Research Pipeline
app.post("/analyze", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { symbol, companyName } = req.body;
    if (!symbol) return res.status(400).json({ error: "'symbol' is required" });

    // 1. Check Firestore cache
    const cacheDoc = db.collection("analyses").doc(`${symbol}_latest`);
    const cached    = await cacheDoc.get();
    if (cached.exists) {
      const data = cached.data() as any;
      const ttl   = 6 * 60 * 60 * 1000; // 6 hours
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

// GET /api/market — Proxy market data (caches internally)
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

// GET /api/news — Proxy news data
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

/* ─── INTERNAL HELPERS ───────────────────────────────────────────────────── */

async function getMarketData(symbol: string): Promise<any> {
  const cacheKey = `market_${symbol}`;
  const cached = myCache.get(cacheKey);
  if (cached) return cached;

  // Yahoo Finance proxy
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  const data = await proxyFetch(yahooUrl, { interval: "1d", range: "1mo" }, "");
  myCache.set(cacheKey, data, 300); // 5 min
  return data;
}

async function getNews(query: string): Promise<any> {
  const cacheKey = `news_${query}`;
  const cached = myCache.get(cacheKey);
  if (cached) return cached;

  const newsKey = process.env.GNEWS_API_KEY || "";
  const newsUrl = "https://gnews.io/api/v4/search";
  const data = await proxyFetch(newsUrl, { q: query, lang: "en", max: "10", apikey: newsKey }, "");
  myCache.set(cacheKey, data, 900); // 15 min
  return data;
}

async function getTechnicalIndicators(symbol: string): Promise<any> {
  const cacheKey = `tech_${symbol}`;
  const cached = myCache.get(cacheKey);
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
  myCache.set(cacheKey, mockIndicators, 300);
  return mockIndicators;
}

async function getLLMAnalysis(context: any): Promise<any> {
  // Proxy to NVIDIA NIM or OpenRouter securely
  const nvidiaKey = process.env.NVIDIA_NIM_KEY || "";
  const openRouterKey = process.env.OPENROUTER_KEY || "";
  const model = "meta/llama-3.1-70b-instruct";

  const prompt = `You are a senior equity research analyst. Analyze ONLY the data provided. Return valid JSON.
Company: ${context.company}
Symbol: ${context.symbol}
Price: ${context.marketData?.chart?.result?.[0]?.meta?.regularMarketPrice || "N/A"}
RSI: ${context.technicals?.rsi}
MACD: ${context.technicals?.macd}
News Headlines: ${context.news?.articles?.map((a: any) => a.title).join("; ") || "N/A"}

CRITICAL RULE: If RSI < 30 or Stochastic < 20, lean BULLISH (oversold bounce). If RSI > 70 or Stochastic > 80, lean BEARISH (overbought pullback).

Return JSON: { "verdict": "BULLISH|BEARISH|NEUTRAL", "confidence": 0-100, "reasoning": "...", "researchPaper": "..." }`;

  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: "You are a JSON-only response engine. Output ONLY valid JSON. No markdown, no code blocks." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 4096
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
      const content = json.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      return { ...parsed, source: provider.label };
    } catch (e) {
      console.warn(`${provider.label} failed, trying next...`);
    }
  }
  return { verdict: "NEUTRAL", confidence: 0, reasoning: "All LLM nodes offline", researchPaper: "" };
}

/* ─── EXPORT ──────────────────────────────────────────────────────────────── */

export const api = functions.https.onRequest(app);
