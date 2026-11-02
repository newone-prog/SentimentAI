import { API_CONFIG, NEMOTRON_MODEL } from '../apiConfig';
import { TOOL_DEFINITIONS, TOOL_EXECUTORS, type ToolResult, type SourceRef } from './agentTools';

export type { SourceRef };

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolActivity?: ToolActivity[];
  sources?: SourceRef[];
  timestamp?: number;
  effort?: 'default' | 'medium' | 'high';
}

export interface ToolActivity {
  tool: string;
  args: Record<string, any>;
  summary: string;
  success: boolean;
  data?: any;
  sources?: SourceRef[];
}

export interface AgentMemory {
  userId: string;
  chatHistory: ChatMessage[];
  preferences: {
    defaultEffort: 'default' | 'medium' | 'high';
    favoriteTickers: string[];
    favoriteFunds: string[];
    language: string;
  };
  facts: Record<string, any>;
  updatedAt: number;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolActivity: (activity: ToolActivity) => void;
  onProgress: (status: string) => void;
  onComplete: (result: { content: string; toolActivity: ToolActivity[]; sources: SourceRef[]; sourceMap: Map<string, SourceRef> }) => void;
  onError: (error: Error) => void;
}

const MAX_ITERATIONS = 10;
const LLM_TIMEOUT = 300000; // 5 minutes for NVIDIA Nemotron 3 Ultra

const EFFORT_SYSTEM_PROMPTS = {
  default: `You are SentimentAI Agent — an elite financial intelligence assistant with FULL AUTONOMOUS control over a market analysis webapp and unrestricted internet access. You operate for Indian equity market users (NSE/BSE focus) but can access global markets too.

## YOUR CAPABILITIES (tools)
1. run_stock_analysis — Full in-built analysis pipeline (RSI, MACD, Bollinger, ADX, ATR, news sentiment, Fear & Greed, TradingView community, market regime)
2. web_search — Search entire internet via DuckDuckGo/Tavily
3. read_webpage — Crawl and read FULL content of any URL
4. get_fno_chain — F&O derivatives: options chains, strikes, OI, IV, expiries
5. get_mutual_fund — Indian mutual funds: NAV, returns, categories
6. get_global_quote — Crypto, commodities, indices, forex, intl stocks
7. get_alphavantage — Alpha Vantage data (if key configured)
8. get_fmp — Financial Modeling Prep data (if key configured)
9. execute_code — Write and execute Python/JS in sandbox for calculations, backtests, custom indicators

## YOUR AUTONOMY
- You decide EVERYTHING. User gives intent; you choose tools, order, chaining, retries.
- If user asks about a stock → run_stock_analysis FIRST. Then decide: need fresh news? → web_search. Need to verify? → read_webpage.
- If user asks about mutual funds, F&O, crypto, indices → use appropriate tool.
- If general question you can answer without tools → answer directly.
- If data seems stale/incomplete → proactively search web.
- Chain tools freely: analysis → search news → read article → execute_code for custom calc → synthesize.
- If tool fails, adapt: try different tool/query. Never give up without alternatives.
- Use execute_code for ANY computation: custom indicators, backtests, portfolio math, statistical tests.

## RESPONSE STYLE
- Decisive, precise, data-driven. Cite specific numbers.
- Structure long answers: verdict, technicals, sentiment, risks.
- Always state final view: BULLISH / BEARISH / NEUTRAL with reasoning.
- Add disclaimer: "Not financial advice."
- Keep conversational replies short. Deep-dives get deep answers.

## IMPORTANT
- Never fabricate data. If you don't have data, say so or fetch it.
- Lead with verdict, then key numbers, then reasoning.`,

  medium: `You are SentimentAI Agent (MEDIUM EFFORT MODE) — deeper reasoning, more thorough tool chaining, and explicit step-by-step analysis.

## ENHANCED BEHAVIOR
- Run 2-3 search queries per topic to cross-verify.
- Use execute_code for statistical validation (t-tests, correlations, Monte Carlo).
- Run multiple analysis passes with different parameters.
- Explicitly show reasoning chain: "First I check X, then Y, because Z".
- Synthesize conflicting sources with weighted credibility.
- Provide confidence intervals where applicable.
- Check 2-3 expiries for F&O, not just nearest.

## ALL DEFAULT CAPABILITIES APPLY`,

  high: `You are SentimentAI Agent (HIGH EFFORT MODE) — maximum depth, exhaustive research, institutional-grade rigor.

## MAXIMUM BEHAVIOR
- Run 5+ search queries with varied angles (news, filings, transcripts, social, analyst reports).
- Use execute_code for: full backtests (walk-forward, Monte Carlo), regime detection, factor models, options Greeks, portfolio optimization.
- Cross-reference ALL sources: Yahoo, TradingView, MarketStack, Alpha Vantage, FMP, IndianAPI, news, filings.
- Build custom indicators in code, test them, report results.
- Run multi-timeframe analysis (intraday, daily, weekly, monthly).
- Check ALL available expiries for F&O, compute term structure.
- For mutual funds: analyze rolling returns, drawdowns, factor exposure, expense ratios.
- Provide decision frameworks: entry/exit rules, position sizing, risk limits.
- Explicit uncertainty quantification: "Confidence 72% because X conflicts with Y".
- If data gaps exist, state them clearly and bound the impact.

## ALL DEFAULT/MEDIUM CAPABILITIES APPLY`
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number = LLM_TIMEOUT): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

const callLLMStream = async (
  messages: any[],
  useTools: boolean,
  callbacks: StreamCallbacks
): Promise<{ content: string; toolCalls: any[] }> => {
  const url = '/llm/nvidia';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  headers['Authorization'] = `Bearer ${API_CONFIG.NVIDIA_NIM_KEY}`;

  const body: any = { model: NEMOTRON_MODEL, messages, temperature: 0.2, max_tokens: 8192, stream: true };
  if (useTools) { body.tools = TOOL_DEFINITIONS; body.tool_choice = 'auto'; }

  console.log(`[Agent] Calling NVIDIA Nemotron 3 Ultra streaming...`, { model: NEMOTRON_MODEL, url, hasTools: useTools });

  const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Agent] NVIDIA LLM failed (${res.status}):`, errText);
    throw new Error(`NVIDIA LLM failed (${res.status}): ${errText}`);
  }

  console.log(`[Agent] NVIDIA streaming response OK`);

  let fullContent = '';
  let toolCalls: any[] = [];
  let currentToolCall: any = null;
  let buffer = '';

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let chunkCount = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunkCount++;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (delta?.content) {
          fullContent += delta.content;
          callbacks.onToken(delta.content);
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined && tc.index !== toolCalls.length - 1) {
              if (currentToolCall) toolCalls.push(currentToolCall);
              currentToolCall = { ...tc, function: { name: '', arguments: '' } };
            }
            if (currentToolCall) {
              if (tc.function?.name) currentToolCall.function.name += tc.function.name;
              if (tc.function?.arguments) currentToolCall.function.arguments += tc.function.arguments;
            }
          }
        }
      } catch (e) {
        console.warn('[Agent] Failed to parse streaming chunk:', line, e);
      }
    }
  }

  console.log(`[Agent] NVIDIA streaming complete: ${chunkCount} chunks, content length: ${fullContent.length}, toolCalls: ${toolCalls.length}`);

  if (currentToolCall) toolCalls.push(currentToolCall);
  return { content: fullContent, toolCalls };
};

const callLLMNonStream = async (messages: any[], useTools: boolean): Promise<any> => {
  const url = '/llm/nvidia';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  headers['Authorization'] = `Bearer ${API_CONFIG.NVIDIA_NIM_KEY}`;

  const body: any = { model: NEMOTRON_MODEL, messages, temperature: 0.2, max_tokens: 8192 };
  if (useTools) { body.tools = TOOL_DEFINITIONS; body.tool_choice = 'auto'; }

  console.log(`[Agent] Calling NVIDIA Nemotron 3 Ultra (non-streaming)...`);

  const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Agent] NVIDIA LLM failed (${res.status}):`, errText);
    throw new Error(`NVIDIA LLM failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message;
};

// ─── LOCAL STORAGE MEMORY (no Firestore) ───

const MEMORY_KEY = (userId: string) => `agent_memory_${userId}`;
const CHAT_KEY = (userId: string) => `agent_chat_${userId}`;

export const loadAgentMemory = async (userId: string): Promise<AgentMemory | null> => {
  try {
    const local = localStorage.getItem(MEMORY_KEY(userId));
    if (local) return JSON.parse(local);
  } catch {}
  return null;
};

export const saveAgentMemory = async (memory: AgentMemory): Promise<void> => {
  try {
    localStorage.setItem(MEMORY_KEY(memory.userId), JSON.stringify(memory));
  } catch (e) {
    console.warn('[Agent] Memory save failed:', e);
  }
};

export const appendToChatHistory = async (userId: string, message: ChatMessage): Promise<void> => {
  try {
    const key = CHAT_KEY(userId);
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(message);
    if (existing.length > 50) existing.splice(0, existing.length - 50);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {
    console.warn('[Agent] Chat history append failed:', e);
  }
};

export const loadRecentChatHistory = async (userId: string, limitCount: number = 15): Promise<ChatMessage[]> => {
  try {
    const key = CHAT_KEY(userId);
    const local = JSON.parse(localStorage.getItem(key) || '[]');
    return local.slice(-limitCount);
  } catch {
    return [];
  }
};

// ─── LOCAL SYNTHESIS FALLBACK ───

const synthesizeFromTools = (_userMessage: string, toolActivity: ToolActivity[]): string => {
  const analysis = toolActivity.find(t => t.tool === 'run_stock_analysis' && t.success);
  const search = toolActivity.find(t => t.tool === 'web_search' && t.success);
  const fno = toolActivity.find(t => t.tool === 'get_fno_chain' && t.success);
  const mf = toolActivity.find(t => t.tool === 'get_mutual_fund' && t.success);

  let response = '';

  if (analysis) {
    const d = analysis.data;
    const tech = d?.technical;
    const sent = d?.sentiment;
    const regime = d?.marketRegime;

    response += `## Analysis for ${d?.company || 'Stock'} (${d?.ticker || 'N/A'})\n\n`;
    response += `**Price:** ${d?.price} ${d?.currency} (${d?.changePercent >= 0 ? '+' : ''}${d?.changePercent}%)\n`;
    response += `**Regime:** ${regime}\n\n`;

    response += `### Technicals\n`;
    response += `- RSI: ${tech?.rsi} | StochRSI: ${tech?.stochRSI}\n`;
    response += `- MACD: ${tech?.macd} / Signal: ${tech?.macdSignal} / Hist: ${tech?.macdHistogram}\n`;
    response += `- ADX: ${tech?.adx} | Trend: ${tech?.trendDirection}\n`;
    response += `- Bollinger %B: ${tech?.bollingerPercentB} | ATR: ${tech?.atr}\n`;
    response += `- SMA20: ${tech?.sma20} | SMA50: ${tech?.sma50}\n`;
    response += `- 52W Range: ${tech?.fiftyTwoWeekLow} - ${tech?.fiftyTwoWeekHigh}\n\n`;

    response += `### Sentiment\n`;
    response += `- News Score: ${sent?.newsSentimentScore} (${sent?.positiveArticles} pos / ${sent?.negativeArticles} neg / ${sent?.neutralArticles} neu)\n`;
    response += `- Fear & Greed: ${sent?.fearGreedIndex} | Social Heat: ${sent?.socialHeat}\n`;
    response += `- TV Recommend: ${sent?.tradingViewRecommend} | TV RSI: ${sent?.tradingViewRSI} | VWAP: ${sent?.tradingViewVWAP}\n\n`;

    let verdict = 'NEUTRAL';
    if (tech && sent) {
      const techScore = tech.technicalScore || 0;
      const sentScore = sent.newsSentimentScore || 0;
      if (techScore > 0.1 && sentScore > 0) verdict = 'BULLISH';
      else if (techScore < -0.1 && sentScore < 0) verdict = 'BEARISH';
      else if (techScore > 0.15) verdict = 'BULLISH';
      else if (techScore < -0.15) verdict = 'BEARISH';
    }
    response += `### Local Verdict: **${verdict}**\n`;
    response += `*Based on technical score ${tech?.technicalScore?.toFixed(2)} and news sentiment ${sent?.newsSentimentScore?.toFixed(2)}*\n\n`;
  }

  if (search) {
    response += `### Web Search Results\n`;
    const results = search.data || [];
    results.slice(0, 3).forEach((r: any, i: number) => {
      response += `${i + 1}. **${r.title}** — ${r.snippet} [${r.url}]\n`;
    });
    response += '\n';
  }

  if (fno) {
    response += `### F&O Chain\n`;
    const d = fno.data;
    response += `- Spot: ${d?.spotPrice} | Expiry: ${d?.expirationDate}\n`;
    response += `- Calls: ${d?.calls?.length || 0} | Puts: ${d?.puts?.length || 0}\n`;
    if (d?.calls?.length) {
      const topCall = d.calls.sort((a: any, b: any) => (b.openInterest || 0) - (a.openInterest || 0))[0];
      response += `- Top Call OI: Strike ${topCall.strike} (OI: ${topCall.openInterest})\n`;
    }
    if (d?.puts?.length) {
      const topPut = d.puts.sort((a: any, b: any) => (b.openInterest || 0) - (a.openInterest || 0))[0];
      response += `- Top Put OI: Strike ${topPut.strike} (OI: ${topPut.openInterest})\n`;
    }
    response += '\n';
  }

  if (mf) {
    response += `### Mutual Funds\n`;
    const funds = mf.data || [];
    funds.slice(0, 3).forEach((f: any, i: number) => {
      response += `${i + 1}. **${f.schemeName}** — NAV: ${f.latestNAV} | 1Y: ${f.oneYearReturnPercent}% | ${f.fundHouse}\n`;
    });
    response += '\n';
  }

  if (!analysis && !search && !fno && !mf) {
    response = `I ran the analysis tools but couldn't retrieve data for your query. Please try again with a specific stock ticker (e.g., "RELIANCE.NS"), mutual fund name, or F&O symbol.`;
  }

  response += `\n---\n*Generated from local tool data (LLM unavailable). Not financial advice.*`;
  return response;
};

// ─── MAIN AGENT LOOP ───

export const runAgentStream = async (
  userMessage: string,
  userId: string,
  effort: 'default' | 'medium' | 'high',
  callbacks: StreamCallbacks
): Promise<void> => {
  const allToolActivity: ToolActivity[] = [];
  const sourceMap = new Map<string, SourceRef>();

  // Load memory
  const [, recentHistory] = await Promise.all([
    loadAgentMemory(userId),
    loadRecentChatHistory(userId, 15)
  ]);

  const systemPrompt = EFFORT_SYSTEM_PROMPTS[effort];

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  let finalContent = '';
  let streamingFailed = false;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    try {
      callbacks.onProgress(iteration === 0 ? 'Thinking...' : `Analyzing... (step ${iteration + 1})`);

      let content = '';
      let toolCalls: any[] = [];

      if (!streamingFailed) {
        try {
          const result = await callLLMStream(messages, true, callbacks);
          content = result.content;
          toolCalls = result.toolCalls;
        } catch (streamErr: any) {
          console.warn('[Agent] NVIDIA streaming failed, falling back to non-streaming:', streamErr.message);
          streamingFailed = true;
        }
      }

      if (streamingFailed || content === '') {
        // Non-streaming fallback
        console.log('[Agent] Using non-streaming fallback');
        try {
          const response = await callLLMNonStream(messages, true);
          content = response.content || '';
          toolCalls = response.tool_calls || [];
        } catch (nonStreamErr: any) {
          console.error('[Agent] Non-streaming also failed:', nonStreamErr.message);
          throw nonStreamErr;
        }
      }

      finalContent += content;
      console.log(`[Agent] Iteration ${iteration + 1}: content length ${content.length}, toolCalls: ${toolCalls.length}`);

      if (toolCalls.length === 0) {
        const allSources: SourceRef[] = [];
        allToolActivity.forEach(a => a.sources?.forEach(s => allSources.push(s)));
        callbacks.onComplete({
          content: finalContent.trim(),
          toolActivity: allToolActivity,
          sources: allSources,
          sourceMap
        });
        return;
      }

      messages.push({ role: 'assistant', content, tool_calls: toolCalls });

      for (const tc of toolCalls) {
        const toolName = tc.function?.name;
        let args: any = {};
        try { args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}; } catch { args = {}; }

        callbacks.onProgress(`Running ${toolName}...`);

        let result: ToolResult;
        const executor = TOOL_EXECUTORS[toolName];
        if (executor) {
          try { result = await executor(args); } catch (e: any) { result = { success: false, data: null, summary: `Tool error: ${e.message}`, sources: [] }; }
        } else { result = { success: false, data: null, summary: `Unknown tool: ${toolName}`, sources: [] }; }

        const activity: ToolActivity = { tool: toolName, args, summary: result.summary, success: result.success, sources: result.sources };
        allToolActivity.push(activity);

        result.sources?.forEach(s => sourceMap.set(`${s.type}:${s.domain}`, s));

        callbacks.onToolActivity(activity);

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ success: result.success, summary: result.summary, data: result.data }).substring(0, 15000)
        });
      }
    } catch (e: any) {
      console.error(`[Agent] Iteration ${iteration + 1} error:`, e);
      // If both streaming and non-streaming fail, use local synthesis
      const localResponse = synthesizeFromTools(userMessage, allToolActivity);
      const allSources: SourceRef[] = [];
      allToolActivity.forEach(a => a.sources?.forEach(s => allSources.push(s)));
      callbacks.onComplete({
        content: localResponse,
        toolActivity: allToolActivity,
        sources: allSources,
        sourceMap
      });
      return;
    }
  }

  // Max iterations reached
  const localResponse = synthesizeFromTools(userMessage, allToolActivity);
  const allSources: SourceRef[] = [];
  allToolActivity.forEach(a => a.sources?.forEach(s => allSources.push(s)));
  callbacks.onComplete({
    content: localResponse,
    toolActivity: allToolActivity,
    sources: allSources,
    sourceMap
  });
};

export const saveUserMessage = async (userId: string, message: ChatMessage): Promise<void> => {
  await appendToChatHistory(userId, message);
  const memory = await loadAgentMemory(userId) || { userId, chatHistory: [], preferences: { defaultEffort: 'default', favoriteTickers: [], favoriteFunds: [], language: 'en' }, facts: {}, updatedAt: Date.now() };
  memory.chatHistory.push(message);
  if (memory.chatHistory.length > 50) memory.chatHistory = memory.chatHistory.slice(-50);
  await saveAgentMemory(memory);
};

export const saveAssistantMessage = async (userId: string, message: ChatMessage): Promise<void> => {
  await appendToChatHistory(userId, message);
  const memory = await loadAgentMemory(userId) || { userId, chatHistory: [], preferences: { defaultEffort: 'default', favoriteTickers: [], favoriteFunds: [], language: 'en' }, facts: {}, updatedAt: Date.now() };
  memory.chatHistory.push(message);
  if (memory.chatHistory.length > 50) memory.chatHistory = memory.chatHistory.slice(-50);
  await saveAgentMemory(memory);
};