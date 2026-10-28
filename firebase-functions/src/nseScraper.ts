import axios from "axios";

export interface NSEOptionsData {
  records: {
    expiryDates: string[];
    data: any[];
    timestamp: string;
    underlyingValue: number;
    strikePrices: number[];
  };
  filtered: {
    data: any[];
    CE: { totOI: number; totVol: number };
    PE: { totOI: number; totVol: number };
  };
}

let cookieStr = "";

const getCookies = async () => {
  try {
    const response = await axios.get("https://www.nseindia.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
      timeout: 10000,
    });
    const setCookies = response.headers["set-cookie"];
    if (setCookies) {
      cookieStr = setCookies.map((c: string) => c.split(";")[0]).join("; ");
    }
  } catch (error) {
    console.error("Failed to fetch NSE cookies:", error);
  }
};

export const fetchNSEOptionsChain = async (symbol: string = "NIFTY"): Promise<NSEOptionsData | null> => {
  if (!cookieStr) {
    await getCookies();
  }

  try {
    const url = `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cookie": cookieStr,
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch NSE options chain for ${symbol}:`, error.message);
    // If blocked, try renewing cookies once
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log("Renewing cookies and retrying...");
      await getCookies();
      try {
        const url = `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`;
        const retryResponse = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cookie": cookieStr,
          },
          timeout: 10000,
        });
        return retryResponse.data;
      } catch (retryError: any) {
        console.error("Retry failed:", retryError.message);
        return null;
      }
    }
    return null;
  }
};
