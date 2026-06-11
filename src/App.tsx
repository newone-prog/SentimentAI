import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  TrendingUp, TrendingDown, Search, ArrowRight, Newspaper,
  Activity, ChevronRight, Sparkles, Zap, Globe, BookOpen, X, FileText,
  ShieldAlert, AlertTriangle, LogIn, Loader2, ExternalLink, Tag
} from 'lucide-react';
import './App.css';
import { useAuth } from './lib/useAuth';
import { fetchStockData, fetchNewsAndSentiment, type StockData, type NewsItem, type SentimentAnalysis } from './lib/api';
import { Navigation } from './components/Navigation';
import { TerminalView } from './components/TerminalView';

gsap.registerPlugin(ScrollTrigger);

// Mock Data for Demo
const mockStockData: Record<string, StockData> = {
  'RELIANCE.NS': { name: 'Reliance Industries', price: 2950.45, change: 45.30, changePercent: 1.55, currency: 'INR', history: [], volume: [], avgVolume: 0 },
  'TCS.NS': { name: 'Tata Consultancy Services', price: 4120.80, change: -12.40, changePercent: -0.30, currency: 'INR', history: [], volume: [], avgVolume: 0 },
  'INFY.NS': { name: 'Infosys Limited', price: 1680.20, change: 15.60, changePercent: 0.94, currency: 'INR', history: [], volume: [], avgVolume: 0 },
  'HDFCBANK.NS': { name: 'HDFC Bank', price: 1530.10, change: 10.20, changePercent: 0.67, currency: 'INR', history: [], volume: [], avgVolume: 0 },
  'ICICIBANK.NS': { name: 'ICICI Bank', price: 1150.40, change: -5.30, changePercent: -0.46, currency: 'INR', history: [], volume: [], avgVolume: 0 },
  'SBIN.NS': { name: 'State Bank of India', price: 820.60, change: 12.40, changePercent: 1.53, currency: 'INR', history: [], volume: [], avgVolume: 0 }
};

// Grain Overlay
const GrainOverlay = () => <div className="grain-overlay" />;

// Animated Background Circles
const AnimatedBackground = () => {
  const circlesRef = useRef<HTMLDivElement[]>([]);
  useLayoutEffect(() => {
    circlesRef.current.forEach((circle, i) => {
      gsap.to(circle, {
        x: `random(-100, 100)`, y: `random(-100, 100)`,
        duration: 8 + i * 2, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
    });
  }, []);
  return (
    <div className="animated-bg">
      {[...Array(3)].map((_, i) => (
        <div key={i} ref={(el) => { if (el) circlesRef.current[i] = el; }} className="animated-circle"
          style={{ width: `${300 + i * 150}px`, height: `${300 + i * 150}px`, top: `${20 + i * 15}%`, left: `${10 + i * 25}%` }} />
      ))}
    </div>
  );
};

// Hero Section
const HeroSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.3 });
      tl.fromTo(titleRef.current, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' })
        .fromTo(subtitleRef.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
        .fromTo(ctaRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, '-=0.4');
      const scrollTl = gsap.timeline({ scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: '+=100%', pin: true, scrub: 0.5 } });
      scrollTl.fromTo([titleRef.current, subtitleRef.current, ctaRef.current], { y: 0, opacity: 1 }, { y: -50, opacity: 0, ease: 'power2.in' }, 0.7);
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const scrollToAnalysis = () => document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section ref={sectionRef} className="section-pinned bg-[#F5F1EB] z-10 flex items-center justify-center relative">
      <AnimatedBackground />
      <div className="text-center px-6 max-w-5xl mx-auto relative z-10">
        <div className="mb-6">
          <span className="section-label flex items-center justify-center gap-2">
            <Zap className="w-3 h-3" /> AI-Powered Market Intelligence
          </span>
        </div>
        <h1 ref={titleRef} className="hero-title mb-8">
          Analyze <span className="italic text-[#C4A77D]">Emotion</span><br />Predict Markets
        </h1>
        <p ref={subtitleRef} className="hero-subtitle max-w-2xl mx-auto mb-12">
          Harness the power of artificial intelligence to decode market sentiment. We analyze millions of data points to give you the edge in understanding stock movements before they happen.
        </p>
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={scrollToAnalysis} className="cta-button flex items-center gap-2">Start Analysis <ArrowRight className="w-4 h-4" /></button>
          <button className="cta-button cta-button-outline">Learn More</button>
        </div>
      </div>
    </section>
  );
};

// Search Section
const SearchSection = ({ onSearch }: { onSearch: (ticker: string) => void }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.search-content', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' } });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const fetchTickerFromName = async (query: string): Promise<string> => {
    try {
      const { getProxyUrl } = await import('./lib/api');
      const growwUrl = `https://groww.in/v1/api/search/v3/query/global/st_p_query?page=0&query=${encodeURIComponent(query)}&size=5&web=true`;
      const proxyGroww = getProxyUrl(growwUrl, 'groww');
      const res = await fetch(proxyGroww);
      let data: any = {};
      if (import.meta.env.DEV) data = await res.json(); else { const wrapperData = await res.json(); if (wrapperData?.contents) data = JSON.parse(wrapperData.contents); }
      const content = data?.data?.content || [];
      const stock = content.find((c: any) => c.entity_type === 'Stocks');
      if (stock) { if (stock.nse_scrip_code) return `${stock.nse_scrip_code}.NS`; if (stock.bse_scrip_code) return `${stock.bse_scrip_code}.BO`; }
    } catch (e) {}
    try {
      const { getProxyUrl } = await import('./lib/api');
      const rawUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=7&newsCount=0`;
      const proxyUrl = getProxyUrl(rawUrl, 'yahoo2');
      const response = await fetch(proxyUrl, { headers: { 'Accept': 'application/json' } });
      let data: any = {};
      if (import.meta.env.DEV) data = await response.json(); else { const wrapperData = await response.json(); if (wrapperData?.contents) data = JSON.parse(wrapperData.contents); }
      const quotes = data.quotes || [];
      if (quotes.length > 0) {
        const indianStock = quotes.find((q: any) => { if (!q.exchange || !q.symbol) return false; const ex = q.exchange.toUpperCase(), sym = q.symbol.toUpperCase(); return ex === 'NSE' || ex === 'BSE' || sym.endsWith('.NS') || sym.endsWith('.BO'); });
        if (indianStock) return indianStock.symbol;
        return quotes[0].symbol.includes('.') ? quotes[0].symbol : `${quotes[0].symbol}.NS`;
      }
    } catch (error) {}
    return `${query.trim().toUpperCase().replace(/\s+/g, '')}.NS`;
  };

  const handleAnalyze = async () => {
    if (!searchQuery) return;
    setIsAnalyzing(true);
    const resolvedTicker = await fetchTickerFromName(searchQuery);
    setIsAnalyzing(false);
    onSearch(resolvedTicker);
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section ref={sectionRef} id="analysis" className="section-flowing bg-[#F5F1EB] py-32 relative">
      <div className="search-content max-w-3xl mx-auto px-6 text-center">
        <span className="section-label mb-4 block">Enter Stock or Ticker</span>
        <h2 className="font-display text-4xl md:text-5xl mb-6 text-[#0A0A0A]">What are you analyzing today?</h2>
        <p className="text-[#6B6B6B] mb-12 max-w-xl mx-auto">Enter a company name or stock ticker to unlock real-time sentiment analysis powered by our advanced AI engine.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9A9A9A]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="e.g., RELIANCE, TCS, or Apple" className="input-elegant pl-14" />
          </div>
          <button onClick={handleAnalyze} disabled={isAnalyzing || !searchQuery} className="cta-button flex items-center gap-2 disabled:opacity-50">
            {isAnalyzing ? (<>Analyzing... <Loader2 className="w-4 h-4 animate-spin" /></>) : (<>Analyze <ChevronRight className="w-4 h-4" /></>)}
          </button>
        </div>
      </div>
    </section>
  );
};

// Price Action Section
const PriceActionSection = ({ stockData }: { stockData: StockData | null }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: sectionRef.current, start: 'top 60%' } });
      tl.fromTo('.price-metric', { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' })
        .fromTo('.chart-box', { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.4');
    }, sectionRef);
    return () => ctx.revert();
  }, [stockData]);

  if (!stockData) return null;
  const isPositive = stockData.change >= 0;
  const getCurrencySymbol = (currency: string) => ({ 'USD': '$', 'INR': '₹', 'EUR': '€', 'GBP': '£' })[currency] || `${currency} `;
  const sym = getCurrencySymbol(stockData.currency || 'USD');
  const chartPoints = stockData.history.length > 0 ? stockData.history : [stockData.price];
  const minPrice = Math.min(...chartPoints);
  const maxPrice = Math.max(...chartPoints);
  const range = maxPrice - minPrice || 1;
  const svgPath = chartPoints.map((price, i) => `${i === 0 ? 'M' : 'L'} ${(i / Math.max(chartPoints.length - 1, 1)) * 100} ${100 - ((price - minPrice) / range) * 80 - 10}`).join(' ');
  const areaPath = `${svgPath} L 100 100 L 0 100 Z`;

  return (
    <section ref={sectionRef} id="results" className="section-flowing bg-[#FAF8F5] py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <span className="section-label mb-4 block">Price Action</span>
          <h2 className="font-display text-4xl md:text-5xl text-[#0A0A0A]">Market Performance</h2>
          {stockData.isSynthetic === true && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 max-w-2xl">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Synthesized Demo Data</h4>
                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                  Live market data is currently unavailable for <strong>{stockData.name}</strong>. The charts and metrics shown are simulated for demonstration purposes. Please verify with actual market data before making any investment decisions.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="space-y-8">
            <div className="price-metric metric-card">
              <div className="metric-value">{sym}{stockData.price.toFixed(2)}</div>
              <div className="metric-label">Current Price ({stockData.currency})</div>
            </div>
            <div className="price-metric metric-card">
              <div className={`metric-value flex items-center gap-3 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                {isPositive ? '+' : ''}{stockData.changePercent.toFixed(2)}%
              </div>
              <div className="metric-label">24h Change</div>
            </div>
            {stockData.fiftyTwoWeekHigh && stockData.fiftyTwoWeekLow && (
              <div className="price-metric metric-card grid grid-cols-2 gap-4 border-t border-[#E5E0D8] pt-6 mt-6">
                <div><div className="text-xl font-display text-green-600">{sym}{stockData.fiftyTwoWeekHigh.toFixed(2)}</div><div className="metric-label text-xs uppercase">52W High</div></div>
                <div><div className="text-xl font-display text-red-600">{sym}{stockData.fiftyTwoWeekLow.toFixed(2)}</div><div className="metric-label text-xs uppercase">52W Low</div></div>
              </div>
            )}
          </div>
          <div className="chart-box lg:col-span-2 chart-container">
            <div className="relative h-64 md:h-80">
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <path d={areaPath} fill={isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'} />
                <path d={svgPath} fill="none" stroke={isPositive ? '#22C55E' : '#EF4444'} strokeWidth="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Market Narrative Section
const MarketNarrativeSection = ({ stockName, newsList }: { stockName: string; newsList: NewsItem[] }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.narrative-header', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: sectionRef.current, start: 'top 60%' } });
      if (newsList && newsList.length > 0) gsap.fromTo('.news-item-anim', { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.news-list', start: 'top 70%' } });
    }, sectionRef);
    return () => ctx.revert();
  }, [newsList]);

  const getBadgeClass = (category: string) => { switch (category) { case 'Positive': return 'badge-pos'; case 'Negative': return 'badge-neg'; default: return 'badge-neu'; } };

  return (
    <section ref={sectionRef} id="insights" className="section-flowing bg-[#F5F1EB] py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="narrative-header mb-16">
          <span className="section-label mb-4 block">Market Narrative</span>
          <h2 className="font-display text-4xl md:text-5xl text-[#0A0A0A] mb-6">The Story Behind {stockName}</h2>
          <p className="text-[#6B6B6B] max-w-2xl">Our AI scans thousands of news sources and social media feeds to understand the emotional pulse driving market movements.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <Newspaper className="w-5 h-5 text-[#C4A77D]" />
              <span className="font-medium text-[#0A0A0A]">Latest Headlines</span>
            </div>
            <div className="news-list space-y-3">
              {(!newsList || newsList.length === 0) ? (
                <div className="text-sm text-[#6B6B6B] italic py-12 border border-dashed border-[#E5E0D8] rounded-2xl text-center bg-white/30">
                  <Newspaper className="w-8 h-8 text-[#E5E0D8] mx-auto mb-3" /> Awaiting real-time intelligence stream for {stockName}...
                </div>
              ) : (newsList.slice(0, 10).map((news, index) => (
                <div key={index} className="news-item-anim news-card group">
                  <a href={news.url} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="news-card-inner">
                      <div className="news-card-index">{String(index + 1).padStart(2, '0')}</div>
                      <div className="news-card-body">
                        <h4 className="news-card-title">{news.title}</h4>
                        <div className="news-card-meta">
                          {news.source && (<span className="news-card-source"><Tag className="w-3 h-3" />{news.source}</span>)}
                          {news.emotion && (<span className="news-card-emotion">{news.emotion}</span>)}
                        </div>
                      </div>
                      <div className="news-card-right">
                        <span className={`news-badge ${getBadgeClass(news.category)}`}>{news.category}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#9A9A9A] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </a>
                </div>
              )))}
            </div>
          </div>
          <div className="lg:col-span-5 space-y-8"></div>
        </div>
      </div>
    </section>
  );
};

// Research Dialog
const ResearchDialog = ({ isOpen, onClose, researchPaper, stockName, source }: { isOpen: boolean; onClose: () => void; researchPaper: string; stockName: string; source: string }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const currentDragY = useRef(0);
  const isDragging = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (isOpen) { document.body.style.overflow = 'hidden'; document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`; }
    else { document.body.style.overflow = ''; document.body.style.paddingRight = ''; }
    return () => { document.body.style.overflow = ''; document.body.style.paddingRight = ''; };
  }, [isOpen]);
  useEffect(() => { if (!isOpen) return; const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); }; window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey); }, [isOpen, handleClose]);

  const handleTouchStart = (e: React.TouchEvent) => { if (!scrollRef.current) return; if (scrollRef.current.scrollTop > 0) return; dragStartY.current = e.touches[0].clientY; currentDragY.current = 0; isDragging.current = true; };
  const handleTouchMove = (e: React.TouchEvent) => { if (!isDragging.current) return; const delta = e.touches[0].clientY - dragStartY.current; if (delta > 0) { currentDragY.current = delta; if (dialogRef.current) { dialogRef.current.style.transform = `translateY(${delta}px)`; dialogRef.current.style.transition = 'none'; } if (overlayRef.current) overlayRef.current.style.background = `rgba(0, 0, 0, ${Math.max(0.1, 0.6 - delta / 400)})`; } };
  const handleTouchEnd = () => { if (!isDragging.current) return; isDragging.current = false; if (dialogRef.current) { dialogRef.current.style.transition = ''; dialogRef.current.style.transform = ''; } if (overlayRef.current) overlayRef.current.style.background = ''; if (currentDragY.current > 120) handleClose(); };

  if (!isOpen) return null;

  const renderPaper = (text: string) => {
    const sections = text.split(/={3}\s*/);
    return sections.filter(s => s.trim()).map((section, i) => {
      const lines = section.trim().split('\n');
      const title = lines[0].replace(/\s*={1,2}\s*/g, '').trim();
      const body = lines.slice(1).join('\n').trim();
      if (!title && !body) return null;
      return (<div key={i} className="research-section mb-6">{title && <h3 className="research-section-title">{title}</h3>}{body && body.split('\n').filter(Boolean).map((p, j) => (<p key={j} className="research-paragraph">{p.trim()}</p>))}</div>);
    });
  };

  return (
    <div ref={overlayRef} className="research-overlay" onClick={handleClose}>
      <div ref={dialogRef} className="research-dialog" onClick={e => e.stopPropagation()} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="research-dialog-handle" />
        <div className="research-dialog-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4A77D]/10 flex items-center justify-center"><FileText className="w-5 h-5 text-[#C4A77D]" /></div>
            <div><h2 className="text-lg font-display text-[#0A0A0A] leading-tight">{stockName}</h2><span className="text-xs text-[#6B6B6B] font-mono">Equity Research Report</span></div>
          </div>
          <button onClick={handleClose} className="research-close-btn" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="research-dialog-source"><Sparkles className="w-3 h-3 text-[#C4A77D]" /><span>AI Engine: {source}</span></div>
        <div ref={scrollRef} className="research-dialog-body">{renderPaper(researchPaper)}</div>
        <div className="research-dialog-footer">
          <p className="text-[10px] text-[#9A9A9A] font-mono uppercase tracking-wider leading-relaxed">AI-generated research. Data sourced from Yahoo Finance, TradingView Scanner, MarketStack, Indian Stock API, GNews & MediaStack APIs. Not financial advice. Invest at your own risk.</p>
        </div>
      </div>
    </div>
  );
};

const FinalVerdictSection = ({ stockName, sentimentStats, stockData }: { stockName: string; sentimentStats: SentimentAnalysis | null; stockData: StockData | null }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const [aiVerdict, setAiVerdict] = useState<"BULLISH" | "BEARISH" | "NEUTRAL">("NEUTRAL");
  const [verdictClass, setVerdictClass] = useState<"verdict-bullish" | "verdict-bearish" | "verdict-neutral">("verdict-neutral");
  const [isProcessing, setIsProcessing] = useState(true);
  const [llmAnalysis, setLlmAnalysis] = useState<{ reasoning: string; source: string; confidence: number; emotionalContext?: string; disclaimer?: string; researchPaper?: string } | null>(null);
  const [showResearch, setShowResearch] = useState(false);

  const truncateReasoning = (text: string, maxLines: number = 6): string => { const lines = text.split(/\.\s+/); if (lines.length <= maxLines) return text; return lines.slice(0, maxLines).join('. ') + '.'; };
  const reasoningText = llmAnalysis?.reasoning ? truncateReasoning(llmAnalysis.reasoning) : '';

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.verdict-content', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: sectionRef.current, start: 'top 60%' } });
      gsap.to(verdictRef.current, { scale: 1.02, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, sectionRef);
    return () => ctx.revert();
  }, [stockData, sentimentStats]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const computeAI = async () => {
      setIsProcessing(true);
      if (stockData) {
        try {
          const { analyzeStock } = await import('./brain/ensembleModel');
          const { getDeepAnalysis } = await import('./lib/llmService');
          const [ensembleSettled, deepSettled] = await Promise.allSettled([
            analyzeStock(stockData, sentimentStats),
            getDeepAnalysis(stockName, stockData, sentimentStats, controller.signal)
          ]);
          
          if (!mounted) return;

          const ensembleResult = ensembleSettled.status === 'fulfilled' ? ensembleSettled.value : { verdict: 'NEUTRAL' as const, verdictClass: 'verdict-neutral' as const, finalScore: 0, confidence: 0 };
          const deepResult = deepSettled.status === 'fulfilled' ? deepSettled.value : { reasoning: 'LLM analysis unavailable', verdict: 'NEUTRAL' as const, confidence: 0, source: 'Local Baseline Engine', emotionalContext: 'Disconnected', researchPaper: '', disclaimer: 'AI-generated analysis. Not financial advice.' };
          
          const llmIsFallback = deepResult.confidence <= 0 || deepResult.source === 'Local Baseline Engine';
          let verdict: "BULLISH" | "BEARISH" | "NEUTRAL";
          let vClass: "verdict-bullish" | "verdict-bearish" | "verdict-neutral";
          if (llmIsFallback) { verdict = ensembleResult.verdict; vClass = ensembleResult.verdictClass; }
          else if (deepResult.verdict === ensembleResult.verdict) { verdict = deepResult.verdict; vClass = `verdict-${verdict.toLowerCase()}` as any; }
          else if (ensembleResult.finalScore > 0.15 || ensembleResult.finalScore < -0.15) { verdict = ensembleResult.verdict; vClass = ensembleResult.verdictClass; }
          else { verdict = deepResult.verdict; vClass = `verdict-${verdict.toLowerCase()}` as any; }
          
          setAiVerdict(verdict); setVerdictClass(vClass);
          setLlmAnalysis({ reasoning: deepResult.reasoning, source: deepResult.source, confidence: Math.max(0, Math.min(100, deepResult.confidence)), emotionalContext: deepResult.emotionalContext, disclaimer: (deepResult as any).disclaimer, researchPaper: deepResult.researchPaper });
        } catch (error) {
          console.error('[App] computeAI error:', error);
        } finally {
          if (mounted) setIsProcessing(false);
        }
      } else { 
        if (mounted) setIsProcessing(false); 
      }
    };
    computeAI();
    return () => { 
      mounted = false; 
      controller.abort();
    };
  }, [stockData, sentimentStats, stockName]);

  const confidence = llmAnalysis?.confidence || 50;

  return (
    <section ref={sectionRef} className="section-flowing bg-[#0A0A0A] py-32 relative overflow-hidden">
      <div className="verdict-content max-w-4xl mx-auto px-6 text-center relative z-10">
        <span className="section-label mb-8 block text-[#C4A77D]">Deep Behavioral RAG Analysis</span>
        <div ref={verdictRef} className="verdict-box">
          <div className={`verdict-word ${verdictClass}`}>{aiVerdict}</div>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent mx-auto mb-4" />
          <div className="text-white/60 text-sm font-mono mb-8 uppercase tracking-[0.2em]">Behavioral Pulse: {llmAnalysis?.emotionalContext || 'Analyzing Crowds...'}</div>
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-[#C4A77D]/30 border-t-[#C4A77D] rounded-full animate-spin" /><p className="text-white/50 animate-pulse">Decoding Human Behavior & Trends...</p></div>
          ) : (<>
            <p className="text-white/90 text-lg md:text-xl font-medium mb-6 leading-relaxed italic">"{reasoningText}"</p>
            {llmAnalysis?.researchPaper && <button onClick={() => setShowResearch(true)} className="read-more-btn"><BookOpen className="w-4 h-4" />Read Full Research</button>}
            {llmAnalysis?.disclaimer && <p className="text-red-400/60 text-[10px] mt-4 mb-6 uppercase tracking-widest font-mono">⚠ {llmAnalysis.disclaimer}</p>}
            <div className="text-[#C4A77D] text-sm font-mono flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" />RAG Engine: {llmAnalysis?.source}</div>
          </>)}
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"><div className="text-3xl font-display text-[#C4A77D] mb-2">{sentimentStats?.globalFearGreed || 50}</div><div className="text-white/50 text-xs uppercase tracking-wider">Fear & Greed</div></div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"><div className="text-3xl font-display text-blue-400 mb-2">{sentimentStats?.socialHeat?.toFixed(0) || 0}%</div><div className="text-white/50 text-xs uppercase tracking-wider">Social Media Heat</div></div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"><div className="text-3xl font-display text-[#C4A77D] mb-2">{confidence.toFixed(0)}%</div><div className="text-white/50 text-xs uppercase tracking-wider">Model Confidence</div></div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"><div className="text-3xl font-display text-white mb-2">{sentimentStats?.analyzedData.length || 0}</div><div className="text-white/50 text-xs uppercase tracking-wider">Intel Nodes Scanned</div></div>
        </div>
      </div>
      {llmAnalysis?.researchPaper && <ResearchDialog isOpen={showResearch} onClose={() => setShowResearch(false)} researchPaper={llmAnalysis.researchPaper} stockName={stockName} source={llmAnalysis.source} />}
    </section>
  );
};

// Features Section
const FeaturesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => { gsap.fromTo('.feature-card', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.15, ease: 'power3.out', scrollTrigger: { trigger: sectionRef.current, start: 'top 60%' } }); }, sectionRef);
    return () => ctx.revert();
  }, []);
  const features = [
    { icon: <Sparkles className="w-6 h-6" />, title: 'AI Analysis', description: 'Advanced NLP to decode sentiment.' },
    { icon: <Globe className="w-6 h-6" />, title: 'Global Coverage', description: 'Real-time news monitoring.' },
    { icon: <Zap className="w-6 h-6" />, title: 'Instant Insights', description: 'Actionable market predictions.' },
    { icon: <Activity className="w-6 h-6" />, title: 'Trend Detection', description: 'Identify emerging behaviors.' },
  ];
  return (
    <section ref={sectionRef} id="features" className="section-flowing bg-[#FAF8F5] py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="feature-card bg-white rounded-2xl p-8 border border-[#E5E0D8] hover:border-[#C4A77D] hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-[#F5F1EB] rounded-xl flex items-center justify-center text-[#C4A77D] mb-6 group-hover:bg-[#C4A77D] group-hover:text-white transition-all">{f.icon}</div>
              <h3 className="font-heading text-xl text-[#0A0A0A] mb-3">{f.title}</h3>
              <p className="text-[#6B6B6B] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode; name: string }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error(`ErrorBoundary [${this.props.name}] caught error:`, error, errorInfo); }
  render() {
    if (this.state.hasError) return (<div className="py-20 text-center bg-red-500/5 border border-red-500/20 rounded-3xl mx-6"><AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" /><h3 className="text-white font-display text-xl mb-2">Section Interrupted</h3><p className="text-white/50 text-red-500/70 mx-auto mb-4">The {this.props.name} node encountered a fault. Rest of system remains active.</p></div>);
    return this.props.children;
  }
}

// Footer
const Footer = () => (
  <footer className="footer-creative">
    <div className="footer-creative-glow" />
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="footer-creative-top">
        <div className="footer-creative-brand">
          <div className="flex items-center gap-2 mb-4"><Sparkles className="w-6 h-6 text-[#C4A77D]" /><span className="font-display text-2xl text-white">SentimentAI</span></div>
          <p className="text-white/40 text-sm max-w-xs leading-relaxed">Decoding market emotion with AI. Real-time sentiment analysis for Indian equity markets.</p>
        </div>
        <div className="footer-creative-links">
          <div><h4 className="footer-creative-heading">Platform</h4><a href="#analysis" className="footer-creative-link">Dashboard</a><a href="#" className="footer-creative-link">Terminal</a><a href="#" className="footer-creative-link">API Docs</a></div>
          <div><h4 className="footer-creative-heading">Data Sources</h4><a href="#" className="footer-creative-link">Yahoo Finance</a><a href="#" className="footer-creative-link">TradingView</a><a href="#" className="footer-creative-link">MarketStack</a><a href="#" className="footer-creative-link">Indian Stock API</a></div>
          <div><h4 className="footer-creative-heading">Legal</h4><a href="#" className="footer-creative-link">Privacy Policy</a><a href="#" className="footer-creative-link">Terms of Service</a><a href="#" className="footer-creative-link">Disclaimer</a></div>
        </div>
      </div>
      <div className="footer-creative-divider" />
      <div className="footer-creative-bottom">
        <div className="footer-creative-stats">
          <div className="footer-stat-item"><span className="footer-stat-value">5</span><span className="footer-stat-label">Data Sources</span></div>
          <div className="footer-stat-dot" />
          <div className="footer-stat-item"><span className="footer-stat-value">3</span><span className="footer-stat-label">AI Models</span></div>
          <div className="footer-stat-dot" />
          <div className="footer-stat-item"><span className="footer-stat-value">NSE/BSE</span><span className="footer-stat-label">Markets</span></div>
          <div className="footer-stat-dot" />
          <div className="footer-stat-item"><span className="footer-stat-value">Real-time</span><span className="footer-stat-label">Analysis</span></div>
        </div>
        <p className="text-white/25 text-xs font-mono">&copy; 2026 SentimentAI. AI-generated insights. Not financial advice. Invest at your own risk.</p>
      </div>
    </div>
  </footer>
);

// ─── MAIN APP ───
function App() {
  const [view, setView] = useState<'main' | 'terminal'>('main');
  const [selectedTicker, setSelectedTicker] = useState('RELIANCE.NS');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [sentimentStats, setSentimentStats] = useState<SentimentAnalysis | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { user, loading: authLoading, isAuthenticated, login, logout } = useAuth();

  // FIX #1: Only fetch data if user is authenticated
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      if (!isAuthenticated) {
        setStockData(null);
        setSentimentStats(null);
        setIsDataLoading(false);
        return;
      }

      try {
        const fallbackName = mockStockData[selectedTicker]?.name || selectedTicker.split('.')[0];
        const sData = await fetchStockData(selectedTicker, fallbackName);
        setStockData(sData);
        const nData = await fetchNewsAndSentiment(selectedTicker, sData?.name);
        setSentimentStats(nData);
      } catch (error) {
        console.error('[App] loadData failed:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (!authLoading) loadData();
  }, [selectedTicker, isAuthenticated, authLoading]);

  return (
    <div className="relative">
      <GrainOverlay />
      <Navigation
        view={view}
        setView={setView}
        authLoading={authLoading}
        isAuthenticated={isAuthenticated}
        user={user}
        login={login}
        logout={logout}
      />
      <main>
        {view === 'main' ? (
          <>
            <ErrorBoundary name="Hero"><HeroSection /></ErrorBoundary>
            <ErrorBoundary name="Search"><SearchSection onSearch={setSelectedTicker} /></ErrorBoundary>
            {!isAuthenticated ? (
              <section className="section-flowing bg-[#F5F1EB] py-32 relative">
                <div className="max-w-lg mx-auto px-6 text-center">
                  <div className="auth-gate-card">
                    <div className="auth-gate-icon"><ShieldAlert className="w-8 h-8 text-[#C4A77D]" /></div>
                    <h3 className="font-display text-2xl mb-3 text-[#0A0A0A]">Sign In to Unlock Analysis</h3>
                    <p className="text-[#6B6B6B] text-sm mb-8 leading-relaxed">Connect with Google to access real-time AI-powered sentiment analysis, deep research reports, and market intelligence.</p>
                    <button className="auth-gate-btn" onClick={login}><LogIn className="w-4 h-4" />Sign In with Google</button>
                  </div>
                </div>
              </section>
            ) : isDataLoading ? (
              <div className="py-32 flex justify-center items-center"><div className="w-8 h-8 border-4 border-[#C4A77D] border-t-transparent rounded-full animate-spin" /></div>
            ) : !stockData ? (
              <div className="py-32 text-center">Data stream interrupted. Please try again.</div>
            ) : (
              <>
                <ErrorBoundary name="Market Performance"><PriceActionSection stockData={stockData} /></ErrorBoundary>
                <ErrorBoundary name="Market Narrative"><MarketNarrativeSection stockName={stockData.name} newsList={sentimentStats?.analyzedData || []} /></ErrorBoundary>
                <ErrorBoundary name="Final Verdict"><FinalVerdictSection stockName={stockData.name} sentimentStats={sentimentStats} stockData={stockData} /></ErrorBoundary>
              </>
            )}
          </>
        ) : (
          <ErrorBoundary name="Terminal"><TerminalView /></ErrorBoundary>
        )}
        <ErrorBoundary name="Features"><FeaturesSection /></ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

export default App;
