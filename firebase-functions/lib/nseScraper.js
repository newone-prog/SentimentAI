"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNSEOptionsChain = void 0;
const axios_1 = __importDefault(require("axios"));
let cookieStr = "";
const getCookies = async () => {
    try {
        const response = await axios_1.default.get("https://www.nseindia.com", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
            },
            timeout: 10000,
        });
        const setCookies = response.headers["set-cookie"];
        if (setCookies) {
            cookieStr = setCookies.map((c) => c.split(";")[0]).join("; ");
        }
    }
    catch (error) {
        console.error("Failed to fetch NSE cookies:", error);
    }
};
const fetchNSEOptionsChain = async (symbol = "NIFTY") => {
    if (!cookieStr) {
        await getCookies();
    }
    try {
        const url = `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`;
        const response = await axios_1.default.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Cookie": cookieStr,
            },
            timeout: 10000,
        });
        return response.data;
    }
    catch (error) {
        console.error(`Failed to fetch NSE options chain for ${symbol}:`, error.message);
        // If blocked, try renewing cookies once
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.log("Renewing cookies and retrying...");
            await getCookies();
            try {
                const url = `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`;
                const retryResponse = await axios_1.default.get(url, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Accept-Encoding": "gzip, deflate, br",
                        "Cookie": cookieStr,
                    },
                    timeout: 10000,
                });
                return retryResponse.data;
            }
            catch (retryError) {
                console.error("Retry failed:", retryError.message);
                return null;
            }
        }
        return null;
    }
};
exports.fetchNSEOptionsChain = fetchNSEOptionsChain;
//# sourceMappingURL=nseScraper.js.map