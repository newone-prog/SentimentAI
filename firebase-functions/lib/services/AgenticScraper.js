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
exports.AgenticScraper = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
class AgenticScraper {
    /**
     * Performs a DuckDuckGo HTML search and returns parsed results.
     * DuckDuckGo Lite is used to bypass JS requirements.
     */
    static async search(query, limit = 5) {
        try {
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const { data } = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            const $ = cheerio.load(data);
            const results = [];
            $('.result').each((i, el) => {
                if (i >= limit)
                    return false;
                const title = $(el).find('.result__title a').text().trim();
                const link = $(el).find('.result__title a').attr('href');
                const snippet = $(el).find('.result__snippet').text().trim();
                // DuckDuckGo redirects links through their server, we need to extract the actual URL
                let actualLink = link || '';
                if (actualLink.startsWith('//duckduckgo.com/l/?uddg=')) {
                    const urlParams = new URLSearchParams(actualLink.split('?')[1]);
                    const decoded = urlParams.get('uddg');
                    actualLink = decoded ? decodeURIComponent(decoded) : actualLink;
                }
                if (title && snippet) {
                    results.push({
                        title,
                        link: actualLink,
                        snippet
                    });
                }
                return true;
            });
            return results;
        }
        catch (error) {
            console.error(`AgenticScraper Error searching "${query}":`, error.message);
            return [];
        }
    }
    /**
     * Fetches and extracts raw text content from a given URL.
     * Useful for the LLM to deep-dive into a specific search result.
     */
    static async extractPageContent(url) {
        try {
            const { data } = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SentimentAI-Research-Bot/1.0)',
                    'Accept': 'text/html,application/xhtml+xml'
                },
                timeout: 10000 // 10s timeout to prevent hanging
            });
            const $ = cheerio.load(data);
            // Remove noise
            $('script, style, noscript, iframe, img, svg, nav, footer, header').remove();
            // Extract clean text
            const text = $('body').text()
                .replace(/\s+/g, ' ')
                .trim();
            // Truncate to first 10,000 characters to save LLM context window
            return text.substring(0, 10000);
        }
        catch (error) {
            console.error(`AgenticScraper Error extracting "${url}":`, error.message);
            return `[Failed to extract content from ${url}. Server may block bots or URL is invalid.]`;
        }
    }
}
exports.AgenticScraper = AgenticScraper;
//# sourceMappingURL=AgenticScraper.js.map