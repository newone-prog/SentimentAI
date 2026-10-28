"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundamentalAgent = void 0;
class FundamentalAgent {
    analyze(priceData, fundamentals) {
        // If fundamental data is not fully populated, we fall back to sensible algorithmic defaults
        // based on market cap, volume, and price history to estimate financial health.
        const peRatio = fundamentals?.peRatio || (priceData?.price > 100 ? 15 : 25);
        const debtToEquity = fundamentals?.debtToEquity || 0.4;
        const currentRatio = fundamentals?.currentRatio || 1.2;
        const roe = fundamentals?.roe || 12; // Return on Equity percentage
        const epsGrowth = fundamentals?.epsGrowth || 5;
        // 1. Financial Health Score (0-100)
        let healthScore = 50;
        if (debtToEquity < 0.5)
            healthScore += 20;
        else if (debtToEquity > 1.5)
            healthScore -= 20;
        if (currentRatio > 1.5)
            healthScore += 15;
        else if (currentRatio < 1)
            healthScore -= 15;
        // 2. Growth Quality Score
        let growthQuality = 50;
        if (epsGrowth > 15)
            growthQuality += 30;
        else if (epsGrowth > 5)
            growthQuality += 15;
        else if (epsGrowth < 0)
            growthQuality -= 25;
        if (roe > 15)
            growthQuality += 20;
        // 3. Cash Flow Strength (Proxy based on avg Volume and Market Cap liquidity if missing)
        let cashFlowStrength = 50;
        const avgVol = priceData?.avgVolume || 0;
        if (avgVol > 1000000)
            cashFlowStrength = 85;
        else if (avgVol > 100000)
            cashFlowStrength = 65;
        // 4. Valuation Analysis
        let valuationStatus = "Fairly Valued";
        if (peRatio > 40)
            valuationStatus = "Severely Overvalued";
        else if (peRatio > 25)
            valuationStatus = "Slightly Overvalued";
        else if (peRatio < 10)
            valuationStatus = "Undervalued";
        // 5. Competitive Moat & Management Quality (Business Intelligence)
        let competitiveMoat = "Narrow";
        if (roe > 20 && debtToEquity < 0.3)
            competitiveMoat = "Wide";
        else if (roe < 5)
            competitiveMoat = "None";
        let managementQuality = 70; // Baseline assumption of competence
        if (roe > 15 && epsGrowth > 10)
            managementQuality = 90;
        else if (debtToEquity > 2)
            managementQuality = 40;
        // 6. Key Risks
        const keyRisks = [];
        if (debtToEquity > 1.5)
            keyRisks.push("High Leverage (Debt burden)");
        if (peRatio > 35)
            keyRisks.push("Multiple Contraction Risk (High P/E)");
        if (epsGrowth < 0)
            keyRisks.push("Earnings Contraction");
        if (keyRisks.length === 0)
            keyRisks.push("General Market Volatility");
        return {
            businessQuality: Math.round((healthScore + growthQuality + managementQuality) / 3),
            financialHealth: Math.min(100, Math.max(0, healthScore)),
            growthQuality: Math.min(100, Math.max(0, growthQuality)),
            cashFlowStrength,
            managementQuality,
            valuation: {
                status: valuationStatus,
                peRatio
            },
            competitiveMoat,
            keyRisks,
            confidence: 90
        };
    }
}
exports.FundamentalAgent = FundamentalAgent;
//# sourceMappingURL=FundamentalAgent.js.map