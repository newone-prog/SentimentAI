import { API_CONFIG } from './apiConfig';
import type { MarketStackEOD, MarketStackDividend, MarketStackSplit, AnalystNews } from './api';
import { CacheService } from './orchestrator/cache/CacheService';

export interface LLMAnalysis {
  reasoning: string;
  verdict: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  source: string;
  emotionalContext?: string;
  researchPaper?: string;
  disclaimer?: string;
}

const NVIDIA_MODEL = "openai/gpt-oss-20b";
const OPENROUTER_MODEL = "meta-llama/llama-3.1-70b-instruct";

const LLM_TIMEOUT = 300000; // 5 minutes for deep research

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

export const getAgenticParallelAnalysis = async (
  stockName: string,
  priceData: any,
  sentimentData: any,
  userQuery?: string,
  mutualFundData?: any
) => {
  const cache = new CacheService();
  const cacheKey = `agentic-investor-${stockName}-${userQuery || 'default'}`;
  const cached = await cache.get<any>(cacheKey);
  
  if (cached) {
    console.log(`[Agentic] Cache HIT for ${cacheKey}`);
    return cached;
  }

  console.log("[Agentic] Triggering Parallel Backend Orchestrator...");
  const url = "/api/agentic-orchestrate";
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticker: stockName,
      companyName: stockName,
      priceData,
      sentimentData,
      userQuery,
      mutualFundData
    })
  });

  if (!response.ok) {
    throw new Error(`Agentic Orchestrator Failed: ${response.status}`);
  }

  const result = await response.json();
  await cache.set(cacheKey, result, 7200); // Cache for 2 hours
  return result;
};

import { ResearchOrchestratorService } from "./orchestrator/ResearchOrchestratorService";

const orchestrator = new ResearchOrchestratorService();

export const getDeepAnalysis = async (
  stockName: string, 
  priceData: any, 
  sentimentData: any, 
  signal?: AbortSignal,
  onProgress?: (step: string, details?: string) => void
): Promise<LLMAnalysis> => {
  console.log("LLM Service [v4.0 - Deep Research RAG with News Intelligence] Initialized");

  // 1. Run local multi-agent orchestrated research
  try {
    console.info(`[LLM] Starting local client-side multi-agent research for ${stockName}...`);
    
    // Pass the real-time data to the local orchestrator
    const report = await orchestrator.orchestrate(stockName, false, priceData, sentimentData, onProgress);
    
    console.info("[LLM] Orchestrated report generated successfully.");

    const compiledPaper = `
=== EXECUTIVE SUMMARY ===
${report.executiveSummary}

=== TECHNICAL ANALYSIS ===
${report.technicalAnalysis}

=== FUNDAMENTAL & NEWS ANALYSIS ===
${report.fundamentalAndNewsAnalysis}

=== BEHAVIORAL ANALYSIS ===
${report.behavioralAnalysis}

=== INVESTMENT THESIS ===
${report.investmentThesis}
      `.trim();

    return {
      reasoning: report.executiveSummary,
      verdict: report.finalVerdict,
      confidence: report.confidenceScore,
      source: "Institutional Multi-Agent Orchestrator (Client-Side)",
      emotionalContext: "CIO Evaluated Consensus",
      researchPaper: compiledPaper,
      disclaimer: "AI-generated institutional research report. Not financial advice."
    };
  } catch (backendError) {
    console.warn("[LLM] Local orchestrator failed. Falling back to client-side single prompt LLM.", backendError);
  }

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

[TASK] Write a comprehensive equity research report in 5 sections. Use === before each section header (e.g. === EXECUTIVE SUMMARY ===):

1. EXECUTIVE SUMMARY (2-3 sentences): Key long-term verdict and why. State your verdict clearly.

2. VALUATION & LONG-TERM TREND: Analyze the broader price trend in the context of valuation. Identify long-term structural support levels. Contrast short-term technical noise (RSI, Stochastic) with the 200-day moving average and long-term consolidation patterns.

3. FUNDAMENTAL & NEWS ANALYSIS: Analyze each news item's impact on intrinsic value. Explain WHY each event affects the stock's multi-year moat — sector trends, regulatory changes, macro factors. Reference the source of each data point.

4. INSTITUTIONAL SENTIMENT & MARGIN OF SAFETY: How is the broader market pricing this asset? Are retail traders panic selling (creating a discount/margin of safety) or is there FOMO (creating overvaluation)? Analyze if smart money is accumulating. 

5. INVESTMENT THESIS: Should a long-term investor ACCUMULATE, HOLD, or REDUCE? Discuss intrinsic value margin of safety and multi-year growth runway instead of short-term entry/exit levels. State structural risk factors. End with a mandatory disclaimer.

[CRITICAL VERDICT RULES — VALUE AWARE]
- If fundamental value is strong but short-term technicals are weak (oversold, fear): lean ACCUMULATE (buying at a discount)
- If fundamental value is weak but short-term technicals are strong (overbought, greed): lean REDUCE (selling into the hype)
- If price is falling but structural thesis is intact: lean ACCUMULATE
- Do not provide short-term day-trading entry/exit levels.
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
    const choice = data.choices?.[0]?.message;
    const content = choice?.content || choice?.reasoning_content || choice?.reasoning || "";

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

    const validVerdicts = ['BULLISH', 'BEARISH', 'NEUTRAL', 'SIDEWAYS'];
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
  } catch (nvidiaError: any) {
    if (nvidiaError?.name === 'AbortError') {
      throw nvidiaError;
    }
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
    } catch (openRouterError: any) {
      if (openRouterError?.name === 'AbortError') {
        throw openRouterError;
      }
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

export const getMFDeepAnalysis = async (
  fundDetails: any,
  signal?: AbortSignal,
  onProgress?: (step: string, details?: string) => void
): Promise<LLMAnalysis> => {
  console.log("LLM Service [v4.0 - Mutual Fund Deep Research] Initialized");
  
  const cacheKey = `mf-report-${fundDetails?.searchId || fundDetails?.schemeName}`;
  const cache = new CacheService();
  const cachedReport = await cache.get<LLMAnalysis>(cacheKey);
  if (cachedReport) {
      onProgress?.('Cache Hit', 'Found recent report. Loading from memory...');
      return cachedReport;
  }

  
  const fundName = fundDetails?.schemeName || 'Unknown Fund';
  
  const prompt = `
You are a senior mutual fund research analyst and portfolio manager at a top-tier institutional asset management firm. Analyze the mutual fund ${fundName} using ONLY the real-time data provided below. 

[REAL-TIME FUND DATA — Source: Groww API]
- Fund Name: ${fundDetails?.schemeName}
- Category: ${fundDetails?.category} - ${fundDetails?.subCategory}
- Current NAV: ₹${fundDetails?.nav}
- AUM (Assets Under Management): ₹${(fundDetails?.aum / 10000000).toFixed(2)} Crores
- Expense Ratio: ${fundDetails?.expenseRatio}%

[FUND MANAGERS]
${fundDetails?.fundManagers?.map((fm: any) => `- Name: ${fm.name} | Experience: ${fm.experience}`).join('\n') || 'No Manager Data'}

[PORTFOLIO & SECTOR ALLOCATION]
- Top Sectors: 
${fundDetails?.sectorAllocation?.map((s: any) => `  * ${s.sector_name}: ${s.corpus_per.toFixed(2)}%`).join('\n') || 'N/A'}
- Top Holdings:
${fundDetails?.topHoldings?.slice(0, 10).map((h: any) => `  * ${h.company_name} (${h.sector_name}): ${h.corpus_per.toFixed(2)}%`).join('\n') || 'N/A'}

[PERFORMANCE & RISK RATIOS]
- 1 Year Return: ${fundDetails?.returns?.return1y || 'N/A'}%
- 3 Year Return: ${fundDetails?.returns?.return3y || 'N/A'}%
- 5 Year Return: ${fundDetails?.returns?.return5y || 'N/A'}%
- Alpha: ${fundDetails?.riskRatios?.alpha || 'N/A'}
- Beta: ${fundDetails?.riskRatios?.beta || 'N/A'} (below 1 = less volatile than market, above 1 = more volatile)
- Sharpe Ratio: ${fundDetails?.riskRatios?.sharpe || 'N/A'} (higher is better risk-adjusted return)
- Sortino Ratio: ${fundDetails?.riskRatios?.sortino || 'N/A'} (higher is better downside protection)

[TASK] Write a comprehensive Mutual Fund research report in 5 sections. Use === before each section header:

1. EXECUTIVE SUMMARY (2-3 sentences): Key long-term verdict and why. State your verdict clearly.

2. FUNDAMENTAL & PORTFOLIO ANALYSIS: Analyze the sector allocation and top holdings. Is it concentrated or diversified? Does the portfolio match the fund's stated category? Evaluate the Expense Ratio relative to industry standards.

3. FUND MANAGER & RISK ASSESSMENT: Evaluate the fund manager's experience. Analyze Alpha, Beta, Sharpe, and Sortino ratios. Is the manager generating outsized returns for the risk taken, or just riding market momentum?

4. HISTORICAL PERFORMANCE: How has it performed over 1Y, 3Y, 5Y? Discuss consistency.

5. INVESTMENT THESIS & RECOMMENDATIONS: Should an investor ACCUMULATE, HOLD, or AVOID this fund? Discuss the ideal investor profile (e.g., risk appetite, time horizon). 
*CRITICAL RULE:* If the fund has poor risk-adjusted returns (low Sharpe, negative Alpha) or underperforms its category, you MUST recommend 1 specific alternative top-performing mutual fund in the SAME category (e.g., if it's a poor Small Cap fund, recommend a better Small Cap fund like Nippon India Small Cap or Quant Small Cap). Explain why the alternative is better.

[CRITICAL VERDICT RULES]
- If Alpha is positive, Sharpe is strong, and expenses are reasonable: lean BULLISH (ACCUMULATE)
- If Alpha is negative, Sharpe is low, or AUM is shrinking rapidly: lean BEARISH (AVOID/SWITCH)
- Your confidence must be between 0 and 100

[OUTPUT FORMAT — STRICT RULES]
Return ONLY a valid JSON object. No markdown code blocks. No backticks. No commentary before or after.
All newlines inside string values MUST be escaped as \\n.
The JSON object must be exactly:
{"reasoning":"5-6 line executive summary","verdict":"BULLISH","confidence":80,"emotionalContext":"Institutional conviction","disclaimer":"AI-generated analysis. Not financial advice. Invest at your own risk.","researchPaper":"Full research report with === section headers and \\n\\n paragraph breaks. 1-2 pages."}

IMPORTANT: The "verdict" field must be exactly one of these three strings: "BULLISH", "BEARISH", or "NEUTRAL". Choose based on the data.
`;

  // We will reuse the internal tryLLM approach from getDeepAnalysis.
  // Since tryLLM is scoped inside getDeepAnalysis, we'll duplicate the LLM caller block here for isolation.
  
  const NVIDIA_MODEL = "openai/gpt-oss-20b";
  const OPENROUTER_MODEL = "meta-llama/llama-3.1-70b-instruct";
  
  const callLLM = async (url: string, headers: Record<string, string>, body: string, label: string): Promise<LLMAnalysis> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const parentSignal = signal;
    const onParentAbort = () => controller.abort();
    if (parentSignal) parentSignal.addEventListener('abort', onParentAbort);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`${label} Offline (${response.status})`);
      const data = await response.json();
      const choice = data.choices?.[0]?.message;
      const content = choice?.content || choice?.reasoning_content || choice?.reasoning || "";
      let raw = content.trim();
      const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) raw = codeBlockMatch[1].trim();
      const braceMatch = raw.match(/\{[\s\S]*\}/);
      if (braceMatch) raw = braceMatch[0];

      let result;
      try {
        result = JSON.parse(raw.replace(/\n/g, '\\n'));
      } catch (e) {
        result = {
          reasoning: "Analysis generated but format parsing failed.",
          verdict: "NEUTRAL",
          confidence: 50,
          emotionalContext: "Parsing Error",
          disclaimer: "AI-generated analysis.",
          researchPaper: raw.replace(/\n/g, '\n')
        };
      }
      return { ...result, source: label };
    } finally {
      clearTimeout(timeoutId);
      if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
    }
  };

  const nvidiaBody = JSON.stringify({
    model: NVIDIA_MODEL,
    messages: [
      { role: "system", content: "You are a JSON-only response engine. Output ONLY valid JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" }
  });

  try {
    if (!API_CONFIG.NVIDIA_NIM_KEY) throw new Error('NVIDIA_NIM_KEY missing');
    const result = await callLLM("/llm/nvidia", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_CONFIG.NVIDIA_NIM_KEY}`
    }, nvidiaBody, `NVIDIA MF Node (${NVIDIA_MODEL})`);
    
    await cache.set(cacheKey, result, 7200); // 2 hours
    return result;
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    try {
      if (!API_CONFIG.OPENROUTER_KEY) throw new Error('OPENROUTER_KEY missing');
      const orBody = JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: "You are a JSON-only response engine. Output ONLY valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      });
      const result = await callLLM("/llm/openrouter/chat/completions", {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_CONFIG.OPENROUTER_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "SentimentAI MF Node"
      }, orBody, `OpenRouter MF Mesh (${OPENROUTER_MODEL})`);

      await cache.set(cacheKey, result, 7200); // 2 hours
      return result;
    } catch (orErr: any) {
      if (orErr?.name === 'AbortError') throw orErr;
      return {
        reasoning: "Intelligence stream interrupted.",
        verdict: "NEUTRAL",
        confidence: 0,
        source: "Local Baseline Engine",
        emotionalContext: "Disconnected",
        disclaimer: "AI-generated analysis. Not financial advice.",
        researchPaper: "=== EXECUTIVE SUMMARY ===\n\nAll AI intelligence nodes are currently offline."
      };
    }
  }
};
