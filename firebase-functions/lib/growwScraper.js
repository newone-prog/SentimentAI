"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGrowwOptionsChain = void 0;
const axios_1 = __importDefault(require("axios"));
const fetchGrowwOptionsChain = async (symbol = "NIFTY") => {
    try {
        const growwSymbol = symbol.toLowerCase();
        const url = `https://groww.in/v1/api/option_chain_service/v1/option_chain/${growwSymbol}`;
        const response = await axios_1.default.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Origin": "https://groww.in"
            },
            timeout: 10000
        });
        if (response.data && response.data.optionChain) {
            console.log("Successfully retrieved option chains");
            // Map Groww data to our expected raw format so optionsChainApi can process it
            const optionChains = response.data.optionChain.optionChains;
            const expiryDates = response.data.optionChain.expiryDetailsDto?.expiryDates || [new Date().toISOString()];
            const mappedData = optionChains.map((c) => {
                const ce = c.callOption;
                const pe = c.putOption;
                // Groww strike prices are multiplied by 100
                const strike = c.strikePrice / 100;
                return {
                    strikePrice: strike,
                    expiryDate: expiryDates[0],
                    CE: ce ? {
                        strikePrice: strike,
                        lastPrice: ce.ltp,
                        impliedVolatility: 15, // Groww doesn't provide IV natively here, fallback to 15%
                        openInterest: ce.openInterest,
                        totalTradedVolume: ce.volume || 0
                    } : undefined,
                    PE: pe ? {
                        strikePrice: strike,
                        lastPrice: pe.ltp,
                        impliedVolatility: 15, // Groww doesn't provide IV natively here, fallback to 15%
                        openInterest: pe.openInterest,
                        totalTradedVolume: pe.volume || 0
                    } : undefined
                };
            });
            // Find underlying price by checking ATM or live price
            let underlyingValue = response.data.optionChain.livePrice?.value;
            if (!underlyingValue) {
                // Find strike where CE and PE prices intersect (ATM)
                let minDiff = Infinity;
                let estimatedUnderlying = optionChains[0].strikePrice / 100;
                optionChains.forEach((c) => {
                    if (c.callOption && c.putOption) {
                        const diff = Math.abs(c.callOption.ltp - c.putOption.ltp);
                        if (diff < minDiff) {
                            minDiff = diff;
                            estimatedUnderlying = c.strikePrice / 100;
                        }
                    }
                });
                underlyingValue = estimatedUnderlying;
            }
            return {
                records: {
                    underlyingValue: underlyingValue,
                    expiryDates: expiryDates,
                    timestamp: new Date().toISOString(),
                    strikePrices: optionChains.map((c) => c.strikePrice / 100),
                    data: mappedData
                },
                filtered: {
                    data: [],
                    CE: { totOI: 1000000, totVol: 1000000 },
                    PE: { totOI: 1000000, totVol: 1000000 }
                }
            };
        }
        console.log(`Response data did not contain optionChains. Keys:`, Object.keys(response.data || {}));
        return null;
    }
    catch (error) {
        console.error(`Failed to fetch Groww options chain for ${symbol}:`, error.message);
        return null;
    }
};
exports.fetchGrowwOptionsChain = fetchGrowwOptionsChain;
//# sourceMappingURL=growwScraper.js.map