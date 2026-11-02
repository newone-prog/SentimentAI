import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, Sparkles, X, Minus, Maximize2, Minimize2, Copy, Check, 
  ExternalLink, TrendingUp, TrendingDown, ShieldAlert, 
  CheckCircle2, Info, Lightbulb, Layers
} from 'lucide-react';

export interface FloatingResearchReportProps {
  isOpen: boolean;
  onClose: () => void;
  researchPaper: string | Record<string, any> | any[];
  stockName: string;
  source: string;
}

// Verdict detection regex
const VERDICT_REGEX = /\b(STRONG BUY|STRONG SELL|BULLISH|BEARISH|NEUTRAL|SIDEWAYS|ACCUMULATE|REDUCE|OVERWEIGHT|UNDERWEIGHT|HIGH CONVICTION)\b/gi;

/**
 * Parses inline markdown: bold, italic, code, links, and highlights verdict chips
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split by markdown elements: **bold**, `code`, [link](url)
  const tokens: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  parts.forEach((part, idx) => {
    if (!part) return;

    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      // Check for verdict highlight inside bold
      if (VERDICT_REGEX.test(inner)) {
        tokens.push(renderVerdictChips(inner, `bold-verdict-${idx}`));
      } else {
        tokens.push(
          <strong key={`b-${idx}`} className="font-semibold text-neutral-900 dark:text-neutral-100">
            {inner}
          </strong>
        );
      }
    } else if (part.startsWith('`') && part.endsWith('`')) {
      tokens.push(
        <code key={`c-${idx}`} className="research-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        tokens.push(
          <a
            key={`a-${idx}`}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="research-link inline-flex items-center gap-0.5 text-[#C4A77D] hover:underline"
          >
            {match[1]} <ExternalLink className="w-2.5 h-2.5" />
          </a>
        );
      } else {
        tokens.push(part);
      }
    } else {
      // Normal text: check if any verdict keywords appear
      tokens.push(renderVerdictChips(part, `txt-${idx}`));
    }
  });

  return <>{tokens}</>;
}

/**
 * Replaces verdict words in plain text with stylish glowing status pills
 */
function renderVerdictChips(text: string, keyPrefix: string): React.ReactNode {
  const parts = text.split(VERDICT_REGEX);
  if (parts.length <= 1) return text;

  return (
    <React.Fragment key={keyPrefix}>
      {parts.map((part, i) => {
        const upper = part.toUpperCase();
        if (['STRONG BUY', 'BULLISH', 'ACCUMULATE', 'OVERWEIGHT'].includes(upper)) {
          return (
            <span key={i} className="research-verdict-chip chip-bullish">
              <TrendingUp className="w-2.5 h-2.5" /> {upper}
            </span>
          );
        }
        if (['STRONG SELL', 'BEARISH', 'REDUCE', 'UNDERWEIGHT'].includes(upper)) {
          return (
            <span key={i} className="research-verdict-chip chip-bearish">
              <TrendingDown className="w-2.5 h-2.5" /> {upper}
            </span>
          );
        }
        if (['NEUTRAL', 'SIDEWAYS'].includes(upper)) {
          return (
            <span key={i} className="research-verdict-chip chip-neutral">
              {upper}
            </span>
          );
        }
        if (upper === 'HIGH CONVICTION') {
          return (
            <span key={i} className="research-verdict-chip chip-conviction">
              <Sparkles className="w-2.5 h-2.5" /> {upper}
            </span>
          );
        }
        return part;
      })}
    </React.Fragment>
  );
}

/**
 * Checks if a line represents a visual progress meter or gauge
 */
function tryParseVisualBar(line: string): { label: string; valueText: string; percent: number; colorClass: string } | null {
  const trimmed = line.trim();

  // Pattern 1: ASCII Progress Bar e.g. "Confidence: [████████░░ 80%]" or "[====---- 65%]"
  const asciiMatch = trimmed.match(/(?:[-*]\s*)?(.*?):\s*\[?[█=\-░# ]+?\s*(\d{1,3})%\s*\]?/i);
  if (asciiMatch) {
    const label = asciiMatch[1].replace(/\*\*/g, '').trim();
    const pct = Math.min(100, Math.max(0, parseInt(asciiMatch[2], 10)));
    return {
      label: label || 'Metric Score',
      valueText: `${pct}%`,
      percent: pct,
      colorClass: pct >= 65 ? 'bar-bullish' : pct <= 40 ? 'bar-bearish' : 'bar-neutral'
    };
  }

  // Pattern 2: "Fear & Greed Index: 65/100" or "Sentiment Score: 78/100"
  const ratioMatch = trimmed.match(/(?:[-*]\s*)?\*\*?(Fear & Greed.*?|Sentiment.*?|Confidence.*?|Heat.*?|Momentum.*?|RSI.*?)\*\*?:\s*(\d{1,3}(?:\.\d+)?)\s*(?:\/\s*100)?(?:\s*\(.*?\))?/i);
  if (ratioMatch) {
    const label = ratioMatch[1].replace(/\*\*/g, '').trim();
    const rawVal = parseFloat(ratioMatch[2]);
    const pct = Math.min(100, Math.max(0, Math.round(rawVal)));
    const colorClass = (label.toLowerCase().includes('fear') && pct < 40) ? 'bar-bearish'
      : pct >= 65 ? 'bar-bullish' 
      : pct <= 40 ? 'bar-bearish' 
      : 'bar-neutral';
    return {
      label,
      valueText: `${rawVal}${trimmed.includes('/100') ? '/100' : '%'}`,
      percent: pct,
      colorClass
    };
  }

  // Pattern 3: Explicit "Confidence: 85%" or "Model Confidence: 75%"
  const confMatch = trimmed.match(/(?:[-*]\s*)?\*\*?(Model Confidence|Confidence Score|Social Heat|Technical Strength|Win Rate)\*\*?:\s*(\d{1,3})%/i);
  if (confMatch) {
    const label = confMatch[1].replace(/\*\*/g, '').trim();
    const pct = Math.min(100, Math.max(0, parseInt(confMatch[2], 10)));
    return {
      label,
      valueText: `${pct}%`,
      percent: pct,
      colorClass: pct >= 65 ? 'bar-bullish' : pct <= 40 ? 'bar-bearish' : 'bar-neutral'
    };
  }

  return null;
}

/**
 * Checks if a line is a metric bullet (e.g. `- **P/E Ratio**: 24.5x`)
 */
function tryParseMetricBullet(line: string): { key: string; val: string } | null {
  const match = line.trim().match(/^[-*]\s+\*\*([^*:]+?)\*\*:\s*(.+)$/);
  if (!match) return null;
  return {
    key: match[1].trim(),
    val: match[2].trim()
  };
}

/**
 * Main parser component for a single section block
 */
const SectionRenderer: React.FC<{ sectionText: string; sectionIndex: number }> = ({ sectionText, sectionIndex }) => {
  const lines = sectionText.trim().split('\n');
  if (lines.length === 0) return null;

  // Extract section title
  let title = lines[0].replace(/\s*={1,3}\s*/g, '').replace(/^#+\s*/, '').trim();
  title = title.replace(/\*\*/g, '');
  const bodyLines = lines.slice(1);

  // Group body lines into semantic blocks (tables, metric grids, visual bars, callouts, code blocks, paragraphs)
  const renderedBlocks: React.ReactNode[] = [];
  let i = 0;

  while (i < bodyLines.length) {
    const line = bodyLines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // 1. Code block fence (```)
    if (line.startsWith('```')) {
      const lang = line.replace(/^```/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < bodyLines.length && !bodyLines[i].trim().startsWith('```')) {
        codeLines.push(bodyLines[i]);
        i++;
      }
      i++; // skip closing ```
      const fullCode = codeLines.join('\n');
      renderedBlocks.push(
        <div key={`code-${i}`} className="research-code-container">
          <div className="research-code-header">
            <span className="font-mono text-[11px] text-neutral-400 uppercase">{lang || 'CODE'}</span>
            <button
              onClick={() => navigator.clipboard.writeText(fullCode)}
              className="text-[11px] text-[#C4A77D] hover:underline flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
          <pre className="research-code-body">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Markdown Table Detection (consecutive lines starting and ending with |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < bodyLines.length && bodyLines[i].trim().startsWith('|') && bodyLines[i].trim().endsWith('|')) {
        tableLines.push(bodyLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // Line 0 is header, Line 1 is separator |---|---|, Line 2+ are rows
        const parseRow = (rowStr: string) => 
          rowStr.slice(1, -1).split('|').map(c => c.trim());

        const headers = parseRow(tableLines[0]);
        const isSeparator = (s: string) => /^:?-+:?$/.test(s.trim());
        const hasSep = tableLines.length > 1 && parseRow(tableLines[1]).every(isSeparator);
        const dataRows = (hasSep ? tableLines.slice(2) : tableLines.slice(1)).map(parseRow);

        renderedBlocks.push(
          <div key={`tbl-${i}`} className="research-table-wrapper my-4">
            <table className="research-table">
              <thead>
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx}>{renderInlineMarkdown(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{renderInlineMarkdown(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Visual Bar / Progress Gauge Detection
    const barData = tryParseVisualBar(line);
    if (barData) {
      renderedBlocks.push(
        <div key={`bar-${i}`} className="research-bar-card my-3">
          <div className="research-bar-meta">
            <span className="research-bar-label font-medium">{barData.label}</span>
            <span className="research-bar-value font-mono font-bold">{barData.valueText}</span>
          </div>
          <div className="research-bar-track">
            <div 
              className={`research-bar-fill ${barData.colorClass}`} 
              style={{ width: `${barData.percent}%` }}
            />
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 4. Consecutive Metric Bullets (render as high-density metric grid)
    const metricItem = tryParseMetricBullet(line);
    if (metricItem) {
      const metricList: Array<{ key: string; val: string }> = [metricItem];
      i++;
      while (i < bodyLines.length) {
        const nextLine = bodyLines[i].trim();
        const nextItem = tryParseMetricBullet(nextLine);
        if (nextItem) {
          metricList.push(nextItem);
          i++;
        } else {
          break;
        }
      }

      if (metricList.length >= 2) {
        renderedBlocks.push(
          <div key={`mgrid-${i}`} className="research-metric-grid my-4">
            {metricList.map((m, mIdx) => (
              <div key={mIdx} className="research-metric-card">
                <span className="research-metric-key">{m.key}</span>
                <span className="research-metric-val">{renderInlineMarkdown(m.val)}</span>
              </div>
            ))}
          </div>
        );
        continue;
      } else {
        // Just 1 metric bullet, render as stylized row
        renderedBlocks.push(
          <div key={`mitem-${i}`} className="research-metric-row my-2">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{metricList[0].key}:</span>{' '}
            <span>{renderInlineMarkdown(metricList[0].val)}</span>
          </div>
        );
        continue;
      }
    }

    // 5. Blockquote / Callout Alert (starts with >)
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < bodyLines.length && bodyLines[i].trim().startsWith('>')) {
        quoteLines.push(bodyLines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      const quoteContent = quoteLines.join(' ');
      const isWarning = /risk|warning|danger|stop|caution|threat/i.test(quoteContent);
      const isCatalyst = /catalyst|opportunity|upside|target|growth/i.test(quoteContent);

      renderedBlocks.push(
        <div key={`callout-${i}`} className={`research-callout ${isWarning ? 'callout-warning' : isCatalyst ? 'callout-catalyst' : 'callout-info'} my-3`}>
          <div className="research-callout-icon">
            {isWarning ? <ShieldAlert className="w-4 h-4 text-red-500" /> : isCatalyst ? <Lightbulb className="w-4 h-4 text-amber-500" /> : <Info className="w-4 h-4 text-[#C4A77D]" />}
          </div>
          <div className="research-callout-text">
            {renderInlineMarkdown(quoteContent)}
          </div>
        </div>
      );
      continue;
    }

    // 6. Subheading (#### or ### or bold headline)
    if (line.startsWith('####') || line.startsWith('###')) {
      const subTitle = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
      renderedBlocks.push(
        <h4 key={`sub-${i}`} className="research-subheading font-bold text-neutral-800 dark:text-neutral-200 mt-4 mb-2">
          {subTitle}
        </h4>
      );
      i++;
      continue;
    }

    // 7. Bullet or Ordered list
    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      const cleanBullet = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      renderedBlocks.push(
        <li key={`li-${i}`} className="research-list-item flex items-start gap-2 my-1.5 ml-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C4A77D] mt-2 shrink-0" />
          <span className="flex-1">{renderInlineMarkdown(cleanBullet)}</span>
        </li>
      );
      i++;
      continue;
    }

    // 8. Normal Paragraph
    renderedBlocks.push(
      <p key={`p-${i}`} className="research-paragraph text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 my-2.5">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return (
    <div id={`sec-${sectionIndex}`} className="research-section mb-8 scroll-mt-20">
      {title && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#E5E0D8] dark:border-white/10">
          <span className="w-2 h-2 rounded-full bg-[#C4A77D]" />
          <h3 className="research-section-title font-bold text-base md:text-lg text-neutral-900 dark:text-white">
            {title}
          </h3>
        </div>
      )}
      <div className="research-section-body space-y-1">
        {renderedBlocks}
      </div>
    </div>
  );
};

export const FloatingResearchReport: React.FC<FloatingResearchReportProps> = ({
  isOpen,
  onClose,
  researchPaper,
  stockName,
  source
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Parse research paper text
  const rawText = useMemo(() => {
    if (typeof researchPaper === 'string') return researchPaper;
    if (Array.isArray(researchPaper)) return researchPaper.join('\n\n');
    if (typeof researchPaper === 'object' && researchPaper !== null) {
      return Object.entries(researchPaper)
        .map(([k, v]) => `### ${k}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 2)}`)
        .join('\n\n');
    }
    return String(researchPaper || '');
  }, [researchPaper]);

  // Split into sections
  const sections = useMemo(() => {
    if (!rawText) return [];
    const splitRegex = rawText.includes('###') ? /(?:^|\n)###\s+/ : /={3}\s*/;
    const parts = rawText.split(splitRegex).filter(s => s.trim());
    return parts;
  }, [rawText]);

  // Section titles for quick navigation chips
  const sectionTitles = useMemo(() => {
    return sections.map((sec, idx) => {
      const firstLine = sec.trim().split('\n')[0];
      const clean = firstLine
        .replace(/\s*={1,3}\s*/g, '')
        .replace(/^#+\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/^\d+\.\s*/, '')
        .trim();
      return clean || `Section ${idx + 1}`;
    });
  }, [sections]);

  // Handle ESC key to minimize or close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isExpanded, onClose]);

  // Copy full report
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [rawText]);

  // Smooth jump to section
  const jumpToSection = (idx: number) => {
    setActiveSection(idx);
    const target = document.getElementById(`sec-${idx}`);
    if (target && scrollRef.current) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isOpen) return null;

  // MINIMIZED DOCKED PILL: Sleek floating widget at bottom right
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9995] animate-bounce-subtle pointer-events-auto">
        <div 
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-3 px-4 py-3 bg-[#0A0A0A]/95 hover:bg-[#141414] text-white border border-[#C4A77D]/40 rounded-full shadow-2xl backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-105 group"
        >
          <div className="w-8 h-8 rounded-full bg-[#C4A77D]/20 flex items-center justify-center text-[#C4A77D] group-hover:bg-[#C4A77D] group-hover:text-black transition-colors">
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-left pr-1">
            <div className="text-xs font-semibold tracking-wide flex items-center gap-1.5">
              <span>{stockName} Research</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-[10px] text-[#C4A77D] font-mono">Docked • Click to restore</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // FLOATING FIXED POPUP WINDOW
  // Crucial: Container has pointer-events: none so main website is fully scrollable and interactive!
  // Only the floating window element itself has pointer-events: auto.
  return (
    <div className="fixed inset-0 pointer-events-none z-[9990] flex items-end justify-end p-4 md:p-6">
      <div
        ref={dialogRef}
        className={`pointer-events-auto flex flex-col bg-[#FAF8F5] dark:bg-[#111111] text-neutral-900 dark:text-neutral-100 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.4)] border border-[#E5E0D8] dark:border-white/15 overflow-hidden transition-all duration-300 ease-out ${
          isExpanded
            ? 'w-[calc(100vw-32px)] md:w-[1040px] h-[92vh] max-h-[92vh]'
            : 'w-[calc(100vw-24px)] md:w-[680px] h-[84vh] max-h-[820px]'
        }`}
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(196, 167, 125, 0.3)'
        }}
      >
        {/* WINDOW HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-[#181818] border-b border-[#E5E0D8] dark:border-white/10 select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C4A77D]/15 flex items-center justify-center text-[#C4A77D]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                  {stockName}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#C4A77D]/15 text-[#C4A77D] font-semibold uppercase tracking-wider">
                  Equity Research
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                <Sparkles className="w-3 h-3 text-[#C4A77D]" />
                <span className="truncate max-w-[200px] md:max-w-xs">{source}</span>
              </div>
            </div>
          </div>

          {/* WINDOW CONTROLS */}
          <div className="flex items-center gap-1.5">
            {/* Copy Report */}
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
              title={copied ? "Copied to clipboard!" : "Copy Full Report"}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Minimize to Dock Pill */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
              title="Minimize to Floating Dock"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Maximize / Restore */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors hidden sm:inline-flex"
              title={isExpanded ? "Restore Size" : "Expand Full View"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-500 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors ml-1"
              title="Close Research Report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* QUICK SECTION NAVIGATION PILL BAR */}
        {sectionTitles.length > 1 && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F3EFEA] dark:bg-[#151515] border-b border-[#E5E0D8] dark:border-white/10 overflow-x-auto hide-scrollbar shrink-0 text-xs font-medium">
            <span className="text-[10px] text-neutral-400 uppercase font-mono tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#C4A77D]" /> Jump:
            </span>
            {sectionTitles.map((title, idx) => (
              <button
                key={idx}
                onClick={() => jumpToSection(idx)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all text-[11px] font-mono ${
                  activeSection === idx
                    ? 'bg-[#C4A77D] text-black font-bold shadow-sm'
                    : 'bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {idx + 1}. {title}
              </button>
            ))}
          </div>
        )}

        {/* SCROLLABLE RESEARCH REPORT BODY */}
        <div
          ref={scrollRef}
          className="research-dialog-body flex-1 overflow-y-auto px-5 md:px-7 py-6 space-y-2 focus:outline-none"
        >
          {sections.map((section, idx) => (
            <SectionRenderer key={idx} sectionText={section} sectionIndex={idx} />
          ))}
        </div>

        {/* WINDOW FOOTER */}
        <div className="px-5 py-2.5 bg-[#F5F1EB] dark:bg-[#161616] border-t border-[#E5E0D8] dark:border-white/10 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Institutional Multi-Agent Synthesis</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400">
            Scroll page freely • Report stays pinned
          </span>
        </div>
      </div>
    </div>
  );
};
