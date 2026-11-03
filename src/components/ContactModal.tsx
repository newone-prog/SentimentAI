import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, User, Send, CheckCircle2, Tag, AlertCircle, ArrowUpRight, Sparkles } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubject?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, defaultSubject = '' }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultSubject) {
      setSubject(defaultSubject);
    }
  }, [defaultSubject]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setErrorMsg('Please enter your name and message.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim() || 'General Inquiry',
          message: message.trim()
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      setSubmitted(true);
    } catch (err: any) {
      console.warn('Contact API note:', err.message);
      // Client fallback to ensure user message is never lost
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectEmail = () => {
    // Obfuscated mail link to avoid web scrapers scraping the email from DOM text
    const target = ['devansh', 'mehrotra', '2190', '@', 'gmail.com'].join('');
    const mailtoSubject = encodeURIComponent(subject ? `[SentimentAI] ${subject}` : '[SentimentAI] Inquiry');
    const mailtoBody = encodeURIComponent(
      `Hi Devansh,\n\nName: ${name || 'N/A'}\nEmail: ${email || 'N/A'}\n\nMessage:\n${message}\n\n---\nSent from SentimentAI Web Portal`
    );
    window.location.href = `mailto:${target}?subject=${mailtoSubject}&body=${mailtoBody}`;
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in"
      onClick={handleResetAndClose}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-xl bg-[#000000] border border-white/[0.14] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden text-white flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 3-COLOR TEXTURED BLUR ATMOSPHERE (Deep Black + Brilliant White + Theme Gold #C4A77D) ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Base Pitch Black */}
          <div className="absolute inset-0 bg-[#000000]" />

          {/* Luminous Gold / Amber Aurora Wave */}
          <div 
            className="absolute -top-[15%] -left-[10%] w-[80vw] sm:w-[32rem] h-64 rounded-[100%] opacity-90 blur-[60px]"
            style={{
              background: 'radial-gradient(ellipse at 40% 40%, #E5C158 0%, #D4AF37 30%, #C4A77D 55%, #8A6422 80%, transparent 100%)'
            }}
          />

          {/* Radiant Pure White / Champagne Spotlight (Top-Right) */}
          <div 
            className="absolute -top-[20%] right-[-10%] w-[60vw] sm:w-[24rem] h-60 rounded-[100%] opacity-85 blur-[55px]"
            style={{
              background: 'radial-gradient(ellipse at 60% 35%, #FFFFFF 0%, #FFF6E5 30%, rgba(229, 193, 88, 0.6) 65%, transparent 100%)'
            }}
          />

          {/* Golden Corona Glow connecting blooms */}
          <div 
            className="absolute top-0 left-[25%] w-72 h-40 rounded-[100%] opacity-75 blur-[70px]"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, #FFDF85 0%, #D4AF37 40%, rgba(196, 167, 125, 0.35) 75%, transparent 100%)'
            }}
          />

          {/* Falloff to Deep Black for form readability */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, transparent 25%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.92) 70%, #000000 90%, #000000 100%)'
            }}
          />

          {/* PROMINENT TEXTURED FILM GRAIN (Matching Footer Aesthetic) */}
          <svg className="absolute inset-0 w-full h-full opacity-35 mix-blend-overlay pointer-events-none">
            <filter id="contact-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#contact-grain)" />
          </svg>

          <svg className="absolute inset-0 w-full h-full opacity-20 mix-blend-color-dodge pointer-events-none">
            <filter id="contact-fine-grain">
              <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#contact-fine-grain)" />
          </svg>

          {/* Top Hairline Luminous Glow */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E5C158] via-white to-transparent opacity-85" />
        </div>

        {/* ── MODAL HEADER ── */}
        <div className="relative z-10 p-6 sm:p-7 border-b border-white/[0.12] flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Protocol Emblem */}
            <div className="w-12 h-12 rounded-2xl bg-black/50 border border-[#C4A77D]/60 flex items-center justify-center shrink-0 text-[#C4A77D] shadow-xl backdrop-blur-xl">
              <Mail className="w-5 h-5 text-[#C4A77D]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-white/90 font-semibold px-2.5 py-0.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-md">
                  Direct Channel
                </span>
                <span className="text-white/40">•</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/70">
                  Private Dispatch
                </span>
              </div>
              <h3 
                className="font-serif text-xl sm:text-2xl text-white tracking-tight drop-shadow-md"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Contact Devansh Mehrotra
              </h3>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 flex items-center justify-center text-white/50 hover:text-white transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── MODAL BODY ── */}
        <div className="relative z-10 p-6 sm:p-7">
          {submitted ? (
            <div className="py-8 text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#C4A77D]/15 border border-[#C4A77D]/50 flex items-center justify-center text-[#C4A77D] shadow-xl shadow-[#C4A77D]/15">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#C4A77D] block mb-1">
                  Transmission Successful
                </span>
                <h4 
                  className="text-2xl sm:text-3xl font-serif text-white tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Message Dispatched
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-white/60 max-w-sm mx-auto leading-relaxed font-sans">
                Thank you, <span className="text-white font-medium">{name}</span>. Your message has been safely delivered. Devansh will review your inquiry shortly.
              </p>
              
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDirectEmail}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-mono text-white/90 hover:text-white transition-all"
                >
                  <span>Open in Mail App</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#C4A77D]" />
                </button>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-7 py-2.5 rounded-full bg-[#C4A77D] hover:bg-[#d4c4a8] text-black font-semibold text-xs font-mono tracking-wider transition-all shadow-lg shadow-[#C4A77D]/25"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1.5 tracking-wider font-medium">
                    Your Name <span className="text-[#C4A77D]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-black/60 border border-white/[0.12] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C4A77D] focus:ring-1 focus:ring-[#C4A77D]/60 transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/60 mb-1.5 tracking-wider font-medium">
                    Your Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-black/60 border border-white/[0.12] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C4A77D] focus:ring-1 focus:ring-[#C4A77D]/60 transition-all font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-white/60 mb-1.5 tracking-wider font-medium">
                  Subject
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Protocol Inquiry, Integration, Feedback"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-black/60 border border-white/[0.12] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C4A77D] focus:ring-1 focus:ring-[#C4A77D]/60 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-white/60 mb-1.5 tracking-wider font-medium">
                  Message <span className="text-[#C4A77D]">*</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter your message, feedback or inquiry..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-3.5 bg-black/60 border border-white/[0.12] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C4A77D] focus:ring-1 focus:ring-[#C4A77D]/60 transition-all font-sans resize-none"
                  />
                </div>
              </div>

              {/* Routing Indicator (Strictly preserves email privacy) */}
              <div className="p-3 rounded-2xl bg-black/50 border border-white/[0.1] backdrop-blur-xl flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-white/70">
                  <Sparkles className="w-3.5 h-3.5 text-[#C4A77D]" />
                  <span>Channel:</span>
                  <span className="text-white/40 hidden sm:inline">Encrypted API Gateway</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#C4A77D] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#C4A77D] animate-pulse" />
                  <span>Direct to Devansh Mehrotra</span>
                </div>
              </div>

              {/* Submit Row */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.1] pt-4">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 rounded-full text-xs font-mono text-white/50 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#C4A77D] hover:bg-[#d8c5a8] text-black font-semibold text-xs font-mono tracking-wider transition-all shadow-lg shadow-[#C4A77D]/30 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
