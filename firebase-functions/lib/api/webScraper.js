"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webScraperEndpoint = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const webScraperEndpoint = async (req, res) => {
    const { type, ticker, interval } = req.body;
    if (!ticker) {
        return res.status(400).json({ error: "Ticker is required" });
    }
    try {
        if (type === 'daily') {
            // Use Yahoo Chart API directly (fast, structured JSON, no header overflow)
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=30d&interval=1d`;
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                }
            });
            if (response.data?.chart?.error || !response.data?.chart?.result?.[0]) {
                return res.status(404).json({
                    success: false,
                    error: response.data?.chart?.error?.description || "Ticker not found on exchange",
                    code: "NOT_FOUND"
                });
            }
            const result = response.data?.chart?.result?.[0];
            const meta = result?.meta;
            const quotes = result?.indicators?.quote?.[0];
            const closeHistory = quotes?.close?.filter((p) => typeof p === 'number') || [];
            const openHistory = quotes?.open?.filter((p) => typeof p === 'number') || [];
            const highHistory = quotes?.high?.filter((p) => typeof p === 'number') || [];
            const lowHistory = quotes?.low?.filter((p) => typeof p === 'number') || [];
            const volumeHistory = quotes?.volume?.filter((p) => typeof p === 'number') || [];
            const currentPrice = meta?.regularMarketPrice || closeHistory[closeHistory.length - 1] || 0;
            const previousPrice = meta?.chartPreviousClose || closeHistory[closeHistory.length - 2] || currentPrice;
            const change = currentPrice - previousPrice;
            const changePercent = previousPrice ? (change / previousPrice) * 100 : 0;
            const avgVolume = volumeHistory.length ? (volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length) : 0;
            return res.json({
                success: true,
                data: {
                    name: ticker,
                    price: currentPrice,
                    change: parseFloat(change.toFixed(2)),
                    changePercent: parseFloat(changePercent.toFixed(2)),
                    currency: meta?.currency || 'USD',
                    history: closeHistory.slice(-30),
                    openHistory: openHistory.slice(-30),
                    highHistory: highHistory.slice(-30),
                    lowHistory: lowHistory.slice(-30),
                    volume: volumeHistory.slice(-30),
                    avgVolume,
                    isScraped: true
                }
            });
        }
        else if (type === 'intraday') {
            // For intraday, scraping Google Finance HTML is tough because charts are canvas.
            // We will fallback to proxying a different free API or standard Yahoo query but with no cors.
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=${interval || '15m'}`;
            const response = await axios_1.default.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const result = response.data.chart.result[0];
            const quotes = result.indicators.quote[0];
            const closePrices = quotes.close.filter((p) => p !== null);
            const volumeArray = quotes.volume ? quotes.volume.filter((v) => v !== null) : [];
            return res.json({
                success: true,
                data: {
                    currentPrice: closePrices[closePrices.length - 1],
                    closePrices,
                    volumeArray,
                    isScraped: true
                }
            });
        }
        else if (type === 'news') {
            // Scrape Google News RSS (which is an XML file)
            const url = `https://news.google.com/rss/search?q=${encodeURIComponent(ticker + ' stock')}&hl=en-US&gl=US&ceid=US:en`;
            const response = await axios_1.default.get(url);
            const $ = cheerio.load(response.data, { xmlMode: true });
            const items = $('item').slice(0, 5);
            const news = [];
            items.each((i, el) => {
                news.push({
                    title: $(el).find('title').text(),
                    publisher: $(el).find('source').text(),
                    link: $(el).find('link').text(),
                    providerPublishTime: new Date($(el).find('pubDate').text()).getTime() / 1000,
                    type: "STORY"
                });
            });
            return res.json({
                success: true,
                data: news
            });
        }
        return res.status(400).json({ error: "Invalid scrape type" });
    }
    catch (error) {
        console.error("[WebScraper] Error:", error.message);
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                error: "Ticker not found on exchange or delisted",
                code: "NOT_FOUND"
            });
        }
        return res.status(500).json({ error: "Scraping failed: " + error.message });
    }
};
exports.webScraperEndpoint = webScraperEndpoint;
//# sourceMappingURL=webScraper.js.map