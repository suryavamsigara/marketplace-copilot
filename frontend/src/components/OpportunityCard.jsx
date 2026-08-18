import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getSeverityBadge } from '../utils/formatters';
import { useFilters } from '../context/FilterContext';
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  Shield,
} from 'lucide-react';

export default function OpportunityCard({ opportunity }) {
  const navigate = useNavigate();
  const { openExplain } = useFilters();

  const {
    id,
    severity,
    score,
    title,
    entity,
    product_id,
    marketplace_id,
    evidence = [],
    impact,
    recommendation,
    confidence,
  } = opportunity;

  const badge = getSeverityBadge(severity);

  const handleExplain = (e) => {
    e.stopPropagation();
    openExplain(
      'opportunity',
      id,
      `Opportunity Breakdown: ${title}`,
      `Evaluating business impact, evidence points, and prioritization urgency`
    );
  };

  const handleEntityClick = (e) => {
    e.stopPropagation();
    if (product_id) {
      navigate(`/products/${product_id}`);
    } else if (entity && ['Amazon', 'Flipkart', 'Myntra', 'Ajio'].includes(entity)) {
      navigate('/marketplaces');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 group flex flex-col justify-between">
      {/* Top Badge & Score Row */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${badge.dot}`} />
              {severity?.toUpperCase()}
            </span>

            {entity && (
              <button
                onClick={handleEntityClick}
                className="text-xs text-slate-300 hover:text-amber-300 font-medium px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition flex items-center space-x-1"
                title="Click to view details"
              >
                <span>{entity}</span>
                <ArrowRight className="w-2.5 h-2.5 ml-0.5 opacity-60" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Score:</span>
            <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {score}
            </span>
          </div>
        </div>

        {/* Opportunity Title */}
        <h4 className="text-sm font-bold text-slate-100 tracking-tight mb-2 group-hover:text-amber-200 transition-colors">
          {title}
        </h4>

        {/* Evidence Highlights */}
        {evidence && evidence.length > 0 && (
          <div className="my-3 space-y-1 bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>Evidence</span>
            </div>
            {evidence.slice(0, 3).map((ev, idx) => (
              <div key={idx} className="text-xs text-slate-300 flex items-start space-x-1.5">
                <span className="text-amber-400/80 font-bold">•</span>
                <span className="leading-tight">{ev}</span>
              </div>
            ))}
          </div>
        )}

        {/* Impact & Action */}
        <div className="space-y-2 mt-3 text-xs">
          {impact && (
            <div className="flex items-baseline space-x-1.5 text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 font-medium">
              <span className="font-bold text-[11px] uppercase tracking-wider text-rose-400">Impact:</span>
              <span className="truncate">{impact}</span>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <span className="font-bold text-[11px] uppercase tracking-wider text-amber-400 block mb-0.5">
              Recommended Action:
            </span>
            <p className="text-xs text-slate-300 leading-snug">{recommendation}</p>
          </div>
        </div>
      </div>

      {/* Footer Details & Action Buttons */}
      <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
          <Shield className="w-3 h-3 text-slate-400" />
          <span>
            Confidence: <strong className="text-slate-300 font-semibold">{confidence}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExplain}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Explain</span>
          </button>
        </div>
      </div>
    </div>
  );
}
