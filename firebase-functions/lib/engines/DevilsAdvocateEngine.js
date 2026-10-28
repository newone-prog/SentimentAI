"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevilsAdvocateEngine = void 0;
class DevilsAdvocateEngine {
    analyze(agentReports) {
        if (!agentReports) {
            return { bearThesis: "No data available to form a bear thesis." };
        }
        const market = agentReports.MarketAgent || {};
        const fundamental = agentReports.FundamentalAgent || {};
        const information = agentReports.InformationAgent || {};
        let probabilityThesisFails = 20; // base risk
        const hiddenRisks = fundamental.keyRisks ? [...fundamental.keyRisks] : [];
        const thesisBreakers = [];
        // 1. Valuation Risk vs Trend
        if (fundamental.valuation?.status === "Severely Overvalued" || fundamental.valuation?.status === "Slightly Overvalued") {
            probabilityThesisFails += 20;
            hiddenRisks.push(`Priced for perfection: ${fundamental.valuation.status}. Any earnings miss will cause severe multiple contraction.`);
            if (market.trend === "Bearish") {
                thesisBreakers.push("Valuation is collapsing as trend confirms institutional exiting.");
            }
        }
        // 2. Trend vs Sentiment Divergence
        if (market.trend === "Bearish" && information.informationFlow === "Bullish Catalyst Influx") {
            probabilityThesisFails += 15;
            hiddenRisks.push("Divergence: Retail is buying good news while price action remains bearish (Smart money distribution).");
        }
        else if (market.trend === "Bullish" && information.informationFlow === "Bearish Catalyst Influx") {
            thesisBreakers.push("Negative catalysts could break the current bullish structure.");
        }
        // 3. Structural Breakdown
        if (market.marketStructure === "Lower Lows" && market.trendStrength > 70) {
            probabilityThesisFails += 25;
            thesisBreakers.push("Market structure has firmly broken down. Long positions are fighting a strong structural downtrend.");
        }
        // 4. Moat / Business Quality Risk
        if (fundamental.competitiveMoat === "None" || fundamental.businessQuality < 50) {
            probabilityThesisFails += 15;
            hiddenRisks.push("Weak fundamental business quality makes the stock highly susceptible to macroeconomic shocks.");
        }
        let bearThesis = "Algorithmic Bear Thesis: ";
        if (probabilityThesisFails >= 60) {
            bearThesis += "HIGH RISK. The combination of structural weakness and/or poor fundamentals creates a very dangerous setup for long positions.";
        }
        else if (probabilityThesisFails >= 40) {
            bearThesis += "MODERATE RISK. While there are bullish elements, key risks in valuation or structure must be monitored closely.";
        }
        else {
            bearThesis += "LOW RISK. The bear case is currently subdued, though systematic market risks always remain.";
        }
        return {
            bearThesis,
            hiddenRisks,
            worstCaseScenario: "A synchronized breakdown of support levels triggering cascading liquidations.",
            thesisBreakers,
            probabilityThesisFails: Math.min(100, Math.max(0, probabilityThesisFails))
        };
    }
}
exports.DevilsAdvocateEngine = DevilsAdvocateEngine;
//# sourceMappingURL=DevilsAdvocateEngine.js.map