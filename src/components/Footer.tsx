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
import { SourcesModal } from './SourcesModal';



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
      <footer id="site-footer" className="relative w-full h-screen min-h-screen bg-[#000000] text-white overflow-hidden flex flex-col justify-between py-6 md:py-10 px-6 md:px-14 border-t border-white/[0.12] select-none">
        {/* ── 3-COLOR TEXTURED BLUR ATMOSPHERE (Deep Black + Brilliant White + Theme Gold #C4A77D) ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* 1. Base Velvet Black */}
          <div className="absolute inset-0 bg-[#000000]" />

          {/* 2. Luminous Gold / Amber Aurora Wave (Left & Center) */}
          <div
            className="absolute -top-[12%] -left-[10%] w-[90vw] md:w-[75vw] h-[65vh] rounded-[100%] opacity-90 blur-[70px] md:blur-[110px]"
            style={{
              background: 'radial-gradient(ellipse at 40% 40%, #E5C158 0%, #D4AF37 25%, #C4A77D 50%, #8A6422 75%, transparent 100%)'
            }}
          />

          {/* 3. Radiant Pure White / Champagne Spotlight (Top-Right - as in AIUC reference) */}
          <div
            className="absolute -top-[15%] right-[-5%] w-[70vw] md:w-[55vw] h-[60vh] rounded-[100%] opacity-85 blur-[60px] md:blur-[95px]"
            style={{
              background: 'radial-gradient(ellipse at 60% 35%, #FFFFFF 0%, #FFF6E5 30%, rgba(229, 193, 88, 0.6) 65%, transparent 100%)'
            }}
          />

          {/* 4. Warm Golden Luminous Corona Bridge */}
          <div
            className="absolute top-0 left-[25%] w-[65vw] md:w-[50vw] h-[45vh] rounded-[100%] opacity-80 blur-[80px] md:blur-[120px]"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, #FFDF85 0%, #D4AF37 40%, rgba(196, 167, 125, 0.4) 70%, transparent 100%)'
            }}
          />

          {/* 5. Natural Atmospheric Falloff into Deep Black at Bottom */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, transparent 28%, rgba(0,0,0,0.35) 48%, rgba(0,0,0,0.85) 68%, #000000 85%, #000000 100%)'
            }}
          />

          {/* 6. PROMINENT TEXTURED FILM GRAIN (Authentic Analog Silk Grain on Blurred Aurora) */}
          <svg className="absolute inset-0 w-full h-full opacity-35 mix-blend-overlay pointer-events-none">
            <filter id="footer-grain-texture">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#footer-grain-texture)" />
          </svg>

          {/* 7. Secondary Specular Micro-Grain for Tactile Frosted Depth */}
          <svg className="absolute inset-0 w-full h-full opacity-20 mix-blend-color-dodge pointer-events-none">
            <filter id="footer-fine-grain">
              <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#footer-fine-grain)" />
          </svg>

          {/* Top Hairline Luminous Glow */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E5C158] via-white to-transparent opacity-80" />
        </div>

        {/* ── TOP SECTION: TAGLINE & DIRECT ACTION CONTROLS ── */}
        <div className="relative z-10 max-w-7xl w-full mx-auto pb-4 border-b border-white/[0.12]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs md:text-sm font-mono uppercase tracking-[0.35em] text-white/80 block mb-0.5 font-semibold">
                Move with confidence
              </span>
              <p className="text-[11px] md:text-xs text-white/50 font-sans tracking-wide">
                Autonomous Financial Sentiment & Quantitative Analytics Protocol
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSourcesModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.18] hover:border-[#C4A77D]/70 text-xs font-mono text-white/95 hover:text-white transition-all backdrop-blur-xl shadow-lg"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#C4A77D]" />
                <span>All 13 Sources</span>
                <ArrowUpRight className="w-3 h-3 text-[#C4A77D]" />
              </button>

              <button
                type="button"
                onClick={() => openContact('General Inquiry')}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C4A77D] hover:bg-[#d8c5a8] text-xs font-mono text-black font-semibold tracking-wider transition-all shadow-lg shadow-[#C4A77D]/30"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Us</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── CENTER SECTION: GRAND TYPOGRAPHIC CENTERPIECE (AIUC Inspired) ── */}
        <div className="relative z-10 max-w-7xl w-full mx-auto my-auto py-6 md:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              {/* Giant Serif Display Title matching AIUC © */}
              <div className="relative inline-block select-none">
                <h1
                  className="font-serif text-white tracking-tight leading-none drop-shadow-[0_20px_45px_rgba(0,0,0,0.9)]"
                  style={{
                    fontSize: 'clamp(3.8rem, 11vw, 8.8rem)',
                    fontFamily: "'Playfair Display', Georgia, serif",
                    letterSpacing: '-0.04em'
                  }}
                >
                  SENTIMENT<span className="text-[#C4A77D]">AI</span>
                </h1>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono text-white/60 tracking-wider">
                <span>NSE / BSE EQUITIES</span>
                <span className="text-[#C4A77D]/60">•</span>
                <span>F&O DERIVATIVES</span>
                <span className="text-[#C4A77D]/60">•</span>
                <span>38,000+ MUTUAL FUNDS</span>
                <span className="text-[#C4A77D]/60">•</span>
                <span>QUANTITATIVE SENTIMENT</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM SECTION: TRANSPARENCY SOURCES STRIP & ATTRIBUTION ── */}
        <div className="relative z-10 max-w-7xl w-full mx-auto space-y-4 pt-4 border-t border-white/[0.12]">
          {/* Compact Data Sources Strip with direct links */}
          <div className="p-3 rounded-2xl bg-black/60 border border-white/[0.1] backdrop-blur-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
            <div className="flex items-center gap-2 text-white/75">
              <ShieldCheck className="w-4 h-4 text-[#C4A77D]" />
              <span className="text-white font-medium">Transparency:</span>
              <span className="text-white/45 hidden sm:inline">Direct links to verified data providers:</span>
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
                  className="px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-[#C4A77D]/25 hover:text-[#C4A77D] text-white/85 border border-white/[0.08] hover:border-[#C4A77D]/50 transition-all inline-flex items-center gap-1 text-[11px]"
                >
                  <span>{s.name}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
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

          {/* Attribution & Copyright Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-white/50">
            <div>
              <span>&copy; {new Date().getFullYear()} SentimentAI Protocol. All rights reserved.</span>
              <span className="block text-[10px] text-white/35 mt-0.5">
                AI-generated market analytics. Not financial advice. Investments are subject to market risks.
              </span>
            </div>

            {/* PROMINENT ATTRIBUTION: Made by Devansh Mehrotra (NO email exposed) */}
            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:border-[#C4A77D]/50 text-white/90 hover:text-white transition-all backdrop-blur-xl shadow-lg">
              <span className="text-white/50">Made by</span>
              <span className="font-semibold text-white tracking-wide">Devansh Mehrotra</span>
              <button
                type="button"
                onClick={() => openContact('Note for Devansh')}
                className="ml-1 text-[#C4A77D] hover:text-[#e4d4b8] transition-colors"
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
                className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
                title="Back to Top"
              >
                <span>Back to top</span>
                <ChevronUp className="w-3.5 h-3.5 text-[#C4A77D]" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ── SOURCES TRANSPARENCY MODAL (Shows all 13 sources in depth) ── */}
      <SourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
      />

      {/* Contact Us Modal Window */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        defaultSubject={contactSubject}
      />
    </>
  );
};
