import React from 'react';
import type { GeneratedRecord } from '../store';
import StatusBadge from './StatusBadge';

interface GeneratedAdCardProps {
  record: GeneratedRecord;
  onClick?: () => void;
  onFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const VARIANT_COLORS: Record<string, string> = {
  premium: '#b45309',
  minimal: '#52525b',
  modern: '#4338ca',
  bold: '#be123c',
};

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin pulse-glow" />
      <p className="text-xs text-zinc-400 font-mono">Generating…</p>
    </div>
  );
}

export default function GeneratedAdCard({ record, onClick, onFavorite, onDelete }: GeneratedAdCardProps) {
  const isClickable = record.status === 'done' && record.imageUrl;

  return (
    <div
      id={`gen-card-${record.id}`}
      onClick={isClickable ? onClick : undefined}
      className={`group relative rounded-xl overflow-hidden bg-white shadow-card border border-zinc-100 card-transition ${
        isClickable ? 'cursor-pointer hover:shadow-card-hover hover:border-indigo-200' : ''
      }`}
    >
      {/* Image area */}
      <div className="aspect-square bg-zinc-50 flex items-center justify-center relative overflow-hidden">
        {record.status === 'generating' && <Spinner />}

        {record.status === 'done' && record.imageUrl && (
          <img
            src={record.imageUrl}
            alt="Generated ad"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {record.status === 'failed' && (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-xs text-red-500 font-medium">Generation failed</p>
          </div>
        )}

        {/* Favorite badge */}
        {record.favorited && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-base drop-shadow-sm">⭐</span>
          </div>
        )}

        {/* Hover action buttons — favorite + delete */}
        {isClickable && (onFavorite || onDelete) && (
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {onFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onFavorite(record.id); }}
                title={record.favorited ? 'Remove from favorites' : 'Add to favorites'}
                className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-all ${
                  record.favorited
                    ? 'bg-amber-400 text-white hover:bg-amber-500'
                    : 'bg-white/90 text-zinc-500 hover:bg-amber-50 hover:text-amber-500'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill={record.favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                title="Delete"
                className="w-7 h-7 rounded-lg bg-white/90 text-zinc-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center shadow-md transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* View overlay for done state */}
        {isClickable && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
              <svg className="w-3.5 h-3.5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-xs font-semibold text-zinc-700">View</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 truncate font-display">
            {record.sourceMeta?.advertiserName ?? 'Ad generation'}
          </p>
          {record.styleVariant && (
            <p
              className="text-[10px] font-bold uppercase tracking-wide mt-0.5"
              style={{ color: VARIANT_COLORS[record.styleVariant] ?? '#52525b' }}
            >
              {record.styleVariant}
            </p>
          )}
          {!record.styleVariant && record.sourceMeta?.daysActive != null && (
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Based on {record.sourceMeta.daysActive}d ad
            </p>
          )}
          {record.parentId && (
            <p className="text-[11px] text-indigo-400 font-mono mt-0.5">↳ Iteration</p>
          )}
        </div>
        <StatusBadge status={record.status === 'generating' ? 'generating' : record.status === 'done' ? 'done' : 'failed'} />
      </div>
    </div>
  );
}
