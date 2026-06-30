import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeneration } from '../contexts/GenerationContext';
import GeneratedAdCard from '../components/GeneratedAdCard';

export default function QueuePage() {
  const navigate = useNavigate();
  const { records, activeCount } = useGeneration();
  const prevActiveCount = useRef<number | null>(null);

  const activeRecords = records.filter((r) => r.status === 'generating');
  const recentlyDone = records.filter((r) => r.status === 'done').slice(0, 4);
  const recentlyFailed = records.filter((r) => r.status === 'failed').slice(0, 4);

  // Auto-navigate to library when all jobs finish
  useEffect(() => {
    if (prevActiveCount.current === null) {
      prevActiveCount.current = activeCount;
      return;
    }

    // Only redirect if we went from > 0 to 0
    if (prevActiveCount.current > 0 && activeCount === 0) {
      navigate('/library');
    }

    prevActiveCount.current = activeCount;
  }, [activeCount, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-8 py-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold font-display text-zinc-900">Generation Queue</h1>
          {activeCount > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse">
              {activeCount} generating
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-0.5">
          {activeCount > 0
            ? 'AI is working on your ads — you\'ll be redirected to Library when done.'
            : 'No active jobs. Start one from Find Ads.'}
        </p>
      </div>

      <div className="flex-1 px-8 py-6 space-y-8">
        {/* Active Jobs */}
        {activeRecords.length > 0 && (
          <section>
            <h2 className="text-sm font-bold font-display text-zinc-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Active ({activeRecords.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {activeRecords.map((record) => (
                <GeneratedAdCard key={record.id} record={record} />
              ))}
            </div>
          </section>
        )}

        {/* Recently completed (preview) */}
        {recentlyDone.length > 0 && (
          <section>
            <h2 className="text-sm font-bold font-display text-zinc-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Recently Completed
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {recentlyDone.map((record) => (
                <GeneratedAdCard
                  key={record.id}
                  record={record}
                  onClick={() => navigate('/library')}
                />
              ))}
            </div>
          </section>
        )}

        {/* Failed jobs */}
        {recentlyFailed.length > 0 && (
          <section>
            <h2 className="text-sm font-bold font-display text-zinc-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Failed
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {recentlyFailed.map((record) => (
                <GeneratedAdCard key={record.id} record={record} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {activeRecords.length === 0 && recentlyDone.length === 0 && recentlyFailed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-[2rem] bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-10 h-10 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-zinc-800 font-bold font-display text-2xl tracking-tight">Queue is empty</p>
            <p className="text-zinc-500 mt-2 max-w-sm leading-relaxed">No active generations right now. Find a winning ad and click Remake to get started.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-8 px-8 py-3.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 hover:shadow-premium transition-all shadow-md flex items-center gap-2"
            >
              Go to Find Ads
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
