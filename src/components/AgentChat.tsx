import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, Search, Globe, BarChart3, PieChart, TrendingUp, CheckCircle2, XCircle, Wrench, Trash2 } from 'lucide-react';
import { runAgent, type ChatMessage, type ToolActivity } from '../lib/agent/agentService';
import './AgentChat.css';

const TOOL_META: Record<string, { icon: React.ReactNode; label: string }> = {
  run_stock_analysis: { icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Running Analysis' },
  web_search: { icon: <Search className="w-3.5 h-3.5" />, label: 'Web Search' },
  read_webpage: { icon: <Globe className="w-3.5 h-3.5" />, label: 'Crawling Page' },
  get_fno_chain: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'F&O Chain' },
  get_mutual_fund: { icon: <PieChart className="w-3.5 h-3.5" />, label: 'Mutual Fund' },
  get_global_quote: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Global Quote' }
};

const SUGGESTIONS = [
  'Analyze RELIANCE',
  'Best small cap mutual funds',
  'NIFTY options chain',
  'What\'s driving IT sector news?'
];

export const AgentChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPulse, setIsPulse] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [progress, setProgress] = useState('');
  const [pendingTools, setPendingTools] = useState<ToolActivity[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTools, progress]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const handleSend = useCallback(async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || isThinking) return;

    setInput('');
    setPendingTools([]);
    setProgress('');

    const history: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(history);
    setIsThinking(true);

    try {
      const result = await runAgent(
        userText,
        messages,
        (activity) => {
          setPendingTools(prev => [...prev, activity]);
        },
        (status) => setProgress(status)
      );

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.content,
        toolActivity: result.toolActivity
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Agent error: ${e.message}. Please try again.`
      }]);
    } finally {
      setIsThinking(false);
      setPendingTools([]);
      setProgress('');
    }
  }, [input, isThinking, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setPendingTools([]);
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
                  {isThinking ? progress || 'Working...' : 'Autonomous • Full Web Access'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
                <h4>Financial Intelligence, On Demand</h4>
                <p>I control this webapp's analysis engine and the entire internet. Ask me anything — I decide which tools to run.</p>
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
                  <div className="agent-msg-text">{msg.content}</div>
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
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="agent-panel-input">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything — stocks, F&O, funds, news..."
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
    </>
  );
};
