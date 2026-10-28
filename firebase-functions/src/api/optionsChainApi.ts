import { Request, Response } from "express";
import { fetchNSEOptionsChain } from "../nseScraper";
import { OptionsMath } from "../agents/OptionsMath";

import { fetchGrowwOptionsChain } from "../growwScraper";

export const optionsChainEndpoint = async (req: Request, res: Response) => {
  const index = req.query.index as string || "NIFTY";

  try {
    let rawData = await fetchNSEOptionsChain(index);
    if (!rawData || !rawData.records) {
      console.warn(`[OptionsChainAPI] Failed to fetch NSE Options Chain for ${index}. Falling back to Groww API...`);
      rawData = await fetchGrowwOptionsChain(index);
      
      if (!rawData || !rawData.records) {
        console.error(`[OptionsChainAPI] Failed to fetch options chain from both NSE and Groww.`);
        res.status(500).json({ error: "Failed to fetch options chain from all live sources." });
        return;
      }
    }

    const underlying = rawData.records.underlyingValue;
    const expiryDates = rawData.records.expiryDates;
    const currentExpiry = expiryDates[0];

    // Filter data for current expiry
    const expiryData = rawData.records.data.filter(d => d.expiryDate === currentExpiry);

    // Sort by strike price
    expiryData.sort((a, b) => a.strikePrice - b.strikePrice);

    // Find the ATM strike (closest to underlying)
    let atmStrike = expiryData[0].strikePrice;
    let minDiff = Math.abs(underlying - atmStrike);
    let atmIndex = 0;

    expiryData.forEach((d, idx) => {
      const diff = Math.abs(underlying - d.strikePrice);
      if (diff < minDiff) {
        minDiff = diff;
        atmStrike = d.strikePrice;
        atmIndex = idx;
      }
    });

    // Take +/- 15 strikes from ATM to get ITM, ATM, OTM
    const startIndex = Math.max(0, atmIndex - 15);
    const endIndex = Math.min(expiryData.length - 1, atmIndex + 15);
    const relevantStrikes = expiryData.slice(startIndex, endIndex + 1);

    // Risk-free rate (approx 7% in India)
    const r = 0.07;
    // Time to expiry in years
    const expiryDateObj = new Date(currentExpiry);
    const now = new Date();
    const daysToExpiry = Math.max((expiryDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24), 0.1);
    const T = daysToExpiry / 365;

    // Process and attach Greeks
    const processedChain = relevantStrikes.map(d => {
      const ce = d.CE ? {
        strike: d.strikePrice,
        ltp: d.CE.lastPrice,
        iv: d.CE.impliedVolatility,
        oi: d.CE.openInterest,
        volume: d.CE.totalTradedVolume,
        greeks: OptionsMath.calculateGreeks(underlying, d.strikePrice, T, r, d.CE.impliedVolatility / 100, 'CE')
      } : null;

      const pe = d.PE ? {
        strike: d.strikePrice,
        ltp: d.PE.lastPrice,
        iv: d.PE.impliedVolatility,
        oi: d.PE.openInterest,
        volume: d.PE.totalTradedVolume,
        greeks: OptionsMath.calculateGreeks(underlying, d.strikePrice, T, r, d.PE.impliedVolatility / 100, 'PE')
      } : null;

      return {
        strikePrice: d.strikePrice,
        CE: ce,
        PE: pe,
        isATM: d.strikePrice === atmStrike
      };
    });

    res.json({
      index,
      underlying,
      expiryDate: currentExpiry,
      daysToExpiry,
      pcr: rawData.filtered.PE.totOI / Math.max(rawData.filtered.CE.totOI, 1),
      chain: processedChain
    });
    return;

  } catch (error: any) {
    console.error("Error in options chain endpoint:", error);
    res.status(500).json({ error: error.message });
    return;
  }
};
