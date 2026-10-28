export class InformationAgent {
  public analyze(sentimentData: any): any {
    if (!sentimentData || !sentimentData.analyzedData || sentimentData.analyzedData.length === 0) {
      return { 
        catalystSummary: "No recent catalysts or information available.",
        sentimentScore: 50,
        informationFlow: "Stagnant" 
      };
    }

    const headlines: any[] = sentimentData.analyzedData;
    let positiveWords = 0;
    let negativeWords = 0;
    
    const posKeywords = ["growth", "profit", "surge", "beat", "upgrade", "buy", "record", "expansion", "dividend", "approval", "bullish"];
    const negKeywords = ["loss", "drop", "miss", "downgrade", "sell", "decline", "lawsuit", "investigation", "bearish", "crash", "debt"];

    headlines.forEach(headline => {
      const titleString = typeof headline === 'string' ? headline : (headline.title || "");
      const lower = titleString.toLowerCase();
      posKeywords.forEach(word => { if (lower.includes(word)) positiveWords++; });
      negKeywords.forEach(word => { if (lower.includes(word)) negativeWords++; });
    });

    let flow = "Neutral";
    let score = 50;
    if (positiveWords > negativeWords * 1.5) {
      flow = "Bullish Catalyst Influx";
      score = 75 + (positiveWords * 2);
    } else if (negativeWords > positiveWords * 1.5) {
      flow = "Bearish Catalyst Influx";
      score = 25 - (negativeWords * 2);
    }

    // Heuristically construct a summary
    let summary = `Recent market information flow is categorized as ${flow}. `;
    if (positiveWords > 0 || negativeWords > 0) {
      summary += `The narrative is driven by ${positiveWords} positive catalyst keywords vs ${negativeWords} negative ones. `;
    }

    return {
      catalystSummary: summary,
      sentimentScore: Math.min(100, Math.max(0, score)),
      informationFlow: flow,
      headlineCount: headlines.length
    };
  }
}
