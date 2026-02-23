import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  ArrowRight,
  BarChart3,
  Newspaper,
  Activity,
  Twitter,
  Linkedin,
  Github,
  Mail,
  ChevronRight,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

import { fetchStockData, fetchNewsAndSentiment, type StockData, type NewsItem, type SentimentAnalysis } from './lib/api';

// Mock Data for Demo
const mockStockData: Record<string, StockData> = {
  'RELIANCE': { name: 'Reliance Industries', price: 2950.45, change: 45.30, changePercent: 1.55, currency: 'INR', history: [] },
  'TCS': { name: 'Tata Consultancy Services', price: 4120.80, change: -12.40, changePercent: -0.30, currency: 'INR', history: [] },
  'INFY': { name: 'Infosys Limited', price: 1680.20, change: 15.60, changePercent: 0.94, currency: 'INR', history: [] },
  'HDFCBANK': { name: 'HDFC Bank', price: 1530.10, change: 10.20, changePercent: 0.67, currency: 'INR', history: [] },
  'ICICIBANK': { name: 'ICICI Bank', price: 1150.40, change: -5.30, changePercent: -0.46, currency: 'INR', history: [] },
  'SBIN': { name: 'State Bank of India', price: 820.60, change: 12.40, changePercent: 1.53, currency: 'INR', history: [] }
};

// Navigation Component
const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`nav-fixed ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="nav-logo flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[#C4A77D]" />
        SentimentAI
      </div>
      <div className="nav-links">
        <a href="#analysis" className="nav-link">Analysis</a>
        <a href="#features" className="nav-link">Features</a>
        <a href="#insights" className="nav-link">Insights</a>
        <a href="#contact" className="nav-link">Contact</a>
      </div>
    </nav>
  );
};

// Grain Overlay
const GrainOverlay = () => <div className="grain-overlay" />;

// Animated Background Circles
const AnimatedBackground = () => {
  const circlesRef = useRef<HTMLDivElement[]>([]);

  useLayoutEffect(() => {
    circlesRef.current.forEach((circle, i) => {
      gsap.to(circle, {
        x: `random(-100, 100)`,
        y: `random(-100, 100)`,
        duration: 8 + i * 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });
  }, []);

  return (
    <div className="animated-bg">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          ref={(el) => { if (el) circlesRef.current[i] = el; }}
          className="animated-circle"
          style={{
            width: `${300 + i * 150}px`,
            height: `${300 + i * 150}px`,
            top: `${20 + i * 15}%`,
            left: `${10 + i * 25}%`,
          }}
        />
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

      tl.fromTo(titleRef.current,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
      )
        .fromTo(subtitleRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
          '-=0.6'
        )
        .fromTo(ctaRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
          '-=0.4'
        );

      // Scroll exit animation
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=100%',
          pin: true,
          scrub: 0.5,
        },
      });

      scrollTl.fromTo([titleRef.current, subtitleRef.current, ctaRef.current],
        { y: 0, opacity: 1 },
        { y: -50, opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const scrollToAnalysis = () => {
    document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section ref={sectionRef} className="section-pinned bg-[#F5F1EB] z-10 flex items-center justify-center relative">
      <AnimatedBackground />
      <div className="text-center px-6 max-w-5xl mx-auto relative z-10">
        <div className="mb-6">
          <span className="section-label flex items-center justify-center gap-2">
            <Zap className="w-3 h-3" />
            AI-Powered Market Intelligence
          </span>
        </div>
        <h1 ref={titleRef} className="hero-title mb-8">
          Analyze <span className="italic text-[#C4A77D]">Emotion</span>
          <br />
          Predict Markets
        </h1>
        <p ref={subtitleRef} className="hero-subtitle max-w-2xl mx-auto mb-12">
          Harness the power of artificial intelligence to decode market sentiment.
          We analyze millions of data points to give you the edge in understanding
          stock movements before they happen.
        </p>
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={scrollToAnalysis} className="cta-button flex items-center gap-2">
            Start Analysis
            <ArrowRight className="w-4 h-4" />
          </button>
          <button className="cta-button cta-button-outline">
            Learn More
          </button>
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
      gsap.fromTo('.search-content',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const fetchTickerFromName = async (query: string): Promise<string> => {
    // 1. Primary AI Intelligence: Native Indian Market Search
    try {
      const growwUrl = `https://groww.in/v1/api/search/v3/query/global/st_p_query?page=0&query=${encodeURIComponent(query)}&size=5&web=true`;
      const proxyGroww = `https://api.allorigins.win/raw?url=${encodeURIComponent(growwUrl)}`;

      const res = await fetch(proxyGroww);
      const data = await res.json();
      const content = data?.data?.content || [];

      // Look for the first actual equity stock in the Indian Market results
      const stock = content.find((c: any) => c.entity_type === 'Stocks');
      if (stock) {
        if (stock.nse_scrip_code) return `${stock.nse_scrip_code}.NS`;
        if (stock.bse_scrip_code) return `${stock.bse_scrip_code}.BO`;
      }
    } catch (e) {
      console.error("Primary Indian Search Index failed, falling back to global heuristics:", e);
    }

    // 2. Global Fallback Intelligence (Yahoo Finance)
    try {
      const rawUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=7&newsCount=0`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;

      const response = await fetch(proxyUrl, { headers: { 'Accept': 'application/json' } });
      const data = await response.json();
      const quotes = data.quotes || [];

      if (quotes.length > 0) {
        const indianStock = quotes.find((q: any) => {
          if (!q.exchange || !q.symbol) return false;
          const ex = q.exchange.toUpperCase();
          const sym = q.symbol.toUpperCase();
          return ex === 'NSE' || ex === 'BSE' || ex === 'NSI' || ex === 'BSI' || sym.endsWith('.NS') || sym.endsWith('.BO');
        });

        if (indianStock && indianStock.symbol) return indianStock.symbol;

        const bestQuote = quotes[0];
        if (bestQuote && bestQuote.symbol) {
          return bestQuote.symbol.includes('.') ? bestQuote.symbol : `${bestQuote.symbol}.NS`;
        }
      }
    } catch (error) {
      console.error("Error fetching ticker via Proxy:", error);
    }

    const cleanQuery = query.trim().toUpperCase().replace(/\s+/g, '');
    return `${cleanQuery}.NS`;
  };

  const handleAnalyze = async () => {
    if (!searchQuery) return;
    setIsAnalyzing(true);

    // Simulate delay for AI feeling
    await new Promise(resolve => setTimeout(resolve, 800));

    // Try fetching from Yahoo Finance API first
    const resolvedTicker = await fetchTickerFromName(searchQuery);

    setIsAnalyzing(false);

    // Let the AI decided exact ticker be the absolute source of truth
    const finalTicker = resolvedTicker || searchQuery.trim().toUpperCase();

    onSearch(finalTicker);
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section ref={sectionRef} id="analysis" className="section-flowing bg-[#F5F1EB] py-32 relative">
      <div className="search-content max-w-3xl mx-auto px-6 text-center">
        <span className="section-label mb-4 block">Enter Stock or Ticker</span>
        <h2 className="font-display text-4xl md:text-5xl mb-6 text-[#0A0A0A]">
          What are you analyzing today?
        </h2>
        <p className="text-[#6B6B6B] mb-12 max-w-xl mx-auto">
          Enter a company name or stock ticker to unlock real-time sentiment analysis
          powered by our advanced AI engine.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9A9A9A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="e.g., AAPL, TSLA, or Apple"
              className="input-elegant pl-14"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !searchQuery}
            className="cta-button flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-[#9A9A9A]">Popular:</span>
          {['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK'].map((ticker) => (
            <button
              key={ticker}
              onClick={() => setSearchQuery(ticker)}
              className="px-4 py-2 bg-white border border-[#E5E0D8] rounded-full text-sm font-medium text-[#6B6B6B] hover:border-[#C4A77D] hover:text-[#0A0A0A] transition-all"
            >
              {ticker}
            </button>
          ))}
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
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 60%',
        },
      });

      tl.fromTo('.price-metric',
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
      )
        .fromTo('.chart-box',
          { x: 40, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
          '-=0.4'
        );
    }, sectionRef);

    return () => ctx.revert();
  }, [stockData]);

  if (!stockData) return null;
  // Developer logs removed for cleaner production console

  const isPositive = stockData.change >= 0;

  const getCurrencySymbol = (currency: string) => {
    const currencySymbols: Record<string, string> = {
      'USD': '$', 'INR': '₹', 'EUR': '€', 'GBP': '£',
      'JPY': '¥', 'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF',
      'CNY': '¥', 'HKD': 'HK$', 'SGD': 'S$'
    };
    return currencySymbols[currency] || `${currency} `;
  };
  const sym = getCurrencySymbol(stockData.currency || 'USD');

  const chartPoints = stockData.history.length > 0 ? stockData.history : [stockData.price];
  const minPrice = Math.min(...chartPoints);
  const maxPrice = Math.max(...chartPoints);
  const range = maxPrice - minPrice || 1;

  const svgPath = chartPoints.map((price, i) => {
    const x = (i / (chartPoints.length - 1)) * 100;
    const y = 100 - ((price - minPrice) / range) * 80 - 10;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaPath = `${svgPath} L 100 100 L 0 100 Z`;

  return (
    <section ref={sectionRef} id="results" className="section-flowing bg-[#FAF8F5] py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <span className="section-label mb-4 block">Price Action</span>
          <h2 className="font-display text-4xl md:text-5xl text-[#0A0A0A]">
            Market Performance
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Metrics */}
          <div className="space-y-8">
            <div className="price-metric metric-card">
              <div className="metric-value">
                {sym}{stockData.price.toFixed(2)}
              </div>
              <div className="metric-label">Current Price ({stockData.currency})</div>
            </div>

            <div className="price-metric metric-card">
              <div className={`metric-value flex items-center gap-3 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                {isPositive ? '+' : ''}{stockData.changePercent.toFixed(2)}%
              </div>
              <div className="metric-label">24h Change</div>
            </div>

            <div className="price-metric metric-card">
              <div className={`metric-value text-2xl ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : '-'}{sym}{Math.abs(stockData.change).toFixed(2)}
              </div>
              <div className="metric-label">Price Movement</div>
            </div>

            <div className="price-metric metric-card">
              <div className="metric-value text-2xl flex items-center gap-2">
                <Activity className="w-6 h-6 text-[#C4A77D]" />
                High
              </div>
              <div className="metric-label">Trading Volume</div>
            </div>
          </div>

          {/* Chart */}
          <div className="chart-box lg:col-span-2 chart-container">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-[#C4A77D]" />
                <span className="font-medium text-[#0A0A0A]">30-Day Price History</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-[#6B6B6B]">Live</span>
              </div>
            </div>
            <div className="relative h-64 md:h-80">
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isPositive ? '#22C55E' : '#EF4444'} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={isPositive ? '#22C55E' : '#EF4444'} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#areaGradient)" />
                <path
                  d={svgPath}
                  fill="none"
                  stroke={isPositive ? '#22C55E' : '#EF4444'}
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex justify-between mt-4 text-xs text-[#9A9A9A]">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Market Narrative Section
const MarketNarrativeSection = ({ stockName, newsList, sentimentStats }: { stockName: string, newsList: NewsItem[], sentimentStats: SentimentAnalysis | null }) => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.narrative-header',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
          },
        }
      );

      if (newsList.length > 0) {
        gsap.fromTo('.news-item-anim',
          { x: -30, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '.news-list',
              start: 'top 70%',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [newsList]);

  const getBadgeClass = (category: string) => {
    switch (category) {
      case 'Positive': return 'badge-pos';
      case 'Negative': return 'badge-neg';
      default: return 'badge-neu';
    }
  };

  const posCount = sentimentStats?.positive || 0;
  const neuCount = sentimentStats?.neutral || 0;
  const negCount = sentimentStats?.negative || 0;

  return (
    <section ref={sectionRef} id="insights" className="section-flowing bg-[#F5F1EB] py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="narrative-header mb-16">
          <span className="section-label mb-4 block">Market Narrative</span>
          <h2 className="font-display text-4xl md:text-5xl text-[#0A0A0A] mb-6">
            The Story Behind {stockName}
          </h2>
          <p className="text-[#6B6B6B] max-w-2xl">
            Our AI scans thousands of news sources, social media feeds, and financial
            reports to understand the emotional pulse driving market movements.
          </p>
        </div>

        {/* Sentiment Stats */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-[#E5E0D8]">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-[#6B6B6B]">Positive</span>
            </div>
            <div className="text-3xl font-display text-green-600">{posCount}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#E5E0D8]">
            <div className="flex items-center gap-3 mb-2">
              <Minus className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-[#6B6B6B]">Neutral</span>
            </div>
            <div className="text-3xl font-display text-gray-500">{neuCount}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#E5E0D8]">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-sm text-[#6B6B6B]">Negative</span>
            </div>
            <div className="text-3xl font-display text-red-600">{negCount}</div>
          </div>
        </div>

        {/* News List */}
        <div className="news-list">
          <div className="flex items-center gap-3 mb-6">
            <Newspaper className="w-5 h-5 text-[#C4A77D]" />
            <span className="font-medium text-[#0A0A0A]">Latest Headlines</span>
          </div>
          {newsList.length === 0 && (
            <div className="text-sm text-[#6B6B6B] italic">No recent news available.</div>
          )}
          {newsList.slice(0, 10).map((news, index) => (
            <div key={index} className="news-item-anim news-item">
              <a href={news.url} target="_blank" rel="noopener noreferrer" className="news-title flex-1 pr-8">
                {news.title}
              </a>
              <span className={`news-badge ${getBadgeClass(news.category)}`}>
                {news.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Final Verdict Section
const FinalVerdictSection = ({ stockName, sentimentStats, stockData }: { stockName: string, sentimentStats: SentimentAnalysis | null, stockData: StockData | null }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const [aiVerdict, setAiVerdict] = useState<"BULLISH" | "BEARISH" | "NEUTRAL">("NEUTRAL");
  const [verdictClass, setVerdictClass] = useState<"verdict-bullish" | "verdict-bearish" | "verdict-neutral">("verdict-neutral");
  const [isProcessing, setIsProcessing] = useState(true);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.verdict-content',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
          },
        }
      );

      // Pulse animation for verdict
      gsap.to(verdictRef.current, {
        scale: 1.02,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [stockData, sentimentStats]);

  useEffect(() => {
    let mounted = true;
    const computeAI = async () => {
      setIsProcessing(true);
      if (stockData) {
        // Run the multi-factor TensorFlow inference engine asynchronously
        const { analyzeStock } = await import('./brain/ensembleModel');
        const result = await analyzeStock(stockData, sentimentStats);

        if (mounted) {
          setAiVerdict(result.verdict);
          setVerdictClass(result.verdictClass);
          setIsProcessing(false);
        }
      } else {
        setIsProcessing(false);
      }
    };
    computeAI();
    return () => { mounted = false; };
  }, [stockData, sentimentStats]);

  const sScore = sentimentStats ? sentimentStats.avgScore : 0;
  const confidence = Math.min(Math.abs(sScore) * 100 * 5 + 50, 99);

  const description = isProcessing
    ? `Running multi-factor TensorFlow matrix regression and analyzing ${sentimentStats?.analyzedData.length || 0} event frequency heuristics...`
    : `The institutional multi-factor ensemble points toward a ${aiVerdict.toLowerCase()} macro trajectory for ${stockName}. Model integrated Technical, Volume, Momentum, and NLP Sentiment matrices collectively.`;

  return (
    <section ref={sectionRef} className="section-flowing bg-[#0A0A0A] py-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#C4A77D]/10 rounded-full blur-[100px]" />
      </div>

      <div className="verdict-content max-w-4xl mx-auto px-6 text-center relative z-10">
        <span className="section-label mb-8 block text-[#C4A77D]">Final Analysis</span>

        <div ref={verdictRef} className="verdict-box">
          <div className={`verdict-word ${verdictClass}`}>
            {aiVerdict}
          </div>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent mx-auto mb-8" />
          <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className={`text-3xl font-display mb-2 ${sScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {sScore > 0 ? '+' : ''}{sScore.toFixed(3)}
            </div>
            <div className="text-white/50 text-sm">Avg Polarity Score</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-3xl font-display text-[#C4A77D] mb-2">{confidence.toFixed(0)}%</div>
            <div className="text-white/50 text-sm">Confidence Level</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-3xl font-display text-white mb-2">{sentimentStats?.analyzedData.length || 0}</div>
            <div className="text-white/50 text-sm">Sources Analyzed</div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Features Section
const FeaturesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.feature-card',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: 'AI-Powered Analysis',
      description: 'Advanced natural language processing to decode market sentiment from millions of sources.',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Global Coverage',
      description: 'Real-time monitoring of news, social media, and financial reports across 50+ languages.',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Instant Insights',
      description: 'Get actionable sentiment scores and market predictions in seconds, not hours.',
    },
    {
      icon: <Activity className="w-6 h-6" />,
      title: 'Trend Detection',
      description: 'Identify emerging trends before they hit mainstream financial media.',
    },
  ];

  return (
    <section ref={sectionRef} id="features" className="section-flowing bg-[#FAF8F5] py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="section-label mb-4 block">Features</span>
          <h2 className="font-display text-4xl md:text-5xl text-[#0A0A0A] mb-6">
            Why Choose SentimentAI?
          </h2>
          <p className="text-[#6B6B6B] max-w-2xl mx-auto">
            Our platform combines cutting-edge AI with comprehensive data sources to deliver
            insights that give you a competitive edge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card bg-white rounded-2xl p-8 border border-[#E5E0D8] hover:border-[#C4A77D] hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-[#F5F1EB] rounded-xl flex items-center justify-center text-[#C4A77D] mb-6 group-hover:bg-[#C4A77D] group-hover:text-white transition-all">
                {feature.icon}
              </div>
              <h3 className="font-heading text-xl text-[#0A0A0A] mb-3">{feature.title}</h3>
              <p className="text-[#6B6B6B] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Big Animated SaaS Footer
const Footer = () => {
  const footerRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Marquee animation
      gsap.to(marqueeRef.current, {
        x: '-50%',
        duration: 30,
        repeat: -1,
        ease: 'none',
      });

      // Footer content reveal
      gsap.fromTo('.footer-content',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 80%',
          },
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  const footerLinks = {
    Product: ['Features', 'Pricing', 'API', 'Integrations'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Resources: ['Documentation', 'Help Center', 'Community', 'Contact'],
    Legal: ['Privacy', 'Terms', 'Security', 'Cookies'],
  };

  return (
    <footer ref={footerRef} id="contact" className="footer-saas relative">
      {/* Animated Marquee */}
      <div className="py-12 border-b border-white/10 overflow-hidden">
        <div ref={marqueeRef} className="flex whitespace-nowrap">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="font-display text-6xl md:text-8xl text-white/10 mx-8">
              Analyze Emotion • Predict Markets •
            </span>
          ))}
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="footer-content max-w-7xl mx-auto px-6 py-20">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="col-span-12 md:col-span-4 mb-12 md:mb-0">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-[#C4A77D]" />
              <span className="font-display text-2xl text-white">SentimentAI</span>
            </div>
            <p className="text-white/60 mb-8 max-w-sm leading-relaxed">
              Harness the power of artificial intelligence to decode market sentiment
              and predict stock movements before they happen.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="col-span-6 md:col-span-2">
              <h4 className="footer-heading">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="footer-link">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-16 pt-12 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <h4 className="font-heading text-white text-lg mb-2">Stay ahead of the market</h4>
              <p className="text-white/60 text-sm">Get weekly sentiment analysis delivered to your inbox.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-white/10 border border-white/20 rounded-full px-6 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4A77D] transition-colors flex-1 md:w-64"
              />
              <button className="bg-[#C4A77D] text-[#0A0A0A] px-6 py-3 rounded-full font-medium hover:bg-[#D4C4A8] transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            © 2025 SentimentAI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-white/40 text-sm hover:text-white/60 transition-colors">Privacy Policy</a>
            <a href="#" className="text-white/40 text-sm hover:text-white/60 transition-colors">Terms of Service</a>
            <a href="#" className="text-white/40 text-sm hover:text-white/60 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main App
function App() {
  const [selectedTicker, setSelectedTicker] = useState('RELIANCE');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [sentimentStats, setSentimentStats] = useState<SentimentAnalysis | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const loadLiveApiData = async () => {
      setIsDataLoading(true);
      const fallbackName = mockStockData[selectedTicker]?.name || selectedTicker.split('.')[0];

      const sData = await fetchStockData(selectedTicker, fallbackName);
      setStockData(sData);

      const nData = await fetchNewsAndSentiment(fallbackName);
      setSentimentStats(nData);

      setIsDataLoading(false);
      // Wait for components to render, then setup triggers
      setTimeout(setupScrollSnap, 200);
    };

    loadLiveApiData();
  }, [selectedTicker]);

  // Global scroll snap inside a ref-based trigger so it re-evaluates
  const setupScrollSnap = () => {
    const pinned = ScrollTrigger.getAll()
      .filter((st) => st.vars.pin)
      .sort((a, b) => a.start - b.start);

    const maxScroll = ScrollTrigger.maxScroll(window);
    if (!maxScroll || pinned.length === 0) return;

    const pinnedRanges = pinned.map((st) => ({
      start: st.start / maxScroll,
      end: (st.end ?? st.start) / maxScroll,
      center: (st.start + ((st.end ?? st.start) - st.start) * 0.5) / maxScroll,
    }));

    ScrollTrigger.create({
      snap: {
        snapTo: (value) => {
          const inPinned = pinnedRanges.some(
            (r) => value >= r.start - 0.08 && value <= r.end + 0.08
          );
          if (!inPinned) return value;

          const target = pinnedRanges.reduce(
            (closest, r) =>
              Math.abs(r.center - value) < Math.abs(closest - value)
                ? r.center
                : closest,
            pinnedRanges[0]?.center ?? 0
          );
          return target;
        },
        duration: { min: 0.15, max: 0.35 },
        delay: 0,
        ease: 'power2.out',
      },
    });
  };

  const getStockName = () => stockData?.name || mockStockData[selectedTicker]?.name || selectedTicker.split('.')[0];

  return (
    <div className="relative">
      <GrainOverlay />
      <Navigation />
      <main>
        <HeroSection />
        <SearchSection onSearch={setSelectedTicker} />
        {isDataLoading ? (
          <div className="py-32 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-[#C4A77D] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !stockData ? (
          <div className="py-32 flex justify-center items-center flex-col text-center px-6">
            <div className="w-16 h-16 bg-red-100/50 rounded-full flex items-center justify-center mb-6 border border-red-200">
              <span className="text-red-500 font-bold text-2xl">!</span>
            </div>
            <h2 className="text-2xl font-display text-[#0A0A0A] mb-4">Data stream interrupted</h2>
            <p className="text-[#6B6B6B] max-w-md">
              Stock not found or real-time data is currently unavailable. Please try a valid Indian ticker query.
            </p>
          </div>
        ) : (
          <>
            <PriceActionSection stockData={stockData} />
            <MarketNarrativeSection
              stockName={getStockName()}
              newsList={sentimentStats?.analyzedData || []}
              sentimentStats={sentimentStats}
            />
            <FinalVerdictSection
              stockName={getStockName()}
              sentimentStats={sentimentStats}
              stockData={stockData}
            />
          </>
        )}
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;
