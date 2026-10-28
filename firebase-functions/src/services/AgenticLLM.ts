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
    maxLoops: number = 2
  ): Promise<string> {
    if (maxLoops <= 0) {
      return await OpenRouterClient.generate(prompt, systemPrompt);
    }

    const toolAwareSystemPrompt = `${systemPrompt}

You are an agentic AI analyst. If you need additional qualitative web research, you may trigger a search:
{
  "action": "SEARCH",
  "query": "company name recent developments earnings"
}

If search context is already available or you have enough information, output ONLY the final institutional-grade JSON report matching the schema.`;

    let currentPrompt = prompt;
    let loopCount = 0;
    const executedQueries = new Set<string>();

    while (loopCount < maxLoops) {
      loopCount++;
      
      const rawResponse = await OpenRouterClient.generate(currentPrompt, toolAwareSystemPrompt);
      let parsed: any;
      try {
        parsed = OpenRouterClient.parseJson(rawResponse);
      } catch (e) {
        return rawResponse;
      }

      // If already returning final report schema, return it immediately
      if (parsed && (parsed.researchPaper || parsed.reasoning || parsed.overallBearCaseStrength !== undefined)) {
        return rawResponse;
      }

      // Check if the LLM invoked a tool
      if (parsed && parsed.action === "SEARCH" && parsed.query && !executedQueries.has(parsed.query)) {
        executedQueries.add(parsed.query);
        console.log(`[AgenticLLM] Tool Triggered: SEARCH -> ${parsed.query}`);
        const results = await AgenticScraper.search(parsed.query, 3);
        const searchContext = `[WEB SEARCH RESULTS FOR "${parsed.query}"]\n` + 
          results.map(r => `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}\n`).join('\n') +
          `\nSynthesize these findings and produce your final complete JSON report.`;
        
        currentPrompt += `\n\n[System: You searched for "${parsed.query}"]\n${searchContext}`;
        continue;
      }

      if (parsed && parsed.action === "READ_URL" && parsed.url && !executedQueries.has(parsed.url)) {
        executedQueries.add(parsed.url);
        console.log(`[AgenticLLM] Tool Triggered: READ_URL -> ${parsed.url}`);
        const content = await AgenticScraper.extractPageContent(parsed.url);
        const urlContext = `[CONTENT OF ${parsed.url}]\n${content.substring(0, 1500)}\n\nSynthesize this content and produce your final complete JSON report.`;
        
        currentPrompt += `\n\n[System: You read the URL "${parsed.url}"]\n${urlContext}`;
        continue;
      }

      // If no valid tool was invoked, this is the final answer
      return rawResponse;
    }

    // If max loops reached, force a final generation without tool instructions
    console.warn(`[AgenticLLM] Max tool loops (${maxLoops}) reached. Forcing final answer.`);
    return await OpenRouterClient.generate(currentPrompt, systemPrompt);
  }
}
