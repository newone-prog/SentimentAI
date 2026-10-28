"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterClient = void 0;
const axios_1 = __importDefault(require("axios"));
class OpenRouterClient {
    static async generate(prompt, systemPrompt) {
        const apiKey = process.env.OPENROUTER_KEY || process.env.NVIDIA_NIM_KEY;
        const url = process.env.OPENROUTER_KEY
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://integrate.api.nvidia.com/v1/chat/completions';
        const model = process.env.OPENROUTER_KEY
            ? 'meta-llama/llama-3.1-70b-instruct'
            : 'meta/llama-3.1-70b-instruct';
        try {
            const response = await axios_1.default.post(url, {
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 4096,
                response_format: { type: 'json_object' }
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data.choices[0].message.content;
        }
        catch (e) {
            if (e.response && e.response.status === 402 && process.env.NVIDIA_NIM_KEY && url.includes('openrouter')) {
                console.warn('OpenRouter returned 402 (Payment Required). Falling back to NVIDIA NIM...');
                const fallbackResponse = await axios_1.default.post('https://integrate.api.nvidia.com/v1/chat/completions', {
                    model: 'meta/llama-3.1-70b-instruct',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 4096,
                    response_format: { type: 'json_object' }
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.NVIDIA_NIM_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                return fallbackResponse.data.choices[0].message.content;
            }
            console.error('OpenRouterClient Error:', e.message);
            throw e;
        }
    }
    static parseJson(raw) {
        try {
            let jsonStr = raw.trim();
            const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                jsonStr = codeBlockMatch[1].trim();
            }
            const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (braceMatch) {
                jsonStr = braceMatch[0];
            }
            return JSON.parse(jsonStr);
        }
        catch (e) {
            console.error("OpenRouterClient parse JSON error:", e, raw);
            throw new Error('Failed to parse JSON response');
        }
    }
}
exports.OpenRouterClient = OpenRouterClient;
//# sourceMappingURL=OpenRouterClient.js.map