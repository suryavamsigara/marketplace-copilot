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
  Database,
  TrendingDown,
  BrainCircuit,
  Layers,
} from 'lucide-react';

const LOADING_STEPS = [
  {
    icon: Database,
    title: 'Querying Time-Series Ledger...',
    subtitle: 'Extracting 90-day multi-channel sales and demand velocity benchmarks',
  },
  {
    icon: TrendingDown,
    title: 'Analyzing Inventory & Depletion Curves...',
    subtitle: 'Evaluating stock velocity, days-of-stock remaining, and reorder constraints',
  },
  {
    icon: Activity,
    title: 'Evaluating Pricing & Return Anomalies...',
    subtitle: 'Benchmarking competitor pricing, category return spikes, and channel margins',
  },
  {
    icon: BrainCircuit,
    title: 'Synthesizing Causal Attribution & Impact...',
    subtitle: 'Computing revenue exposure, root causes, and prioritizing operational steps',
  },
];

export default function ExplainModal() {
  const navigate = useNavigate();
  const { explainModal, closeExplain } = useFilters();
  const { isOpen, subjectType, subjectId, title, subtitle } = explainModal;

  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState(null);
  const scrollContainerRef = useRef(null);

  // Cycle through diagnostic steps while waiting for initial tokens
  useEffect(() => {
    if (!isOpen || !loading) {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isOpen, loading]);

  // Stream explanation
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
        (accumulated) => {
          if (isMounted) {
            setStreamedText(accumulated);
            if (accumulated.trim().length > 0) {
              setLoading(false);
            }
            // Smoothly keep scroll at latest content during stream
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
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

  const currentStep = LOADING_STEPS[stepIndex];
  const StepIcon = currentStep?.icon || Sparkles;

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
      <div className="relative w-full max-w-3xl h-[82vh] max-h-[740px] min-h-[560px] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-xl">

        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-sm shadow-amber-500/10">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-[15px] font-semibold text-slate-100 truncate">{title}</h3>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-[10px] font-mono text-slate-300 uppercase tracking-wider">
                  {subjectType}
                </span>
              </div>
              {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            {loading && (
              <span className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-300 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Analyzing</span>
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
          className="flex-1 overflow-y-auto min-h-0 px-6 py-6 space-y-5 select-text"
        >
          {/* Initial Loading Step Animation */}
          {loading && !streamedText && (
            <div className="h-full min-h-[380px] flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-300">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
                <StepIcon className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>

              <div className="text-center max-w-md px-4 transition-all duration-300">
                <p className="text-sm font-semibold text-slate-100 tracking-tight transition-all duration-300">
                  {currentStep.title}
                </p>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed transition-all duration-300">
                  {currentStep.subtitle}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex items-center space-x-2 pt-1">
                {LOADING_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === stepIndex
                      ? 'w-7 bg-amber-400 shadow-sm shadow-amber-400/50'
                      : 'w-1.5 bg-slate-700'
                      }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-100">Unable to generate explanation</p>
                <p className="text-xs text-rose-400/90 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Streamed Formatted Content */}
          {streamedText && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Executive Grounding Badge */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300 font-medium">Diagnostic Reasoning Engine</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Telemetry Grounded</span>
                </div>
              </div>

              {/* Polished Executive Markdown Typography */}
              <div className="text-[14px] text-slate-200 leading-relaxed space-y-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-[15px] font-bold text-amber-300/90 border-b border-slate-800/80 pb-1.5 mt-6 mb-3 flex items-center space-x-2 tracking-wide uppercase text-xs">
                        <span>{children}</span>
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold text-slate-100 mt-4 mb-1.5">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 space-y-2 my-2 text-slate-300 text-xs leading-relaxed">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 space-y-2 my-2 text-slate-300 text-xs leading-relaxed">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
                    p: ({ children }) => (
                      <p className="my-2.5 leading-relaxed text-xs text-slate-300">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-slate-100">{children}</strong>
                    ),
                    code: ({ inline, children }) => (
                      <code
                        className={`font-mono text-[11px] ${inline
                          ? 'px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300'
                          : 'block p-3.5 my-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto'
                          }`}
                      >
                        {children}
                      </code>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3.5 rounded-xl border border-slate-800 bg-slate-950/40">
                        <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-slate-950/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {children}
                      </thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-slate-800/60">{children}</tbody>
                    ),
                    th: ({ children }) => <th className="p-3 font-semibold">{children}</th>,
                    td: ({ children }) => <td className="p-3 text-slate-300">{children}</td>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-amber-400/60 bg-amber-500/5 px-4 py-2 my-3 rounded-r-lg text-xs text-slate-300 italic">
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
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="hidden sm:inline">Metrics calculated using Analytics Engine</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={closeExplain}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Close
            </button>
            <button onClick={handleOpenInCopilot} className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 font-semibold text-xs shadow-sm transition" > <Bot className="w-3.5 h-3.5" /> <span>Ask Follow-up in Copilot</span> <ArrowRight className="w-3 h-3 ml-1" /> </button>
          </div>
        </div>
      </div>
    </div>
  );
}
