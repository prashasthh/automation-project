import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { pollGenerate } from '../api';
import {
  getGeneratedRecords,
  saveGeneratedRecord,
  updateGeneratedRecord,
  type GeneratedRecord,
} from '../store';

// ─── Context Types ─────────────────────────────────────────────────────────────

interface GenerationContextValue {
  records: GeneratedRecord[];
  activeCount: number;
  startPolling: (
    id: string,
    sourceAdId: string,
    sourceMeta?: GeneratedRecord['sourceMeta'],
    parentId?: string,
    batchId?: string,
    styleVariant?: GeneratedRecord['styleVariant']
  ) => void;
  /** Start polling for a batch of variation IDs at once */
  startBatchPolling: (
    generationIds: string[],
    sourceAdId: string,
    sourceMeta?: GeneratedRecord['sourceMeta']
  ) => void;
  refreshRecords: () => void;
}

const GenerationContext = createContext<GenerationContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

const EXPIRE_MS = 10 * 60 * 1000; // 10 minutes
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_ATTEMPTS = 200; // ~10 min

// Style variant labels in order (matches VARIANT_ORDER in backend)
const VARIANT_ORDER: Array<GeneratedRecord['styleVariant']> = ['premium', 'minimal', 'modern', 'bold'];

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<GeneratedRecord[]>(() => getGeneratedRecords());
  const intervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const attempts = useRef<Map<string, number>>(new Map());

  const refreshRecords = useCallback(() => {
    setRecords(getGeneratedRecords());
  }, []);

  // On mount: expire old generating records + clean up failed with no image
  useEffect(() => {
    const now = Date.now();
    const all = getGeneratedRecords();

    for (const r of all) {
      if (r.status === 'generating') {
        if (now - r.timestamp > EXPIRE_MS) {
          updateGeneratedRecord(r.id, { status: 'failed' });
        } else {
          // Resume polling!
          startPolling(r.id, r.sourceAdId, r.sourceMeta, r.parentId, r.batchId, r.styleVariant, true);
        }
      }
    }

    // Remove failed records with no imageUrl (pure noise)
    const cleaned = getGeneratedRecords().filter(
      (r) => !(r.status === 'failed' && !r.imageUrl)
    );
    localStorage.setItem('ad_remaker_generated', JSON.stringify(cleaned));

    setRecords(getGeneratedRecords());
  }, []);

  const stopPolling = useCallback((id: string) => {
    const interval = intervals.current.get(id);
    if (interval) {
      clearInterval(interval);
      intervals.current.delete(id);
    }
    attempts.current.delete(id);
  }, []);

  const startPolling = useCallback(
    (
      id: string,
      sourceAdId: string,
      sourceMeta?: GeneratedRecord['sourceMeta'],
      parentId?: string,
      batchId?: string,
      styleVariant?: GeneratedRecord['styleVariant'],
      isResume = false
    ) => {
      if (!isResume) {
        // Create placeholder record immediately
        const placeholder: GeneratedRecord = {
          id,
          sourceAdId,
          sourceMeta,
          status: 'generating',
          parentId,
          timestamp: Date.now(),
          batchId,
          styleVariant,
        };
        saveGeneratedRecord(placeholder);
        setRecords(getGeneratedRecords());
        attempts.current.set(id, 0);
      } else {
        // If resuming, estimate attempts based on time elapsed
        const existing = getGeneratedRecords().find(r => r.id === id);
        if (existing) {
          const elapsed = Date.now() - existing.timestamp;
          attempts.current.set(id, Math.floor(elapsed / POLL_INTERVAL));
        } else {
          attempts.current.set(id, 0);
        }
      }

      const interval = setInterval(async () => {
        const attempt = (attempts.current.get(id) ?? 0) + 1;
        attempts.current.set(id, attempt);

        if (attempt > MAX_ATTEMPTS) {
          updateGeneratedRecord(id, { status: 'failed' });
          stopPolling(id);
          setRecords(getGeneratedRecords());
          return;
        }

        try {
          const result = await pollGenerate(id);

          if (result.status === 'done' && result.imageUrl) {
            updateGeneratedRecord(id, {
              status: 'done',
              imageUrl: result.imageUrl,
              promptUsed: result.promptUsed,
            });
            stopPolling(id);
            setRecords(getGeneratedRecords());
          } else if (result.status === 'failed') {
            updateGeneratedRecord(id, { status: 'failed' });
            stopPolling(id);
            setRecords(getGeneratedRecords());
          }
        } catch (err: any) {
          // 404 = server restarted, task lost
          if (err?.status === 404 || err?.message?.includes('Not found')) {
            updateGeneratedRecord(id, { status: 'failed' });
            stopPolling(id);
            setRecords(getGeneratedRecords());
          }
          // Other errors — keep polling
        }
      }, POLL_INTERVAL);

      intervals.current.set(id, interval);
    },
    [stopPolling]
  );

  /** Start polling for all IDs in a batch. Each gets its own polling loop. */
  const startBatchPolling = useCallback(
    (
      generationIds: string[],
      sourceAdId: string,
      sourceMeta?: GeneratedRecord['sourceMeta']
    ) => {
      const batchId = generationIds[0]; // Use first ID as batch identifier
      const count = generationIds.length;

      generationIds.forEach((id, index) => {
        // Assign style variant only when generating multiple
        const styleVariant = count > 1 ? VARIANT_ORDER[index % VARIANT_ORDER.length] : undefined;
        startPolling(id, sourceAdId, sourceMeta, undefined, batchId, styleVariant);
      });
    },
    [startPolling]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const interval of intervals.current.values()) {
        clearInterval(interval);
      }
    };
  }, []);

  const activeCount = records.filter((r) => r.status === 'generating').length;

  return (
    <GenerationContext.Provider value={{ records, activeCount, startPolling, startBatchPolling, refreshRecords }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error('useGeneration must be used inside GenerationProvider');
  return ctx;
}
