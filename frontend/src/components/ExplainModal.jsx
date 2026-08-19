import React, { useEffect, useState } from 'react';
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
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Cycle through informative analysis steps while loading
  useEffect(() => {
    if (!isOpen || !loading) {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isOpen, loading]);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .explainSubject({
        subject_type: subjectType,
        subject_id: subjectId,
      })
      .then((res) => {
        if (isMounted) {
          setData(res);
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
    const answerText = data?.answer || '';
    closeExplain();
    navigate('/copilot', {
      state: {
        initialPrompt: promptText,
        initialAnswer: answerText,
        title: title,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={closeExplain}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-5 animate-in fade-in duration-300">
              {/* Spinning Ring with Active Stage Icon */}
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
                <StepIcon className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>

              {/* Dynamic Cycling Step Messages */}
              <div className="text-center max-w-md px-4 transition-all duration-300">
                <p className="text-sm font-semibold text-slate-100 transition-all duration-300">
                  {currentStep.title}
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed transition-all duration-300">
                  {currentStep.subtitle}
                </p>
              </div>

              {/* Step Progress Dots */}
              <div className="flex items-center space-x-1.5 pt-2">
                {LOADING_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === stepIndex
                        ? 'w-6 bg-amber-400 shadow-sm shadow-amber-400/40'
                        : 'w-1.5 bg-slate-700'
                      }`}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to generate explanation</p>
                <p className="text-xs text-rose-400/90 mt-1">{error}</p>
              </div>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              {/* Tool Execution or Mode Pill */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300 font-medium">
                    {data.mode === 'llm'
                      ? 'AI Reasoning Layer'
                      : 'Deterministic Analytics Engine Grounding'}
                  </span>
                </div>
                {data.tool_calls && data.tool_calls.length > 0 && (
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {data.tool_calls.length} tools executed
                  </span>
                )}
              </div>

              {/* Render Formatted Markdown */}
              <div className="markdown-prose text-sm text-slate-200 space-y-3 leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-sm font-bold text-amber-300 border-b border-slate-800/80 pb-1 mt-4 mb-2 flex items-center space-x-2">
                        <span>{children}</span>
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider mt-3 mb-1">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2 text-xs">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2 text-xs">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-300 leading-snug">{children}</li>,
                    p: ({ children }) => <p className="my-1.5 leading-relaxed text-xs text-slate-300">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-slate-100">{children}</strong>,
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px]">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {data.answer}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Deterministic metrics verified against database</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={closeExplain}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Close
            </button>
            <button
              onClick={handleOpenInCopilot}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
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
