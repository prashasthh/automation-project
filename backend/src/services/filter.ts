import { v4 as uuidv4 } from 'uuid';
import { parseApifyItem } from './apify.js';
import { dHashFromBuffer, hammingDistance } from './phash.js';
import { saveImageBuffer } from './localstore.js';

export interface WinningAd {
  id: string;
  adId: string;
  advertiserId: string;
  advertiserName: string;
  imageUrl: string;
  /** Local cached copy of the source image (permanent) — used for display. */
  displayImageUrl?: string;
  daysActive: number;
  adCopy: string | null;
  headline: string | null;
  cta: string | null;
}

/** Best-effort file extension from an image URL (defaults to jpg). */
function extFromUrl(url: string): string {
  const m = url.split('?')[0].match(/\.(jpe?g|png|webp)$/i);
  if (!m) return 'jpg';
  const e = m[1].toLowerCase();
  return e === 'jpeg' ? 'jpg' : e;
}

/**
 * Filter raw Apify items to winning static image ads, deduplicated per advertiser.
 *
 * Pipeline:
 * 1. Parse + validate — must have imageUrl. isActive & creativeType are best-effort
 *    (the Ad Library URL already filters active_status=active, so we trust that).
 * 2. Compute daysActive, skip if < minDays.
 * 3. Group by advertiser.
 * 4. Per group: dedupe by perceptual hash (Hamming < 10 = same creative),
 *    sort by daysActive desc, keep top 2.
 * 5. Return final[] sorted by daysActive desc.
 */
/**
 * Normalize a timestamp to epoch milliseconds.
 * Facebook returns dates as Unix timestamps in *seconds* (e.g. 1644134400) or as
 * date strings ("2022-02-06 08:00:00"). Feeding seconds straight into `new Date()`
 * treats them as milliseconds and lands in 1970 — hence bogus "20000d running".
 */
function toEpochMs(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === 'number') {
    if (!isFinite(v)) return null;
    return v < 1e12 ? v * 1000 : v; // < 1e12 ⇒ seconds
  }
  const s = String(v).trim();
  if (s === '') return null;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return n < 1e12 ? n * 1000 : n;
  }
  const ms = new Date(s).getTime();
  return isNaN(ms) ? null : ms;
}

export async function filterAndDedupe(
  rawItems: any[],
  minDays = 0
): Promise<WinningAd[]> {
  const now = Date.now();
  const candidates: WinningAd[] = [];

  console.log(`[filter] Processing ${rawItems.length} raw items, minDays=${minDays}`);

  for (const item of rawItems) {
    const parsed = parseApifyItem(item);

    // Must have an image URL — this is our primary filter
    if (!parsed.imageUrl) continue;

    // Skip obvious non-image types (video), but if no type info just proceed
    if (parsed.creativeType === 'video') continue;

    // Compute daysActive — if no startDate, include with daysActive = 0.
    // Count up to the ad's end date when it has already stopped, otherwise up to now.
    let daysActive = 0;
    const startMs = toEpochMs(parsed.startDate);
    if (startMs != null) {
      const endMs = toEpochMs(parsed.endDate);
      const endpoint = endMs != null && endMs < now ? endMs : now;
      daysActive = Math.max(0, Math.floor((endpoint - startMs) / 86_400_000));
    }

    // Skip if below minimum days threshold
    if (daysActive < minDays) continue;

    candidates.push({
      id: uuidv4(),
      adId: parsed.adId,
      advertiserId: parsed.pageId || parsed.adId, // fallback to adId if no pageId
      advertiserName: parsed.pageName,
      imageUrl: parsed.imageUrl,
      daysActive,
      adCopy: parsed.adCopy,
      headline: parsed.headline,
      cta: parsed.cta,
    });
  }

  console.log(`[filter] ${candidates.length} candidates after image/days filter`);

  // Group by advertiser
  const grouped = new Map<string, WinningAd[]>();
  for (const ad of candidates) {
    const group = grouped.get(ad.advertiserId) ?? [];
    group.push(ad);
    grouped.set(ad.advertiserId, group);
  }

  const final: WinningAd[] = [];

  for (const [, group] of grouped) {
    // Sort by daysActive descending
    group.sort((a, b) => b.daysActive - a.daysActive);

    // Dedupe by perceptual hash (Hamming distance < 10 = same creative).
    // Fetch each image once and reuse the buffer for both hashing and caching.
    const hashes: bigint[] = [];
    const deduped: { ad: WinningAd; buffer: Buffer | null; ext: string }[] = [];

    for (const ad of group) {
      let buffer: Buffer | null = null;
      try {
        const res = await fetch(ad.imageUrl, { signal: AbortSignal.timeout(10_000) });
        if (res.ok) buffer = Buffer.from(await res.arrayBuffer());
      } catch {
        /* image unreachable — keep the ad, skip dedup + caching */
      }

      if (!buffer) {
        deduped.push({ ad, buffer: null, ext: 'jpg' });
        continue;
      }

      let h: bigint;
      try {
        h = await dHashFromBuffer(buffer);
      } catch {
        deduped.push({ ad, buffer, ext: extFromUrl(ad.imageUrl) });
        continue;
      }

      if (hashes.some((existing) => hammingDistance(existing, h) < 10)) continue; // dupe
      hashes.push(h);
      deduped.push({ ad, buffer, ext: extFromUrl(ad.imageUrl) });
    }

    // Keep top 2 per advertiser and cache their source image locally so it
    // survives Facebook's ~4-day CDN URL expiry (used for display).
    for (const { ad, buffer, ext } of deduped.slice(0, 2)) {
      if (buffer) {
        try {
          ad.displayImageUrl = saveImageBuffer(buffer, ext);
        } catch {
          /* leave undefined → frontend falls back to imageUrl */
        }
      }
      final.push(ad);
    }
  }

  // Sort final list by daysActive descending
  final.sort((a, b) => b.daysActive - a.daysActive);

  console.log(`[filter] ${final.length} final winning ads after dedup (top 2 per advertiser)`);

  return final;
}
