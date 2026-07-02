import React, { useState, useEffect } from 'react';
import {
  getCollections,
  saveCollection,
  getCollectionItems,
  toggleAdInCollection,
  type Collection,
  type CollectionItem,
  type WinningAd,
} from '../store';

interface CollectionModalProps {
  adId: string;
  adType: 'generated' | 'inspiration';
  inspirationAd?: WinningAd;
  onClose: () => void;
}

export default function CollectionModal({
  adId,
  adType,
  inspirationAd,
  onClose,
}: CollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    setCollections(getCollections());
    setItems(getCollectionItems());
  }, []);

  const handleToggle = (collectionId: string) => {
    toggleAdInCollection(collectionId, adId, adType, inspirationAd);
    setItems(getCollectionItems());
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    const newCol: Collection = {
      id: Math.random().toString(36).substring(2, 15),
      name: newCollectionName.trim(),
      createdAt: Date.now(),
    };
    saveCollection(newCol);
    
    // Automatically add this ad to the new collection
    toggleAdInCollection(newCol.id, adId, adType, inspirationAd);
    
    setCollections(getCollections());
    setItems(getCollectionItems());
    setNewCollectionName('');
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
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slide-up flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold font-display text-zinc-900 text-lg">Save to Collection</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[100px] mb-4 space-y-2">
          {collections.length === 0 ? (
            <p className="text-sm text-zinc-500 italic text-center py-4">No collections yet.</p>
          ) : (
            collections.map((col) => {
              const isAdded = items.some(
                (i) =>
                  i.collectionId === col.id &&
                  i.type === adType &&
                  (adType === 'generated'
                    ? i.generatedRecordId === adId
                    : i.inspirationAd?.id === adId)
              );

              return (
                <label
                  key={col.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-50 cursor-pointer border border-transparent hover:border-zinc-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isAdded}
                    onChange={() => handleToggle(col.id)}
                    className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-zinc-800">{col.name}</span>
                </label>
              );
            })
          )}
        </div>

        <form onSubmit={handleCreate} className="mt-auto border-t border-zinc-100 pt-4 flex gap-2">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="+ New Collection"
            className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newCollectionName.trim()}
            className="px-4 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
}
