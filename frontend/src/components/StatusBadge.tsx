import React from 'react';

type StatusType = 'generating' | 'done' | 'failed' | 'running' | 'pending';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const STATUS_CONFIG: Record<StatusType, { color: string; dot: string; defaultLabel: string; animate: boolean }> = {
  generating: {
    color: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500',
    defaultLabel: 'Generating',
    animate: true,
  },
  running: {
    color: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500',
    defaultLabel: 'Running',
    animate: true,
  },
  pending: {
    color: 'bg-zinc-50 text-zinc-600 border border-zinc-200',
    dot: 'bg-zinc-400',
    defaultLabel: 'Pending',
    animate: false,
  },
  done: {
    color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500',
    defaultLabel: 'Done',
    animate: false,
  },
  failed: {
    color: 'bg-red-50 text-red-700 border border-red-200',
    dot: 'bg-red-500',
    defaultLabel: 'Failed',
    animate: false,
  },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const displayLabel = label ?? config.defaultLabel;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot} ${
          config.animate ? 'animate-pulse' : ''
        }`}
      />
      {displayLabel}
    </span>
  );
}
