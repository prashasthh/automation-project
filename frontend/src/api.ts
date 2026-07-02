import type { WinningAd, BrandInput } from './store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StartSearchResponse {
  searchId: string;
}

export interface PollSearchResponse {
  status: 'running' | 'done' | 'failed';
  ads?: WinningAd[];
  error?: string;
}

export interface StartGenerateResponse {
  generationId: string;
  generationIds: string[];
}

export interface PollGenerateResponse {
  status: 'pending' | 'running' | 'done' | 'failed';
  imageUrl?: string;
  promptUsed?: string;
  error?: string;
}

export interface StartIterateResponse {
  generationId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || '';

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url);
  if (res.status === 404) throw Object.assign(new Error('Not found'), { status: 404 });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export function startSearch(
  searchUrl: string,
  maxAds: number,
  minDays: number
): Promise<StartSearchResponse> {
  return post('/api/searches', { searchUrl, maxAds, minDays });
}

export function pollSearch(searchId: string): Promise<PollSearchResponse> {
  return get(`/api/searches/${searchId}`);
}

export interface AdInput {
  imageUrl: string;
  adCopy?: string | null;
  headline?: string | null;
  cta?: string | null;
  daysActive: number;
}

export function startGenerate(
  ad: AdInput,
  brand: BrandInput,
  variations: 1 | 2 | 4 = 1
): Promise<StartGenerateResponse> {
  return post('/api/generate', { ad, brand, variations });
}

export function pollGenerate(generationId: string): Promise<PollGenerateResponse> {
  return get(`/api/generate/${generationId}`);
}

export function startIterate(
  instruction: string,
  parentId: string,
  brand: BrandInput,
  parentImageUrl?: string
): Promise<StartIterateResponse> {
  return post('/api/iterate', { instruction, parentId, brand, parentImageUrl });
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export interface AdInsights {
  headline: string;
  mainOffer: string;
  cta: string;
  brandName: string;
  visualStyle: string;
  colorPalette: string[];
  productLayout: string;
  whyWorking: string;
  creativeBreakdown: {
    whyHeadlineWorks: string;
    whyLayoutWorks: string;
    emotionTargeted: string;
    marketingAngle: string;
    attentionHook: string;
    targetAudience: string;
  };
}

export function fetchInsights(
  adId: string,
  ad: AdInput
): Promise<AdInsights> {
  return post('/api/insights', { adId, ad });
}
