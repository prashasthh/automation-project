// ─── Types ────────────────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  addedAt: number;
  type: 'generated' | 'inspiration';
  generatedRecordId?: string;
  inspirationAd?: WinningAd;
}

export interface BrandInput {
  brandName?: string;
  usp?: string;
  tone?: string;
  audience?: string;
  visualGuidelines?: string;
  referenceAssetUrls?: string[];
}

export interface GeneratedRecord {
  id: string;
  sourceAdId: string;
  sourceMeta?: {
    advertiserName?: string;
    daysActive?: number;
    imageUrl?: string;
  };
  status: 'generating' | 'done' | 'failed';
  imageUrl?: string;
  promptUsed?: string;
  parentId?: string;
  timestamp: number;
  // Multi-variation fields
  batchId?: string;
  styleVariant?: 'premium' | 'minimal' | 'modern' | 'bold';
  // Library management
  favorited?: boolean;
  favoritedAt?: number;
}

export interface WinningAd {
  id: string;
  adId: string;
  advertiserId: string;
  advertiserName: string;
  imageUrl: string;
  /** Local cached copy of the source image (permanent); falls back to imageUrl. */
  displayImageUrl?: string;
  daysActive: number;
  adCopy: string | null;
  headline: string | null;
  cta: string | null;
}

export interface SavedSearch {
  id: string;
  searchUrl: string;
  timestamp: number;
  adCount: number;
  minDays: number;
  ads: WinningAd[];
}

// ─── Brand ────────────────────────────────────────────────────────────────────

const BRAND_KEY = 'ad_remaker_brand';

export function getBrand(): BrandInput {
  try {
    return JSON.parse(localStorage.getItem(BRAND_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveBrand(brand: BrandInput): void {
  localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
}

// ─── Generated Records ────────────────────────────────────────────────────────

const GEN_KEY = 'ad_remaker_generated';
const GEN_CAP = 100;

export function getGeneratedRecords(): GeneratedRecord[] {
  try {
    return JSON.parse(localStorage.getItem(GEN_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveGeneratedRecord(record: GeneratedRecord): void {
  const records = getGeneratedRecords();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.unshift(record);
  }
  // Cap at 100
  const capped = records.slice(0, GEN_CAP);
  localStorage.setItem(GEN_KEY, JSON.stringify(capped));
}

export function updateGeneratedRecord(id: string, patch: Partial<GeneratedRecord>): void {
  const records = getGeneratedRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...patch };
    localStorage.setItem(GEN_KEY, JSON.stringify(records));
  }
}

export function deleteGeneratedRecord(id: string): void {
  const records = getGeneratedRecords().filter((r) => r.id !== id);
  localStorage.setItem(GEN_KEY, JSON.stringify(records));
}

export function toggleFavorite(id: string): void {
  const records = getGeneratedRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx >= 0) {
    const current = records[idx].favorited ?? false;
    records[idx] = {
      ...records[idx],
      favorited: !current,
      favoritedAt: !current ? Date.now() : undefined,
    };
    localStorage.setItem(GEN_KEY, JSON.stringify(records));
  }
}

// ─── Saved Searches ───────────────────────────────────────────────────────────

const SEARCH_KEY = 'ad_remaker_searches';
const SEARCH_CAP = 5;

export function getSavedSearches(): SavedSearch[] {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveSearch(search: SavedSearch): void {
  // Dedupe by URL — remove existing if same URL
  const searches = getSavedSearches().filter((s) => s.searchUrl !== search.searchUrl);
  searches.unshift(search);
  const capped = searches.slice(0, SEARCH_CAP);
  localStorage.setItem(SEARCH_KEY, JSON.stringify(capped));
}

export function deleteSavedSearch(id: string): void {
  const searches = getSavedSearches().filter((s) => s.id !== id);
  localStorage.setItem(SEARCH_KEY, JSON.stringify(searches));
}

// ─── Collections ──────────────────────────────────────────────────────────────

const COL_KEY = 'ad_remaker_collections';
const COL_ITEMS_KEY = 'ad_remaker_collection_items';

export function getCollections(): Collection[] {
  try {
    return JSON.parse(localStorage.getItem(COL_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveCollection(collection: Collection): void {
  const collections = getCollections();
  collections.push(collection);
  localStorage.setItem(COL_KEY, JSON.stringify(collections));
}

export function deleteCollection(id: string): void {
  const collections = getCollections().filter((c) => c.id !== id);
  localStorage.setItem(COL_KEY, JSON.stringify(collections));
  
  // Cascade delete items
  const items = getCollectionItems().filter((i) => i.collectionId !== id);
  localStorage.setItem(COL_ITEMS_KEY, JSON.stringify(items));
}

export function getCollectionItems(): CollectionItem[] {
  try {
    return JSON.parse(localStorage.getItem(COL_ITEMS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function toggleAdInCollection(
  collectionId: string,
  adId: string,
  type: 'generated' | 'inspiration',
  inspirationAd?: WinningAd
): void {
  const items = getCollectionItems();
  
  // Check if it already exists
  const existingIdx = items.findIndex(
    (i) => i.collectionId === collectionId && 
           i.type === type && 
           (type === 'generated' ? i.generatedRecordId === adId : i.inspirationAd?.id === adId)
  );

  if (existingIdx >= 0) {
    // Remove it
    items.splice(existingIdx, 1);
  } else {
    // Add it
    items.push({
      id: Math.random().toString(36).substring(2, 15),
      collectionId,
      addedAt: Date.now(),
      type,
      generatedRecordId: type === 'generated' ? adId : undefined,
      inspirationAd: type === 'inspiration' ? inspirationAd : undefined,
    });
  }
  
  localStorage.setItem(COL_ITEMS_KEY, JSON.stringify(items));
}
