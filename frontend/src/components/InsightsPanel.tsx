import React, { useState } from 'react';
import type { AdInsights } from '../api';
import type { WinningAd } from '../store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InsightChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-zinc-800 leading-snug">{value}</span>
    </div>
  );
}

function ColorSwatch({ hex }: { hex: string }) {
  // Validate that it looks like a hex color
  const isValid = /^#[0-9a-f]{3,6}$/i.test(hex);
  const displayHex = isValid ? hex : '#e5e7eb';
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-lg border border-black/10 shadow-sm flex-shrink-0"
        style={{ backgroundColor: displayHex }}
        title={displayHex}
      />
      <span className="text-xs font-mono text-zinc-500">{displayHex}</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function InsightsSkeleton() {
  return (
    <div className="p-5 space-y-5 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-16 bg-zinc-200 rounded" />
        <div className="h-5 w-3/4 bg-zinc-200 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-14 bg-zinc-200 rounded" />
            <div className="h-4 w-24 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3 w-20 bg-zinc-200 rounded" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => <div key={i} className="w-7 h-7 bg-zinc-200 rounded-lg" />)}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-28 bg-zinc-200 rounded" />
        <div className="h-4 bg-zinc-200 rounded" />
        <div className="h-4 bg-zinc-200 rounded w-5/6" />
        <div className="h-4 bg-zinc-200 rounded w-4/6" />
      </div>
    </div>
  );
}

// ─── Creative Breakdown ───────────────────────────────────────────────────────

const BREAKDOWN_LABELS: Record<string, string> = {
  whyHeadlineWorks: '💬 Why the headline works',
  whyLayoutWorks: '🖼 Why the layout works',
  emotionTargeted: '❤️ Emotion targeted',
  marketingAngle: '🎯 Marketing angle',
  attentionHook: '⚡ Attention hook',
  targetAudience: '👥 Target audience',
};

function CreativeBreakdown({ breakdown }: { breakdown: AdInsights['creativeBreakdown'] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
        id="btn-creative-breakdown"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-600">
          Creative Breakdown
        </span>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3 border-t border-zinc-100">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="flex gap-3">
              <div className="mt-0.5 w-1 flex-shrink-0 rounded-full bg-indigo-200" />
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">
                  {BREAKDOWN_LABELS[key] ?? key}
                </p>
                <p className="text-sm text-zinc-700 leading-relaxed">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface InsightsPanelProps {
  ad: WinningAd;
  insights: AdInsights | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onRemake: () => void;
  isRemakingLoading: boolean;
  onClose: () => void;
}

export default function InsightsPanel({
  ad,
  insights,
  isLoading,
  error,
  onRetry,
  onRemake,
  isRemakingLoading,
  onClose,
}: InsightsPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white border border-zinc-100 rounded-2xl shadow-lg overflow-hidden animate-slide-up">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Selected Ad</p>
          <p className="text-sm font-bold text-zinc-900 font-display truncate mt-0.5">
            {ad.advertiserName}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="text-emerald-500">●</span>
            {ad.daysActive}d running
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors"
            title="Deselect ad"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <InsightsSkeleton />}

        {error && !isLoading && (
          <div className="p-5 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700">Insights failed to load</p>
              <p className="text-xs text-zinc-400 mt-0.5">{error}</p>
            </div>
            <button
              onClick={onRetry}
              className="px-4 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {insights && !isLoading && (
          <div className="p-5 space-y-5">
            {/* Core info chips */}
            <div className="grid grid-cols-2 gap-4">
              {insights.headline && (
                <div className="col-span-2">
                  <InsightChip label="Headline" value={insights.headline} />
                </div>
              )}
              {insights.mainOffer && (
                <div className="col-span-2">
                  <InsightChip label="Main Offer" value={insights.mainOffer} />
                </div>
              )}
              <InsightChip label="Brand" value={insights.brandName} />
              <InsightChip label="CTA" value={insights.cta} />
              <InsightChip label="Visual Style" value={insights.visualStyle} />
              <InsightChip label="Layout" value={insights.productLayout} />
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-100" />

            {/* Color palette */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2.5">
                Color Palette
              </p>
              <div className="space-y-2">
                {insights.colorPalette.slice(0, 3).map((hex, i) => (
                  <ColorSwatch key={i} hex={hex} />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-100" />

            {/* Why it's working */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Why It's Probably Working
              </p>
              <p className="text-sm text-zinc-700 leading-relaxed">{insights.whyWorking}</p>
            </div>

            {/* Creative Breakdown */}
            {insights.creativeBreakdown && (
              <CreativeBreakdown breakdown={insights.creativeBreakdown} />
            )}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="px-5 py-4 border-t border-zinc-100 bg-zinc-50">
        <button
          id="btn-remake-from-panel"
          onClick={onRemake}
          disabled={isRemakingLoading}
          className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
        >
          {isRemakingLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          Remake This Ad →
        </button>
        <p className="text-center text-[11px] text-zinc-400 mt-2">
          AI will replicate the formula for your brand
        </p>
      </div>
    </div>
  );
}
