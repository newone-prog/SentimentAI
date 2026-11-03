import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ExternalLink, 
  Mail, 
  ShieldCheck, 
  Globe2, 
  ChevronUp
} from 'lucide-react';
import { ContactModal } from './ContactModal';

// ── Complete Data Sources Directory for Maximum Transparency ──
interface DataSourceItem {
  name: string;
  category: 'Equities & Derivatives' | 'Mutual Funds' | 'News & Sentiment' | 'AI & Execution';
  url: string;
  role: string;
  status: 'Live API' | 'Official Exchange' | 'Real-time Feed' | 'WASM Runtime';
}

const DATA_SOURCES: DataSourceItem[] = [
  // Equities & Derivatives
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

  // Mutual Funds
  {
    name: 'MF API (AMFI)',
    category: 'Mutual Funds',
    url: 'https://www.mfapi.in',
    role: 'All 38,000+ Indian mutual fund schemes: historical NAV, 1Y returns, and 3Y CAGRs.',
    status: 'Live API'
  },

  // News & Sentiment
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

  // AI & Execution
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
  const [showAllSources, setShowAllSources] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const openContact = (subject: string = 'General Inquiry') => {
    setContactSubject(subject);
    setIsContactOpen(true);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categories = ['All', 'Equities & Derivatives', 'Mutual Funds', 'News & Sentiment', 'AI & Execution'];

  const filteredSources = selectedCategory === 'All' 
    ? DATA_SOURCES 
    : DATA_SOURCES.filter(s => s.category === selectedCategory);

  return (
    <>
      <footer className="relative bg-[#020307] text-white overflow-hidden pt-24 pb-12 border-t border-white/[0.08]">
        {/* ── ATMOSPHERIC AURORA TOP MESH (Inspired by AIUC artwork) ── */}
        <div className="absolute top-0 left-0 right-0 h-96 pointer-events-none overflow-hidden">
          {/* Main Top Deep Indigo Aurora Gradient */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[120%] opacity-85 blur-3xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(37, 99, 235, 0.45) 0%, rgba(30, 58, 138, 0.3) 30%, rgba(15, 23, 42, 0.2) 60%, transparent 80%)'
            }}
          />
          {/* Subtle cyan accent glow at center-top */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-48 opacity-60 blur-2xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(56, 189, 248, 0.35) 0%, rgba(99, 102, 241, 0.2) 40%, transparent 70%)'
            }}
          />
          {/* Top Edge Hairline Glow */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 via-blue-500/50 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* ── ROW 1: TAGLINE & DIRECT LINKS BAR ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-12 border-b border-white/[0.08]">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-white/50 block mb-1">
                Move with confidence
              </span>
              <p className="text-sm text-white/70 font-sans tracking-wide">
                Autonomous Quantitative Sentiment & Financial Intelligence Protocol
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                13 Data Feeds Live
              </span>

              <button
                type="button"
                onClick={() => openContact('General Inquiry')}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-400 text-xs font-mono text-blue-300 hover:text-white transition-all shadow-lg shadow-blue-500/10"
              >
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>Contact Us</span>
              </button>

              <a
                href="https://www.stocksentimentai.app"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-white/60 hover:text-white transition-all"
              >
                <span>STOCKSENTIMENTAI.APP</span>
                <ArrowUpRight className="w-3 h-3 text-white/40" />
              </a>
            </div>
          </div>

          {/* ── ROW 2: GRAND TYPOGRAPHIC CENTERPIECE (AIUC Inspired) ── */}
          <div className="py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              {/* Giant Serif Display Logo */}
              <div className="relative inline-block select-none">
                <h1 
                  className="font-serif text-white tracking-tight leading-none"
                  style={{
                    fontSize: 'clamp(3.5rem, 9.5vw, 7.8rem)',
                    fontFamily: "'Playfair Display', Georgia, serif",
                    letterSpacing: '-0.03em'
                  }}
                >
                  SENTIMENT<span className="text-blue-400">AI</span>
                  <sup 
                    className="text-white/60 font-sans ml-1 text-2xl md:text-4xl align-super inline-block -translate-y-2"
                    style={{ fontSize: '0.35em' }}
                  >
                    ©
                  </sup>
                </h1>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-white/50 tracking-wider">
                <span>NSE / BSE EQUITY</span>
                <span className="text-white/20">•</span>
                <span>F&O DERIVATIVES</span>
                <span className="text-white/20">•</span>
                <span>38K+ MUTUAL FUNDS</span>
                <span className="text-white/20">•</span>
                <span>NVIDIA NEMOTRON 3</span>
              </div>
            </div>

            {/* Circular Insignia & Descriptor Badge */}
            <div className="lg:col-span-4 flex items-center lg:justify-end">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm max-w-sm">
                <div className="w-12 h-12 rounded-full border border-blue-500/40 bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-400">
                  <Globe2 className="w-6 h-6 animate-[spin_20s_linear_infinite]" />
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest text-white/80 font-semibold">
                    SentimentAI Protocol
                  </div>
                  <div className="text-[11px] text-white/45 leading-relaxed mt-0.5">
                    Quantitative Financial Underwriting & Multi-Agent Intelligence Architecture
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 3: LIST OF SOURCES (FULL TRANSPARENCY & DIRECT LINKS) ── */}
          <div className="py-12 border-t border-white/[0.08]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-mono uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Full Transparency Manifesto</span>
                </div>
                <h3 className="text-2xl font-display font-semibold text-white tracking-tight">
                  Data Sources & Integration Directory
                </h3>
                <p className="text-sm text-white/50 max-w-2xl mt-1">
                  We believe in 100% data auditability. Below is the verified list of direct external data feeds, official exchanges, and execution engines powering SentimentAI.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-medium'
                        : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Sources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(showAllSources ? filteredSources : filteredSources.slice(0, 6)).map((source) => (
                <a
                  key={source.name}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-white/60 border border-white/[0.05]">
                        {source.category}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {source.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-semibold text-white text-base group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                        <span>{source.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                      </h4>
                    </div>

                    <p className="text-xs text-white/50 mt-1.5 line-clamp-2 leading-relaxed">
                      {source.role}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-white/40 group-hover:text-blue-300 transition-colors">
                    <span className="truncate max-w-[220px]">{source.url.replace(/^https?:\/\//, '')}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  </div>
                </a>
              ))}
            </div>

            {/* Show More / Show Less Toggle */}
            {filteredSources.length > 6 && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllSources(!showAllSources)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-white/70 hover:text-white transition-all"
                >
                  <span>{showAllSources ? 'Show Less Sources' : `View All ${filteredSources.length} Direct Sources`}</span>
                  <ArrowUpRight className={`w-3.5 h-3.5 transition-transform ${showAllSources ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </div>

          {/* ── ROW 4: PLATFORM NAVIGATION COLUMNS ── */}
          <div className="py-12 border-t border-white/[0.08] grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Column 1: Platform */}
            <div>
              <h5 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/40 mb-4 font-semibold">
                Platform
              </h5>
              <ul className="space-y-2.5 text-xs font-mono">
                <li><a href="#analysis" className="text-white/60 hover:text-blue-400 transition-colors">Equity Radar & Analysis</a></li>
                <li><a href="#fno" className="text-white/60 hover:text-blue-400 transition-colors">F&O Options Chain Engine</a></li>
                <li><a href="#mf" className="text-white/60 hover:text-blue-400 transition-colors">Mutual Fund Screener (38K)</a></li>
                <li><a href="#terminal" className="text-white/60 hover:text-blue-400 transition-colors">Devil's Advocate Terminal</a></li>
                <li><a href="#backtest" className="text-white/60 hover:text-blue-400 transition-colors">Quantitative Backtester</a></li>
              </ul>
            </div>

            {/* Column 2: Architecture */}
            <div>
              <h5 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/40 mb-4 font-semibold">
                Architecture
              </h5>
              <ul className="space-y-2.5 text-xs font-mono">
                <li><span className="text-white/60">NVIDIA Nemotron 3 Ultra 550B</span></li>
                <li><span className="text-white/60">WASM Pyodide Python Kernel</span></li>
                <li><span className="text-white/60">Multi-Agent Orchestrator</span></li>
                <li><span className="text-white/60">Real-time Scraping Engine</span></li>
                <li><span className="text-white/60">FinBERT Sentiment Ensembles</span></li>
              </ul>
            </div>

            {/* Column 3: Transparency */}
            <div>
              <h5 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/40 mb-4 font-semibold">
                Transparency
              </h5>
              <ul className="space-y-2.5 text-xs font-mono">
                <li>
                  <a 
                    href="https://www.mfapi.in" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    <span>AMFI India Data</span>
                    <ArrowUpRight className="w-3 h-3 text-white/30" />
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.nseindia.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    <span>NSE India Exchange</span>
                    <ArrowUpRight className="w-3 h-3 text-white/30" />
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.tradingview.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    <span>TradingView Ratings</span>
                    <ArrowUpRight className="w-3 h-3 text-white/30" />
                  </a>
                </li>
                <li>
                  <a 
                    href="https://finance.yahoo.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    <span>Yahoo Finance Data</span>
                    <ArrowUpRight className="w-3 h-3 text-white/30" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Creator */}
            <div>
              <h5 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/40 mb-4 font-semibold">
                Contact & Developer
              </h5>
              <div className="space-y-3">
                <p className="text-xs text-white/60 leading-relaxed font-sans">
                  Have inquiries, feedback, or custom institutional integrations?
                </p>
                <button
                  type="button"
                  onClick={() => openContact('Institutional Integration')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs font-mono tracking-wider transition-all shadow-md shadow-blue-500/20"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact Us</span>
                </button>
                <div className="pt-1">
                  <a 
                    href="mailto:devanshmehrotra2190@gmail.com" 
                    className="text-[11px] font-mono text-blue-400 hover:text-blue-300 break-all block"
                  >
                    devanshmehrotra2190@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 5: BOTTOM ATTRIBUTION & COPYRIGHT (Made by Devansh Mehrotra) ── */}
          <div className="pt-8 border-t border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-white/40">
            <div>
              <span>&copy; {new Date().getFullYear()} SentimentAI Protocol. All rights reserved.</span>
              <span className="block text-[11px] text-white/30 mt-0.5">
                AI-generated intelligence. Not financial advice. Investments in securities are subject to market risks.
              </span>
            </div>

            {/* PROMINENT ATTRIBUTION: Made by Devansh Mehrotra */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 hover:border-blue-500/40 text-white/80 hover:text-white transition-all shadow-sm">
              <span className="text-white/50">Made by</span>
              <span className="font-semibold text-white tracking-wide">Devansh Mehrotra</span>
              <button
                type="button"
                onClick={() => openContact('Note for Devansh')}
                className="ml-1 text-blue-400 hover:text-blue-300"
                title="Send Devansh a message"
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
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Us Modal Window */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        defaultSubject={contactSubject}
      />
    </>
  );
};
