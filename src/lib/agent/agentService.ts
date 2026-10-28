import { API_CONFIG } from '../apiConfig';
import { TOOL_DEFINITIONS, TOOL_EXECUTORS, type ToolResult } from './agentTools';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolActivity?: ToolActivity[];
}

export interface ToolActivity {
  tool: string;
  args: Record<string, any>;
  summary: string;
  success: boolean;
}

const NVIDIA_MODEL = "meta/llama-3.1-70b-instruct";
const OPENROUTER_MODEL = "meta-llama/llama-3.1-70b-instruct";
const MAX_ITERATIONS = 8;
const LLM_TIMEOUT = 90000;

const SYSTEM_PROMPT = `You are SentimentAI Agent — an elite financial intelligence assistant with FULL AUTONOMOUS control over a market analysis webapp and unrestricted internet access. You operate for Indian equity market users (NSE/BSE focus) but can access global markets too.

## YOUR CAPABILITIES (tools)
1. **run_stock_analysis** — Run the webapp's full in-built analysis pipeline (RSI, MACD, Bollinger, ADX, ATR, news sentiment, Fear & Greed, TradingView community data, market regime detection) on any Indian stock.
2. **web_search** — Search the entire internet via DuckDuckGo for ANY information.
3. **read_webpage** — Crawl and read the full content of any URL.
4. **get_fno_chain** — Get F&O derivatives data: options chains, strikes, open interest, IV, expiries.
5. **get_mutual_fund** — Search Indian mutual funds: NAV, returns, categories.
6. **get_global_quote** — Quotes for crypto, commodities, indices, forex, international stocks.

## YOUR AUTONOMY RULES
- You decide EVERYTHING yourself. The user gives intent; you choose which tools to run, in which order, how many times.
- If the user asks about a stock → run run_stock_analysis FIRST. Then decide: do you need fresh news context? If yes → web_search. Do search results need verification? If yes → read_webpage.
- If the user asks about mutual funds, F&O, crypto, or indices → use the appropriate tool.
- If the user asks a general question you can answer without tools → answer directly. Do NOT run tools unnecessarily.
- If data seems stale or incomplete → proactively search the web to fill gaps.
- You may chain multiple tools: e.g., analysis → search latest news → read the top article → synthesize.
- If a tool fails, adapt: try a different tool or a different query. Never give up without trying alternatives.

## RESPONSE STYLE
- Be decisive, precise, and data-driven. Cite specific numbers from tool results.
- Structure long answers with clear sections (verdict, technicals, sentiment, risks).
- Always state your final view: BULLISH / BEARISH / NEUTRAL with reasoning.
- Add a one-line disclaimer at the end of financial recommendations: "Not financial advice."
- Keep conversational replies short and natural. Deep-dives get deep answers.

## IMPORTANT
- Never fabricate data. If you don't have data, say so or fetch it.
- When you present analysis results, lead with the verdict, then key numbers, then reasoning.
- Dates: today's context comes from tool data. Don't guess dates.`;

const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number = LLM_TIMEOUT): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

const callLLM = async (messages: any[], useTools: boolean, provider: 'nvidia' | 'openrouter'): Promise<any> => {
  const model = provider === 'nvidia' ? NVIDIA_MODEL : OPENROUTER_MODEL;
  const url = provider === 'nvidia' ? '/llm/nvidia' : '/llm/openrouter/chat/completions';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (provider === 'nvidia') {
    headers['Authorization'] = `Bearer ${API_CONFIG.NVIDIA_NIM_KEY}`;
  } else {
    headers['Authorization'] = `Bearer ${API_CONFIG.OPENROUTER_KEY}`;
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'SentimentAI Agent';
  }

  const body: any = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: 4096
  };

  if (useTools) {
    body.tools = TOOL_DEFINITIONS;
    body.tool_choice = 'auto';
  }

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`${provider} LLM failed (${res.status})`);
  const data = await res.json();
  return data.choices[0].message;
};

export const runAgent = async (
  userMessage: string,
  chatHistory: ChatMessage[],
  onToolActivity: (activity: ToolActivity) => void,
  onProgress?: (status: string) => void
): Promise<{ content: string; toolActivity: ToolActivity[]; source: string }> => {
  const allToolActivity: ToolActivity[] = [];

  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...chatHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  let provider: 'nvidia' | 'openrouter' = API_CONFIG.NVIDIA_NIM_KEY ? 'nvidia' : 'openrouter';
  let finalContent = '';
  let lastError: Error | null = null;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    try {
      onProgress?.(iteration === 0 ? 'Thinking...' : `Analyzing results... (step ${iteration + 1})`);

      const response = await callLLM(messages, true, provider);
      const toolCalls = response.tool_calls || [];

      if (toolCalls.length === 0) {
        finalContent = response.content || 'I could not generate a response. Please try again.';
        return {
          content: finalContent,
          toolActivity: allToolActivity,
          source: provider === 'nvidia' ? `Agent (${NVIDIA_MODEL})` : `Agent (${OPENROUTER_MODEL})`
        };
      }

      messages.push({
        role: 'assistant',
        content: response.content || null,
        tool_calls: toolCalls
      });

      for (const tc of toolCalls) {
        const toolName = tc.function?.name;
        let args: any = {};
        try {
          args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments || {};
        } catch {
          args = {};
        }

        onProgress?.(`Running ${toolName}...`);

        let result: ToolResult;
        const executor = TOOL_EXECUTORS[toolName];
        if (executor) {
          try {
            result = await executor(args);
          } catch (e: any) {
            result = { success: false, data: null, summary: `Tool error: ${e.message}` };
          }
        } else {
          result = { success: false, data: null, summary: `Unknown tool: ${toolName}` };
        }

        const activity: ToolActivity = {
          tool: toolName,
          args,
          summary: result.summary,
          success: result.success
        };
        allToolActivity.push(activity);
        onToolActivity(activity);

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({
            success: result.success,
            summary: result.summary,
            data: result.data
          }).substring(0, 12000)
        });
      }
    } catch (e: any) {
      lastError = e;
      console.warn(`[Agent] ${provider} failed on iteration ${iteration}:`, e.message);

      if (provider === 'nvidia' && API_CONFIG.OPENROUTER_KEY) {
        console.warn('[Agent] Switching to OpenRouter...');
        provider = 'openrouter';
        continue;
      }
      break;
    }
  }

  if (lastError && !finalContent) {
    try {
      onProgress?.('Generating summary without tools...');
      const response = await callLLM(
        [
          { role: 'system', content: 'You are a financial assistant. Tools are unavailable. Answer from your knowledge, clearly noting data may be outdated.' },
          { role: 'user', content: userMessage }
        ],
        false,
        provider
      );
      return {
        content: response.content || 'Tools and LLM unavailable.',
        toolActivity: allToolActivity,
        source: `${provider} (no tools)`
      };
    } catch {
      return {
        content: `Agent encountered an error: ${lastError.message}. Please try again.`,
        toolActivity: allToolActivity,
        source: 'error'
      };
    }
  }

  return {
    content: finalContent || 'Agent could not complete the request.',
    toolActivity: allToolActivity,
    source: provider === 'nvidia' ? `Agent (${NVIDIA_MODEL})` : `Agent (${OPENROUTER_MODEL})`
  };
};
