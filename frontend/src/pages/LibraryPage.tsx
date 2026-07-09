import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeneration } from '../contexts/GenerationContext';
import { useToast } from '../components/Toast';
import {
  getBrand,
  deleteGeneratedRecord,
  toggleFavorite,
  getCollections,
  getCollectionItems,
  type GeneratedRecord,
  type Collection,
  type CollectionItem,
  type WinningAd,
} from '../store';
import { startIterate } from '../api';
import GeneratedAdCard from '../components/GeneratedAdCard';
import AdCard from '../components/AdCard';
import CollectionModal from '../components/CollectionModal';

// ─── Filter Bar ────────────────────────────────────────────────────────────────

type DateFilter = 'all' | 'today' | 'week';

interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  brands: string[];
  brand: string;
  onBrand: (v: string) => void;
  collections: Collection[];
  collectionFilter: string;
  onCollection: (v: string) => void;
  dateFilter: DateFilter;
  onDate: (v: DateFilter) => void;
  favoritesOnly: boolean;
  onFavoritesOnly: (v: boolean) => void;
  totalShown: number;
  totalAll: number;
}

function FilterBar({
  search, onSearch, brands, brand, onBrand,
  collections, collectionFilter, onCollection,
  dateFilter, onDate, favoritesOnly, onFavoritesOnly,
  totalShown, totalAll,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="library-search"
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search ads…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-zinc-400"
        />
      </div>

      {/* Brand filter */}
      {brands.length > 1 && (
        <select
          id="library-filter-brand"
          value={brand}
          onChange={(e) => onBrand(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-zinc-700 cursor-pointer"
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      )}

      {/* Collection filter */}
      {collections.length > 0 && (
        <select
          id="library-filter-collection"
          value={collectionFilter}
          onChange={(e) => onCollection(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-zinc-700 cursor-pointer"
        >
          <option value="">All Collections</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {/* Date filter */}
      <div className="flex rounded-lg border border-zinc-200 overflow-hidden bg-white">
        {(['all', 'today', 'week'] as DateFilter[]).map((d) => (
          <button
            key={d}
            id={`library-date-${d}`}
            onClick={() => onDate(d)}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              dateFilter === d
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            {d === 'all' ? 'All time' : d === 'today' ? 'Today' : 'This week'}
          </button>
        ))}
      </div>

      {/* Favorites toggle */}
      <button
        id="library-filter-favorites"
        onClick={() => onFavoritesOnly(!favoritesOnly)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
          favoritesOnly
            ? 'bg-amber-50 border-amber-300 text-amber-700'
            : 'bg-white border-zinc-200 text-zinc-500 hover:border-amber-300 hover:text-amber-600'
        }`}
      >
        <span>⭐</span>
        Favorites
      </button>

      {/* Count */}
      <span className="text-xs text-zinc-400 font-mono ml-auto">
        {totalShown === totalAll ? `${totalAll} ads` : `${totalShown} of ${totalAll}`}
      </span>
    </div>
  );
}

// ─── Lightboxes ───────────────────────────────────────────────────────────────

interface LightboxProps {
  record: GeneratedRecord;
  onClose: () => void;
  onIterate: (record: GeneratedRecord) => void;
  onDelete: (id: string) => void;
  onFavorite: (id: string) => void;
  onRefreshCollections: () => void;
}

function Lightbox({ record, onClose, onIterate, onDelete, onFavorite, onRefreshCollections }: LightboxProps) {
  const toast = useToast();
  const [showCollections, setShowCollections] = useState(false);
  const hasSource = !!record.sourceMeta?.imageUrl;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/export/${record.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adforge-${record.id.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export downloaded successfully');
    } catch (err) {
      toast.error('Failed to export ZIP');
    }
  };

  const handleDownloadImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!record.imageUrl) return;
    try {
      const res = await fetch(record.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad-${record.id.slice(0, 8)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(record.imageUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      id="lightbox-overlay"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 className="font-bold font-display text-zinc-900">
              {record.sourceMeta?.advertiserName ?? 'Generated Ad'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {record.sourceMeta?.daysActive != null && (
                <p className="text-xs text-zinc-500 font-mono">
                  Based on ad running {record.sourceMeta.daysActive} days
                </p>
              )}
              {record.styleVariant && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  {record.styleVariant}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Save to Collection */}
            <button
              onClick={() => setShowCollections(true)}
              className="px-3 py-1.5 text-sm font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Collections
            </button>

            {/* Favorite */}
            <button
              id="btn-lightbox-favorite"
              onClick={() => { onFavorite(record.id); }}
              title={record.favorited ? 'Remove from favorites' : 'Add to favorites'}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                record.favorited
                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  : 'text-zinc-600 bg-zinc-100 hover:bg-amber-50 hover:text-amber-600'
              }`}
            >
              <span>{record.favorited ? '⭐' : '☆'}</span>
              {record.favorited ? 'Favorited' : 'Favorite'}
            </button>

            {/* Iterate */}
            <button
              id="btn-lightbox-iterate"
              onClick={() => onIterate(record)}
              className="px-3 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Iterate →
            </button>

            {/* Download */}
            {record.imageUrl && (
              <button
                id="btn-lightbox-download"
                onClick={handleDownloadImage}
                className="px-3 py-1.5 text-sm font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Image
              </button>
            )}

            {/* Export Package */}
            <button
              id="btn-lightbox-export"
              onClick={handleExport}
              className="px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Export ZIP
            </button>

            {/* Delete */}
            <button
              onClick={() => { onDelete(record.id); onClose(); }}
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Close */}
            <button
              id="btn-lightbox-close"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Comparison */}
        <div className="p-6">
          {hasSource ? (
            <div className="flex gap-6 items-start">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 font-display">
                  Inspiration
                </p>
                <img
                  src={record.sourceMeta!.imageUrl}
                  alt="Competitor inspiration ad"
                  className="w-full rounded-xl border border-zinc-100 shadow-card"
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.onerror = null;
                    t.src =
                      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' fill='%230a0a0a'/><text x='60' y='56' font-size='7' fill='%23FF5F1F' text-anchor='middle' font-family='monospace'>SOURCE</text><text x='60' y='70' font-size='7' fill='%236b6b6b' text-anchor='middle' font-family='monospace'>EXPIRED</text></svg>";
                  }}
                />
              </div>
              <div className="flex-shrink-0 flex items-center self-center mt-6">
                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 font-display">
                  Your Version
                </p>
                {record.imageUrl ? (
                  <img
                    src={record.imageUrl}
                    alt="Your generated ad"
                    className="w-full rounded-xl border border-indigo-100 shadow-card"
                  />
                ) : (
                  <div className="aspect-square rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                    <p className="text-zinc-400 text-sm">No image</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="max-w-md w-full">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 font-display text-center">
                  Your Generated Ad
                </p>
                {record.imageUrl && (
                  <img
                    src={record.imageUrl}
                    alt="Generated ad"
                    className="w-full rounded-xl border border-indigo-100 shadow-card"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Prompt used */}
        {record.promptUsed && (
          <div className="px-6 pb-6">
            <details className="group">
              <summary className="text-xs font-semibold text-zinc-500 cursor-pointer hover:text-zinc-700 transition-colors list-none flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                View prompt used
              </summary>
              <p className="mt-2 text-xs text-zinc-500 font-mono bg-zinc-50 rounded-lg p-3 leading-relaxed border border-zinc-100">
                {record.promptUsed}
              </p>
            </details>
          </div>
        )}
      </div>
      
      {showCollections && (
        <CollectionModal
          adId={record.id}
          adType="generated"
          onClose={() => {
            setShowCollections(false);
            onRefreshCollections();
          }}
        />
      )}
    </div>
  );
}

function InspirationLightbox({ ad, onClose, onRefreshCollections }: { ad: WinningAd; onClose: () => void; onRefreshCollections: () => void }) {
  const [showCollections, setShowCollections] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 className="font-bold font-display text-zinc-900">
              {ad.advertiserName}
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Inspiration Ad
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCollections(true)}
              className="px-3 py-1.5 text-sm font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Collections
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
           <img
             src={ad.displayImageUrl || ad.imageUrl}
             alt="Competitor inspiration ad"
             className="w-full rounded-xl border border-zinc-100 shadow-card mb-6"
             onError={(e) => {
               const t = e.currentTarget;
               t.onerror = null;
               t.src =
                 "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' fill='%230a0a0a'/><text x='60' y='56' font-size='7' fill='%23FF5F1F' text-anchor='middle' font-family='monospace'>SOURCE</text><text x='60' y='70' font-size='7' fill='%236b6b6b' text-anchor='middle' font-family='monospace'>EXPIRED</text></svg>";
             }}
           />
           <div className="space-y-4 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
             <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Headline</p>
               <p className="text-sm font-semibold text-zinc-800">{ad.headline || 'N/A'}</p>
             </div>
             <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ad Copy</p>
               <p className="text-sm text-zinc-700">{ad.adCopy || 'N/A'}</p>
             </div>
             <div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">CTA</p>
               <p className="text-sm font-semibold text-zinc-800">{ad.cta || 'N/A'}</p>
             </div>
           </div>
        </div>
      </div>
      {showCollections && (
        <CollectionModal
          adId={ad.id}
          adType="inspiration"
          inspirationAd={ad}
          onClose={() => {
            setShowCollections(false);
            onRefreshCollections();
          }}
        />
      )}
    </div>
  );
}

// ─── Iterate Modal ─────────────────────────────────────────────────────────────

interface IterateModalProps {
  record: GeneratedRecord;
  onClose: () => void;
}

function IterateModal({ record, onClose }: IterateModalProps) {
  const navigate = useNavigate();
  const { startPolling } = useGeneration();
  const toast = useToast();
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleIterate = async () => {
    if (!instruction.trim()) return;
    setIsLoading(true);
    try {
      const brand = getBrand();
      const { generationId } = await startIterate(instruction, record.id, brand, record.imageUrl);
      startPolling(generationId, record.sourceAdId, record.sourceMeta, record.id);
      toast.info('Iteration started — check the Queue');
      onClose();
      navigate('/queue');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to start iteration');
    } finally {
      setIsLoading(false);
    }
  };

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
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold font-display text-zinc-900 text-lg mb-1">Iterate on this ad</h3>
        <p className="text-sm text-zinc-500 mb-4">
          Describe what to change — color, layout, tone, text, etc.
        </p>
        <textarea
          id="iterate-instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Make the background darker and the headline more punchy. Add a 'Limited Time' badge."
          className="w-full h-28 px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
          autoFocus
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-iterate-generate"
            onClick={handleIterate}
            disabled={!instruction.trim() || isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Generate →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Library Page ─────────────────────────────────────────────────────────────

const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;

export default function LibraryPage() {
  const { records, refreshRecords } = useGeneration();
  const toast = useToast();
  const navigate = useNavigate();

  const [lightboxRecord, setLightboxRecord] = useState<GeneratedRecord | null>(null);
  const [inspirationLightboxAd, setInspirationLightboxAd] = useState<WinningAd | null>(null);
  const [iterateRecord, setIterateRecord] = useState<GeneratedRecord | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filter state
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const doneRecords = records.filter((r) => r.status === 'done');

  const collections = useMemo(() => getCollections(), [refreshTrigger]);
  const collectionItems = useMemo(() => getCollectionItems(), [refreshTrigger]);

  const handleRefreshCollections = useCallback(() => {
    setRefreshTrigger(v => v + 1);
  }, []);

  // Unique brand names for the filter dropdown
  const brands = useMemo(() => {
    const names = new Set<string>();
    doneRecords.forEach((r) => {
      if (r.sourceMeta?.advertiserName) names.add(r.sourceMeta.advertiserName);
    });
    return Array.from(names).sort();
  }, [doneRecords]);

  // Apply all filters
  const filteredItems = useMemo(() => {
    const now = Date.now();
    let baseItems: Array<{ id: string; type: 'generated' | 'inspiration'; record?: GeneratedRecord; ad?: WinningAd; timestamp: number }> = [];

    if (collectionFilter) {
      // Only items in this collection
      const itemsInCol = collectionItems.filter((i) => i.collectionId === collectionFilter);
      itemsInCol.forEach((item) => {
        if (item.type === 'generated' && item.generatedRecordId) {
          const r = doneRecords.find((dr) => dr.id === item.generatedRecordId);
          if (r) baseItems.push({ id: `gen-${r.id}`, type: 'generated', record: r, timestamp: item.addedAt });
        } else if (item.type === 'inspiration' && item.inspirationAd) {
          baseItems.push({ id: `insp-${item.inspirationAd.id}`, type: 'inspiration', ad: item.inspirationAd, timestamp: item.addedAt });
        }
      });
      // Sort by addedAt descending
      baseItems.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      // All generated records
      baseItems = doneRecords.map((r) => ({ id: `gen-${r.id}`, type: 'generated', record: r, timestamp: r.timestamp }));
    }

    return baseItems.filter((item) => {
      if (item.type === 'generated' && item.record) {
        const r = item.record;
        // Search
        if (search) {
          const q = search.toLowerCase();
          const name = (r.sourceMeta?.advertiserName ?? '').toLowerCase();
          const prompt = (r.promptUsed ?? '').toLowerCase();
          if (!name.includes(q) && !prompt.includes(q)) return false;
        }
        // Brand
        if (brandFilter && r.sourceMeta?.advertiserName !== brandFilter) return false;
        // Date
        if (dateFilter === 'today' && now - r.timestamp > ONE_DAY) return false;
        if (dateFilter === 'week' && now - r.timestamp > ONE_WEEK) return false;
        // Favorites
        if (favoritesOnly && !r.favorited) return false;
        return true;
      } else if (item.type === 'inspiration' && item.ad) {
        const ad = item.ad;
        // Search
        if (search) {
          const q = search.toLowerCase();
          const name = (ad.advertiserName ?? '').toLowerCase();
          const copy = (ad.adCopy ?? '').toLowerCase();
          if (!name.includes(q) && !copy.includes(q)) return false;
        }
        // Brand
        if (brandFilter && ad.advertiserName !== brandFilter) return false;
        // Favorites
        if (favoritesOnly) return false; // Inspiration ads don't have this favorited toggle in this context
        return true;
      }
      return false;
    });
  }, [doneRecords, search, brandFilter, collectionFilter, dateFilter, favoritesOnly, collectionItems]);

  const handleDelete = useCallback((id: string) => {
    deleteGeneratedRecord(id);
    refreshRecords();
    toast.success('Ad deleted');
  }, [refreshRecords, toast]);

  const handleFavorite = useCallback((id: string) => {
    const record = records.find((r) => r.id === id);
    toggleFavorite(id);
    refreshRecords();
    // Update lightbox record if it's the one being toggled
    if (lightboxRecord?.id === id) {
      setLightboxRecord((prev) => prev ? { ...prev, favorited: !prev.favorited } : null);
    }
    toast.success(record?.favorited ? 'Removed from favorites' : '⭐ Added to favorites');
  }, [records, refreshRecords, lightboxRecord, toast]);

  const hasAnyItems = filteredItems.length > 0;
  const showEmptyFilterState = !hasAnyItems && (doneRecords.length > 0 || collectionFilter);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-display text-zinc-900">Ad Library</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Organize and review your generated and collected inspiration ads.
            </p>
          </div>
          {(doneRecords.length > 0 || collections.length > 0) && (
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              + Find More Ads
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-8 py-6">
        {(doneRecords.length > 0 || collections.length > 0) ? (
          <>
            {/* Filter bar */}
            <FilterBar
              search={search}
              onSearch={setSearch}
              brands={brands}
              brand={brandFilter}
              onBrand={setBrandFilter}
              collections={collections}
              collectionFilter={collectionFilter}
              onCollection={setCollectionFilter}
              dateFilter={dateFilter}
              onDate={setDateFilter}
              favoritesOnly={favoritesOnly}
              onFavoritesOnly={setFavoritesOnly}
              totalShown={filteredItems.length}
              totalAll={collectionFilter ? collectionItems.filter(i => i.collectionId === collectionFilter).length : doneRecords.length}
            />

            {/* Grid */}
            {hasAnyItems ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-slide-up">
                {filteredItems.map((item) => {
                  if (item.type === 'generated' && item.record) {
                    return (
                      <GeneratedAdCard
                        key={item.id}
                        record={item.record}
                        onClick={() => setLightboxRecord(item.record!)}
                        onFavorite={handleFavorite}
                        onDelete={handleDelete}
                      />
                    );
                  } else if (item.type === 'inspiration' && item.ad) {
                    return (
                      <AdCard
                        key={item.id}
                        ad={item.ad}
                        selected={false}
                        onSelect={() => setInspirationLightboxAd(item.ad!)}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            ) : showEmptyFilterState ? (
              // Empty filter state
              <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-zinc-700 font-semibold font-display">No ads match your filters</p>
                <p className="text-sm text-zinc-400 mt-1">Try clearing filters or selecting a different collection.</p>
                <button
                  onClick={() => { setSearch(''); setBrandFilter(''); setCollectionFilter(''); setDateFilter('all'); setFavoritesOnly(false); }}
                  className="mt-4 px-4 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : null}
          </>
        ) : (
          // Empty library state
          <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 flex items-center justify-center mb-6 shadow-premium">
              <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-zinc-800 font-bold font-display text-2xl tracking-tight">Your library is empty</p>
            <p className="text-zinc-500 mt-2 max-w-sm leading-relaxed">
              Generate your first high-converting ad or save some inspiration ads to a collection.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-8 px-8 py-3.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 hover:shadow-premium transition-all shadow-md flex items-center gap-2"
            >
              Find Winning Ads
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox for Generated Record */}
      {lightboxRecord && (
        <Lightbox
          record={lightboxRecord}
          onClose={() => setLightboxRecord(null)}
          onIterate={(r) => { setLightboxRecord(null); setIterateRecord(r); }}
          onDelete={(id) => { handleDelete(id); setLightboxRecord(null); }}
          onFavorite={handleFavorite}
          onRefreshCollections={handleRefreshCollections}
        />
      )}

      {/* Lightbox for Inspiration Ad */}
      {inspirationLightboxAd && (
        <InspirationLightbox
          ad={inspirationLightboxAd}
          onClose={() => setInspirationLightboxAd(null)}
          onRefreshCollections={handleRefreshCollections}
        />
      )}

      {/* Iterate Modal */}
      {iterateRecord && (
        <IterateModal
          record={iterateRecord}
          onClose={() => setIterateRecord(null)}
        />
      )}
    </div>
  );
}
