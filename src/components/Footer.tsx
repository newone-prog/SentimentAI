import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ExternalLink, 
  Mail, 
  ShieldCheck, 
  Globe2, 
  ChevronUp,
  X
} from 'lucide-react';
import { ContactModal } from './ContactModal';

// ── Complete Data Sources Directory for Maximum Transparency ──
interface DataSourceItem {
  name: string;
  category: 'Equities & Derivatives' | 'Mutual Funds' | 'News & Sentiment' | 'AI & Execution';
  url: string;
  role: string;
  status: string;
}

const DATA_SOURCES: DataSourceItem[] = [
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

export const Footer: React.FC = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactSubject, setContactSubject] = useState('');
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);

  const openContact = (subject: string = 'General Inquiry') => {
    setContactSubject(subject);
    setIsContactOpen(true);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer className="relative bg-[#050505] text-white overflow-hidden pt-16 pb-8 border-t border-white/[0.08]">
        {/* ── ATMOSPHERIC 3-COLOR TEXTURED BLUR (Black, White & Gold #C4A77D) ── */}
        <div className="absolute top-0 left-0 right-0 h-80 pointer-events-none overflow-hidden">
          {/* Top Champagne Gold Aurora Glow */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[130%] h-[120%] opacity-40 blur-3xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(196, 167, 125, 0.32) 0%, rgba(196, 167, 125, 0.12) 35%, rgba(10, 10, 10, 0.5) 70%, transparent 85%)'
            }}
          />
          {/* Soft White/Gold top focus spot */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-36 opacity-30 blur-2xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255, 255, 255, 0.15) 0%, rgba(196, 167, 125, 0.18) 40%, transparent 70%)'
            }}
          />
          {/* Top Edge Hairline Glow */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C4A77D]/50 to-transparent" />
        </div>

        {/* Textured Noise Filter Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* ── ROW 1: TAGLINE & DIRECT ACTION BAR ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-white/[0.08]">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-white/50 block mb-0.5">
                Move with confidence
              </span>
              <p className="text-xs text-white/70 font-sans tracking-wide">
                Autonomous Financial Sentiment & Quantitative Analytics Protocol
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSourcesModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-[#C4A77D]/40 text-xs font-mono text-white/80 hover:text-white transition-all backdrop-blur-md"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#C4A77D]" />
                <span>Sources (13 Direct)</span>
                <ArrowUpRight className="w-3 h-3 text-white/40" />
              </button>

              <button
                type="button"
                onClick={() => openContact('General Inquiry')}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C4A77D]/15 hover:bg-[#C4A77D]/25 border border-[#C4A77D]/40 text-xs font-mono text-[#C4A77D] hover:text-white transition-all shadow-lg shadow-[#C4A77D]/10 backdrop-blur-md"
              >
                <Mail className="w-3.5 h-3.5 text-[#C4A77D]" />
                <span>Contact Us</span>
              </button>
            </div>
          </div>

          {/* ── ROW 2: GRAND TYPOGRAPHIC CENTERPIECE (AIUC Inspired, 1-Page Height) ── */}
          <div className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              {/* Giant Serif Display Logo */}
              <div className="relative inline-block select-none">
                <h1 
                  className="font-serif text-white tracking-tight leading-none"
                  style={{
                    fontSize: 'clamp(3.2rem, 8.5vw, 6.8rem)',
                    fontFamily: "'Playfair Display', Georgia, serif",
                    letterSpacing: '-0.03em'
                  }}
                >
                  SENTIMENT<span className="text-[#C4A77D]">AI</span>
                  <sup 
                    className="text-white/60 font-sans ml-1 text-2xl md:text-3xl align-super inline-block -translate-y-2"
                    style={{ fontSize: '0.35em' }}
                  >
                    ©
                  </sup>
                </h1>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-mono text-white/50 tracking-wider">
                <span>NSE & BSE EQUITIES</span>
                <span className="text-[#C4A77D]/40">•</span>
                <span>F&O DERIVATIVES</span>
                <span className="text-[#C4A77D]/40">•</span>
                <span>38K+ MUTUAL FUNDS</span>
                <span className="text-[#C4A77D]/40">•</span>
                <span>QUANT INTELLIGENCE</span>
              </div>
            </div>

            {/* Circular Insignia Badge */}
            <div className="lg:col-span-4 flex items-center lg:justify-end">
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-md max-w-xs">
                <div className="w-10 h-10 rounded-full border border-[#C4A77D]/40 bg-[#C4A77D]/10 flex items-center justify-center shrink-0 text-[#C4A77D]">
                  <Globe2 className="w-5 h-5 animate-[spin_20s_linear_infinite]" />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-white/90 font-semibold">
                    SentimentAI Protocol
                  </div>
                  <div className="text-[10px] text-white/45 leading-relaxed mt-0.5">
                    Quantitative Financial Underwriting & Multi-Agent Intelligence Engine
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 3: COMPACT SOURCES DIRECTORY STRIP ── */}
          <div className="py-4 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-white/60">
              <ShieldCheck className="w-4 h-4 text-[#C4A77D]" />
              <span className="text-white font-medium">Transparency:</span>
              <span className="text-white/40 hidden sm:inline">Direct links to all data providers:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                { name: 'NSE', url: 'https://www.nseindia.com' },
                { name: 'BSE', url: 'https://www.bseindia.com' },
                { name: 'Yahoo Finance', url: 'https://finance.yahoo.com' },
                { name: 'AMFI (MF)', url: 'https://www.mfapi.in' },
                { name: 'TradingView', url: 'https://www.tradingview.com' },
                { name: 'IndianAPI', url: 'https://stock.indianapi.in' },
                { name: 'NVIDIA NIM', url: 'https://build.nvidia.com' },
                { name: 'Pyodide', url: 'https://pyodide.org' }
              ].map(s => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-[#C4A77D]/15 hover:text-[#C4A77D] text-white/70 border border-white/[0.06] hover:border-[#C4A77D]/30 transition-all inline-flex items-center gap-1 text-[11px]"
                >
                  <span>{s.name}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                </a>
              ))}

              <button
                type="button"
                onClick={() => setIsSourcesModalOpen(true)}
                className="text-[11px] text-[#C4A77D] hover:underline px-2 py-1 font-semibold"
              >
                +5 more
              </button>
            </div>
          </div>

          {/* ── ROW 4: BOTTOM ATTRIBUTION & COPYRIGHT (Made by Devansh Mehrotra) ── */}
          <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-white/40">
            <div>
              <span>&copy; {new Date().getFullYear()} SentimentAI Protocol. All rights reserved.</span>
              <span className="block text-[11px] text-white/30 mt-0.5">
                AI-generated market analytics. Not financial advice. Investments are subject to market risks.
              </span>
            </div>

            {/* PROMINENT ATTRIBUTION: Made by Devansh Mehrotra (Email is NOT revealed) */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 hover:border-[#C4A77D]/40 text-white/80 hover:text-white transition-all backdrop-blur-md">
              <span className="text-white/50">Made by</span>
              <span className="font-semibold text-white tracking-wide">Devansh Mehrotra</span>
              <button
                type="button"
                onClick={() => openContact('Note for Devansh')}
                className="ml-1 text-[#C4A77D] hover:text-[#d4c4a8]"
                title="Send a message to Devansh"
              >
                <Mail className="w-3.5 h-3.5 inline" />
              </button>
            </div>

            {/* Back to top button */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-1.5 text-white/50 hover:text-white transition-colors"
                title="Back to Top"
              >
                <span>Back to top</span>
                <ChevronUp className="w-3.5 h-3.5 text-[#C4A77D]" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ── SOURCES TRANSPARENCY MODAL (Shows all 13 sources without making footer long) ── */}
      {isSourcesModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div 
            className="relative w-full max-w-3xl max-h-[85vh] bg-[#070707] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gold bar */}
            <div className="h-1 bg-gradient-to-r from-transparent via-[#C4A77D] to-transparent shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C4A77D]/10 border border-[#C4A77D]/30 flex items-center justify-center text-[#C4A77D]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-wide text-white">
                    Data Sources & Transparency Directory
                  </h3>
                  <p className="text-xs text-white/50 font-mono">
                    All 13 verified direct data sources, exchanges & execution layers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSourcesModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar">
              {DATA_SOURCES.map((source) => (
                <div
                  key={source.name}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#C4A77D]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display font-semibold text-white text-sm">
                        {source.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-[#C4A77D] border border-[#C4A77D]/20">
                        {source.category}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed max-w-xl">
                      {source.role}
                    </p>
                  </div>

                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#C4A77D]/20 text-[#C4A77D] hover:text-white border border-white/[0.08] hover:border-[#C4A77D]/40 text-xs font-mono transition-all shrink-0 self-start sm:self-center"
                  >
                    <span>Visit Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-black/40 flex items-center justify-between text-xs font-mono text-white/40 shrink-0">
              <span>Verified Data Integrity Protocol</span>
              <button
                type="button"
                onClick={() => setIsSourcesModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#C4A77D] text-black font-semibold text-xs hover:bg-[#d4c4a8] transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Us Modal Window */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        defaultSubject={contactSubject}
      />
    </>
  );
};
