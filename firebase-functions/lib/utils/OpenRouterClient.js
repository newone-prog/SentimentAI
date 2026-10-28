"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterClient = void 0;
class OpenRouterClient {
    static getApiKey() {
        return process.env.OPENROUTER_KEY || process.env.VITE_OPENROUTER_KEY || "";
    }
    static model = "openai/gpt-oss-20b";
    static getNvidiaKey() {
        return process.env.NVIDIA_NIM_KEY || process.env.VITE_NVIDIA_NIM_KEY || "";
    }
    static async generate(prompt, systemPrompt = "You are a JSON-only response engine. Output ONLY valid JSON. No markdown, no code blocks, no commentary. All string values must properly escape newlines as \\n.") {
        const nvidiaKey = this.getNvidiaKey();
        const openRouterKey = this.getApiKey();
        if (!nvidiaKey && !openRouterKey) {
            throw new Error("Both NVIDIA_NIM_KEY and OPENROUTER_KEY are missing from environment variables.");
        }
        let lastError = null;
        // 1. Try NVIDIA NIM First
        if (nvidiaKey) {
            try {
                console.log(`[OpenRouterClient] Sending request to NVIDIA NIM using model: ${this.model}`);
                // NVIDIA uses the standard OpenAI chat completions endpoint format
                const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
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
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`NVIDIA NIM API error: ${response.status} ${response.statusText} - ${errorText}`);
                }
                const data = await response.json();
                const choice = data.choices?.[0]?.message;
                const content = choice?.content || choice?.reasoning_content || choice?.reasoning || "";
                console.log(`[OpenRouterClient] Successfully retrieved response from NVIDIA NIM.`);
                return content.trim();
            }
            catch (error) {
                console.warn("[OpenRouterClient] NVIDIA NIM failed, falling back to OpenRouter:", error.message);
                lastError = error;
            }
        }
        // 2. Fallback to OpenRouter
        if (openRouterKey) {
            try {
                console.log(`[OpenRouterClient] Sending request to OpenRouter using model: ${this.model}`);
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
            }
            catch (error) {
                console.error("[OpenRouterClient] OpenRouter also failed.", error);
                throw error;
            }
        }
        throw lastError || new Error("Failed to generate response from any provider.");
    }
    /**
     * Sanitizes and parses JSON returned by the LLM, correcting common issues.
     */
    static parseJson(raw) {
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
        const escapeStringsInJson = (json) => {
            let out = '';
            let inString = false;
            let escaped = false;
            for (let i = 0; i < json.length; i++) {
                const ch = json[i];
                if (escaped) {
                    out += ch;
                    escaped = false;
                    continue;
                }
                if (ch === '\\') {
                    out += ch;
                    escaped = true;
                    continue;
                }
                if (ch === '"') {
                    inString = !inString;
                    out += ch;
                    continue;
                }
                if (inString) {
                    if (ch === '\n') {
                        out += '\\n';
                        continue;
                    }
                    if (ch === '\r') {
                        out += '\\r';
                        continue;
                    }
                    if (ch === '\t') {
                        out += '\\t';
                        continue;
                    }
                    if (ch >= '\x00' && ch <= '\x1f')
                        continue;
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
        }
        catch (err) {
            console.warn("[OpenRouterClient] JSON parse failed, returning raw string inside placeholder", err);
            throw new Error(`Failed to parse LLM response as JSON: ${err}`);
        }
    }
}
exports.OpenRouterClient = OpenRouterClient;
//# sourceMappingURL=OpenRouterClient.js.map