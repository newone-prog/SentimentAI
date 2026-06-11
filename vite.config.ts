import { resolve as pathResolve } from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  base: './',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": pathResolve(__dirname, "./src"),
    },
  },
  server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
  },
  proxy: {
  '/api/yahoo1': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/yahoo1/, ''),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*'
    }
  },
  '/api/yahoo2': {
    target: 'https://query2.finance.yahoo.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/yahoo2/, ''),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*'
    }
  },
  '/api/groww': {
    target: 'https://groww.in',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/groww/, '')
  },
  '/api/gnews': {
    target: 'https://gnews.io',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/gnews/, '/api')
  },
  '/api/mediastack': {
    target: 'https://api.mediastack.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/mediastack/, ''),
  },
  '/api/marketstack': {
    target: 'http://api.marketstack.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/marketstack/, ''),
    secure: false,
  },
  '/api/indianapi': {
    target: 'https://stock.indianapi.in',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/indianapi/, ''),
    headers: {
      'X-API-Key': env.VITE_INDIANAPI_KEY || ''
    }
  },
  '/api/tradingview': {
    target: 'https://scanner.tradingview.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/tradingview/, ''),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Origin': 'https://www.tradingview.com',
      'Referer': 'https://www.tradingview.com/',
    },
  },
  '/llm/nvidia': {
    target: 'https://integrate.api.nvidia.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/llm\/nvidia/, '/v1/chat/completions'),
    secure: false
  },
  '/llm/openrouter': {
    target: 'https://openrouter.ai',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/llm\/openrouter/, '/api/v1'),
    secure: false
  }
  }
  }
  };
});
