import React, { useState, useEffect } from 'react';
import { X, ExternalLink, ShieldCheck, Globe2, Sparkles, Filter } from 'lucide-react';

export interface DataSourceItem {
  name: string;
  category: 'Equities & Derivatives' | 'Mutual Funds' | 'News & Sentiment' | 'AI & Execution';
  url: string;
  role: string;
  status: string;
}

export const DATA_SOURCES: DataSourceItem[] = [
  {
    name: 'NSE India',
    category: 'Equities & Derivatives',
    url: 'https://www.nseindia.com',
    role: 'National Stock Exchange of India: Equities, NIFTY Indices, and Derivatives.',
    status: 'Official Exchange'
  },
  {
    name: 'BSE India',
    category: 'Equities & Derivatives',
    url: 'https://www.bseindia.com',
    role: 'Bombay Stock Exchange: SENSEX, Corporate Actions, and Bhavcopy historicals.',
    status: 'Official Exchange'
  },
  {
    name: 'Yahoo Finance',
    category: 'Equities & Derivatives',
    url: 'https://finance.yahoo.com',
    role: 'Real-time quotes, multi-year historical candles (1D, 1W), and global commodities.',
    status: 'Real-time Feed'
  },
  {
    name: 'IndianAPI',
    category: 'Equities & Derivatives',
    url: 'https://stock.indianapi.in',
    role: 'Live NSE/BSE options chains, strike open interest (OI), and corporate filings.',
    status: 'Live API'
  },
  {
    name: 'Marketstack',
    category: 'Equities & Derivatives',
    url: 'https://marketstack.com',
    role: 'End-of-day market tick histories and institutional closing price feeds.',
    status: 'Live API'
  },
  {
    name: 'MF API (AMFI)',
    category: 'Mutual Funds',
    url: 'https://www.mfapi.in',
    role: 'All 38,000+ Indian mutual fund schemes: historical NAV, 1Y returns, and 3Y CAGRs.',
    status: 'Live API'
  },
  {
    name: 'Google News',
    category: 'News & Sentiment',
    url: 'https://news.google.com',
    role: 'Real-time Indian financial coverage, corporate headlines, and macroeconomic feeds.',
    status: 'Real-time Feed'
  },
  {
    name: 'GNews API',
    category: 'News & Sentiment',
    url: 'https://gnews.io',
    role: 'Curated financial news aggregation with semantic sentiment scoring.',
    status: 'Live API'
  },
  {
    name: 'MediaStack',
    category: 'News & Sentiment',
    url: 'https://mediastack.com',
    role: 'Global economic press wire aggregation and international market sentiment.',
    status: 'Live API'
  },
  {
    name: 'Tavily AI Search',
    category: 'News & Sentiment',
    url: 'https://tavily.com',
    role: 'Autonomous real-time search engine for AI agents and market investigations.',
    status: 'Live API'
  },
  {
    name: 'TradingView',
    category: 'AI & Execution',
    url: 'https://www.tradingview.com',
    role: 'Technical oscillators (RSI, ADX, MACD, Bollinger Bands) and consensus ratings.',
    status: 'Real-time Feed'
  },
  {
    name: 'NVIDIA NIM',
    category: 'AI & Execution',
    url: 'https://build.nvidia.com',
    role: 'Nemotron 3 Ultra 550B autonomous reasoning, strategy backtesting, and synthesis.',
    status: 'Live API'
  },
  {
    name: 'Pyodide',
    category: 'AI & Execution',
    url: 'https://pyodide.org',
    role: 'In-browser WebAssembly Python quantitative analytics & Monte Carlo engine.',
    status: 'WASM Runtime'
  }
];

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CategoryFilter = 'All' | 'Equities & Derivatives' | 'Mutual Funds' | 'News & Sentiment' | 'AI & Execution';

export const SourcesModal: React.FC<SourcesModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredSources = selectedCategory === 'All' 
    ? DATA_SOURCES 
    : DATA_SOURCES.filter(s => s.category === selectedCategory);

  const categories: { label: CategoryFilter; count: number }[] = [
    { label: 'All', count: DATA_SOURCES.length },
    { label: 'Equities & Derivatives', count: DATA_SOURCES.filter(s => s.category === 'Equities & Derivatives').length },
    { label: 'Mutual Funds', count: DATA_SOURCES.filter(s => s.category === 'Mutual Funds').length },
    { label: 'News & Sentiment', count: DATA_SOURCES.filter(s => s.category === 'News & Sentiment').length },
    { label: 'AI & Execution', count: DATA_SOURCES.filter(s => s.category === 'AI & Execution').length },
  ];

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[88vh] bg-[#000000] border border-white/[0.14] rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col text-white select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 3-COLOR TEXTURED BLUR ATMOSPHERE (Deep Black + Brilliant White + Theme Gold #C4A77D) ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Base Pitch Black */}
          <div className="absolute inset-0 bg-[#000000]" />

          {/* Luminous Gold / Amber Aurora Wave */}
          <div 
            className="absolute -top-[15%] -left-[10%] w-[85vw] sm:w-[40rem] h-72 rounded-[100%] opacity-90 blur-[70px]"
            style={{
              background: 'radial-gradient(ellipse at 40% 40%, #E5C158 0%, #D4AF37 25%, #C4A77D 50%, #8A6422 75%, transparent 100%)'
            }}
          />

          {/* Radiant Pure White / Champagne Spotlight (Top-Right) */}
          <div 
            className="absolute -top-[20%] right-[-10%] w-[65vw] sm:w-[30rem] h-64 rounded-[100%] opacity-85 blur-[60px]"
            style={{
              background: 'radial-gradient(ellipse at 60% 35%, #FFFFFF 0%, #FFF6E5 30%, rgba(229, 193, 88, 0.6) 65%, transparent 100%)'
            }}
          />

          {/* Corona Bridge */}
          <div 
            className="absolute top-0 left-[25%] w-96 h-48 rounded-[100%] opacity-75 blur-[80px]"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, #FFDF85 0%, #D4AF37 40%, rgba(196, 167, 125, 0.4) 70%, transparent 100%)'
            }}
          />

          {/* Falloff to Deep Black for content readability */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, transparent 20%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.94) 65%, #000000 85%, #000000 100%)'
            }}
          />

          {/* PROMINENT TEXTURED FILM GRAIN (Matching Footer Aesthetic) */}
          <svg className="absolute inset-0 w-full h-full opacity-35 mix-blend-overlay pointer-events-none">
            <filter id="sources-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#sources-grain)" />
          </svg>

          <svg className="absolute inset-0 w-full h-full opacity-20 mix-blend-color-dodge pointer-events-none">
            <filter id="sources-fine-grain">
              <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#sources-fine-grain)" />
          </svg>

          {/* Top Hairline Luminous Glow */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E5C158] via-white to-transparent opacity-85" />
        </div>

        {/* ── MODAL HEADER ── */}
        <div className="relative z-10 p-6 sm:p-7 border-b border-white/[0.12] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-black/50 border border-[#C4A77D]/60 flex items-center justify-center shrink-0 text-[#C4A77D] shadow-xl backdrop-blur-xl">
              <Globe2 className="w-6 h-6 animate-[spin_24s_linear_infinite]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-white/90 font-semibold px-2.5 py-0.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-md">
                  Transparency Protocol
                </span>
                <span className="text-white/40">•</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/70">
                  13 Verified Direct Sources
                </span>
              </div>
              <h3 
                className="font-serif text-xl sm:text-2xl text-white tracking-tight drop-shadow-md"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Data Sources & Transparency Directory
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 flex items-center justify-center text-white/50 hover:text-white transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── CATEGORY FILTER STRIP ── */}
        <div className="relative z-10 px-6 sm:px-7 py-3 border-b border-white/[0.08] bg-black/40 backdrop-blur-xl flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#C4A77D] shrink-0 mr-1" />
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.label;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => setSelectedCategory(cat.label)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${
                  isActive 
                    ? 'bg-[#C4A77D] text-black font-semibold shadow-md shadow-[#C4A77D]/25' 
                    : 'bg-white/[0.04] hover:bg-white/[0.09] text-white/70 hover:text-white border border-white/[0.08]'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── SCROLLABLE SOURCES LIST ── */}
        <div className="relative z-10 p-6 sm:p-7 overflow-y-auto space-y-3.5 custom-scrollbar flex-1">
          {filteredSources.map((source) => (
            <div
              key={source.name}
              className="p-4 rounded-2xl bg-black/60 border border-white/[0.1] hover:border-[#C4A77D]/60 hover:bg-white/[0.02] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group backdrop-blur-xl"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span 
                    className="font-serif text-lg font-semibold text-white tracking-wide"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {source.name}
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#C4A77D]/10 text-[#C4A77D] border border-[#C4A77D]/30 font-medium">
                    {source.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-white/60 border border-white/10">
                    {source.status}
                  </span>
                </div>
                <p className="text-xs text-white/55 leading-relaxed max-w-2xl font-sans">
                  {source.role}
                </p>
              </div>

              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.05] hover:bg-[#C4A77D] text-[#C4A77D] hover:text-black border border-[#C4A77D]/40 hover:border-[#C4A77D] text-xs font-mono font-medium transition-all shrink-0 self-start sm:self-center shadow-lg group-hover:shadow-[#C4A77D]/20"
              >
                <span>Visit Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>

        {/* ── MODAL FOOTER ── */}
        <div className="relative z-10 p-4 sm:p-5 border-t border-white/[0.1] bg-black/60 backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-white/50 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C4A77D]" />
            <span>SentimentAI Transparency Protocol • 100% Verified Direct Links</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-full bg-[#C4A77D] hover:bg-[#d8c5a8] text-black font-semibold text-xs font-mono tracking-wider transition-all shadow-lg shadow-[#C4A77D]/25"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
