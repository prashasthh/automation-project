import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startSearch, pollSearch, startGenerate, fetchInsights, type AdInsights } from '../api';
import { getBrand, saveSearch, getSavedSearches, type WinningAd, type SavedSearch } from '../store';
import { useGeneration } from '../contexts/GenerationContext';
import { useToast } from '../components/Toast';
import AdCard from '../components/AdCard';
import InsightsPanel from '../components/InsightsPanel';
import VariationPicker, { type VariationCount } from '../components/VariationPicker';
import { v4 as uuidv4 } from 'uuid';

// Helper: extract niche label from URL
function extractNiche(url: string): string {
  try {
    const u = new URL(url);
    const q = u.searchParams.get('q');
    if (q) return q;
    return u.hostname.replace('www.', '');
  } catch {
    return 'Search';
  }
}

// Helper: time ago
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type PageStatus = 'idle' | 'searching' | 'done' | 'failed';
type InsightsStatus = 'idle' | 'loading' | 'done' | 'failed';

export default function SearchPage() {
  const navigate = useNavigate();
  const { startPolling, startBatchPolling } = useGeneration();
  const toast = useToast();

  const [url, setUrl] = useState('');
  const [maxAds, setMaxAds] = useState(100);
  const [minDays, setMinDays] = useState(20);
  const [pageStatus, setPageStatus] = useState<PageStatus>('idle');
  const [ads, setAds] = useState<WinningAd[]>([]);
  const [selectedAd, setSelectedAd] = useState<WinningAd | null>(null);
  const [error, setError] = useState('');
  const [isRemakingLoading, setIsRemakingLoading] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => getSavedSearches());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Insights state
  const [insightsStatus, setInsightsStatus] = useState<InsightsStatus>('idle');
  const [insights, setInsights] = useState<AdInsights | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Variation picker state
  const [showVariationPicker, setShowVariationPicker] = useState(false);

  // Auto-fetch insights when an ad is selected
  const loadInsights = useCallback(async (ad: WinningAd) => {
    setInsightsStatus('loading');
    setInsights(null);
    setInsightsError(null);
    try {
      const result = await fetchInsights(ad.id, {
        imageUrl: ad.imageUrl,
        adCopy: ad.adCopy,
        headline: ad.headline,
        cta: ad.cta,
        daysActive: ad.daysActive,
      });
      setInsights(result);
      setInsightsStatus('done');
    } catch (err: any) {
      setInsightsError(err.message ?? 'Failed to load insights');
      setInsightsStatus('failed');
    }
  }, []);

  // Select an ad and trigger insights fetch
  const handleSelectAd = useCallback((ad: WinningAd) => {
    setSelectedAd(ad);
    loadInsights(ad);
  }, [loadInsights]);

  const handleDeselectAd = useCallback(() => {
    setSelectedAd(null);
    setInsights(null);
    setInsightsStatus('idle');
    setInsightsError(null);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!url.trim()) return;
    setPageStatus('searching');
    setError('');
    setAds([]);
    setSelectedAd(null);
    setInsights(null);
    setInsightsStatus('idle');

    try {
      const { searchId } = await startSearch(url.trim(), maxAds, minDays);

      // Poll every 4 seconds
      pollRef.current = setInterval(async () => {
        try {
          const result = await pollSearch(searchId);

          if (result.status === 'done') {
            clearInterval(pollRef.current!);
            const foundAds = result.ads ?? [];
            setAds(foundAds);
            setPageStatus('done');

            // Save to localStorage
            if (foundAds.length > 0) {
              const saved: SavedSearch = {
                id: uuidv4(),
                searchUrl: url.trim(),
                timestamp: Date.now(),
                adCount: foundAds.length,
                minDays,
                ads: foundAds,
              };
              saveSearch(saved);
              setSavedSearches(getSavedSearches());
            }
          } else if (result.status === 'failed') {
            clearInterval(pollRef.current!);
            setError(result.error ?? 'Scrape failed');
            setPageStatus('failed');
          }
        } catch (err: any) {
          clearInterval(pollRef.current!);
          setError(err.message ?? 'Poll failed');
          setPageStatus('failed');
        }
      }, 4000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to start search');
      setPageStatus('failed');
    }
  }, [url, maxAds, minDays]);

  const handleRemake = useCallback(async (variationCount: VariationCount = 1) => {
    if (!selectedAd) return;
    const brand = getBrand();

    if (!brand.brandName && !brand.usp) {
      navigate('/brand');
      return;
    }

    setShowVariationPicker(false);
    setIsRemakingLoading(true);
    try {
      const { generationIds } = await startGenerate(
        {
          imageUrl: selectedAd.imageUrl,
          adCopy: selectedAd.adCopy,
          headline: selectedAd.headline,
          cta: selectedAd.cta,
          daysActive: selectedAd.daysActive,
        },
        brand,
        variationCount
      );

      startBatchPolling(generationIds, selectedAd.id, {
        advertiserName: selectedAd.advertiserName,
        daysActive: selectedAd.daysActive,
        imageUrl: selectedAd.imageUrl,
      });

      navigate('/queue');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to start generation');
    } finally {
      setIsRemakingLoading(false);
    }
  }, [selectedAd, navigate, startBatchPolling]);

  const loadSavedSearch = (s: SavedSearch) => {
    setUrl(s.searchUrl);
    setMinDays(s.minDays);
    setAds(s.ads);
    setSelectedAd(null);
    setInsights(null);
    setInsightsStatus('idle');
    setPageStatus('done');
  };

  const showResults = pageStatus === 'done' && ads.length > 0;
  const showPanel = selectedAd !== null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-8 py-6">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-indigo-600 mb-2">
          <span className="w-1.5 h-1.5 bg-[var(--accent)] animate-pulse" />
          SYS.01 / RECON
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Find Winning Ads</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Paste a Meta Ad Library search URL to find your competitors' best-performing static ads.
        </p>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6">
        {/* Search Form */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-card p-6 space-y-5">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1.5" htmlFor="search-url">
              Meta Ad Library URL
            </label>
            <div className="flex gap-2">
              <input
                id="search-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="https://www.facebook.com/ads/library/?active_status=active&q=protein+shake&media_type=image"
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm font-mono text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                disabled={pageStatus === 'searching'}
              />
              <button
                id="btn-search"
                onClick={handleSearch}
                disabled={!url.trim() || pageStatus === 'searching'}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all duration-150 flex items-center gap-2 min-w-[120px] justify-center"
              >
                {pageStatus === 'searching' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Find Ads
                  </>
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400">
              Tip: The URL will automatically have <code className="font-mono bg-zinc-100 px-1 rounded">active_status=active&media_type=image</code> applied.
            </p>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-zinc-700">Max ads to scrape</label>
                <span className="text-sm font-mono font-bold text-indigo-600">{maxAds}</span>
              </div>
              <input
                id="slider-max-ads"
                type="range"
                min={10}
                max={500}
                step={10}
                value={maxAds}
                onChange={(e) => setMaxAds(Number(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
                <span>10</span><span>500</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-zinc-700">Min days running</label>
                <span className="text-sm font-mono font-bold text-indigo-600">
                  {minDays === 0 ? 'Any' : `${minDays}d`}
                </span>
              </div>
              <input
                id="slider-min-days"
                type="range"
                min={0}
                max={90}
                step={5}
                value={minDays}
                onChange={(e) => setMinDays(Number(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
                <span>Any</span><span>90d</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Searching skeleton */}
        {pageStatus === 'searching' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
              <div className="w-5 h-5 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm font-semibold text-indigo-700">Scraping Meta Ad Library — this usually takes 1–3 minutes…</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-zinc-100 bg-white shadow-sm">
                  <div className="aspect-square shimmer" />
                  <div className="p-4 space-y-3">
                    <div className="h-2.5 shimmer rounded-full w-3/4" />
                    <div className="h-2 shimmer rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results — two-column layout when an ad is selected */}
        {showResults && (
          <div className="animate-slide-up">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold font-display text-zinc-900">
                  {ads.length} Winning Ad{ads.length !== 1 ? 's' : ''} Found
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {showPanel ? 'Insights panel open — click Remake This Ad to generate' : 'Click an ad to view insights and remake it'}
                </p>
              </div>
            </div>

            {/* Two-column or single layout */}
            <div className={`flex gap-6 items-start transition-all duration-300`}>
              {/* Ad grid — shrinks when panel is open */}
              <div className={`transition-all duration-300 ${showPanel ? 'flex-1 min-w-0' : 'w-full'}`}>
                <div className={`grid gap-4 ${showPanel
                  ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                }`}>
                  {ads.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      selected={selectedAd?.id === ad.id}
                      onSelect={handleSelectAd}
                    />
                  ))}
                </div>
              </div>

              {/* Insights panel — slides in on the right */}
              {showPanel && selectedAd && (
                <div className="w-80 flex-shrink-0 sticky top-6">
                  <InsightsPanel
                    ad={selectedAd}
                    insights={insights}
                    isLoading={insightsStatus === 'loading'}
                    error={insightsStatus === 'failed' ? insightsError : null}
                    onRetry={() => loadInsights(selectedAd)}
                    onRemake={() => setShowVariationPicker(true)}
                    isRemakingLoading={isRemakingLoading}
                    onClose={handleDeselectAd}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Variation picker modal */}
        {showVariationPicker && (
          <VariationPicker
            onSelect={handleRemake}
            onClose={() => setShowVariationPicker(false)}
            isLoading={isRemakingLoading}
          />
        )}

        {/* Empty results */}
        {pageStatus === 'done' && ads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-5 shadow-sm">
              <span className="text-3xl">🔍</span>
            </div>
            <p className="text-zinc-800 font-bold font-display text-xl tracking-tight">No matching ads found</p>
            <p className="text-sm text-zinc-500 mt-2 max-w-sm leading-relaxed">
              Try lowering the min days filter or searching a different niche URL.
            </p>
          </div>
        )}

        {/* Recent Searches */}
        {pageStatus === 'idle' && savedSearches.length > 0 && (
          <div className="animate-slide-up">
            <h2 className="text-sm font-bold font-display text-zinc-700 mb-3">Recent Searches</h2>
            <div className="space-y-2">
              {savedSearches.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-zinc-200 rounded-lg px-4 py-3 flex items-center justify-between hover:border-indigo-200 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-800 truncate font-display">
                      {extractNiche(s.searchUrl)}
                    </p>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      {s.adCount} ads · {s.minDays > 0 ? `${s.minDays}d+` : 'any age'} · {timeAgo(s.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={() => loadSavedSearch(s)}
                    className="ml-3 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
