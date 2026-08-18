import React from 'react';
import { getHealthBadge } from '../utils/formatters';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

export default function HealthBadge({ health }) {
  const badge = getHealthBadge(health);

  const getIcon = () => {
    switch (health?.toLowerCase()) {
      case 'healthy':
        return <CheckCircle2 className="w-3 h-3 text-emerald-400 mr-1" />;
      case 'needs attention':
        return <AlertTriangle className="w-3 h-3 text-amber-400 mr-1" />;
      case 'critical':
        return <AlertCircle className="w-3 h-3 text-rose-400 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
    >
      {getIcon()}
      {badge.label}
    </span>
  );
}
