import React, { useEffect } from 'react';

export type VariationCount = 1 | 2 | 4;

interface VariationOption {
  count: VariationCount;
  label: string;
  description: string;
  styles: string[];
  badge?: string;
}

const OPTIONS: VariationOption[] = [
  {
    count: 1,
    label: '1 Version',
    description: 'One AI-optimized ad',
    styles: ['Premium'],
  },
  {
    count: 2,
    label: '2 Versions',
    description: 'Two distinct creative styles',
    styles: ['Premium', 'Minimal'],
    badge: 'Popular',
  },
  {
    count: 4,
    label: '4 Versions',
    description: 'Full style range to test',
    styles: ['Premium', 'Minimal', 'Modern', 'Bold'],
    badge: 'Best Value',
  },
];

const STYLE_COLORS: Record<string, string> = {
  Premium: 'bg-amber-100 text-amber-700 border-amber-200',
  Minimal: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  Modern: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Bold: 'bg-rose-100 text-rose-700 border-rose-200',
};

interface VariationPickerProps {
  onSelect: (count: VariationCount) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function VariationPicker({ onSelect, onClose, isLoading }: VariationPickerProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold font-display text-zinc-900">
              How many versions?
            </h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              Each version uses a different creative style — same strategy, fresh look.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors flex-shrink-0 ml-3"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.count}
              id={`btn-variation-${opt.count}`}
              disabled={isLoading}
              onClick={() => onSelect(opt.count)}
              className="w-full text-left p-4 rounded-xl border-2 border-zinc-100 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-150 group disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              {/* Badge */}
              {opt.badge && (
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  {opt.badge}
                </span>
              )}

              <div className="flex items-center gap-3">
                {/* Count circle */}
                <div className="w-10 h-10 rounded-xl bg-zinc-100 group-hover:bg-indigo-100 transition-colors flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-black text-zinc-600 group-hover:text-indigo-700 transition-colors font-display">
                    {opt.count}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-zinc-900">{opt.label}</p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{opt.description}</p>

                  {/* Style tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {opt.styles.map((style) => (
                      <span
                        key={style}
                        className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STYLE_COLORS[style] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-zinc-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-[11px] text-zinc-400 mt-4">
          All variations use the same winning ad strategy for your brand
        </p>
      </div>
    </div>
  );
}
