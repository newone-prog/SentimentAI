
import axios from "axios";
import * as cheerio from "cheerio";

export const scrapeMutualFundNews = async (query: string) => {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const response = await axios.get(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const items: any[] = [];
    
    $("item").slice(0, 15).each((i, el) => {
      items.push({
        title: $(el).find("title").text(),
        url: $(el).find("link").text(),
        source: $(el).find("source").text() || "Google News",
        date: $(el).find("pubDate").text(),
        content: $(el).find("description").text().replace(/<[^>]+>/g, '') // strip html
      });
    });

    return items;
  } catch (error: any) {
    console.error("Scraping failed:", error.message);
    return [];
  }
};
