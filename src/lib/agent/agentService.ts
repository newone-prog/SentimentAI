import { API_CONFIG, NEMOTRON_MODEL } from '../apiConfig';
import { TOOL_DEFINITIONS, TOOL_EXECUTORS, type ToolResult, type SourceRef } from './agentTools';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, query, orderBy, limit, serverTimestamp, getDocs as fsGetDocs } from 'firebase/firestore';

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

const OPENROUTER_MODEL = "meta-llama/llama-3.1-70b-instruct";
const MAX_ITERATIONS = 10;
const LLM_TIMEOUT = 120000;

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
  provider: 'nvidia' | 'openrouter',
  callbacks: StreamCallbacks
): Promise<{ content: string; toolCalls: any[] }> => {
  const model = provider === 'nvidia' ? NEMOTRON_MODEL : OPENROUTER_MODEL;
  const url = provider === 'nvidia' ? '/llm/nvidia' : '/llm/openrouter/chat/completions';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider === 'nvidia') {
    headers['Authorization'] = `Bearer ${API_CONFIG.NVIDIA_NIM_KEY}`;
  } else {
    headers['Authorization'] = `Bearer ${API_CONFIG.OPENROUTER_KEY}`;
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'SentimentAI Agent';
  }

  const body: any = { model, messages, temperature: 0.2, max_tokens: 8192, stream: true };
  if (useTools) { body.tools = TOOL_DEFINITIONS; body.tool_choice = 'auto'; }

  const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${provider} LLM failed (${res.status})`);

  let fullContent = '';
  let toolCalls: any[] = [];
  let currentToolCall: any = null;
  let buffer = '';

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
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
      } catch {}
    }
  }

  if (currentToolCall) toolCalls.push(currentToolCall);
  return { content: fullContent, toolCalls };
};

const callLLMNonStream = async (messages: any[], useTools: boolean, provider: 'nvidia' | 'openrouter'): Promise<any> => {
  const model = provider === 'nvidia' ? NEMOTRON_MODEL : OPENROUTER_MODEL;
  const url = provider === 'nvidia' ? '/llm/nvidia' : '/llm/openrouter/chat/completions';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider === 'nvidia') headers['Authorization'] = `Bearer ${API_CONFIG.NVIDIA_NIM_KEY}`;
  else { headers['Authorization'] = `Bearer ${API_CONFIG.OPENROUTER_KEY}`; headers['HTTP-Referer'] = window.location.origin; headers['X-Title'] = 'SentimentAI Agent'; }

  const body: any = { model, messages, temperature: 0.2, max_tokens: 8192 };
  if (useTools) { body.tools = TOOL_DEFINITIONS; body.tool_choice = 'auto'; }

  const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${provider} LLM failed (${res.status})`);
  const data = await res.json();
  return data.choices[0].message;
};

// ─── MEMORY MANAGEMENT ───

export const loadAgentMemory = async (userId: string): Promise<AgentMemory | null> => {
  try {
    const docRef = doc(db, 'agent_memory', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data() as AgentMemory;
  } catch {}
  try {
    const local = localStorage.getItem(`agent_memory_${userId}`);
    if (local) return JSON.parse(local);
  } catch {}
  return null;
};

export const saveAgentMemory = async (memory: AgentMemory): Promise<void> => {
  try {
    localStorage.setItem(`agent_memory_${memory.userId}`, JSON.stringify(memory));
  } catch {}
  try {
    const docRef = doc(db, 'agent_memory', memory.userId);
    await setDoc(docRef, { ...memory, updatedAt: serverTimestamp() }, { merge: true });
  } catch {}
};

export const appendToChatHistory = async (userId: string, message: ChatMessage): Promise<void> => {
  try {
    const key = `agent_chat_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(message);
    if (existing.length > 50) existing.splice(0, existing.length - 50);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {}
  try {
    const historyRef = collection(db, 'agent_memory', userId, 'chat_history');
    await setDoc(doc(historyRef), { ...message, timestamp: serverTimestamp() });
  } catch {}
};

export const loadRecentChatHistory = async (userId: string, limitCount: number = 20): Promise<ChatMessage[]> => {
  try {
    const historyRef = collection(db, 'agent_memory', userId, 'chat_history');
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await fsGetDocs(q);
    return snap.docs.map(d => d.data() as ChatMessage).reverse();
  } catch {
    try {
      const key = `agent_chat_${userId}`;
      const local = JSON.parse(localStorage.getItem(key) || '[]');
      return local.slice(-limitCount);
    } catch {
      return [];
    }
  }
};

// ─── MAIN AGENT LOOP ───

export const runAgentStream = async (
  userMessage: string,
  userId: string,
  effort: 'default' | 'medium' | 'high',
  callbacks: StreamCallbacks
): Promise<void> => {
  let provider: 'nvidia' | 'openrouter' = API_CONFIG.NVIDIA_NIM_KEY ? 'nvidia' : 'openrouter';
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
  let lastError: Error | null = null;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    try {
      callbacks.onProgress(iteration === 0 ? 'Thinking...' : `Analyzing... (step ${iteration + 1})`);

      const { content, toolCalls } = await callLLMStream(messages, true, provider, callbacks);
      finalContent += content;

      if (toolCalls.length === 0) {
        // Collect all sources from tool activities
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

        // Track sources globally
        result.sources?.forEach(s => sourceMap.set(`${s.type}:${s.domain}`, s));

        callbacks.onToolActivity(activity);

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ success: result.success, summary: result.summary, data: result.data }).substring(0, 15000)
        });
      }
    } catch (e: any) {
      lastError = e;
      console.warn(`[Agent] ${provider} failed:`, e.message);
      if (provider === 'nvidia' && API_CONFIG.OPENROUTER_KEY) {
        provider = 'openrouter';
        continue;
      }
      break;
    }
  }

  if (lastError) {
    callbacks.onError(lastError);
    return;
  }

  callbacks.onComplete({ content: finalContent, toolActivity: allToolActivity, sources: [], sourceMap: new Map() });
};

// ─── NON-STREAM FALLBACK ───

export const runAgent = async (
  userMessage: string,
  userId: string,
  effort: 'default' | 'medium' | 'high',
  onToolActivity: (activity: ToolActivity) => void,
  onProgress?: (status: string) => void
): Promise<{ content: string; toolActivity: ToolActivity[]; sources: SourceRef[] }> => {
  await loadAgentMemory(userId);
  const recentHistory = await loadRecentChatHistory(userId, 15);

  const systemPrompt = EFFORT_SYSTEM_PROMPTS[effort];
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  let provider: 'nvidia' | 'openrouter' = API_CONFIG.NVIDIA_NIM_KEY ? 'nvidia' : 'openrouter';
  const allToolActivity: ToolActivity[] = [];
  const sourceMap = new Map<string, SourceRef>();
  let finalContent = '';

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    try {
      onProgress?.(iteration === 0 ? 'Thinking...' : `Analyzing... (step ${iteration + 1})`);
      const response = await callLLMNonStream(messages, true, provider);
      const toolCalls = response.tool_calls || [];

      if (toolCalls.length === 0) {
        finalContent = response.content || 'No response generated.';
        const allSources: SourceRef[] = [];
        allToolActivity.forEach(a => a.sources?.forEach(s => allSources.push(s)));
        return { content: finalContent, toolActivity: allToolActivity, sources: allSources };
      }

      messages.push({ role: 'assistant', content: response.content, tool_calls: toolCalls });

      for (const tc of toolCalls) {
        const toolName = tc.function?.name;
        let args: any = {};
        try { args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments || {}; } catch {}
        onProgress?.(`Running ${toolName}...`);
        let result: ToolResult;
        const executor = TOOL_EXECUTORS[toolName];
        if (executor) { try { result = await executor(args); } catch (e: any) { result = { success: false, data: null, summary: `Tool error: ${e.message}`, sources: [] }; } }
        else { result = { success: false, data: null, summary: `Unknown tool: ${toolName}`, sources: [] }; }
        const activity: ToolActivity = { tool: toolName, args, summary: result.summary, success: result.success, sources: result.sources };
        allToolActivity.push(activity);
        result.sources?.forEach(s => sourceMap.set(`${s.type}:${s.domain}`, s));
        onToolActivity(activity);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ success: result.success, summary: result.summary, data: result.data }).substring(0, 15000) });
      }
    } catch (e: any) {
      if (provider === 'nvidia' && API_CONFIG.OPENROUTER_KEY) { provider = 'openrouter'; continue; }
      break;
    }
  }

  const allSources: SourceRef[] = [];
  allToolActivity.forEach(a => a.sources?.forEach(s => allSources.push(s)));
  return { content: finalContent || 'Agent could not complete request.', toolActivity: allToolActivity, sources: allSources };
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