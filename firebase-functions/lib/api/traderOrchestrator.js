"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traderOrchestratorEndpoint = void 0;
const AgenticLLM_1 = require("../services/AgenticLLM");
const TradingMath_1 = require("../agents/TradingMath");
const traderOrchestratorEndpoint = async (req, res) => {
    const { ticker, companyName, intradayData, dailyData, optionsChain } = req.body;
    if (!ticker) {
        return res.status(400).json({ error: "Ticker is required" });
    }
    try {
        const prices = intradayData?.closePrices || dailyData?.history || [];
        const volumes = intradayData?.volumeArray || dailyData?.volume || [];
        if (prices.length === 0) {
            return res.status(400).json({ error: "No price data available for trading analysis" });
        }
        const rsi = TradingMath_1.TradingMath.calculateRSI(prices, 14);
        const macd = TradingMath_1.TradingMath.calculateMACD(prices);
        const bb = TradingMath_1.TradingMath.calculateBollingerBands(prices, 20, 2);
        const orderBlocks = TradingMath_1.TradingMath.calculateOrderBlocks(prices, volumes);
        const traderContext = `
[QUANTITATIVE ALGORITHM DATA FOR ${ticker}]
Current Price: ${intradayData?.currentPrice || dailyData?.price || 'N/A'}

1. MOMENTUM INDICATORS
- RSI (14-period): ${rsi.toFixed(2)} (Oversold < 30, Overbought > 70)
- MACD Histogram: ${macd.histogram.toFixed(4)} (Positive = Bullish momentum, Negative = Bearish)

2. VOLATILITY BANDS
- Bollinger Upper Band: ${bb.upper.toFixed(2)}
- Bollinger Middle Band: ${bb.middle.toFixed(2)}
- Bollinger Lower Band: ${bb.lower.toFixed(2)}

3. INSTITUTIONAL ORDER BLOCKS
- Bullish Order Block (Support/Demand): ${orderBlocks.bullishOB || 'None detected'}
- Bearish Order Block (Resistance/Supply): ${orderBlocks.bearishOB || 'None detected'}

${optionsChain ? `4. DERIVATIVES & OPTIONS DATA
- Put-Call Ratio (PCR): ${optionsChain.pcr.toFixed(2)}
- Days to Expiry: ${Math.floor(optionsChain.daysToExpiry)}
- ATM Strike: ${optionsChain.chain.find((c) => c.isATM)?.strikePrice || 'N/A'}
- Options Chain Snapshot (Wider Range): ${JSON.stringify(optionsChain.chain.filter((c) => Math.abs(c.strikePrice - optionsChain.underlying) < 1500).map((c) => ({
            Strike: c.strikePrice,
            Call: {
                IV: c.CE?.iv,
                OI: c.CE?.oi,
                Volume: c.CE?.volume,
                Delta: c.CE?.greeks.delta.toFixed(2),
                Gamma: c.CE?.greeks.gamma.toFixed(4),
                Theta: c.CE?.greeks.theta.toFixed(2),
                Vega: c.CE?.greeks.vega.toFixed(2),
                Rho: c.CE?.greeks.rho?.toFixed(2)
            },
            Put: {
                IV: c.PE?.iv,
                OI: c.PE?.oi,
                Volume: c.PE?.volume,
                Delta: c.PE?.greeks.delta.toFixed(2),
                Gamma: c.PE?.greeks.gamma.toFixed(4),
                Theta: c.PE?.greeks.theta.toFixed(2),
                Vega: c.PE?.greeks.vega.toFixed(2),
                Rho: c.PE?.greeks.rho?.toFixed(2)
            }
        })), null, 2)}` : ''}
    `;
        const systemPrompt = `You are a world-class, mathematically strict quantitative algorithm and derivatives specialist.
Your objective is to provide a 90%+ probability trade setup based STRICTLY on the mathematical data provided.

RULES:
- If price is near Lower Bollinger Band and RSI < 35 -> STRONG_BUY (Reversion setup).
- If price is near Upper Bollinger Band and RSI > 65 -> REDUCE/SELL (Exhaustion).
- Respect the Order Blocks as strict Stop Loss (SL) and Take Profit (TP) levels.
${optionsChain ? `- DERIVATIVES RULE: If PCR < 0.6, market is extremely bearish. If PCR > 1.3, market is bullish.
- OPTIONS ANALYSIS: Use the provided Implied Volatility (IV), OI, Volume, and Greeks (Gamma, Theta, Vega) across the wider strike range to identify potential Gamma Blasts, support/resistance levels based on highest OI, and pinpoint the EXACT Strike, Premium, SL, and TP for the perfect trade. Specify whether to buy ATM, ITM, or OTM and exactly why.` : ''}

OUTPUT STRICTLY AS JSON MATCHING THIS EXACT SCHEMA:
{
  "reasoning": "Mathematical explanation of the trade setup",
  "verdict": "STRONG_BUY|ACCUMULATE|HOLD|REDUCE|AVOID",
  "confidence": 85,
  "emotionalContext": "Algorithmic state",
  "researchPaper": "Detailed mathematical breakdown of entry, SL, and TP targets. ${optionsChain ? 'MUST include an Options Strategy section detailing Greeks and Strikes.' : ''}",
  "optionSignals": [
    {
       "type": "BUY CE | BUY PE | SELL CE | SELL PE | SPREAD",
       "strike": 0,
       "moneyness": "ITM | ATM | OTM",
       "entry": 0,
       "stopLoss": 0,
       "takeProfit": 0,
       "rationale": "High gamma blast probability due to...",
       "greeks": { "delta": 0, "gamma": 0, "theta": 0, "vega": 0 }
    }
  ]
}`;
        const prompt = `
Ticker: ${ticker}
Entity: ${companyName || ticker}

${traderContext}

CRITICAL INSTRUCTION: Analyze the short-term trading setup using ONLY the mathematical data above.
Do NOT hallucinate levels. Rely completely on the Volatility Bands and Order Blocks provided.
    `;
        console.log(`[TraderOrchestrator] Launching single LLM loop for ${ticker} fueled by intraday math...`);
        const result = await AgenticLLM_1.AgenticLLM.runWithTools(prompt, systemPrompt, 3);
        let parsedData;
        try {
            const match = result.match(/\{[\s\S]*\}/);
            parsedData = JSON.parse(match ? match[0] : result);
        }
        catch (e) {
            console.error("Failed to parse trader LLM response", result);
            parsedData = {
                verdict: "NEUTRAL",
                reasoning: "Analysis failed to produce structured JSON.",
                confidence: 0
            };
        }
        return res.json({
            success: true,
            data: parsedData,
            isTraderMode: true
        });
    }
    catch (error) {
        console.error("[traderOrchestrator] Error:", error);
        return res.status(500).json({ error: "Failed to generate algorithmic trading plan" });
    }
};
exports.traderOrchestratorEndpoint = traderOrchestratorEndpoint;
//# sourceMappingURL=traderOrchestrator.js.map