import { Request, Response } from "express";
import axios from "axios";
import * as cheerio from "cheerio";

export const webScraperEndpoint = async (req: Request, res: Response) => {
  const { type, ticker, interval } = req.body;

  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required" });
  }

  try {
    if (type === 'daily') {
      // Scrape Yahoo Finance Historical Data page
      const url = `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/history/`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      
      const $ = cheerio.load(response.data);
      const rows = $('table tbody tr');
      
      const openHistory: number[] = [];
      const highHistory: number[] = [];
      const lowHistory: number[] = [];
      const closeHistory: number[] = [];
      const volumeHistory: number[] = [];
      
      rows.each((i, el) => {
        const cells = $(el).find('td');
        if (cells.length >= 7) {
          const open = parseFloat($(cells[1]).text().replace(/,/g, ''));
          const high = parseFloat($(cells[2]).text().replace(/,/g, ''));
          const low = parseFloat($(cells[3]).text().replace(/,/g, ''));
          const close = parseFloat($(cells[4]).text().replace(/,/g, ''));
          const volumeText = $(cells[6]).text().replace(/,/g, '');
          let volume = parseInt(volumeText, 10);
          if (volumeText.includes('M')) volume = parseFloat(volumeText) * 1000000;
          else if (volumeText.includes('B')) volume = parseFloat(volumeText) * 1000000000;
          
          if (!isNaN(open) && !isNaN(close)) {
            openHistory.unshift(open);
            highHistory.unshift(high);
            lowHistory.unshift(low);
            closeHistory.unshift(close);
            volumeHistory.unshift(isNaN(volume) ? 0 : volume);
          }
        }
      });

      if (closeHistory.length === 0) {
        throw new Error("Scraper failed to parse table data");
      }

      const currentPrice = closeHistory[closeHistory.length - 1];
      const previousPrice = closeHistory[closeHistory.length - 2] || currentPrice;
      const change = currentPrice - previousPrice;
      const changePercent = (change / previousPrice) * 100;
      const avgVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length;

      return res.json({
        success: true,
        data: {
          name: ticker,
          price: currentPrice,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          currency: 'USD',
          history: closeHistory.slice(-30),
          openHistory: openHistory.slice(-30),
          highHistory: highHistory.slice(-30),
          lowHistory: lowHistory.slice(-30),
          volume: volumeHistory.slice(-30),
          avgVolume,
          isScraped: true
        }
      });

    } else if (type === 'intraday') {
      // For intraday, scraping Google Finance HTML is tough because charts are canvas.
      // We will fallback to proxying a different free API or standard Yahoo query but with no cors.
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=${interval || '15m'}`;
      const response = await axios.get(url, {
         headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const result = response.data.chart.result[0];
      const quotes = result.indicators.quote[0];
      
      const closePrices = quotes.close.filter((p: number | null) => p !== null);
      const volumeArray = quotes.volume ? quotes.volume.filter((v: number | null) => v !== null) : [];
      
      return res.json({
        success: true,
        data: {
          currentPrice: closePrices[closePrices.length - 1],
          closePrices,
          volumeArray,
          isScraped: true
        }
      });
      
    } else if (type === 'news') {
      // Scrape Google News RSS (which is an XML file)
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(ticker + ' stock')}&hl=en-US&gl=US&ceid=US:en`;
      const response = await axios.get(url);
      const $ = cheerio.load(response.data, { xmlMode: true });
      const items = $('item').slice(0, 5);
      
      const news: any[] = [];
      items.each((i, el) => {
        news.push({
          title: $(el).find('title').text(),
          publisher: $(el).find('source').text(),
          link: $(el).find('link').text(),
          providerPublishTime: new Date($(el).find('pubDate').text()).getTime() / 1000,
          type: "STORY"
        });
      });
      
      return res.json({
        success: true,
        data: news
      });
    }

    return res.status(400).json({ error: "Invalid scrape type" });

  } catch (error: any) {
    console.error("[WebScraper] Error:", error.message);
    return res.status(500).json({ error: "Scraping failed: " + error.message });
  }
};
