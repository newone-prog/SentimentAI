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
import { fetchStockData, fetchNewsAndSentiment, fetchLivePrice, searchMutualFunds, type StockData, type NewsItem, type SentimentAnalysis, type MutualFundDetails, type OptionsChainResponse } from './lib/api';
import { Navigation } from './components/Navigation';
import { TerminalView } from './components/TerminalView';
import { type DevilsAdvocateResponse } from './lib/terminalService';

gsap.registerPlugin(ScrollTrigger);

// Mock Data for Demo
const mockStockData: Record<string, StockData> = {
  'RELIANCE.NS': { name: 'Reliance Industries', price: 2950.45, change: 45.30, changePercent: 1.55, currency: 'INR', history: [], openHistory: [], highHistory: [], lowHistory: [], volume: [], avgVolume: 0 },
  'TCS.NS': { name: 'Tata Consultancy Services', price: 4120.80, change: -12.40, changePercent: -0.30, currency: 'INR', history: [], openHistory: [], highHistory: [], lowHistory: [], volume: [], avgVolume: 0 },
  'INFY.NS': { name: 'Infosys Limited', price: 1680.20, change: 15.60, changePercent: 0.94, currency: 'INR', history: [], openHistory: [], highHistory: [], lowHistory: [], volume: [], avgVolume: 0 },
  'HDFCBANK.NS': { name: 'HDFC Bank', price: 1530.10, change: 10.20, changePercent: 0.67, currency: 'INR', history: [], openHistory: [], highHistory: [], lowHistory: [], volume: [], avgVolume: 0 },
  'ICICIBANK.NS': { name: 'ICICI Bank', price: 1150.40, change: -5.30, changePercent: -0.46, currency: 'INR', history: [], openHistory: [], highHistory: [], lowHistory: [], volume: [], avgVolume: 0 },
  'SBIN.NS': { name: 'State Bank of India', price: 820.60, change: 12.40, changePercent: 1.53, currency: 'INR', history: [], openHistory: [], highHistory: [], lowHistory: [], volume: [], avgVolume: 0 }
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
const SearchSection = ({ 
  onSearch, 
  analysisMode, 
  setAnalysisMode,
  investorMode,
  setInvestorMode
}: { 
  onSearch: (t: string) => void, 
  analysisMode: 'INVESTOR' | 'TRADER',
  setAnalysisMode: (mode: 'INVESTOR' | 'TRADER') => void,
  investorMode: 'EQUITY' | 'MUTUAL_FUND',
  setInvestorMode: (mode: 'EQUITY' | 'MUTUAL_FUND') => void
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef<HTMLDivElement>(null);
  const mfSwitchRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (switchRef.current) {
      gsap.to(switchRef.current, {
        x: analysisMode === 'TRADER' ? '100%' : '0%',
        duration: 0.4,
        ease: 'power3.inOut'
      });
    }
  }, [analysisMode]);

  useEffect(() => {
    if (mfSwitchRef.current) {
      gsap.to(mfSwitchRef.current, {
        x: investorMode === 'MUTUAL_FUND' ? '100%' : '0%',
        duration: 0.4,
        ease: 'power3.inOut'
      });
    }
  }, [investorMode]);

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

  const handleAnalyze = async (overrideQuery?: string) => {
    const query = typeof overrideQuery === 'string' ? overrideQuery : searchQuery;
    if (!query) return;
    setIsAnalyzing(true);
    
    if (analysisMode === 'INVESTOR' && investorMode === 'MUTUAL_FUND') {
      const mfs = await searchMutualFunds(query);
      if (mfs && mfs.length > 0) {
        onSearch(mfs[0].id);
      } else {
        alert("Mutual fund not found!");
      }
    } else if (analysisMode === 'TRADER') {
      onSearch(query);
    } else {
      const resolvedTicker = await fetchTickerFromName(query);
      onSearch(resolvedTicker);
    }
    
    setIsAnalyzing(false);
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section ref={sectionRef} id="analysis" className="section-flowing bg-[#F5F1EB] py-16 relative">
      <div className="search-content max-w-3xl mx-auto px-6 text-center">
        <div className="mb-10 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-3">Select Mode</span>
          <div className="relative bg-[#EAE5DF] rounded-full p-1 w-64 h-12 flex items-center cursor-pointer shadow-inner border border-[#D5CFC6]"
               onClick={() => setAnalysisMode(analysisMode === 'INVESTOR' ? 'TRADER' : 'INVESTOR')}>
            <div 
              ref={switchRef}
              className="absolute left-1 w-[calc(50%-4px)] h-[40px] bg-white rounded-full shadow-md z-0" 
            />
            <div className={`relative z-10 w-1/2 text-center text-sm font-semibold transition-colors duration-300 ${analysisMode === 'INVESTOR' ? 'text-[#0A0A0A]' : 'text-[#6B6B6B]'}`}>
              Investor
            </div>
            <div className={`relative z-10 w-1/2 text-center text-sm font-semibold transition-colors duration-300 ${analysisMode === 'TRADER' ? 'text-[#0A0A0A]' : 'text-[#6B6B6B]'}`}>
              Trader
            </div>
          </div>
          
          {analysisMode === 'INVESTOR' && (
            <div className="mt-4 relative bg-[#F5F1EB] rounded-full p-1 w-56 h-10 flex items-center cursor-pointer shadow-sm border border-[#EAE5DF]"
                 onClick={() => setInvestorMode(investorMode === 'EQUITY' ? 'MUTUAL_FUND' : 'EQUITY')}>
              <div ref={mfSwitchRef} className="absolute left-1 w-[calc(50%-4px)] h-[32px] bg-white rounded-full shadow-sm z-0" />
              <div className={`relative z-10 w-1/2 text-center text-xs font-semibold transition-colors duration-300 ${investorMode === 'EQUITY' ? 'text-[#C4A77D]' : 'text-[#9A9A9A]'}`}>Equity</div>
              <div className={`relative z-10 w-1/2 text-center text-xs font-semibold transition-colors duration-300 ${investorMode === 'MUTUAL_FUND' ? 'text-[#C4A77D]' : 'text-[#9A9A9A]'}`}>Mutual Funds</div>
            </div>
          )}
        </div>

        <span className="section-label mb-4 block">
          {analysisMode === 'INVESTOR' ? 'Enter Stock, Ticker, or Fund' : 'Select Derivatives Index'}
        </span>
        <h2 className="font-display text-4xl md:text-5xl mb-6 text-[#0A0A0A]">
          {analysisMode === 'INVESTOR' ? 'What are you analyzing today?' : 'Algorithmic FnO Trading'}
        </h2>
        <p className="text-[#6B6B6B] mb-12 max-w-xl mx-auto">
          {analysisMode === 'INVESTOR' 
            ? "Unlock long-term structural value analysis using global macro trends and deeply reasoned fundamentals."
            : "Live Options Chain analysis with Black-Scholes Greeks, Put-Call Ratio (PCR), and Quantitative Derivatives Strategies."
          }
        </p>
        
        {analysisMode === 'INVESTOR' ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9A9A9A]" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder={investorMode === 'MUTUAL_FUND' ? "e.g., Parag Parikh Flexi Cap" : "e.g., RELIANCE, TCS, or Apple"} className="input-elegant pl-14" />
            </div>
            <button onClick={() => handleAnalyze()} disabled={isAnalyzing || !searchQuery} className="cta-button flex items-center gap-2 disabled:opacity-50">
              {isAnalyzing ? (<>Analyzing... <Loader2 className="w-4 h-4 animate-spin" /></>) : (<>Analyze <ChevronRight className="w-4 h-4" /></>)}
            </button>
          </div>
        ) : (
          <div className="flex flex-row items-center justify-center gap-4 flex-wrap max-w-2xl mx-auto">
            {['NIFTY', 'BANKNIFTY', 'FINNIFTY'].map((idx) => (
              <button key={idx} onClick={() => { setSearchQuery(idx); handleAnalyze(idx); }} disabled={isAnalyzing} className="px-8 py-4 bg-[#F5F1EB] border border-[#EAE5DF] text-[#0A0A0A] font-semibold rounded-full hover:bg-white hover:shadow-sm transition-all duration-300 disabled:opacity-50">
                {idx}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const OrbLoading = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-4">
    <div className="glass-pill">
      <div className="glowing-orb">
        <div className="glowing-orb-core"></div>
      </div>
      <span className="glass-pill-text">{text}</span>
    </div>
  </div>
);

// Price Action Section
const PriceActionSection = ({ stockData, mutualFundData, isLoading }: { stockData: StockData | null, mutualFundData?: MutualFundDetails | null, isLoading?: boolean }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'MAX'>('MAX');
  
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (!isLoading && stockData) {
        const tl = gsap.timeline({ scrollTrigger: { trigger: sectionRef.current, start: 'top 60%' } });
        tl.fromTo('.price-metric', { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' })
          .fromTo('.chart-box', { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.4');
      }
    }, sectionRef);
    return () => ctx.revert();
  }, [stockData, isLoading]);

  if (isLoading) {
    return (
      <section ref={sectionRef} className="section-flowing bg-[#FAF8F5] py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 animate-pulse">
            <div className="h-4 w-32 bg-[#E5E0D8] rounded mb-4"></div>
            <div className="h-12 w-64 bg-[#E5E0D8] rounded"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="space-y-8 animate-pulse">
              <div className="h-32 bg-[#E5E0D8] rounded-2xl"></div>
              <div className="h-32 bg-[#E5E0D8] rounded-2xl"></div>
              <div className="h-24 bg-[#E5E0D8] rounded-2xl"></div>
            </div>
            <div className="lg:col-span-2 chart-box h-[400px] bg-gradient-to-br from-[#F5F1EB] to-[#EAE5DF] rounded-2xl border border-black/5 flex items-center justify-center">
              <OrbLoading text="Analyzing Price Action..." />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!stockData) return null;
  const getCurrencySymbol = (currency: string) => ({ 'USD': '$', 'INR': '₹', 'EUR': '€', 'GBP': '£' })[currency] || `${currency} `;
  const sym = getCurrencySymbol(stockData.currency || 'USD');
  const getTimeframeDays = (tf: string) => {
    switch (tf) {
      case '1M': return 21;
      case '3M': return 63;
      case '6M': return 126;
      case '1Y': return 252;
      case '3Y': return 756;
      case '5Y': return 1260;
      default: return stockData.history.length;
    }
  };

  const days = getTimeframeDays(timeframe);
  const rawPoints = stockData.history.length > 0 ? stockData.history.slice(-days) : [stockData.price];
  const chartPoints = rawPoints.length > 0 ? rawPoints : [stockData.price];
  
  const startPrice = chartPoints[0];
  const endPrice = chartPoints[chartPoints.length - 1];
  const dynamicChange = endPrice - startPrice;
  const dynamicChangePercent = startPrice !== 0 ? (dynamicChange / startPrice) * 100 : 0;
  
  let displayChangePercent = stockData.changePercent;
  let isCAGR = false;
  if (mutualFundData && mutualFundData.returns) {
    const r = mutualFundData.returns;
    switch (timeframe) {
      case '1M': displayChangePercent = r.return1m ?? dynamicChangePercent; break;
      case '3M': displayChangePercent = r.return3m ?? dynamicChangePercent; break;
      case '6M': displayChangePercent = r.return6m ?? dynamicChangePercent; break;
      case '1Y': displayChangePercent = r.return1y ?? dynamicChangePercent; isCAGR = true; break;
      case '3Y': displayChangePercent = r.return3y ?? dynamicChangePercent; isCAGR = true; break;
      case '5Y': displayChangePercent = r.return5y ?? dynamicChangePercent; isCAGR = true; break;
      case 'MAX': displayChangePercent = r.return_since_created ?? dynamicChangePercent; isCAGR = true; break;
    }
  }

  const isPositive = displayChangePercent >= 0;
  
  const timeframeLabel = timeframe === 'MAX' ? 'All Time' : timeframe;
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
                {isPositive ? '+' : ''}{displayChangePercent.toFixed(2)}%
              </div>
              <div className="metric-label">{mutualFundData ? `${timeframeLabel} Return ${isCAGR ? '(CAGR)' : ''}` : '24h Return'}</div>
            </div>
            {stockData.fiftyTwoWeekHigh && stockData.fiftyTwoWeekLow && (
              <div className="price-metric metric-card grid grid-cols-2 gap-4 border-t border-[#E5E0D8] pt-6 mt-6">
                <div><div className="text-xl font-display text-green-600">{sym}{stockData.fiftyTwoWeekHigh.toFixed(2)}</div><div className="metric-label text-xs uppercase">52W High</div></div>
                <div><div className="text-xl font-display text-red-600">{sym}{stockData.fiftyTwoWeekLow.toFixed(2)}</div><div className="metric-label text-xs uppercase">52W Low</div></div>
              </div>
            )}
          </div>
          <div className="chart-box lg:col-span-2 chart-container flex flex-col">
            {mutualFundData && (
              <div className="flex flex-wrap gap-2 mb-4 justify-end">
                {(['1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      timeframe === tf 
                        ? 'bg-[#C4A77D] text-black font-semibold' 
                        : 'bg-black/5 text-[#6B6B6B] hover:bg-black/10'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}
            <div className="relative h-64 md:h-80 w-full mt-auto">
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
const MarketNarrativeSection = ({ stockName, newsList, isLoading }: { stockName?: string; newsList?: NewsItem[], isLoading?: boolean }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (!isLoading) {
        gsap.fromTo('.narrative-header', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: sectionRef.current, start: 'top 60%' } });
        if (newsList && newsList.length > 0) gsap.fromTo('.news-item-anim', { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.news-list', start: 'top 70%' } });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, [newsList, isLoading]);

  if (isLoading) {
    return (
      <section ref={sectionRef} className="section-flowing bg-white py-32 border-y border-[#E5E0D8]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 animate-pulse">
            <div className="h-4 w-32 bg-[#F5F1EB] rounded mb-4"></div>
            <div className="h-12 w-64 bg-[#F5F1EB] rounded"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 space-y-4 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-[#F5F1EB] rounded-2xl"></div>
              ))}
            </div>
            <div className="lg:col-span-5 h-[400px] bg-gradient-to-br from-[#F5F1EB] to-[#EAE5DF] rounded-2xl flex items-center justify-center">
               <OrbLoading text="Scanning Global Narratives..." />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!newsList || newsList.length === 0) return null;

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

  const renderPaper = (text: any) => {
    let processText = typeof text === 'string' ? text : '';
    if (typeof text === 'object' && text !== null) {
      if (Array.isArray(text)) {
        processText = text.join('\n\n');
      } else {
        processText = Object.entries(text).map(([k, v]) => `### ${k}\n${v}`).join('\n\n');
      }
    } else if (typeof text !== 'string') {
      processText = String(text || '');
    }
    
    const splitRegex = processText.includes('###') ? /(?:^|\n)###\s+/ : /={3}\s*/;
    const sections = processText.split(splitRegex);
    return sections.filter(s => s.trim()).map((section, i) => {
      const lines = section.trim().split('\n');
      let title = lines[0].replace(/\s*={1,3}\s*/g, '').trim();
      title = title.replace(/\*\*/g, ''); // Remove bold asterisks from title
      const body = lines.slice(1).join('\n').trim();
      if (!title && !body) return null;
      return (
        <div key={i} className="research-section mb-6">
          {title && <h3 className="research-section-title font-bold text-[#0A0A0A]">{title}</h3>}
          {body && body.split('\n').filter(Boolean).map((p, j) => {
            const parts = p.trim().split(/(\*\*.*?\*\*)/g);
            return (
              <p key={j} className="research-paragraph">
                {parts.map((part, k) => part.startsWith('**') && part.endsWith('**') ? <strong key={k} className="font-bold text-[#0A0A0A]">{part.slice(2, -2)}</strong> : part)}
              </p>
            );
          })}
        </div>
      );
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


const FinalVerdictSection = ({ ticker, stockName, sentimentStats, stockData, analysisMode, mutualFundData, optionsChainData, onOpenTerminal, setDaCache }: { ticker: string; stockName: string; sentimentStats: SentimentAnalysis | null; stockData: StockData | null; analysisMode: 'INVESTOR' | 'TRADER' | 'MUTUAL_FUND'; mutualFundData?: MutualFundDetails; optionsChainData?: OptionsChainResponse | null; onOpenTerminal: (q: string) => void; setDaCache: (da: DevilsAdvocateResponse | null) => void; }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const [aiVerdict, setAiVerdict] = useState<"BULLISH" | "BEARISH" | "NEUTRAL" | "SIDEWAYS">("NEUTRAL");
  const [verdictClass, setVerdictClass] = useState<"verdict-bullish" | "verdict-bearish" | "verdict-neutral" | "verdict-sideways">("verdict-neutral");
  const [isProcessing, setIsProcessing] = useState(true);
  const [llmAnalysis, setLlmAnalysis] = useState<{ reasoning: string; source: string; confidence: number; emotionalContext?: string; disclaimer?: string; researchPaper?: string; optionSignals?: any[] } | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [daGlimpse, setDaGlimpse] = useState<string>("");

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
      if (!stockData || !sentimentStats) return;
      setIsProcessing(true);
      try {
        if (analysisMode === 'TRADER') {
            const { TraderOrchestratorService } = await import('./lib/orchestrator/TraderOrchestratorService');
            const onProgress = () => {};
            const result = await TraderOrchestratorService.executeAlgorithmicTradeAnalysis(ticker, stockName, onProgress, optionsChainData);
            
            if (!mounted) return;
            
            const verdict = (result?.data?.verdict || 'NEUTRAL').replace(/\s+/g, '_');
            setAiVerdict(verdict as any);
            setVerdictClass(`verdict-${verdict.toLowerCase()}` as any);
            
            setLlmAnalysis({
              reasoning: result?.data?.reasoning || 'Trader analysis complete.',
              source: 'Algorithmic Trading Orchestrator',
              confidence: result?.data?.confidence || 90,
              emotionalContext: result?.data?.emotionalContext || 'Technical Analysis Mode',
              researchPaper: result?.data?.researchPaper || '',
              disclaimer: 'Algorithmic analysis. Not financial advice.',
              optionSignals: result?.data?.optionSignals || []
            });
          } else {
            const { analyzeStock } = await import('./brain/ensembleModel');
            const { getAgenticParallelAnalysis } = await import('./lib/llmService');
            const [ensembleSettled, deepSettled] = await Promise.allSettled([
              analyzeStock(stockData, sentimentStats),
              getAgenticParallelAnalysis(stockName, stockData, sentimentStats, undefined, mutualFundData)
            ]);
            
            if (!mounted) return;

            const ensembleResult = ensembleSettled.status === 'fulfilled' ? ensembleSettled.value : { verdict: 'NEUTRAL' as const, verdictClass: 'verdict-neutral' as const, finalScore: 0, confidence: 0 };
            const deepResult = deepSettled.status === 'fulfilled' ? deepSettled.value.research : { reasoning: 'LLM analysis unavailable', verdict: 'NEUTRAL' as const, confidence: 0, source: 'Local Baseline Engine', emotionalContext: 'Disconnected', researchPaper: '', disclaimer: 'AI-generated analysis. Not financial advice.' };
            
            if (deepSettled.status === 'fulfilled' && deepSettled.value.devilsAdvocate) {
                setDaGlimpse(deepSettled.value.devilsAdvocate.bearishSummary);
                setDaCache(deepSettled.value.devilsAdvocate);
            }
            
            const llmIsFallback = deepResult.confidence <= 0 || deepResult.source === 'Local Baseline Engine';
            let verdict: "BULLISH" | "BEARISH" | "NEUTRAL" | "SIDEWAYS";
            let vClass: "verdict-bullish" | "verdict-bearish" | "verdict-neutral" | "verdict-sideways";
            if (llmIsFallback) { verdict = ensembleResult.verdict; vClass = ensembleResult.verdictClass; }
            else { verdict = deepResult.verdict; vClass = `verdict-${verdict.toLowerCase()}` as any; }
            
            setAiVerdict(verdict); setVerdictClass(vClass);
            setLlmAnalysis({ reasoning: deepResult.reasoning, source: deepResult.source || "Agentic Web Scraper", confidence: Math.max(0, Math.min(100, deepResult.confidence)), emotionalContext: deepResult.emotionalContext, disclaimer: (deepResult as any).disclaimer, researchPaper: deepResult.researchPaper });
          }
        } catch (error) {
          console.error('[App] computeAI error:', error);
        } finally {
          if (mounted) setIsProcessing(false);
        }
    };
    computeAI();
    return () => { 
      mounted = false; 
      controller.abort();
    };
    // Exclude stockData to prevent infinite loop on real-time price ticks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentimentStats, stockName, analysisMode]);

  const confidence = Number(llmAnalysis?.confidence) || 50;

  return (
    <section ref={sectionRef} className="section-flowing bg-[#0A0A0A] py-32 relative overflow-hidden">
      <div className="verdict-content max-w-4xl mx-auto px-6 text-center relative z-10">
        <span className="section-label mb-8 block text-[#C4A77D]">Deep Behavioral RAG Analysis</span>
        <div ref={verdictRef} className="verdict-box">
          <div className={`verdict-word ${verdictClass}`}>{aiVerdict}</div>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent mx-auto mb-4" />
          <div className="text-white/60 text-sm font-mono mb-8 uppercase tracking-[0.2em]">Behavioral Pulse: {llmAnalysis?.emotionalContext || 'Analyzing Crowds...'}</div>
          {isProcessing ? (
            <OrbLoading text="Decoding Human Behavior & Trends..." />
          ) : (<>
            <p className="text-white/90 text-lg md:text-xl font-medium mb-6 leading-relaxed italic">"{reasoningText}"</p>
            {llmAnalysis?.researchPaper && <button onClick={() => setShowResearch(true)} className="read-more-btn"><BookOpen className="w-4 h-4" />Read Full Research</button>}
            {llmAnalysis?.disclaimer && <p className="text-red-400/60 text-[10px] mt-4 mb-6 uppercase tracking-widest font-mono">⚠ {llmAnalysis.disclaimer}</p>}
            <div className="text-[#C4A77D] text-sm font-mono flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" />RAG Engine: {llmAnalysis?.source}</div>
            
            {/* Options Signals Carousel */}
            {analysisMode === 'TRADER' && llmAnalysis?.optionSignals && llmAnalysis.optionSignals.length > 0 && (
              <div className="mt-12 w-full text-left">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-green-400" />
                  <h4 className="text-white/90 font-display text-lg">AI Option Signals</h4>
                </div>
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 hide-scrollbar">
                  {llmAnalysis.optionSignals.map((sig, idx) => (
                    <div key={idx} className="snap-center shrink-0 w-80 md:w-96 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold font-mono tracking-wider ${sig.type.includes('BUY') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {sig.type}
                          </span>
                          <span className="ml-2 inline-block px-2 py-1 rounded text-xs font-mono bg-blue-500/20 text-blue-400">
                            {sig.moneyness}
                          </span>
                        </div>
                        <div className="text-xl font-mono text-white">{sig.strike}</div>
                      </div>
                      <p className="text-sm text-white/70 italic mb-4 line-clamp-3">"{sig.rationale}"</p>
                      <div className="grid grid-cols-3 gap-2 mb-4 text-center font-mono text-xs">
                        <div className="bg-white/5 p-2 rounded">
                          <div className="text-white/40 mb-1">ENTRY</div>
                          <div className="text-white">₹{sig.entry}</div>
                        </div>
                        <div className="bg-red-500/10 p-2 rounded border border-red-500/20">
                          <div className="text-red-400/60 mb-1">SL</div>
                          <div className="text-red-400">₹{sig.stopLoss}</div>
                        </div>
                        <div className="bg-green-500/10 p-2 rounded border border-green-500/20">
                          <div className="text-green-400/60 mb-1">TARGET</div>
                          <div className="text-green-400">₹{sig.takeProfit}</div>
                        </div>
                      </div>
                      {sig.greeks && (
                        <div className="border-t border-white/10 pt-3 flex justify-between text-[10px] font-mono text-white/50 uppercase">
                          <span>Δ: {sig.greeks.delta}</span>
                          <span className={sig.greeks.gamma > 0.05 ? 'text-yellow-400' : ''}>Γ: {sig.greeks.gamma}</span>
                          <span className="text-red-400">Θ: {sig.greeks.theta}</span>
                          <span>V: {sig.greeks.vega}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Devil's Advocate Glimpse */}
            <div className="mt-12 pt-8 border-t border-white/10 text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  <h4 className="text-white/80 font-display text-lg">Devil's Advocate</h4>
                </div>
                <button 
                  onClick={() => onOpenTerminal(`Analyze the downside risks and bear case for ${stockName}`)}
                  className="px-4 py-2 bg-red-950/30 text-red-400 border border-red-900/50 rounded-lg hover:bg-red-900/50 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest flex items-center gap-2 group whitespace-nowrap"
                >
                  <Activity className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  View Deep Analysis in Terminal
                </button>
              </div>
              <p className="text-white/50 text-sm font-mono leading-relaxed border-l-2 border-red-500/30 pl-4 italic">
                "{daGlimpse || `Our independent red-team engine has scanned for structural weaknesses, hidden institutional offloading, and structural breakdown scenarios for ${stockName}...`}"
              </p>
            </div>
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

const OptionsChainSection = ({ optionsChainData }: { optionsChainData: OptionsChainResponse | null }) => {
  if (!optionsChainData || !optionsChainData.chain) return null;

  return (
    <section className="py-20 bg-white border-t border-[#EAE5DF]">
      <div className="max-w-7xl mx-auto px-6">
        <h3 className="text-2xl font-display mb-6">FnO Options Chain</h3>
        
        <div className="flex gap-8 mb-8 text-sm">
          <div className="bg-[#F5F1EB] p-4 rounded-xl border border-[#EAE5DF]">
            <div className="text-[#6B6B6B] mb-1">Underlying Spot</div>
            <div className="font-mono text-xl">{optionsChainData.underlying}</div>
          </div>
          <div className="bg-[#F5F1EB] p-4 rounded-xl border border-[#EAE5DF]">
            <div className="text-[#6B6B6B] mb-1">Put-Call Ratio (PCR)</div>
            <div className={`font-mono text-xl ${optionsChainData.pcr > 1.2 ? 'text-green-600' : optionsChainData.pcr < 0.8 ? 'text-red-600' : ''}`}>
              {optionsChainData.pcr.toFixed(2)}
            </div>
          </div>
          <div className="bg-[#F5F1EB] p-4 rounded-xl border border-[#EAE5DF]">
            <div className="text-[#6B6B6B] mb-1">Expiry Date</div>
            <div className="font-mono text-xl">{optionsChainData.expiryDate}</div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#EAE5DF]">
          <table className="w-full text-sm font-mono text-right border-collapse">
            <thead>
              <tr className="bg-[#F5F1EB] text-[#6B6B6B]">
                <th className="p-3 border-r border-[#EAE5DF]" colSpan={8}>CALLS (CE)</th>
                <th className="p-3 border-r border-[#EAE5DF] text-center" rowSpan={2}>STRIKE</th>
                <th className="p-3" colSpan={8}>PUTS (PE)</th>
              </tr>
              <tr className="bg-white text-[#6B6B6B] text-xs">
                <th className="p-2 border-r border-[#EAE5DF] border-b">Rho</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">Vega</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">Theta</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">Gamma</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">Delta</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">OI</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">IV</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">LTP</th>
                
                <th className="p-2 border-r border-[#EAE5DF] border-b">LTP</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">IV</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">OI</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">Delta</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">Gamma</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">Theta</th>
                <th className="p-2 border-r border-[#EAE5DF] border-b">Vega</th>
                <th className="p-2 border-b border-[#EAE5DF]">Rho</th>
              </tr>
            </thead>
            <tbody>
              {optionsChainData.chain.map((row: any) => {
                const ce = row.CE;
                const pe = row.PE;
                return (
                  <tr key={row.strikePrice} className={`border-b border-[#EAE5DF] hover:bg-[#F5F1EB] transition-colors ${row.isATM ? 'bg-[#FDF8EC] font-bold' : ''}`}>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice < optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{ce?.greeks.rho.toFixed(2) || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice < optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{ce?.greeks.vega.toFixed(2) || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice < optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{ce?.greeks.theta.toFixed(2) || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice < optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{ce?.greeks.gamma.toFixed(4) || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice < optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{ce?.greeks.delta.toFixed(2) || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice < optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{ce?.oi || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice < optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{ce?.iv ? ce.iv.toFixed(1) : '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] font-bold ${row.strikePrice < optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{ce?.ltp || '-'}</td>
                    
                    <td className="p-2 border-r border-[#EAE5DF] text-center bg-[#F5F1EB] text-black">
                      {row.isATM ? <span className="px-2 py-0.5 bg-yellow-200 rounded text-xs mr-2">ATM</span> : null} 
                      {row.strikePrice}
                    </td>

                    <td className={`p-2 border-r border-[#EAE5DF] font-bold ${row.strikePrice > optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{pe?.ltp || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice > optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{pe?.iv ? pe.iv.toFixed(1) : '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice > optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{pe?.oi || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice > optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{pe?.greeks.delta.toFixed(2) || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice > optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{pe?.greeks.gamma.toFixed(4) || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice > optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{pe?.greeks.theta.toFixed(2) || '-'}</td>
                    <td className={`p-2 border-r border-[#EAE5DF] ${row.strikePrice > optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{pe?.greeks.vega.toFixed(2) || '-'}</td>
                    <td className={`p-2 ${row.strikePrice > optionsChainData.underlying ? 'bg-yellow-50/50' : ''}`}>{pe?.greeks.rho.toFixed(2) || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
  const [terminalInitialQuery, setTerminalInitialQuery] = useState<string>('');
  const [analysisMode, setAnalysisMode] = useState<'INVESTOR' | 'TRADER'>('INVESTOR');
  const [investorMode, setInvestorMode] = useState<'EQUITY' | 'MUTUAL_FUND'>('EQUITY');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [mutualFundData, setMutualFundData] = useState<MutualFundDetails | null>(null);
  const [mutualFundHistory, setMutualFundHistory] = useState<number[]>([]);
  const [sentimentStats, setSentimentStats] = useState<SentimentAnalysis | null>(null);
  const [optionsChainData, setOptionsChainData] = useState<OptionsChainResponse | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [daCache, setDaCache] = useState<DevilsAdvocateResponse | null>(null);
  const { user, loading: authLoading, isAuthenticated, login, logout } = useAuth();

  // FIX #1: Only fetch data if user is authenticated
  useEffect(() => {
    const loadData = async () => {
      if (!selectedTicker) return;
      setIsDataLoading(true);
      setStockData(null);
      setMutualFundData(null);
      setSentimentStats(null);
      setOptionsChainData(null);
      setDaCache(null);
      
      if (!isAuthenticated) {
        setIsDataLoading(false);
        return;
      }

      try {
        if (investorMode === 'MUTUAL_FUND') {
          const { fetchMutualFundDetails, fetchMutualFundNews, fetchMutualFundHistory } = await import('./lib/api');
          const mData = await fetchMutualFundDetails(selectedTicker);
          setMutualFundData(mData);
          if (mData) {
             const [nData, hData] = await Promise.all([
               fetchMutualFundNews(mData.schemeName),
               mData.schemeCode ? fetchMutualFundHistory(mData.schemeCode) : Promise.resolve([])
             ]);
             setSentimentStats(nData);
             setMutualFundHistory(hData);
          }
        } else {
          const fallbackName = mockStockData[selectedTicker]?.name || selectedTicker.split('.')[0];
          const sData = await fetchStockData(selectedTicker, fallbackName);
          setStockData(sData);
          const nData = await fetchNewsAndSentiment(selectedTicker, sData?.name);
          setSentimentStats(nData);

          if (analysisMode === 'TRADER' && ['NIFTY', 'BANKNIFTY', 'FINNIFTY'].includes(selectedTicker)) {
            const { fetchOptionsChain } = await import('./lib/api');
            const chainData = await fetchOptionsChain(selectedTicker);
            setOptionsChainData(chainData);
          }
        }
      } catch (error) {
        console.error('[App] loadData failed:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (!authLoading) loadData();
  }, [selectedTicker, isAuthenticated, authLoading]);

  // FIX #2: Poll for real-time tick-by-tick prices (only for Equity)
  useEffect(() => {
    if (!selectedTicker || isDataLoading || !stockData || !isAuthenticated || investorMode === 'MUTUAL_FUND') return;

    const intervalId = setInterval(async () => {
      try {
        const liveData = await fetchLivePrice(selectedTicker);
        if (liveData) {
          setStockData(prev => {
            if (!prev) return prev;
            if (prev.price === liveData.price && prev.change === liveData.change) return prev;
            return {
              ...prev,
              price: liveData.price,
              change: liveData.change,
              changePercent: liveData.changePercent,
            };
          });
        }
      } catch (e) {
        // silent fail on polling
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [selectedTicker, isDataLoading, stockData?.name, isAuthenticated]);

  let mfMockStockData: StockData | null = null;
  if (investorMode === 'MUTUAL_FUND' && mutualFundData) {
    const hasHistory = mutualFundHistory && mutualFundHistory.length > 1;
    mfMockStockData = {
      name: mutualFundData.schemeName,
      price: mutualFundData.nav,
      change: mutualFundData.nav * (mutualFundData.returns?.return1y || 0) / 100,
      changePercent: mutualFundData.returns?.return1y || 0,
      currency: 'INR',
      history: hasHistory ? mutualFundHistory : [mutualFundData.nav * 0.8, mutualFundData.nav * 0.9, mutualFundData.nav * 0.85, mutualFundData.nav * 1.05, mutualFundData.nav],
      openHistory: hasHistory ? mutualFundHistory : [mutualFundData.nav * 0.8, mutualFundData.nav * 0.9, mutualFundData.nav * 0.85, mutualFundData.nav * 1.05, mutualFundData.nav],
      highHistory: hasHistory ? mutualFundHistory : [mutualFundData.nav * 0.8, mutualFundData.nav * 0.9, mutualFundData.nav * 0.85, mutualFundData.nav * 1.05, mutualFundData.nav],
      lowHistory: hasHistory ? mutualFundHistory : [mutualFundData.nav * 0.8, mutualFundData.nav * 0.9, mutualFundData.nav * 0.85, mutualFundData.nav * 1.05, mutualFundData.nav],
      fiftyTwoWeekHigh: mutualFundData.nav * 1.2,
      fiftyTwoWeekLow: mutualFundData.nav * 0.8,
      volume: [],
      avgVolume: mutualFundData.aum // Pack AUM into avgVolume for the component
    };
  }

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
            <ErrorBoundary name="Search">
              <SearchSection 
                onSearch={setSelectedTicker} 
                analysisMode={analysisMode} 
                setAnalysisMode={(mode) => {
                  setAnalysisMode(mode);
                  if (mode === 'TRADER') {
                    setSelectedTicker(null);
                  }
                }}
                investorMode={investorMode}
                setInvestorMode={(mode) => {
                  setInvestorMode(mode);
                  setSelectedTicker(null);
                }}
              />
            </ErrorBoundary>
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
            ) : !selectedTicker ? (
              <div className="py-32 text-center text-[#6B6B6B] font-medium text-lg">Please search for a stock to begin analysis.</div>
            ) : isDataLoading && investorMode === 'MUTUAL_FUND' ? (
              <div className="py-32 flex justify-center items-center"><OrbLoading text="Loading Mutual Fund..." /></div>
            ) : !stockData && investorMode === 'EQUITY' && !isDataLoading ? (
              <div className="py-32 text-center">Data stream interrupted. Please try again.</div>
            ) : !mutualFundData && investorMode === 'MUTUAL_FUND' && !isDataLoading ? (
              <div className="py-32 text-center">Mutual Fund data unavailable.</div>
            ) : investorMode === 'MUTUAL_FUND' ? (
              <>
                <ErrorBoundary name="MF Market Performance">
                  <PriceActionSection stockData={mfMockStockData} mutualFundData={mutualFundData} isLoading={isDataLoading} />
                </ErrorBoundary>
                <ErrorBoundary name="MF Market Narrative">
                  <MarketNarrativeSection stockName={mutualFundData?.schemeName} newsList={sentimentStats?.analyzedData || []} isLoading={isDataLoading} />
                </ErrorBoundary>
                {(!isDataLoading && mutualFundData && mfMockStockData) && (
                  <ErrorBoundary name="MF Analysis">
                    <FinalVerdictSection 
                      ticker={selectedTicker}
                      stockName={mutualFundData.schemeName} 
                      sentimentStats={sentimentStats} 
                      stockData={mfMockStockData}
                      analysisMode={investorMode}
                      mutualFundData={mutualFundData}
                      optionsChainData={optionsChainData}
                      onOpenTerminal={(query) => {
                        setTerminalInitialQuery(query);
                        setView('terminal');
                      }}
                      setDaCache={setDaCache}
                    />
                  </ErrorBoundary>
                )}
              </>
            ) : (
              <>
                <ErrorBoundary name="Market Performance"><PriceActionSection stockData={stockData} isLoading={isDataLoading} /></ErrorBoundary>
                {optionsChainData && <ErrorBoundary name="Options Chain"><OptionsChainSection optionsChainData={optionsChainData} /></ErrorBoundary>}
                <ErrorBoundary name="Market Narrative"><MarketNarrativeSection stockName={stockData?.name} newsList={sentimentStats?.analyzedData || []} isLoading={isDataLoading} /></ErrorBoundary>
                {(!isDataLoading && stockData) && (
                  <ErrorBoundary name="Analysis">
                  <FinalVerdictSection 
                    ticker={selectedTicker}
                    stockName={stockData!.name} 
                    sentimentStats={sentimentStats} 
                    stockData={stockData} 
                    analysisMode={analysisMode}
                    optionsChainData={optionsChainData}
                    onOpenTerminal={(query) => {
                      setTerminalInitialQuery(query);
                      setView('terminal');
                    }}
                    setDaCache={setDaCache}
                  />
                  </ErrorBoundary>
                )}
              </>
            )}
          </>
        ) : (
          <ErrorBoundary name="Terminal"><TerminalView initialQuery={terminalInitialQuery} initialData={daCache} /></ErrorBoundary>
        )}
        <ErrorBoundary name="Features"><FeaturesSection /></ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

export default App;
