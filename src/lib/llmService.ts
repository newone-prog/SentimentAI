import { API_CONFIG } from './apiConfig';
import type { MarketStackEOD, MarketStackDividend, MarketStackSplit, AnalystNews } from './api';

export interface LLMAnalysis {
  reasoning: string;
  verdict: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  source: string;
  emotionalContext?: string;
  researchPaper?: string;
  disclaimer?: string;
}

const NVIDIA_MODEL = "meta/llama-3.1-70b-instruct";
const OPENROUTER_MODEL = "meta-llama/llama-3.1-70b-instruct";

const LLM_TIMEOUT = 60000;

const fetchWithRetry = async (url: string, options: RequestInit, retries: number = 2): Promise<Response> => {
  const parentSignal = options.signal;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (parentSignal?.aborted) {
      throw parentSignal.reason || new DOMException('Aborted', 'AbortError');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT);

    const onParentAbort = () => {
      controller.abort();
    };

    if (parentSignal) {
      parentSignal.addEventListener('abort', onParentAbort);
    }

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (response.status === 429 || response.status === 503) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[LLM] ${response.status} on attempt ${attempt + 1}, retrying in ${delay}ms...`);
        
        // Wait for the delay or parent abort
        await new Promise<void>((resolve, reject) => {
          const delayTimeout = setTimeout(resolve, delay);
          const abortHandler = () => {
            clearTimeout(delayTimeout);
            reject(parentSignal?.reason || new DOMException('Aborted', 'AbortError'));
          };
          if (parentSignal?.aborted) {
            abortHandler();
          } else if (parentSignal) {
            parentSignal.addEventListener('abort', abortHandler);
          }
        });
        continue;
      }
      return response;
    } catch (e: any) {
      if (parentSignal?.aborted) {
        throw parentSignal.reason || e;
      }
      if (e?.name === 'AbortError' && attempt < retries) {
        console.warn(`[LLM] Timeout on attempt ${attempt + 1}, retrying...`);
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
      if (parentSignal) {
        parentSignal.removeEventListener('abort', onParentAbort);
      }
    }
  }
  throw new Error('Max retries exceeded');
};

const buildNewsIntelligenceSection = (sentimentData: any): string => {
  const articles = sentimentData?.analyzedData || [];
  if (!articles || articles.length === 0) return 'No news intelligence data available.';

  const articlesWithContent = articles.filter((a: any) => a.content && a.content.length > 20);

  if (articlesWithContent.length > 0) {
    const summaries = articlesWithContent.slice(0, 5).map((a: any, i: number) => {
      const truncatedContent = a.content.substring(0, 500);
      return `[Article ${i + 1}] Headline: "${a.title}" | Source: ${a.source || 'Unknown'} | Sentiment Score: ${a.score?.toFixed(2) || 'N/A'} | Emotion: ${a.emotion || 'Unknown'}\nContent excerpt: "${truncatedContent}"`;
    });
    return `[NEWS INTELLIGENCE — Full Article Analysis]\n${summaries.join('\n\n')}\n\nINSTRUCTION: You have full article content excerpts above. Analyze the SUBSTANCE of each article — not just the headline. What are the key facts, figures, and implications? How do they affect the stock? Cross-reference article content with technical and fundamental data.`;
  }

  const headlineSummaries = articles.slice(0, 10).map((d: any) => ({
    headline: d.title,
    source: d.source,
    detected_emotion: d.emotion,
    impact_score: d.score
  }));
  return `[NEWS ENTITIES — Headline-Only Analysis (no article body available)]\n${JSON.stringify(headlineSummaries)}\n\nNOTE: Only headlines are available. Analyze based on headline content but note limited depth.`;
};

export const getDeepAnalysis = async (stockName: string, priceData: any, sentimentData: any, signal?: AbortSignal): Promise<LLMAnalysis> => {
  console.log("LLM Service [v4.0 - Deep Research RAG with News Intelligence] Initialized");

  const newsIntelSection = buildNewsIntelligenceSection(sentimentData);

  const prompt = `
You are a senior equity research analyst at a top-tier Indian brokerage firm. Analyze ${stockName} using ONLY the real-time data provided below. Every claim must reference specific data points from the sources listed. Cross-reference all sources for deeper insight.

[REAL-TIME MARKET DATA — Source: Yahoo Finance API]
- Stock: ${stockName}
- Current Price: ${priceData?.price} ${priceData?.currency}
- 24h Change: ${priceData?.changePercent}%
- 30-Day Price History: ${JSON.stringify(priceData?.history?.slice(-15))}
- Average Volume: ${priceData?.avgVolume?.toLocaleString() || 'N/A'}
- 52-Week High: ${priceData?.fiftyTwoWeekHigh || 'N/A'}
- 52-Week Low: ${priceData?.fiftyTwoWeekLow || 'N/A'}

[TECHNICAL INDICATORS — Source: TradingView Scanner API]
- RSI(14): ${sentimentData?.communitySentiment?.rsi ?? 'N/A'} (above 70 = overbought, below 30 = oversold)
- Stochastic K/D: ${sentimentData?.communitySentiment?.stochK ?? 'N/A'} / ${sentimentData?.communitySentiment?.stochD ?? 'N/A'} (above 80 = overbought, below 20 = oversold)
- MACD: ${sentimentData?.communitySentiment?.macd ?? 'N/A'} vs Signal: ${sentimentData?.communitySentiment?.macdSignal ?? 'N/A'} (MACD above signal = bullish, below = bearish)
- TradingView Recommend.All: ${sentimentData?.communitySentiment?.recommendAll ?? 'N/A'} (scale -1 to +1, negative = sell, positive = buy)
- Volatility: ${sentimentData?.communitySentiment?.volatility ?? 'N/A'}
- VWAP: ${sentimentData?.communitySentiment?.vwap ?? 'N/A'} (price above VWAP = bullish, below = bearish)

[END-OF-DAY DATA — Source: MarketStack API]
${(() => {
    const ms = sentimentData?.marketData?.marketStack;
    if (!ms || !ms.eod || ms.eod.length === 0) return 'No MarketStack EOD data available for this symbol.';
    const latest = ms.eod[0];
    const prev = ms.eod.length > 1 ? ms.eod[1] : null;
    let section = `- Latest EOD (${latest.date}): Open=${latest.open}, High=${latest.high}, Low=${latest.low}, Close=${latest.close}, Volume=${latest.volume}`;
    if (prev) {
      const eodChange = ((latest.close - prev.close) / prev.close * 100).toFixed(2);
      section += `\n- Previous EOD (${prev.date}): Close=${prev.close} (Day change: ${eodChange}%)`;
    }
    if (ms.eod.length >= 7) {
      const weekAgo = ms.eod[6];
      const weeklyChange = ((latest.close - weekAgo.close) / weekAgo.close * 100).toFixed(2);
      section += `\n- 1-Week Change: ${weeklyChange}% (from ${weekAgo.close} on ${weekAgo.date})`;
    }
    if (ms.eod.length >= 30) {
      const monthAgo = ms.eod[ms.eod.length - 1];
      const monthlyChange = ((latest.close - monthAgo.close) / monthAgo.close * 100).toFixed(2);
      const monthlyHigh = Math.max(...ms.eod.map((d: MarketStackEOD) => d.high));
      const monthlyLow = Math.min(...ms.eod.map((d: MarketStackEOD) => d.low));
      section += `\n- 30-Day Change: ${monthlyChange}% | 30D High: ${monthlyHigh} | 30D Low: ${monthlyLow}`;
    }
    section += `\n- 30-Day EOD History: ${JSON.stringify(ms.eod.map((d: MarketStackEOD) => ({ date: d.date, close: d.close, volume: d.volume, split_factor: d.split_factor, dividend: d.dividend })))}`;
    if (ms.eod.length > 0 && ms.eod[0].symbol) {
      section += `\n- Symbol: ${ms.eod[0].symbol} | Exchange: ${ms.eod[0].exchange || 'N/A'}`;
    }
    return section;
  })()}

[DIVIDENDS & SPLITS — Source: MarketStack API]
${(() => {
    const ms = sentimentData?.marketData?.marketStack;
    if (!ms) return 'No dividend/split data available.';
    let section = '';
    if (ms.dividends && ms.dividends.length > 0) {
      section += `- Recent Dividends: ${JSON.stringify(ms.dividends.slice(0, 5).map((d: MarketStackDividend) => ({ date: d.date, amount: d.dividend, symbol: d.symbol })))}`;
      let totalDiv = 0;
      for (const d of ms.dividends) { totalDiv += d.dividend; }
      section += `\n- Total Dividend Payout (recent): ${totalDiv.toFixed(2)}`;
    } else {
      section += '- No recent dividends recorded.';
    }
    if (ms.splits && ms.splits.length > 0) {
      section += `\n- Recent Splits: ${JSON.stringify(ms.splits.slice(0, 5).map((s: MarketStackSplit) => ({ date: s.date, split_factor: s.split_factor, symbol: s.symbol })))}`;
    } else {
      section += '\n- No recent stock splits recorded.';
    }
    return section;
  })()}

[SENTIMENT & MACRO — Source: Nifty Fear & Greed Index, GNews/MediaStack]
- Fear & Greed Index: ${sentimentData?.globalFearGreed}/100 (below 30 = extreme fear, above 70 = extreme greed)
- Social Heat Score: ${sentimentData?.socialHeat}/100
- Aggregate News Sentiment: ${sentimentData?.avgScore} (-1 to 1)

${newsIntelSection}

[INDIAN MARKET INTELLIGENCE — Source: Indian Stock API]
${sentimentData?.indianDetails?.analystView ? `Analyst View: ${sentimentData.indianDetails.analystView}` : 'No analyst view available'}
${sentimentData?.indianDetails?.recommendation ? `Analyst Recommendation: ${sentimentData.indianDetails.recommendation}` : ''}
${sentimentData?.indianDetails?.recentNews?.length ? `Recent Indian Market News (${sentimentData.indianDetails.recentNews.length} items): ${JSON.stringify(sentimentData.indianDetails.recentNews.slice(0, 8).map((n: AnalystNews) => ({ title: n.title, source: n.source, date: n.date })))}` : 'No Indian market news available'}

[DATA CROSS-REFERENCE INSTRUCTIONS]
You have data from 5 independent sources: Yahoo Finance, TradingView, MarketStack, Indian Stock API, and News APIs. Use ALL of them:
- Cross-verify Yahoo price data against MarketStack EOD closing prices for consistency
- Use MarketStack 30-day EOD to identify support/resistance levels beyond what Yahoo 52W range provides
- Use MarketStack dividend history to assess income potential and yield
- Use MarketStack split history to adjust historical price comparisons
- Combine TradingView RSI/Stoch with MarketStack price trends for stronger technical signals
- Use IndianAPI news AND GNews/MediaStack news together — if both report the same event, confidence increases
- If MarketStack and Yahoo disagree on price, note the discrepancy and use the more recent source
- When full article content is provided, analyze the substance of the article, not just the headline

[TASK] Write a comprehensive equity research report in 5 sections:

1. EXECUTIVE SUMMARY (2-3 sentences): Key verdict and why. State your verdict clearly.

2. TECHNICAL ANALYSIS: Analyze the price trend using BOTH Yahoo and MarketStack EOD data. Analyze RSI, MACD, Stochastic values. Identify support/resistance from 30-day EOD highs/lows AND 52-week range. Reference specific price levels and indicator values. State whether indicators signal overbought/oversold. Compare current price to VWAP. Distinguish between trending and ranging regimes — in a strong trend, RSI>70 can signal strength not overbought; in a range, RSI>70 signals overbought.

3. FUNDAMENTAL & DIVIDEND ANALYSIS: Analyze dividend history from MarketStack — calculate approximate yield if current price is available. Assess split-adjusted performance. Analyze each news item's IMPACT AND SUBSTANCE (use full article content when available). Cite specific headlines and their sentiment scores. Explain WHY each event affects the stock — sector trends, regulatory changes, macro factors. Reference the source of each data point.

4. BEHAVIORAL ANALYSIS: What are traders doing? Is there FOMO, panic selling, accumulation, or distribution? Use Fear & Greed Index, Social Heat, and community sentiment to explain crowd psychology. Are smart money and retail aligned or divergent? Use MarketStack volume trends to confirm or deny crowd behavior signals.

5. INVESTMENT THESIS: Should a trader BUY, SELL, or HOLD? Give specific entry/exit price levels from the data. Factor in dividend income potential. State risk factors. End with a mandatory disclaimer.

[CRITICAL VERDICT RULES — TREND-AWARE]
- If the market is in a STRONG UPTREND (ADX>25, price above SMA20): RSI>70 signals STRENGTH, not overbought — lean BULLISH
- If the market is in a STRONG DOWNTREND (ADX>25, price below SMA20): RSI<30 signals WEAKNESS, not oversold — lean BEARISH
- If the market is RANGING (ADX<20): RSI>70 signals overbought → lean BEARISH; RSI<30 signals oversold → lean BULLISH
- If RSI < 30 AND Stochastic < 20 AND price is in a range (low ADX) AND Recommend.All > 0: lean BULLISH (contrarian buy in oversold range)
- If RSI > 70 AND Stochastic > 80 AND price is in a range (low ADX) AND Recommend.All < 0: lean BEARISH (contrarian sell in overbought range)
- If price is down more than 1% with bearish technicals in a downtrend: verdict should be BEARISH (follow the trend)
- If price is up more than 1% with bullish technicals in an uptrend: verdict should be BULLISH (follow the trend)
- Only return NEUTRAL if signals are genuinely mixed (some bullish, some bearish, no clear regime)
- DO NOT default to NEUTRAL out of caution — make a decisive call based on the data
- Your confidence must be between 0 and 100

[OUTPUT FORMAT — STRICT RULES]
Return ONLY a valid JSON object. No markdown code blocks. No backticks. No commentary before or after.
All newlines inside string values MUST be escaped as \\n.
No trailing commas.
The JSON object must be exactly:
{"reasoning":"5-6 line executive summary","verdict":"BULLISH","confidence":75,"emotionalContext":"One-line market emotion","disclaimer":"AI-generated analysis. Not financial advice. Invest at your own risk.","researchPaper":"Full research report with === section headers and \\n\\n paragraph breaks. 1-2 pages. Every claim must cite data source."}

IMPORTANT: The "verdict" field must be exactly one of these three strings: "BULLISH", "BEARISH", or "NEUTRAL". Choose based on the data — do NOT default to NEUTRAL.
IMPORTANT: The "confidence" field must be an integer between 0 and 100.
`;

  const tryLLM = async (url: string, headers: Record<string, string>, body: string, label: string): Promise<LLMAnalysis> => {
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body,
      signal
    });
    if (!response.ok) throw new Error(`${label} Offline (${response.status})`);
    const data = await response.json();
    const content = data.choices[0].message.content;

    let raw = content.trim();

    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) raw = codeBlockMatch[1].trim();

    const braceMatch = raw.match(/\{[\s\S]*\}/);
    if (braceMatch) raw = braceMatch[0];

    const escapeStringsInJson = (json: string): string => {
      let out = '';
      let inString = false;
      let escaped = false;
      for (let i = 0; i < json.length; i++) {
        const ch = json[i];
        if (escaped) { out += ch; escaped = false; continue; }
        if (ch === '\\') { out += ch; escaped = true; continue; }
        if (ch === '"') { inString = !inString; out += ch; continue; }
        if (inString) {
          if (ch === '\n') { out += '\\n'; continue; }
          if (ch === '\r') { out += '\\r'; continue; }
          if (ch === '\t') { out += '\\t'; continue; }
          if (ch >= '\x00' && ch <= '\x1f') continue;
        }
        out += ch;
      }
      return out;
    };

    let sanitized = escapeStringsInJson(raw);
    sanitized = sanitized
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/"\s*\|\s*"/g, '" || "');

    let result;
    try {
      result = JSON.parse(sanitized);
    } catch (parseErr) {
      console.warn("LLM JSON parse failed, attempting field extraction.", parseErr);
      const extractString = (name: string): string => {
        const re = new RegExp(`"${name}"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,|\\})`);
        const m = raw.match(re);
        if (!m) {
          const re2 = new RegExp(`"${name}"\\s*:\\s*"([\\s\\S]*)`);
          const m2 = raw.match(re2);
          if (m2) return m2[1].replace(/"\s*$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
          return '';
        }
        return m[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, '\t').replace(/\\"/g, '"');
      };
      const extractNumber = (name: string): number => {
        const re = new RegExp(`"${name}"\\s*:\\s*([0-9.]+)`);
        const m = raw.match(re);
        return m ? parseFloat(m[1]) : 0;
      };
      const extractUnquoted = (name: string): string => {
        const re = new RegExp(`"${name}"\\s*:\\s*"?([A-Z]+)"?`);
        const m = raw.match(re);
        return m ? m[1] : '';
      };
      result = {
        reasoning: extractString('reasoning') || 'Analysis completed but response format was irregular.',
        verdict: extractUnquoted('verdict') || 'NEUTRAL',
        confidence: extractNumber('confidence') || 50,
        emotionalContext: extractString('emotionalContext') || 'Mixed signals',
        disclaimer: extractString('disclaimer') || 'AI-generated analysis. Not financial advice.',
        researchPaper: extractString('researchPaper') || '',
      };
    }

    if (result.researchPaper && typeof result.researchPaper === 'string') {
      result.researchPaper = result.researchPaper
        .replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, '\t').replace(/\\"/g, '"');
    }

    const validVerdicts = ['BULLISH', 'BEARISH', 'NEUTRAL'];
    if (!validVerdicts.includes(result.verdict)) {
      result.verdict = 'NEUTRAL';
    }

    result.confidence = Math.max(0, Math.min(100, Math.round(result.confidence || 50)));

    return { ...result, source: label };
  };

  const nvidiaBody = JSON.stringify({
    model: NVIDIA_MODEL,
    messages: [
      { role: "system", content: "You are a JSON-only response engine. Output ONLY valid JSON. No markdown, no code blocks, no commentary. All string values must properly escape newlines as \\n." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" }
  });

  try {
    console.log("Deep Research RAG v4.0: Attempting NVIDIA NIM Analysis...");

    if (!API_CONFIG.NVIDIA_NIM_KEY) {
      throw new Error('NVIDIA_NIM_KEY not configured');
    }

    return await tryLLM("/llm/nvidia", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_CONFIG.NVIDIA_NIM_KEY}`
    }, nvidiaBody, `NVIDIA Intelligence Node (${NVIDIA_MODEL})`);
  } catch (nvidiaError) {
    console.warn("NVIDIA Node Failed, switching to OpenRouter...", nvidiaError);

    try {
      if (!API_CONFIG.OPENROUTER_KEY) {
        throw new Error('OPENROUTER_KEY not configured');
      }

      const openRouterBody = JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: "You are a JSON-only response engine. Output ONLY valid JSON. No markdown, no code blocks, no commentary. All string values must properly escape newlines as \\n." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      });
      return await tryLLM("/llm/openrouter/chat/completions", {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_CONFIG.OPENROUTER_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "SentimentAI v4"
      }, openRouterBody, `OpenRouter Mesh (${OPENROUTER_MODEL})`);
    } catch (openRouterError) {
      console.error("CRITICAL: All Intelligence Nodes Offline.", openRouterError);
      return {
        reasoning: "Intelligence stream interrupted. Falling back to local deterministic model.",
        verdict: "NEUTRAL",
        confidence: 0,
        source: "Local Baseline Engine",
        emotionalContext: "Disconnected",
        disclaimer: "AI-generated analysis. Not financial advice. Invest at your own risk.",
        researchPaper: "=== EXECUTIVE SUMMARY ===\n\nAll AI intelligence nodes are currently offline. Unable to generate research report.\n\n=== DATA SOURCES ===\n\n- Yahoo Finance API (price data)\n- TradingView Scanner API (technical indicators)\n- MarketStack API (EOD data, dividends, splits)\n- Indian Stock API (news, analyst view)\n- GNews / MediaStack (news sentiment)\n\nPlease try again later when the LLM services are restored."
      };
    }
  }
};
