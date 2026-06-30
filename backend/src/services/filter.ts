import { v4 as uuidv4 } from 'uuid';
import { parseApifyItem } from './apify';
import { dHash, hammingDistance } from './phash';

export interface WinningAd {
  id: string;
  adId: string;
  advertiserId: string;
  advertiserName: string;
  imageUrl: string;
  daysActive: number;
  adCopy: string | null;
  headline: string | null;
  cta: string | null;
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

    // Compute daysActive — if no startDate, include with daysActive = 0
    let daysActive = 0;
    if (parsed.startDate) {
      const startMs = new Date(parsed.startDate).getTime();
      if (!isNaN(startMs)) {
        daysActive = Math.floor((now - startMs) / 86_400_000);
      }
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

    // Dedupe by perceptual hash (Hamming distance < 10 = same creative)
    const hashes: bigint[] = [];
    const deduped: WinningAd[] = [];

    for (const ad of group) {
      try {
        const h = await dHash(ad.imageUrl);
        const isDupe = hashes.some((existing) => hammingDistance(existing, h) < 10);
        if (!isDupe) {
          hashes.push(h);
          deduped.push(ad);
        }
      } catch {
        // If hash fails, include the ad anyway
        deduped.push(ad);
      }
    }

    // Keep top 2 per advertiser (deduped)
    const top = deduped.slice(0, 2);
    final.push(...top);
  }

  // Sort final list by daysActive descending
  final.sort((a, b) => b.daysActive - a.daysActive);

  console.log(`[filter] ${final.length} final winning ads after dedup (top 2 per advertiser)`);

  return final;
}
