import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedResult {
  title: string;
  link: string;
  snippet: string;
}

export class AgenticScraper {
  
  /**
   * Performs a DuckDuckGo HTML search and returns parsed results.
   * DuckDuckGo Lite is used to bypass JS requirements.
   */
  static async search(query: string, limit: number = 5): Promise<ScrapedResult[]> {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const $ = cheerio.load(data);
      const results: ScrapedResult[] = [];

      $('.result').each((i, el) => {
        if (i >= limit) return false;
        
        const title = $(el).find('.result__title a').text().trim();
        const link = $(el).find('.result__title a').attr('href');
        const snippet = $(el).find('.result__snippet').text().trim();

        // DuckDuckGo redirects links through their server, we need to extract the actual URL
        let actualLink = link || '';
        if (actualLink.startsWith('//duckduckgo.com/l/?uddg=')) {
          const urlParams = new URLSearchParams(actualLink.split('?')[1]);
          const decoded = urlParams.get('uddg');
          actualLink = decoded ? decodeURIComponent(decoded) : actualLink;
        }

        if (title && snippet) {
          results.push({
            title,
            link: actualLink,
            snippet
          });
        }
        return true;
      });

      return results;
    } catch (error: any) {
      console.error(`AgenticScraper Error searching "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Fetches and extracts raw text content from a given URL.
   * Useful for the LLM to deep-dive into a specific search result.
   */
  static async extractPageContent(url: string): Promise<string> {
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SentimentAI-Research-Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 10000 // 10s timeout to prevent hanging
      });

      const $ = cheerio.load(data);
      
      // Remove noise
      $('script, style, noscript, iframe, img, svg, nav, footer, header').remove();
      
      // Extract clean text
      const text = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();
        
      // Truncate to first 10,000 characters to save LLM context window
      return text.substring(0, 10000);
    } catch (error: any) {
      console.error(`AgenticScraper Error extracting "${url}":`, error.message);
      return `[Failed to extract content from ${url}. Server may block bots or URL is invalid.]`;
    }
  }
}
