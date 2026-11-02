import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, TrendingDown, Minus, Activity, BarChart2, Table as TableIcon,
  Sparkles, Info, ExternalLink
} from 'lucide-react';

interface MetricItem {
  title: string;
  value: string | number;
  delta?: string | number;
}

interface MetricCardsData {
  title?: string;
  metrics: MetricItem[];
}

interface ComparisonItem {
  name: string;
  [key: string]: any;
}

interface ComparisonKey {
  key: string;
  label: string;
}

interface ComparisonData {
  title?: string;
  items: ComparisonItem[];
  keys: ComparisonKey[];
}

interface TableData {
  title?: string;
  data: any[];
  columns?: Array<string | { key: string; label: string }>;
  sortable?: boolean;
  filterable?: boolean;
  pageSize?: number;
}

interface ChartPoint {
  [key: string]: any;
}

interface ChartData {
  title?: string;
  data: ChartPoint[];
  chart_type?: string;
  chartType?: string;
  x_key?: string;
  xKey?: string;
  y_keys?: string[];
  yKeys?: string[];
  height?: number;
}

const VERDICT_REGEX = /\b(STRONG BUY|STRONG SELL|BULLISH|BEARISH|NEUTRAL-TO-BEARISH|NEUTRAL-TO-BUY|NEUTRAL|SIDEWAYS|OVERBOUGHT|OVERSOLD|EXTREME GREED|EXTREME FEAR|GREED|FEAR|ACCUMULATE|REDUCE|BUY|SELL)\b/gi;

function renderVerdictBadge(word: string, key: string | number) {
  const upper = word.toUpperCase();
  if (['STRONG BUY', 'BULLISH', 'NEUTRAL-TO-BUY', 'BUY', 'ACCUMULATE', 'OVERSOLD'].includes(upper)) {
    return (
      <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <TrendingUp className="w-3 h-3" /> {upper}
      </span>
    );
  }
  if (['STRONG SELL', 'BEARISH', 'NEUTRAL-TO-BEARISH', 'SELL', 'REDUCE', 'OVERBOUGHT'].includes(upper)) {
    return (
      <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <TrendingDown className="w-3 h-3" /> {upper}
      </span>
    );
  }
  return (
    <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#C4A77D]/15 text-[#C4A77D] border border-[#C4A77D]/30">
      <Minus className="w-3 h-3" /> {upper}
    </span>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split by markdown bold, backticks, citations [Source], or verdict keywords
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\)|\b(?:STRONG BUY|STRONG SELL|BULLISH|BEARISH|NEUTRAL-TO-BEARISH|NEUTRAL-TO-BUY|NEUTRAL|SIDEWAYS|OVERBOUGHT|OVERSOLD|EXTREME GREED|EXTREME FEAR|GREED|FEAR|BUY|SELL)\b)/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;

        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2);
          if (VERDICT_REGEX.test(inner)) {
            return renderVerdictBadge(inner, idx);
          }
          return <strong key={idx} className="font-semibold text-white/95">{renderInlineMarkdown(inner)}</strong>;
        }

        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={idx} className="px-1.5 py-0.5 rounded bg-white/10 text-[#C4A77D] font-mono text-[11px]">
              {part.slice(1, -1)}
            </code>
          );
        }

        if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
          const match = part.match(/\[(.*?)\]\((.*?)\)/);
          if (match) {
            return (
              <a
                key={idx}
                href={match[2]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C4A77D] hover:underline inline-flex items-center gap-0.5"
              >
                {match[1]} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            );
          }
        }

        if (VERDICT_REGEX.test(part)) {
          return renderVerdictBadge(part, idx);
        }

        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

// ─── COMPONENT: METRIC CARDS ───
const MetricCardsRenderer: React.FC<{ data: MetricCardsData }> = ({ data }) => {
  return (
    <div className="agent-ui-card my-3 p-3.5 rounded-xl bg-white/[0.04] border border-[#C4A77D]/25 backdrop-blur-md">
      {data.title && (
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-[#C4A77D]">
          <Activity className="w-3.5 h-3.5" />
          <span>{data.title}</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {(data.metrics || []).map((m, idx) => {
          const deltaStr = String(m.delta || '').trim();
          const isPos = deltaStr.startsWith('+') || deltaStr.includes('vs Buy & Hold: +');
          const isNeg = deltaStr.startsWith('-') || deltaStr.includes('vs Buy & Hold: -');

          return (
            <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-white/5 hover:border-[#C4A77D]/30 transition-colors">
              <div className="text-[10px] text-white/50 uppercase tracking-wider font-medium truncate" title={m.title}>
                {m.title}
              </div>
              <div className="text-base font-bold text-white/90 mt-0.5 tracking-tight">
                {m.value}
              </div>
              {deltaStr && (
                <div className={`text-[10.5px] mt-1 font-medium flex items-center gap-0.5 ${isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-white/40'}`}>
                  {isPos && <TrendingUp className="w-2.5 h-2.5 inline" />}
                  {isNeg && <TrendingDown className="w-2.5 h-2.5 inline" />}
                  <span className="truncate" title={deltaStr}>{deltaStr}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── COMPONENT: COMPARISON ───
const ComparisonRenderer: React.FC<{ data: ComparisonData }> = ({ data }) => {
  const keys = data.keys || [];
  const items = data.items || [];

  return (
    <div className="agent-ui-card my-3 p-3.5 rounded-xl bg-white/[0.04] border border-[#C4A77D]/25 backdrop-blur-md overflow-hidden">
      {data.title && (
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-[#C4A77D]">
          <BarChart2 className="w-3.5 h-3.5" />
          <span>{data.title}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              {keys.map((k, idx) => (
                <th key={idx} className="p-2 font-semibold text-white/70 whitespace-nowrap">
                  {k.label || k.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((item, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-white/[0.03] transition-colors">
                {keys.map((k, colIdx) => {
                  const val = item[k.key];
                  const valStr = String(val ?? '');
                  const isNum = typeof val === 'number';
                  const isReturn = k.key.toLowerCase().includes('return');
                  const isPos = isNum && val > 0;
                  const isNeg = isNum && val < 0;

                  return (
                    <td key={colIdx} className="p-2 whitespace-nowrap">
                      {isReturn && isNum ? (
                        <span className={`font-semibold ${isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-white/70'}`}>
                          {val > 0 ? `+${val}%` : `${val}%`}
                        </span>
                      ) : colIdx === 0 ? (
                        <span className="font-semibold text-white/90">{valStr}</span>
                      ) : (
                        <span className="text-white/75">{valStr}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── COMPONENT: INTERACTIVE DATA TABLE ───
const TableRenderer: React.FC<{ data: TableData }> = ({ data }) => {
  const rows = data.data || [];
  const rawCols = data.columns || (rows[0] ? Object.keys(rows[0]) : []);
  const cols = rawCols.map(c => typeof c === 'string' ? { key: c, label: c.replace(/_/g, ' ') } : c);
  const [page, setPage] = useState(0);
  const pageSize = data.pageSize || 8;
  const totalPages = Math.ceil(rows.length / pageSize);
  const pagedRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="agent-ui-card my-3 p-3.5 rounded-xl bg-white/[0.04] border border-[#C4A77D]/25 backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between mb-2.5">
        {data.title && (
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4A77D]">
            <TableIcon className="w-3.5 h-3.5" />
            <span>{data.title}</span>
          </div>
        )}
        <span className="text-[10px] text-white/40">{rows.length} rows</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/5">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-black/60 border-b border-white/10">
              {cols.map((col, idx) => (
                <th key={idx} className="p-2 text-[10.5px] font-semibold text-[#C4A77D]/90 uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-black/20">
            {pagedRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.03] transition-colors">
                {cols.map((col, cIdx) => {
                  const val = row[col.key];
                  const valStr = typeof val === 'number' ? (Number.isInteger(val) ? String(val) : val.toFixed(2)) : String(val ?? '');
                  const isType = col.key.toLowerCase() === 'type';
                  const isBuy = isType && valStr.toUpperCase() === 'BUY';
                  const isSell = isType && valStr.toUpperCase() === 'SELL';

                  return (
                    <td key={cIdx} className="p-2 whitespace-nowrap text-white/80">
                      {isBuy ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">BUY</span>
                      ) : isSell ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">SELL</span>
                      ) : (
                        valStr
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2.5 text-[10.5px] text-white/50">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── COMPONENT: INTERACTIVE SVG CHART ───
const ChartRenderer: React.FC<{ data: ChartData }> = ({ data }) => {
  const points = data.data || [];
  const xKey = data.x_key || data.xKey || (points[0] ? Object.keys(points[0])[0] : 'x');
  const yKeys = data.y_keys || data.yKeys || (points[0] ? Object.keys(points[0]).filter(k => k !== xKey) : ['value']);

  const colors = ['#C4A77D', '#10B981', '#38BDF8', '#F43F5E'];

  const chartInfo = useMemo(() => {
    if (!points.length) return null;
    const allVals: number[] = [];
    points.forEach(p => {
      yKeys.forEach(k => {
        const v = Number(p[k]);
        if (!isNaN(v)) allVals.push(v);
      });
    });

    if (!allVals.length) return null;
    let min = Math.min(...allVals);
    let max = Math.max(...allVals);
    if (min === max) { min -= 1; max += 1; }
    const padding = (max - min) * 0.08;
    return { minY: min - padding, maxY: max + padding };
  }, [points, yKeys]);

  if (!chartInfo || points.length < 2) return null;

  const width = 420;
  const height = 180;
  const padLeft = 45;
  const padRight = 15;
  const padTop = 15;
  const padBottom = 25;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getY = (val: number) => {
    return padTop + plotH - ((val - chartInfo.minY) / (chartInfo.maxY - chartInfo.minY)) * plotH;
  };

  const getX = (idx: number) => {
    return padLeft + (idx / (points.length - 1)) * plotW;
  };

  return (
    <div className="agent-ui-card my-3 p-3.5 rounded-xl bg-white/[0.04] border border-[#C4A77D]/25 backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        {data.title && (
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4A77D]">
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{data.title}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-2 text-[10px]">
        {yKeys.map((key, i) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-white/70 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
          </div>
        ))}
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto drop-shadow">
          <defs>
            {yKeys.map((key, i) => (
              <linearGradient key={key} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity="0.35" />
                <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padTop + plotH * pct;
            const val = chartInfo.maxY - pct * (chartInfo.maxY - chartInfo.minY);
            return (
              <g key={idx}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.4)">
                  {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Lines and Areas */}
          {yKeys.map((key, i) => {
            const coords = points.map((p, idx) => ({ x: getX(idx), y: getY(Number(p[key]) || 0) }));
            const pathD = coords.reduce((acc, c, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`, '');
            const areaD = `${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;

            return (
              <g key={key}>
                <path d={areaD} fill={`url(#grad-${i})`} />
                <path d={pathD} fill="none" stroke={colors[i % colors.length]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {coords.map((c, ptIdx) => (
                  <circle
                    key={ptIdx}
                    cx={c.x}
                    cy={c.y}
                    r="2.5"
                    fill="#0F0F0F"
                    stroke={colors[i % colors.length]}
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}

          {/* X Axis labels */}
          {points.map((p, idx) => {
            if (idx === 0 || idx === points.length - 1 || idx === Math.floor(points.length / 2)) {
              return (
                <text key={idx} x={getX(idx)} y={height - 8} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.45)">
                  {String(p[xKey])}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    </div>
  );
};

// ─── PARSER: SPLIT MESSAGE INTO MARKDOWN & UI ACTION CHUNKS ───
interface ContentChunk {
  type: 'markdown' | 'ui';
  uiType?: string;
  uiData?: any;
  text?: string;
}

function parseMessageChunks(rawText: string): ContentChunk[] {
  if (!rawText) return [];

  // 1. Clean hallucinated raw "[object Object]" sources
  let cleanText = rawText.replace(/Sources:\s*(\[object Object\](,\s*)?)+/gi, '').trim();

  // 2. Extract <sys.ui_*> blocks
  const TAG_REGEX = /<sys\.(ui_[a-z_]+)>([\s\S]*?)<\/sys\.\1>/gi;
  const chunks: ContentChunk[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_REGEX.exec(cleanText)) !== null) {
    const textBefore = cleanText.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      chunks.push({ type: 'markdown', text: textBefore });
    }

    const uiTag = match[1];
    const rawJson = match[2].trim();
    try {
      const parsedData = JSON.parse(rawJson);
      chunks.push({ type: 'ui', uiType: uiTag, uiData: parsedData });
    } catch (e) {
      // If JSON is malformed, fall back to plain markdown
      chunks.push({ type: 'markdown', text: `\`\`\`json\n${rawJson}\n\`\`\`` });
    }

    lastIndex = TAG_REGEX.lastIndex;
  }

  const remainder = cleanText.substring(lastIndex);
  if (remainder.trim()) {
    chunks.push({ type: 'markdown', text: remainder });
  }

  return chunks;
}

// ─── COMPONENT: MARKDOWN CHUNK RENDERER ───
const MarkdownBlock: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string | number) => {
    if (!tableRows.length) return;
    const [headerRow, ...bodyRows] = tableRows;
    const cleanHeader = headerRow.map(c => c.trim());
    elements.push(
      <div key={`table-${key}`} className="my-2.5 overflow-x-auto rounded-lg border border-white/10 bg-black/40">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.06] border-b border-white/10">
              {cleanHeader.map((h, i) => (
                <th key={i} className="p-2 text-[10.5px] font-semibold text-[#C4A77D] uppercase tracking-wider whitespace-nowrap">
                  {renderInlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.03] transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2 whitespace-nowrap text-white/80">
                    {renderInlineMarkdown(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Markdown Table check
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1, -1).split('|');
      // Ignore separator line like |---|---|
      if (cells.every(c => /^[-:\s]+$/.test(c))) {
        inTable = true;
        return;
      }
      tableRows.push(cells);
      inTable = true;
      return;
    } else if (inTable) {
      flushTable(i);
    }

    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      return;
    }

    // Horizontal Rule
    if (/^---|\*\*\*|___$/.test(trimmed)) {
      elements.push(
        <div key={`hr-${i}`} className="my-3 h-[1px] bg-gradient-to-r from-transparent via-[#C4A77D]/40 to-transparent" />
      );
      return;
    }

    // Headers
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-bold text-white mt-3 mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#C4A77D]" />
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-bold text-[#C4A77D] mt-2 mb-1 flex items-center gap-1.5 uppercase tracking-wider">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h5 key={`h4-${i}`} className="text-[11px] font-semibold text-white/70 mt-2 mb-0.5 uppercase tracking-wide">
          {renderInlineMarkdown(trimmed.slice(5))}
        </h5>
      );
      return;
    }

    // Bullet lists
    if (/^[-*•]\s/.test(trimmed)) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 text-xs text-white/80 my-0.5 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C4A77D] shrink-0 mt-1.5" />
          <span className="flex-1">{renderInlineMarkdown(trimmed.replace(/^[-*•]\s/, ''))}</span>
        </div>
      );
      return;
    }

    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 text-xs text-white/80 my-1 leading-relaxed">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-[10px] font-bold text-[#C4A77D] shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <span className="flex-1">{renderInlineMarkdown(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // Disclaimer / Italic text
    if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
      elements.push(
        <div key={`disc-${i}`} className="text-[10px] italic text-white/45 my-1.5 flex items-start gap-1">
          <Info className="w-3 h-3 text-[#C4A77D]/70 shrink-0 mt-0.5" />
          <span>{trimmed.slice(1, -1)}</span>
        </div>
      );
      return;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-white/85 leading-relaxed my-1">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  if (inTable) flushTable('end');

  return <>{elements}</>;
};

// ─── MAIN EXPORT: AGENT MESSAGE RENDERER ───
export const AgentMessageRenderer: React.FC<{
  content: string;
  isStreaming?: boolean;
  isUser?: boolean;
}> = ({ content, isStreaming, isUser }) => {
  if (isUser) {
    return <span className="text-xs text-white font-medium whitespace-pre-wrap">{content}</span>;
  }

  const chunks = useMemo(() => parseMessageChunks(content), [content]);

  return (
    <div className="agent-rendered-content text-xs text-white/90 space-y-1">
      {chunks.map((chunk, idx) => {
        if (chunk.type === 'ui') {
          switch (chunk.uiType) {
            case 'ui_metric_cards':
              return <MetricCardsRenderer key={idx} data={chunk.uiData} />;
            case 'ui_comparison':
              return <ComparisonRenderer key={idx} data={chunk.uiData} />;
            case 'ui_table':
              return <TableRenderer key={idx} data={chunk.uiData} />;
            case 'ui_chart':
              return <ChartRenderer key={idx} data={chunk.uiData} />;
            default:
              return <div key={idx} className="p-2 rounded bg-white/5 my-2 text-xs font-mono">{JSON.stringify(chunk.uiData)}</div>;
          }
        }

        return <MarkdownBlock key={idx} text={chunk.text || ''} />;
      })}

      {isStreaming && <span className="cursor-blink">▌</span>}
    </div>
  );
};
