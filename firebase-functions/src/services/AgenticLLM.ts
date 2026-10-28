import { OpenRouterClient } from './OpenRouterClient';
import { AgenticScraper } from './AgenticScraper';

export class AgenticLLM {
  
  /**
   * Generates a response with autonomous tool-calling loops.
   * If the LLM requests a search, this runner executes the search and feeds it back.
   */
  public static async runWithTools(
    prompt: string,
    systemPrompt: string,
    maxLoops: number = 3
  ): Promise<string> {
    
    // We append instructions to the system prompt telling the LLM how to use tools
    // Since we are forcing a JSON response in OpenRouterClient, we can teach it to return
    // {"action": "SEARCH", "query": "reliance latest earnings"} to trigger the tool.
const toolAwareSystemPrompt = `${systemPrompt}

CRITICAL: You are an agentic AI. The data provided to you so far is SHALLOW (only headlines and numbers). 
You MUST use your Web Scraper tool to gather deeper context, underlying causes, and recent developments BEFORE you output your final report.

To trigger a search, output ONLY this exact JSON format (and nothing else):
{
  "action": "SEARCH",
  "query": "your search query here"
}

To read the full text of a specific URL, output ONLY this exact JSON format:
{
  "action": "READ_URL",
  "url": "https://example.com/article"
}

Do NOT output your final JSON response until you have used these tools to gather sufficient institutional-grade context.`;

    let currentPrompt = prompt;
    let loopCount = 0;

    while (loopCount < maxLoops) {
      loopCount++;
      
      const rawResponse = await OpenRouterClient.generate(currentPrompt, toolAwareSystemPrompt);
      let parsed;
      try {
        parsed = OpenRouterClient.parseJson(rawResponse);
      } catch (e) {
        // If it failed to parse, it might not be a tool call. Just return raw.
        return rawResponse;
      }

      // Check if the LLM invoked a tool
      if (parsed && parsed.action === "SEARCH" && parsed.query) {
        console.log(`[AgenticLLM] Tool Triggered: SEARCH -> ${parsed.query}`);
        const results = await AgenticScraper.search(parsed.query, 3);
        const searchContext = `[WEB SEARCH RESULTS FOR "${parsed.query}"]\n` + 
          results.map(r => `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}\n`).join('\n') +
          `\nBased on these results, continue your reasoning.`;
        
        currentPrompt += `\n\n[System: You searched for "${parsed.query}"]\n${searchContext}`;
        continue; // Loop again with the new context
      }

      if (parsed && parsed.action === "READ_URL" && parsed.url) {
        console.log(`[AgenticLLM] Tool Triggered: READ_URL -> ${parsed.url}`);
        const content = await AgenticScraper.extractPageContent(parsed.url);
        const urlContext = `[CONTENT OF ${parsed.url}]\n${content}\n\nBased on this content, continue your reasoning.`;
        
        currentPrompt += `\n\n[System: You read the URL "${parsed.url}"]\n${urlContext}`;
        continue;
      }

      // If no tool was invoked, this is the final answer
      return rawResponse;
    }

    // If max loops reached, force a final generation without tool instructions
    console.warn(`[AgenticLLM] Max tool loops (${maxLoops}) reached. Forcing final answer.`);
    return await OpenRouterClient.generate(currentPrompt, systemPrompt);
  }
}
