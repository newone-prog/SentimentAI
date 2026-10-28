import axios from 'axios';

export class OpenRouterClient {
  static async generate(prompt: string, systemPrompt: string): Promise<string> {
    const nvidiaKey = process.env.NVIDIA_NIM_KEY || process.env.VITE_NVIDIA_NIM_KEY;
    const openrouterKey = process.env.OPENROUTER_KEY || process.env.VITE_OPENROUTER_KEY;
    const model = 'openai/gpt-oss-20b';

    // 1. Try NVIDIA NIM First
    if (nvidiaKey) {
      try {
        console.log(`[Backend OpenRouterClient] Calling NVIDIA NIM using ${model}...`);
        const response = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
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
            'Authorization': `Bearer ${nvidiaKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000
        });

        const choice = response.data?.choices?.[0]?.message;
        const content = choice?.content || choice?.reasoning_content || choice?.reasoning;
        if (content) {
          return content;
        }
      } catch (nvidiaErr: any) {
        console.warn('[Backend OpenRouterClient] NVIDIA NIM failed, falling back to OpenRouter:', nvidiaErr?.message);
      }
    }

    // 2. Fallback to OpenRouter
    if (openrouterKey) {
      try {
        console.log(`[Backend OpenRouterClient] Calling OpenRouter using ${model}...`);
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
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
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000
        });

        const choice = response.data?.choices?.[0]?.message;
        const content = choice?.content || choice?.reasoning_content || choice?.reasoning;
        if (content) {
          return content;
        }
      } catch (openRouterErr: any) {
        console.error('[Backend OpenRouterClient] OpenRouter also failed:', openRouterErr?.message);
        throw openRouterErr;
      }
    }

    throw new Error('All backend LLM providers failed or are unconfigured');
  }

  static parseJson(raw: string): any {
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
    } catch (e) {
      console.error("OpenRouterClient parse JSON error:", e, raw);
      throw new Error('Failed to parse JSON response');
    }
  }
}
