import React from 'react';
import type { WinningAd } from '../store';

interface AdCardProps {
  ad: WinningAd;
  selected: boolean;
  onSelect: (ad: WinningAd) => void;
}

export default function AdCard({ ad, selected, onSelect }: AdCardProps) {
  return (
    <div
      id={`ad-card-${ad.id}`}
      onClick={() => onSelect(ad)}
      className={`group relative rounded-xl overflow-hidden cursor-pointer card-transition shadow-card hover:shadow-card-hover ${
        selected
          ? 'ring-2 ring-indigo-500 ring-offset-2'
          : 'ring-1 ring-zinc-200 hover:ring-indigo-300'
      }`}
    >
      {/* Image */}
      <div className="aspect-square bg-zinc-100 relative overflow-hidden">
        <img
          src={ad.imageUrl}
          alt={`Ad by ${ad.advertiserName}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f4f4f5"/><text y="55" x="50" font-size="24" text-anchor="middle" fill="%23a1a1aa">📷</text></svg>';
          }}
        />

        {/* Selection overlay */}
        {selected && (
          <div className="absolute inset-0 bg-indigo-600/10 flex items-start justify-end p-2 animate-fade-in">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}

        {/* Days badge */}
        <div className="absolute bottom-2 left-2">
          <span className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[11px] font-mono px-2 py-0.5 rounded-full">
            <span className="text-emerald-400">●</span>
            {ad.daysActive}d running
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-white">
        <p className="font-semibold text-zinc-900 text-sm truncate font-display">
          {ad.advertiserName}
        </p>
        {ad.headline && (
          <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1 font-mono">{ad.headline}</p>
        )}
        {!ad.headline && ad.adCopy && (
          <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1 font-mono">{ad.adCopy}</p>
        )}
        {ad.cta && (
          <span className="mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wide bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
            {ad.cta.replace(/_/g, ' ')}
          </span>
        )}
      </div>
    </div>
  );
}
