
import { type StockData, type SentimentAnalysis } from './api';

export interface DevilsAdvocateResponse {
  overallBearCaseStrength: number;
  bearishSummary: string;
  userPositionAnalysis: string; // New: Analysis of the user's specific concern/position
  honestAdvice: string; // New: Direct advice on what to do next
  hiddenRisks: string[];
  overlookedWeaknesses: string[];
  valuationConcerns: string[];
  competitiveThreats: string[];
  financialRisks: string[];
  industryRisks: string[];
  regulatoryRisks: string[];
  sentimentRisks: string[];
  thesisBreakers: string[];
  worstCaseScenario: string;
  probabilityBullThesisFails: number;
  keyQuestionsInvestorsShouldAsk: string[];
  source: string;
}

const NVIDIA_MODEL = "meta/llama-3.1-70b-instruct";
const OPENROUTER_MODEL = "meta-llama/llama-3.1-70b-instruct";

export const getDevilsAdvocateAnalysis = async (
  query: string, // Accept full user query
  stockName: string, 
  priceData: StockData | null, 
  sentimentData: SentimentAnalysis | null
): Promise<DevilsAdvocateResponse | null> => {
  
  const systemPrompt = `
    # SENTIMENTAI — FORENSIC TERMINAL CORE
    ## SYSTEM ROLE
    You are the Senior Forensic Analyst and Risk Director at SentimentAI.
    Your mission is to analyze the user's specific concern regarding a stock and provide an institutional-grade Red Team report.
    
    ## OPERATIONAL DIRECTIVE
    - Acknowledge the user's specific situation (e.g., "I am short on Zomato").
    - Be brutally honest. If the user is making a mistake, explain why with data.
    - Focus on risk discovery and behavioral traps.
    - Provide a definitive "What to do next" summary.
  `;

  const userPrompt = `
    USER QUERY: "${query}"
    TARGET ENTITY: ${stockName}
    
    [CONTEXT DATA]
    - Market Data: ${JSON.stringify(priceData)}
    - Sentiment/News Pulse: ${JSON.stringify(sentimentData?.analyzedData.slice(0, 15))}
    - Global Fear & Greed: ${sentimentData?.globalFearGreed}/100
    
    [TASK]
    1. Analyze the USER QUERY. Understand their position (Long/Short/Neutral) and their specific anxiety.
    2. Generate a full forensic bear case for ${stockName}.
    3. Provide "Honest Advice": Is the user's current decision/position correct based on real-time data? What is the smartest next move?
    
    [OUTPUT FORMAT - JSON ONLY]
    {
      "overallBearCaseStrength": 0-100,
      "bearishSummary": "Institutional-grade summary of the bear case.",
      "userPositionAnalysis": "Address the user's query specifically. Explain the risks of their specific position.",
      "honestAdvice": "A 2-3 sentence verdict on whether they are right/wrong and what they should do next.",
      "hiddenRisks": ["list"],
      "overlookedWeaknesses": ["list"],
      "valuationConcerns": ["list"],
      "competitiveThreats": ["list"],
      "financialRisks": ["list"],
      "industryRisks": ["list"],
      "regulatoryRisks": ["list"],
      "sentimentRisks": ["list"],
      "thesisBreakers": ["list"],
      "worstCaseScenario": "The absolute 'black swan' scenario for this entity.",
      "probabilityBullThesisFails": 0-100,
      "keyQuestionsInvestorsShouldAsk": ["list"]
    }
  `;

  const body = JSON.stringify({
    model: NVIDIA_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 2048,
    response_format: { type: "json_object" }
  });

  // Try NVIDIA NIM Branch
  try {
    const response = await fetch("/llm/nvidia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_NVIDIA_NIM_KEY}`
      },
      body
    });

    if (!response.ok) throw new Error(`NVIDIA Node Error: ${response.status}`);
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    return { ...result, source: "NVIDIA Forensics Node" };

  } catch (err) {
    console.warn("NVIDIA Forensics failed, falling back to OpenRouter Mesh...", err);

    // Try OpenRouter Fallback
    try {
      const orBody = JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      });

      const response = await fetch("/llm/openrouter/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "SentimentAI Terminal"
        },
        body: orBody
      });

      if (!response.ok) throw new Error(`OpenRouter Mesh Error: ${response.status}`);

      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      return { ...result, source: "OpenRouter Forensic Mesh" };

    } catch (orErr) {
      console.error("Terminal AI Pipeline Collapsed:", orErr);
      return null;
    }
  }
};
