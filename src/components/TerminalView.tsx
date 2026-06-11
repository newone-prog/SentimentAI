import React from 'react';
import {
  ShieldAlert,
  BarChart3,
  Activity,
  Zap,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { getDevilsAdvocateAnalysis } from '../lib/terminalService';
import { fetchStockData, fetchNewsAndSentiment } from '../lib/api';
import { gsap } from 'gsap';
import { useLayoutEffect, useRef, useState } from 'react';

/* ─── RiskSection sub-component ─── */
const RiskSection = ({ title, items, icon, color }: { title: string; items: string[]; icon: React.ReactNode; color: string }) => (
  <div className="group">
    <div className="flex items-center gap-4 mb-6">
      <div className={`w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <h4 className={`${color} text-xs font-mono uppercase tracking-[0.2em]`}>{title}</h4>
    </div>
    <ul className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="text-white/50 text-sm leading-relaxed flex gap-4 p-4 rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
          <span className="text-[#C4A77D]/30 font-mono">0{i + 1}</span> {item}
        </li>
      ))}
    </ul>
  </div>
);

export const TerminalView: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [command, setCommand] = useState('');
  const [isForensicsRunning, setIsForensicsRunning] = useState(false);
  const [forensicResult, setForensicsResult] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<string>('');

  useLayoutEffect(() => {
    if (sectionRef.current) {
      gsap.fromTo(sectionRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: 'power3.out' }
      );
    }
  }, []);

  const extractTicker = async (query: string): Promise<string> => {
    const queryUpper = query.toUpperCase();
    const commonTickers = ['ZOMATO', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'ADANI', 'TATA', 'PAYTM', 'AAPL', 'TSLA', 'NVDA', 'MSFT'];
    const stopWords = ['I', 'AM', 'SHORT', 'LONG', 'ON', 'WHAT', 'SHOULD', 'DO', 'NOW', 'BUY', 'SELL', 'HOLD', 'THE', 'IS', 'TO', 'IN', 'A', 'AN', 'OF', 'AND', 'FOR', 'MY', 'ABOUT', 'THINKING'];

    for (const ticker of commonTickers) {
      const regex = new RegExp(`\\b${ticker}\\b`, 'i');
      if (regex.test(queryUpper)) return ticker;
    }

    let bestMatch = '';
    const words = query.split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^A-Z]/gi, '').toUpperCase();
      if (clean.length > 2 && !stopWords.includes(clean)) {
        if (clean.length > bestMatch.length) {
          bestMatch = clean;
        }
      }
    }

    if (bestMatch) return bestMatch;
    return 'RELIANCE';
  };

  const runForensics = async (query: string) => {
    setIsForensicsRunning(true);
    setForensicsResult(null);

    setActiveStep('EXTRACTING_ENTITY');
    const ticker = await extractTicker(query);

    try {
      setActiveStep('GATHERING_MARKET_INTEL');
      const resolvedTicker = ticker.includes('.') ? ticker : `${ticker}.NS`;

      const priceData = await fetchStockData(resolvedTicker, ticker);
      const sentimentData = await fetchNewsAndSentiment(ticker, priceData?.name);

      setActiveStep('RUNNING_RED_TEAM_STRESS_TEST');
      const result = await getDevilsAdvocateAnalysis(query, ticker, priceData, sentimentData);

      if (result) {
        setForensicsResult(result);
        setActiveStep('REPORT_GENERATED');
      } else {
        setActiveStep('PIPELINE_ERROR');
      }
    } catch (e) {
      console.error(e);
      setActiveStep('CRITICAL_SYSTEM_FAULT');
    } finally {
      setIsForensicsRunning(false);
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command || isForensicsRunning) return;
    runForensics(command);
    setCommand('');
  };

  return (
    <section ref={sectionRef} className="min-h-screen bg-[#060606] pt-24 pb-20 px-4 md:px-12 relative flex flex-col">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-20" />
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#C4A77D]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-red-900/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10 flex-1 flex flex-col">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b border-white/5 pb-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <span className="bg-[#C4A77D]/10 text-[#C4A77D] text-[10px] font-mono px-2 py-1 rounded border border-[#C4A77D]/20 uppercase tracking-widest">Forensic Engine v4.1</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                <div className="w-1 h-1 rounded-full bg-green-500/50" />
              </div>
            </div>
            <h1 className="font-display text-4xl md:text-5xl text-white tracking-tight">
              Pro <span className="italic text-[#C4A77D]">Terminal</span>
            </h1>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-white/50 text-[10px] font-mono">
              LATENCY: <span className="text-green-500">12MS</span>
            </div>
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-white/50 text-[10px] font-mono">
              ENCRYPTION: <span className="text-[#C4A77D]">AES-256</span>
            </div>
            <div className="px-4 py-2 bg-red-950/20 rounded-xl border border-red-900/30 text-red-500/70 text-[10px] font-mono">
              THREAT MODE: <span className="text-red-500">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Command Interface */}
        <div className="mb-12 max-w-3xl mx-auto w-full">
          <form onSubmit={handleCommand} className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#C4A77D] font-mono text-xl group-focus-within:scale-110 transition-transform">{">"}</div>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              disabled={isForensicsRunning}
              placeholder="Explain your concern (e.g., 'I am short on Zomato')..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-14 pr-6 text-white placeholder:text-white/10 focus:outline-none focus:border-[#C4A77D]/40 focus:bg-white/[0.07] transition-all font-mono text-lg shadow-2xl"
            />
          </form>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col">
          {!forensicResult && !isForensicsRunning ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
              <div className="w-32 h-32 mb-8 relative">
                <ShieldAlert className="w-full h-full text-[#C4A77D] absolute inset-0" />
                <div className="absolute inset-0 border-2 border-[#C4A77D] rounded-full animate-[ping_3s_linear_infinite]" />
              </div>
              <h3 className="text-2xl font-display text-white mb-2">Awaiting Directives</h3>
              <p className="text-sm font-mono uppercase tracking-[0.2em] text-[#C4A77D]">Describe your position or anxiety regarding any stock</p>
            </div>
          ) : isForensicsRunning ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-12">
              <div className="relative w-72 h-72 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-dashed border-[#C4A77D]/20 rounded-full animate-[spin_20s_linear_infinite]" />
                <div className="absolute inset-8 border border-[#C4A77D]/40 rounded-full animate-[spin_10s_linear_infinite_reverse]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <Zap className="w-12 h-12 text-[#C4A77D] animate-pulse mb-4" />
                    <div className="flex gap-1">
                      <div className="w-1 h-4 bg-[#C4A77D] animate-[bounce_1s_infinite]" />
                      <div className="w-1 h-4 bg-[#C4A77D] animate-[bounce_1s_infinite_0.2s]" />
                      <div className="w-1 h-4 bg-[#C4A77D] animate-[bounce_1s_infinite_0.4s]" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center font-mono">
                <div className="text-[#C4A77D] text-lg tracking-[0.4em] uppercase mb-3 animate-pulse">{activeStep.replace(/_/g, ' ')}</div>
                <div className="text-white/20 text-xs uppercase tracking-widest">Cross-referencing Crowd Psychology...</div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-16">
                  <section className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[3rem] p-10 md:p-14 backdrop-blur-2xl shadow-3xl">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 rounded-2xl bg-[#C4A77D]/10 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-[#C4A77D]" />
                      </div>
                      <h3 className="text-sm font-mono text-[#C4A77D] uppercase tracking-[0.4em]">Forensic Dossier</h3>
                    </div>

                    <h2 className="text-white text-3xl md:text-4xl font-display leading-tight mb-8">
                      {forensicResult.userPositionAnalysis}
                    </h2>

                    <div className="p-8 bg-red-950/30 border border-red-900/40 rounded-3xl mb-12">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-red-500 text-[10px] font-mono uppercase tracking-[0.3em]">Bearish Core Analysis</span>
                      </div>
                      <p className="text-white/80 text-lg leading-relaxed italic">"{forensicResult.bearishSummary}"</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <h4 className="text-[10px] font-mono text-white/40 uppercase mb-4 tracking-widest">Risk Volatility Curve</h4>
                        <div className="h-24 flex items-end gap-1">
                          {[40, 70, 45, 90, 65, 80, 50, 95].map((h, i) => (
                            <div key={i} className="flex-1 bg-red-500/20 rounded-t-sm" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      </div>
                      <div className="p- backwards bg-white/[0.02] border border-white/5 rounded-2xl">
                        <h4 className="text-[10px] font-mono text-white/40 uppercase mb-4 tracking-widest">Crowd Hype Velocity</h4>
                        <div className="h-24 flex items-end gap-1">
                          {[20, 30, 80, 100, 40, 20, 15, 10].map((h, i) => (
                            <div key={i} className="flex-1 bg-[#C4A77D]/20 rounded-t-sm" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <RiskSection title="The Hidden Risks" items={forensicResult.hiddenRisks} icon={<ShieldAlert className="w-5 h-5" />} color="text-red-500" />
                    <RiskSection title="Financial Leaks" items={forensicResult.financialRisks} icon={<BarChart3 className="w-5 h-5" />} color="text-[#C4A77D]" />
                    <RiskSection title="Competitive War" items={forensicResult.competitiveThreats} icon={<Zap className="w-5 h-5" />} color="text-blue-400" />
                    <RiskSection title="Industry Traps" items={forensicResult.industryRisks} icon={<Globe className="w-5 h-5" />} color="text-purple-400" />
                  </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 space-y-10">
                  <div className="bg-[#C4A77D] rounded-[2.5rem] p-10 text-[#060606] shadow-[0_30px_100px_rgba(196,167,125,0.2)]">
                    <h3 className="text-[11px] font-mono uppercase tracking-[0.4em] mb-6 font-bold opacity-60">The Bottom Line</h3>
                    <h4 className="text-3xl font-display mb-6 leading-tight">Honest Advice</h4>
                    <p className="text-base font-medium leading-relaxed mb-10">
                      {forensicResult.honestAdvice}
                    </p>
                    <div className="pt-8 border-t border-black/10 flex items-center justify-between">
                      <div className="text-[10px] font-mono uppercase tracking-widest font-bold">Forensic Confidence</div>
                      <div className="text-2xl font-display">{(forensicResult.overallBearCaseStrength * 0.94).toFixed(0)}%</div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10">
                    <div className="text-7xl font-display text-red-500 mb-2 leading-none">{forensicResult.probabilityBullThesisFails}%</div>
                    <div className="text-[10px] text-white/40 uppercase font-mono tracking-widest mb-10">Institutional Failure Probability</div>

                    <div className="space-y-8">
                      <h3 className="text-white/80 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" /> Thesis Breakers
                      </h3>
                      <ul className="space-y-5">
                        {forensicResult.thesisBreakers.map((b: string, i: number) => (
                          <li key={i} className="text-xs text-white/50 leading-relaxed pl-4 border-l border-red-500/30">{b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-center pt-8">
                    <p className="text-[9px] text-white/10 uppercase tracking-[0.3em] leading-loose">
                      DATA SOURCE: NVIDIA FORENSIC NODE + GLOBAL RAG MESH v4.1<br />
                      AI-GENERATED ANALYSIS. NOT FINANCIAL ADVICE. INVEST AT YOUR OWN RISK.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
