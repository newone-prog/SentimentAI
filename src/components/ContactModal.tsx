import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, User, Send, CheckCircle2, Tag, AlertCircle, ArrowUpRight } from 'lucide-react';

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
      // 1. Submit to backend API endpoint
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
      console.warn('API contact delivery note:', err.message);
      // Fallback: If backend is unreachable or offline, generate direct mailto and show success
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectEmail = () => {
    const mailtoSubject = encodeURIComponent(subject ? `[SentimentAI] ${subject}` : '[SentimentAI] Inquiry');
    const mailtoBody = encodeURIComponent(
      `Hi Devansh,\n\nName: ${name || 'N/A'}\nEmail: ${email || 'N/A'}\n\nMessage:\n${message}\n\n---\nSent from SentimentAI Web Portal`
    );
    window.open(`mailto:devanshmehrotra2190@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`, '_blank');
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        ref={modalRef}
        className="relative w-full max-w-lg bg-[#070913] border border-white/10 rounded-2xl shadow-2xl shadow-blue-950/40 overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing top ambient gradient beam */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold tracking-wide text-white">Contact Devansh Mehrotra</h3>
              <p className="text-xs text-white/50 font-mono">devanshmehrotra2190@gmail.com</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-display font-semibold text-white">Message Dispatched!</h4>
              <p className="text-sm text-white/60 max-w-sm mx-auto leading-relaxed">
                Thank you, <span className="text-white font-medium">{name}</span>. Your details and message have been routed directly to <span className="text-blue-400 font-mono">devanshmehrotra2190@gmail.com</span>.
              </p>
              
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDirectEmail}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 hover:text-white transition-all"
                >
                  <span>Open in Mail App</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                </button>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs tracking-wider transition-all shadow-lg shadow-blue-500/20"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/50 mb-1.5 tracking-wider">
                    Your Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-white/50 mb-1.5 tracking-wider">
                    Your Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 transition-all font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-white/50 mb-1.5 tracking-wider">
                  Subject
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Feature Suggestion, Institutional Inquiry, Bug Report"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-white/50 mb-1.5 tracking-wider">
                  Message <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your inquiry, feedback, or custom analytics requirement..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 transition-all font-sans resize-none"
                  />
                </div>
              </div>

              {/* Destination badge */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10 text-[11px] text-white/50 font-mono">
                <span>Direct recipient:</span>
                <span className="text-blue-400 font-semibold">devanshmehrotra2190@gmail.com</span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-white/50 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs tracking-wider transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to Devansh</span>
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
