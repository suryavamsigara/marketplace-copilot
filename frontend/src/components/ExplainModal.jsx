import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFilters } from '../context/FilterContext';
import { api } from '../api/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  X,
  Sparkles,
  Bot,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Activity,
} from 'lucide-react';

export default function ExplainModal() {
  const navigate = useNavigate();
  const { explainModal, closeExplain } = useFilters();
  const { isOpen, subjectType, subjectId, title, subtitle } = explainModal;

  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStreamedText('');
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setStreamedText('');
    setError(null);

    api
      .streamExplain(
        {
          subject_type: subjectType,
          subject_id: subjectId,
        },
        (event) => {
          if (!isMounted) return;

          if (event.type === 'token') {
            setStreamedText(event.accumulated);
            if (event.accumulated.trim().length > 0) {
              setLoading(false);
            }
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
          } else if (event.type === 'done') {
            setLoading(false);
          }
        }
      )
      .then(() => {
        if (isMounted) {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch AI explanation');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, subjectType, subjectId]);

  if (!isOpen) return null;

  const handleOpenInCopilot = () => {
    const promptText = `Can you provide a deep-dive explanation for: ${title}?`;
    closeExplain();
    navigate('/copilot', {
      state: {
        initialPrompt: promptText,
        initialAnswer: streamedText,
        title: title,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Fixed-dimension Modal Card to prevent layout jumping */}
      <div className="relative w-full max-w-3xl h-[82vh] max-h-[760px] min-h-[580px] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-xl">
        
        {/* Top Header */}
        <div className="px-6 py-4.5 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-9.5 h-9.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-sm shadow-amber-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base sm:text-[17px] font-semibold text-slate-100 truncate">{title}</h3>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                  {subjectType}
                </span>
              </div>
              {subtitle && <p className="text-[13px] text-slate-400 truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            {loading && (
              <span className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-300 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Evaluating telemetry</span>
              </span>
            )}
            <button
              onClick={closeExplain}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body with fixed viewport */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 px-6 sm:px-8 py-6 space-y-6 select-text"
        >
          {/* Shimmer Skeleton Placeholder while waiting for initial tokens */}
          {loading && !streamedText && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Executive Status Pill */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs sm:text-[13px]">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Activity className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="font-medium">Evaluating root causes & financial impact...</span>
                </div>
                <span className="text-xs font-mono text-slate-500">Analytics Engine</span>
              </div>

              {/* Shimmer Skeleton Cards */}
              <div className="space-y-4 pt-1">
                <div className="p-5 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-800/80 rounded w-1/3" />
                  <div className="h-3 bg-slate-800/50 rounded w-5/6" />
                  <div className="h-3 bg-slate-800/50 rounded w-4/6" />
                </div>

                <div className="p-5 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-3 animate-pulse" style={{ animationDelay: '150ms' }}>
                  <div className="h-4 bg-slate-800/80 rounded w-2/5" />
                  <div className="h-3 bg-slate-800/50 rounded w-full" />
                  <div className="h-3 bg-slate-800/50 rounded w-3/4" />
                </div>

                <div className="p-5 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-3 animate-pulse" style={{ animationDelay: '300ms' }}>
                  <div className="h-4 bg-slate-800/80 rounded w-1/4" />
                  <div className="h-3 bg-slate-800/50 rounded w-11/12" />
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-100">Unable to generate explanation</p>
                <p className="text-xs sm:text-sm text-rose-400/90 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Streamed Formatted Content */}
          {streamedText && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Executive Grounding Badge */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs sm:text-[13px]">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300 font-medium">Diagnostic Reasoning Engine</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Telemetry Grounded</span>
                </div>
              </div>

              {/* Polished Executive Markdown Typography */}
              <div className="text-[15px] sm:text-[15.5px] text-slate-200 leading-relaxed space-y-4 font-normal">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-[14px] sm:text-[15px] font-bold text-amber-300/95 border-b border-slate-800/90 pb-2 mt-7 mb-3.5 flex items-center space-x-2 tracking-wider uppercase">
                        <span>{children}</span>
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-[15px] sm:text-[16px] font-semibold text-slate-100 mt-5 mb-2">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 space-y-2.5 my-3 text-slate-300 text-[14px] sm:text-[15px] leading-relaxed">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 space-y-2.5 my-3 text-slate-300 text-[14px] sm:text-[15px] leading-relaxed">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
                    p: ({ children }) => (
                      <p className="my-3 leading-relaxed text-[14px] sm:text-[15px] text-slate-300">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-slate-100">{children}</strong>
                    ),
                    code: ({ inline, children }) => (
                      <code
                        className={`font-mono text-[12px] sm:text-[13px] ${
                          inline
                            ? 'px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300'
                            : 'block p-4 my-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto'
                        }`}
                      >
                        {children}
                      </code>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-xl border border-slate-800 bg-slate-950/40">
                        <table className="w-full text-left text-[13px] sm:text-[14px] text-slate-300 divide-y divide-slate-800">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-slate-950/70 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {children}
                      </thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-slate-800/60">{children}</tbody>
                    ),
                    th: ({ children }) => <th className="p-3.5 font-semibold">{children}</th>,
                    td: ({ children }) => <td className="p-3.5 text-slate-300">{children}</td>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-amber-400/60 bg-amber-500/5 px-4 py-2.5 my-3.5 rounded-r-lg text-[13.5px] sm:text-[14px] text-slate-300 italic leading-relaxed">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {streamedText}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2 text-xs sm:text-[13px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="hidden sm:inline">Metrics calculated using Analytics Engine</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={closeExplain}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition"
            >
              Close
            </button>
            <button
              onClick={handleOpenInCopilot}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 font-semibold text-xs sm:text-sm shadow-sm transition"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask Follow-up in Copilot</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
