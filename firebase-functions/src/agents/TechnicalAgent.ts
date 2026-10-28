export class TechnicalAgent {
  public analyze(marketAgentOutput: any, priceData: any): any {
    if (!marketAgentOutput || !priceData) {
      return { conclusion: "Insufficient technical data to form a conclusion." };
    }

    const { trend, trendStrength, marketStructure, support, resistance, patterns, volumeAnalysis } = marketAgentOutput;
    const isAccumulating = volumeAnalysis?.institutionalAccumulation;

    let conclusion = "";

    // 1. Synthesize Trend and Structure
    if (trend === "Bullish" && marketStructure === "Higher Highs") {
      conclusion += `The chart exhibits a structurally robust bullish continuation setup, characterized by sustained higher highs and a strong trend (Strength: ${trendStrength}/100). `;
      if (isAccumulating) {
        conclusion += `Crucially, recent price action is supported by institutional accumulation, indicating smart money sponsorship of this upward momentum. `;
      }
    } else if (trend === "Bearish" && marketStructure === "Lower Lows") {
      conclusion += `The primary technical structure is aggressively bearish, locked in a sequence of lower lows (Strength: ${trendStrength}/100). `;
      if (volumeAnalysis?.smartMoneyActivity === "High Distribution") {
        conclusion += `Distribution volume confirms institutional offloading; rallies should be viewed with extreme caution. `;
      }
    } else {
      conclusion += `The technical structure is currently trapped in a sideways / ranging regime, lacking a definitive directional catalyst. `;
    }

    // 2. Synthesize Patterns
    if (patterns && patterns[0] && patterns[0] !== "None") {
      conclusion += `A ${patterns[0]} pattern is currently developing. `;
    }

    // 3. Actionable Levels
    conclusion += `From an actionable standpoint, immediate downside support rests at ${support[0] || 'N/A'}. A confirmed break below this invalidates the near-term structure. Conversely, overhead supply (resistance) sits at ${resistance[0] || 'N/A'}. Clearing this supply zone on expanding volume would mathematically confirm the next leg of price discovery.`;

    return {
      technicalConclusion: conclusion,
      actionableAdvice: trend === "Bullish" ? "Buy on dips near support" : (trend === "Bearish" ? "Avoid or short near resistance" : "Hold / Wait for breakout"),
      confidence: 88
    };
  }
}
