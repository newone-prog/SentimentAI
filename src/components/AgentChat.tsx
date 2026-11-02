import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, Search, Globe, BarChart3, PieChart, TrendingUp, CheckCircle2, XCircle, Wrench, Trash2, Zap, Brain, ChevronDown, ExternalLink, Code2, Sparkles, Cpu } from 'lucide-react';
import { runAgentStream, saveUserMessage, saveAssistantMessage, loadAgentMemory, saveAgentMemory, type ChatMessage, type ToolActivity, type SourceRef } from '../lib/agent/agentService';
import { NEMOTRON_MODELS } from '../lib/apiConfig';
import { useAuth } from '../lib/useAuth';
import './AgentChat.css';

const TOOL_META: Record<string, { icon: React.ReactNode; label: string }> = {
  run_stock_analysis: { icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Analysis' },
  web_search: { icon: <Search className="w-3.5 h-3.5" />, label: 'Web Search' },
  read_webpage: { icon: <Globe className="w-3.5 h-3.5" />, label: 'Crawling' },
  get_fno_chain: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'F&O Chain' },
  get_mutual_fund: { icon: <PieChart className="w-3.5 h-3.5" />, label: 'Mutual Fund' },
  get_global_quote: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Global Quote' },
  get_alphavantage: { icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Alpha Vantage' },
  get_fmp: { icon: <PieChart className="w-3.5 h-3.5" />, label: 'FMP' },
  execute_code: { icon: <Code2 className="w-3.5 h-3.5" />, label: 'Code Exec' }
};

const EFFORT_LEVELS = [
  { value: 'default', label: 'Default', desc: 'Fast, efficient', icon: <Zap className="w-4 h-4" /> },
  { value: 'medium', label: 'Medium', desc: 'Deeper research', icon: <Brain className="w-4 h-4" /> },
  { value: 'high', label: 'High', desc: 'Institutional grade', icon: <Sparkles className="w-4 h-4" /> }
] as const;

const SUGGESTIONS = [
  'Analyze RELIANCE with backtest',
  'Best small cap mutual funds 2024',
  'NIFTY options chain + IV analysis',
  'What\'s driving IT sector this week?',
  'Run custom momentum strategy on TCS'
];

const sanitizeSourceRef = (src: SourceRef): SourceRef => {
  let domain = src.domain || 'tradingview.com';
  if (domain.includes('scanner.tradingview.com')) domain = 'tradingview.com';
  let favicon = src.favicon;
  if (!favicon || favicon.includes('scanner.tradingview.com') || favicon.includes('gstatic.com') || favicon.includes('domain=javascript')) {
    favicon = 'https://icons.duckduckgo.com/ip3/tradingview.com.ico';
  }
  return { ...src, domain, favicon };
};

export const AgentChat: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isPulse, setIsPulse] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [progress, setProgress] = useState('');
  const [pendingTools, setPendingTools] = useState<ToolActivity[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [effort, setEffort] = useState<'default' | 'medium' | 'high'>('default');
  const [modelId, setModelId] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('agent_selected_model') : null;
    return NEMOTRON_MODELS.some(m => m.id === saved) ? (saved as string) : NEMOTRON_MODELS[0].id;
  });
  const [showEffortMenu, setShowEffortMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [allSources, setAllSources] = useState<SourceRef[]>([]);
  const [sourceMap, setSourceMap] = useState<Map<string, SourceRef>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const effortMenuRef = useRef<HTMLDivElement>(null);
  const sourcesPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTools, streamingContent, progress]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) setShowModelMenu(false);
      if (effortMenuRef.current && !effortMenuRef.current.contains(e.target as Node)) setShowEffortMenu(false);
      if (sourcesPanelRef.current && !sourcesPanelRef.current.contains(e.target as Node)) setShowSourcesPanel(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    loadAgentMemory(user.uid).then(mem => {
      if (mem?.chatHistory?.length) {
        const sanitizedHistory = mem.chatHistory.map(m => ({
          ...m,
          sources: m.sources?.map(sanitizeSourceRef),
          toolActivity: m.toolActivity?.map(t => ({
            ...t,
            sources: t.sources?.map(sanitizeSourceRef)
          }))
        }));
        setMessages(sanitizedHistory.slice(-20));
        const srcs: SourceRef[] = [];
        sanitizedHistory.forEach(m => m.sources?.forEach(s => srcs.push(s)));
        const uniq = Array.from(new Map(srcs.map(s => [`${s.type}:${s.domain}`, s])).values());
        setAllSources(uniq);
        uniq.forEach(s => setSourceMap(prev => new Map(prev).set(`${s.type}:${s.domain}`, s)));
        saveAgentMemory({ ...mem, chatHistory: sanitizedHistory });
      }
      if (mem?.preferences?.defaultEffort) setEffort(mem.preferences.defaultEffort);
    });
  }, [isAuthenticated, user]);

  const handleSend = useCallback(async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || isThinking || !user) return;

    setShowModelMenu(false);
    setShowEffortMenu(false);

    setInput('');
    setPendingTools([]);
    setProgress('');
    setStreamingContent('');

    const userMsg: ChatMessage = { role: 'user', content: userText, timestamp: Date.now(), effort };
    setMessages(prev => [...prev, userMsg]);
    saveUserMessage(user.uid, userMsg);
    setIsThinking(true);

    try {
      await runAgentStream(
        userText,
        user.uid,
        effort,

        {
          onToken: (token) => {
            console.log('[Chat] onToken:', token.length);
            setStreamingContent(prev => prev + token);
          },
          onToolActivity: (activity) => {
            console.log('[Chat] onToolActivity:', activity.tool, activity.summary);
            const sanitizedActivity = { ...activity, sources: activity.sources?.map(sanitizeSourceRef) };
            setPendingTools(prev => [...prev, sanitizedActivity]);
          },
          onProgress: (status) => {
            console.log('[Chat] onProgress:', status);
            setProgress(status);
          },
          onComplete: async (result) => {
            console.log('[Chat] onComplete:', result.content.length, 'toolActivity:', result.toolActivity.length);
            const sanitizedSources = (result.sources || []).map(sanitizeSourceRef);
            const sanitizedToolActivity = (result.toolActivity || []).map(t => ({
              ...t,
              sources: t.sources?.map(sanitizeSourceRef)
            }));
            const assistantMsg: ChatMessage = {
              role: 'assistant',
              content: result.content,
              toolActivity: sanitizedToolActivity,
              sources: sanitizedSources,
              timestamp: Date.now(),
              effort
            };
            setMessages(prev => [...prev, assistantMsg]);
            await saveAssistantMessage(user.uid, assistantMsg);
            setStreamingContent('');
            setPendingTools([]);
            setAllSources(prev => {
              const next = new Set([...prev, ...sanitizedSources].map(s => `${s.type}:${s.domain}`));
              return [...prev, ...sanitizedSources].filter(s => next.has(`${s.type}:${s.domain}`) && next.delete(`${s.type}:${s.domain}`));
            });
            const cleanMap = new Map<string, SourceRef>();
            result.sourceMap?.forEach((val, key) => cleanMap.set(key, sanitizeSourceRef(val)));
            setSourceMap(cleanMap);
          },
          onError: async (error) => {
            console.error('[Chat] onError:', error);
            const errMsg: ChatMessage = { role: 'assistant', content: `Agent error: ${error.message}. Please try again.`, timestamp: Date.now() };
            setMessages(prev => [...prev, errMsg]);
            await saveAssistantMessage(user.uid, errMsg);
            setStreamingContent('');
            setPendingTools([]);
          }
        },
        modelId
      );
    } catch (e: any) {
      console.error('[Chat] handleSend error:', e);
      const errMsg: ChatMessage = { role: 'assistant', content: `Agent error: ${e.message}`, timestamp: Date.now() };
      setMessages(prev => [...prev, errMsg]);
      await saveAssistantMessage(user.uid, errMsg);
      setStreamingContent('');
      setPendingTools([]);
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, effort, modelId, user]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setPendingTools([]);
    setAllSources([]);
    setSourceMap(new Map());
  };

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
    setIsPulse(false);
  };

  const renderToolChip = (activity: ToolActivity, i: number) => {
    const meta = TOOL_META[activity.tool] || { icon: <Wrench className="w-3.5 h-3.5" />, label: activity.tool };
    return (
      <div key={i} className={`agent-tool-chip ${activity.success ? 'ok' : 'fail'}`}>
        <span className="agent-tool-chip-icon">{meta.icon}</span>
        <div className="agent-tool-chip-body">
          <span className="agent-tool-chip-label">{meta.label}</span>
          <span className="agent-tool-chip-summary">{activity.summary}</span>
        </div>
        {activity.success
          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
          : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
      </div>
    );
  };

  const renderSourcesBubbles = () => {
    if (allSources.length === 0) return null;
    const display = allSources.slice(0, 4);
    const remaining = allSources.length - 4;
    return (
      <div className="agent-sources-bubbles">
        {display.map((src, i) => (
          <button
            key={i}
            className="agent-source-bubble"
            onClick={() => setShowSourcesPanel(true)}
            title={`${src.name} (${src.domain})`}
          >
            <img src={src.favicon} alt={src.name} className="agent-source-favicon" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="agent-source-name">{src.name}</span>
          </button>
        ))}
        {remaining > 0 && (
          <button className="agent-source-bubble more" onClick={() => setShowSourcesPanel(true)}>
            +{remaining}
          </button>
        )}
      </div>
    );
  };

  const currentModel = NEMOTRON_MODELS.find(m => m.id === modelId) || NEMOTRON_MODELS[0];
  const currentEffort = EFFORT_LEVELS.find(e => e.value === effort) || EFFORT_LEVELS[0];

  return (
    <>
      <button
        className={`agent-fab ${isPulse && !isOpen ? 'pulse' : ''} ${isOpen ? 'open' : ''}`}
        onClick={toggleOpen}
        aria-label="AI Agent"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="agent-panel">
          <div className="agent-panel-header">
            <div className="agent-panel-title">
              <div className="agent-avatar"><Bot className="w-5 h-5" /></div>
              <div>
                <h3>SentimentAI Agent</h3>
                <span className="agent-status">
                  {isThinking ? progress || 'Working...' : `${currentModel.shortLabel || currentModel.label} • ${currentEffort.label} Effort`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  className={`agent-header-pill ${showModelMenu ? 'active' : ''}`}
                  onClick={() => {
                    setShowModelMenu(prev => !prev);
                    setShowEffortMenu(false);
                  }}
                  aria-label="Model selection"
                  title={currentModel.label}
                >
                  <Cpu className="w-3.5 h-3.5 text-[#C4A77D] shrink-0" />
                  <span className="agent-pill-label">{currentModel.shortLabel || currentModel.label}</span>
                  <ChevronDown className={`w-3 h-3 text-white/50 transition-transform duration-200 ${showModelMenu ? 'rotate-180' : ''}`} />
                </button>
                {showModelMenu && (
                  <div className="agent-menu-dropdown model-dropdown">
                    <div className="agent-menu-header">AI Engine</div>
                    {NEMOTRON_MODELS.map(m => (
                      <button key={m.id} className={`effort-option ${modelId === m.id ? 'active' : ''}`} onClick={() => { setModelId(m.id); localStorage.setItem('agent_selected_model', m.id); setShowModelMenu(false); }}>
                        <Cpu className="w-4 h-4 text-[#C4A77D] shrink-0" />
                        <div>
                          <span className="effort-opt-label">{m.label}</span>
                          <span className="effort-opt-desc">{m.desc}</span>
                        </div>
                        {modelId === m.id && <CheckCircle2 className="w-4 h-4 text-[#C4A77D]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative" ref={effortMenuRef}>
                <button
                  type="button"
                  className={`agent-header-pill ${showEffortMenu ? 'active' : ''}`}
                  onClick={() => {
                    setShowEffortMenu(prev => !prev);
                    setShowModelMenu(false);
                  }}
                  aria-label="Effort level"
                  title={`${currentEffort.label} Effort`}
                >
                  <span className="shrink-0">{currentEffort.icon}</span>
                  <span className="agent-pill-label">{currentEffort.label}</span>
                  <ChevronDown className={`w-3 h-3 text-white/50 transition-transform duration-200 ${showEffortMenu ? 'rotate-180' : ''}`} />
                </button>
                {showEffortMenu && (
                  <div className="agent-menu-dropdown effort-dropdown">
                    <div className="agent-menu-header">Reasoning Depth</div>
                    {EFFORT_LEVELS.map(e => (
                      <button key={e.value} className={`effort-option ${effort === e.value ? 'active' : ''}`} onClick={() => { setEffort(e.value); setShowEffortMenu(false); }}>
                        <span>{e.icon}</span>
                        <div>
                          <span className="effort-opt-label">{e.label} Effort</span>
                          <span className="effort-opt-desc">{e.desc}</span>
                        </div>
                        {effort === e.value && <CheckCircle2 className="w-4 h-4 text-[#C4A77D]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {messages.length > 0 && (
                <button className="agent-header-btn" onClick={clearChat} aria-label="Clear chat">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button className="agent-header-btn" onClick={toggleOpen} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="agent-panel-messages">
            {messages.length === 0 && (
              <div className="agent-welcome">
                <Bot className="w-10 h-10 text-[#C4A77D] mb-3" />
                <h4>Nemotron 3 Ultra • Full Autonomy</h4>
                <p>I run your webapp's analysis engine, search the entire web, crawl pages, execute code, and remember our conversations. Choose effort level — I'll adapt.</p>
                <div className="agent-suggestions">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`agent-msg ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="agent-msg-avatar"><Bot className="w-4 h-4" /></div>
                )}
                <div className="agent-msg-bubble">
                  {msg.toolActivity && msg.toolActivity.length > 0 && (
                    <div className="agent-tool-trace">
                      {msg.toolActivity.map(renderToolChip)}
                    </div>
                  )}
                  <div className="agent-msg-text">
                    {i === messages.length - 1 && msg.role === 'assistant' && isThinking && streamingContent
                      ? streamingContent + '<span class="cursor-blink">▌</span>'
                      : msg.content}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="agent-msg-sources">
                      Sources: {msg.sources.map(s => <span key={`${s.type}:${s.domain}`} className="agent-inline-source" title={`${s.name} (${s.domain})`}>{s.name}</span>).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="agent-msg assistant">
                <div className="agent-msg-avatar"><Bot className="w-4 h-4" /></div>
                <div className="agent-msg-bubble">
                  {pendingTools.length > 0 && (
                    <div className="agent-tool-trace">{pendingTools.map(renderToolChip)}</div>
                  )}
                  <div className="agent-thinking">
                    <Loader2 className="w-4 h-4 animate-spin text-[#C4A77D]" />
                    <span>{progress || 'Thinking...'}</span>
                  </div>
                  {streamingContent && <div className="agent-streaming-preview" dangerouslySetInnerHTML={{ __html: streamingContent + '<span class="cursor-blink">▌</span>' }} />}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {renderSourcesBubbles()}

          <div className="agent-panel-input">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything — stocks, F&O, funds, code, news..."
              disabled={isThinking}
            />
            <button
              onClick={() => handleSend()}
              disabled={isThinking || !input.trim()}
              className="agent-send-btn"
              aria-label="Send"
            >
              {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {showSourcesPanel && (
        <div className="agent-sources-overlay" onClick={() => setShowSourcesPanel(false)}>
          <div className="agent-sources-panel" ref={sourcesPanelRef} onClick={e => e.stopPropagation()}>
            <div className="agent-sources-header">
              <h4>Sources Used This Session</h4>
              <button className="agent-header-btn" onClick={() => setShowSourcesPanel(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="agent-sources-list">
              {Array.from(sourceMap.values()).length === 0 ? (
                <p className="agent-sources-empty">No external sources used yet. Run an analysis or search to see sources here.</p>
              ) : (
                Array.from(sourceMap.values()).map((src, i) => (
                  <div key={i} className="agent-source-item">
                    <img src={src.favicon} alt={src.name} className="agent-source-favicon" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <div className="agent-source-info">
                      <span className="agent-source-name">{src.name}</span>
                      <span className="agent-source-domain">{src.domain}</span>
                    </div>
                    <div className="agent-source-tags">
                      <span className={`agent-source-tag ${src.type}`}>{src.type}</span>
                    </div>
                    {src.url && (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="agent-source-link">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};