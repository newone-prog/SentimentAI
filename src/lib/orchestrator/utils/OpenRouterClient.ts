export class OpenRouterClient {
  private static getApiKey(): string {
    return import.meta.env.VITE_OPENROUTER_KEY || "";
  }

  private static model = "openai/gpt-oss-20b";

  private static getNvidiaKey(): string {
    return import.meta.env.VITE_NVIDIA_NIM_KEY || "";
  }

  public static async generate(
    prompt: string,
    systemPrompt = "You are a JSON-only response engine. Output ONLY valid JSON. No markdown, no code blocks, no commentary. All string values must properly escape newlines as \\n."
  ): Promise<string> {
    const nvidiaKey = this.getNvidiaKey();
    const openRouterKey = this.getApiKey();

    if (!nvidiaKey && !openRouterKey) {
      throw new Error("Both NVIDIA_NIM_KEY and OPENROUTER_KEY are missing from environment variables.");
    }

    let lastError: Error | null = null;

    // 1. Try NVIDIA NIM First
    if (nvidiaKey) {
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[OpenRouterClient] Sending request to NVIDIA NIM using model: ${this.model} (Attempt ${attempt})`);
          // NVIDIA NIM is accessed through Vite proxy to avoid CORS
          const response = await fetch("/llm/nvidia", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${nvidiaKey}`,
              "Accept": "application/json"
            },
            body: JSON.stringify({
              model: this.model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
              ],
              temperature: 0.1,
              max_tokens: 4096,
              response_format: { type: "json_object" }
            })
          });

          if (response.status === 429) {
            const delayMs = attempt * 2000;
            console.warn(`[OpenRouterClient] NVIDIA NIM 429 Too Many Requests. Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue; // Retry
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NVIDIA NIM API error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          const choice = data.choices?.[0]?.message;
          const content = choice?.content || choice?.reasoning_content || choice?.reasoning || "";
          console.log(`[OpenRouterClient] Successfully retrieved response from NVIDIA NIM.`);
          return content.trim();
        } catch (error) {
          console.warn(`[OpenRouterClient] NVIDIA NIM failed on attempt ${attempt}:`, (error as Error).message);
          lastError = error as Error;
          // If not a rate limit error, don't keep repeating invalid requests
          if (attempt === maxRetries || !((error as Error).message.includes('429'))) break;
        }
      }
    }

    // 2. Fallback to OpenRouter
    if (openRouterKey) {
      try {
        console.log(`[OpenRouterClient] Sending request to OpenRouter using model: ${this.model}`);
        // OpenRouter accessed through Vite proxy to avoid CORS
        const response = await fetch("/llm/openrouter/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openRouterKey}`,
            "HTTP-Referer": "https://sentimentai.com",
            "X-Title": "SentimentAI v3"
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 4096,
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0]?.message;
        const content = choice?.content || choice?.reasoning_content || choice?.reasoning || "";
        console.log(`[OpenRouterClient] Successfully retrieved response from OpenRouter.`);
        return content.trim();
      } catch (error) {
        console.error("[OpenRouterClient] OpenRouter also failed.", error);
        throw error;
      }
    }

    throw lastError || new Error("Failed to generate response from any provider.");
  }

  /**
   * Sanitizes and parses JSON returned by the LLM, correcting common issues.
   */
  public static parseJson(raw: string): any {
    let cleaned = raw.trim();

    // Strip markdown code blocks if present
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    // Isolate outer braces
    const braceMatch = cleaned.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      cleaned = braceMatch[0];
    }

    // Basic cleaning of string fields for newlines
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

    let sanitized = escapeStringsInJson(cleaned);
    sanitized = sanitized
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/"\s*\|\s*"/g, '" || "'); // Fix pipes inside JSON

    try {
      return JSON.parse(sanitized);
    } catch (err) {
      console.warn("[OpenRouterClient] JSON parse failed, returning raw string inside placeholder", err);
      throw new Error(`Failed to parse LLM response as JSON: ${err}`);
    }
  }
}
