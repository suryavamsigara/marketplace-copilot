import React, { useEffect, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { api } from '../api/client';
import {
  X,
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export default function ExplainModal() {
  const { explainModal, closeExplain, setActiveTab } = useFilters();
  const { isOpen, subjectType, subjectId, title, subtitle } = explainModal;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

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

  const handleOpenInCopilot = () => {
    closeExplain();
    setActiveTab('copilot');
  };

  // Helper to format structured answer markdown cleanly
  const renderStructuredAnswer = (text) => {
    if (!text) return null;
    const sections = text.split(/(?=^##\s+)/m);

    return (
      <div className="space-y-4 text-sm text-slate-200">
        {sections.map((sec, idx) => {
          const trimmed = sec.trim();
          if (!trimmed) return null;
          const lines = trimmed.split('\n');
          const heading = lines[0].replace(/^##\s+/, '');
          const body = lines.slice(1).join('\n').trim();

          const isSummary = heading.toLowerCase().includes('summary');
          const isDrivers = heading.toLowerCase().includes('drivers');
          const isEvidence = heading.toLowerCase().includes('evidence');
          const isAction = heading.toLowerCase().includes('action');
          const isImpact = heading.toLowerCase().includes('impact');
          const isConfidence = heading.toLowerCase().includes('confidence');

          let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
          if (isSummary) badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
          if (isAction) badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
          if (isImpact) badgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';

          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm"
            >
              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${badgeColor}`}
                >
                  {heading}
                </span>
              </div>
              <div className="text-slate-300 leading-relaxed whitespace-pre-line text-sm pl-1">
                {body}
              </div>
            </div>
          );
        })}
      </div>
    );
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
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-200">Synthesizing Business Evidence...</p>
                <p className="text-xs text-slate-400 mt-1">
                  Querying deterministic Python analytics tools and computing root-causes
                </p>
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
                      ? 'AI Reasoning Layer (GPT-4o Mini with Tool Calling)'
                      : 'Deterministic Analytics Engine Grounding'}
                  </span>
                </div>
                {data.tool_calls && data.tool_calls.length > 0 && (
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {data.tool_calls.length} tools executed
                  </span>
                )}
              </div>

              {/* Render Structured Sections */}
              {renderStructuredAnswer(data.answer)}
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
