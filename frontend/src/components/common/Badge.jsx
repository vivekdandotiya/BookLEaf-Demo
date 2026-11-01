import React from 'react';

export const PriorityBadge = ({ priority }) => {
  const styles = {
    Critical: 'bg-red-100 text-red-800 border-red-300 font-semibold',
    High: 'bg-orange-100 text-orange-800 border-orange-300 font-medium',
    Medium: 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
    Low: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
  };

  const style = styles[priority] || 'bg-paper-200 text-ink-700 border-paper-300';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border tracking-tight ${style}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          priority === 'Critical'
            ? 'bg-red-600 animate-pulse'
            : priority === 'High'
            ? 'bg-orange-500'
            : priority === 'Medium'
            ? 'bg-amber-500'
            : 'bg-slate-400'
        }`}
      />
      {priority}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const styles = {
    Open: 'bg-blue-50 text-blue-800 border-blue-200 font-medium',
    'In Progress': 'bg-purple-50 text-purple-800 border-purple-200 font-medium',
    Resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium',
    Closed: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
  };

  const style = styles[status] || 'bg-paper-200 text-ink-700 border-paper-300';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${style}`}>
      {status}
    </span>
  );
};

export const CategoryBadge = ({ category }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-paper-100 text-ink-700 border border-paper-300">
      {category}
    </span>
  );
};

export const BookStatusBadge = ({ status }) => {
  const isLive = status === 'Published & Live';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
        isLive
          ? 'bg-sage-light text-sage-dark border-sage/30'
          : 'bg-amber-light text-amber-dark border-amber/30'
      }`}
    >
      {status}
    </span>
  );
};

export const ClassificationSourceBadge = ({ source }) => {
  if (source === 'openai' || source === 'ai') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        OpenAI
      </span>
    );
  }
  if (source === 'rule_engine') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Local Rule-Based Engine
      </span>
    );
  }
  if (source === 'manual') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Manual Admin Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-paper-100 text-ink-500 border border-paper-300">
      Pending Triage
    </span>
  );
};
