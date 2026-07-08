const APIFY_TOKEN = process.env.APIFY_TOKEN ?? '';

const ACTOR_ID = 'curious_coder~facebook-ads-library-scraper';
const BASE = 'https://api.apify.com/v2';

export interface ApifyRunResult {
  runId: string;
  datasetId: string;
}

export interface ParsedAd {
  adId: string;
  pageId: string;
  pageName: string;
  imageUrl: string | null;
  isActive: boolean;
  startDate: string | number | null;
  endDate: string | number | null;
  adCopy: string | null;
  headline: string | null;
  cta: string | null;
  creativeType: string;
}

/** Start an Apify actor run and return runId + datasetId */
export async function startApifyRun(searchUrl: string, maxAds: number): Promise<ApifyRunResult> {
  const body = {
    count: maxAds,
    scrapeAdDetails: true,
    'scrapePageAds.activeStatus': 'active',
    'scrapePageAds.countryCode': 'ALL',
    'scrapePageAds.sortBy': 'impressions_desc',
    urls: [{ url: searchUrl }],
  };

  const res = await fetch(
    `${BASE}/acts/${ACTOR_ID}/runs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APIFY_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify start failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as any;
  const runId = json?.data?.id;
  const datasetId = json?.data?.defaultDatasetId;

  if (!runId || !datasetId) {
    throw new Error(`Apify returned unexpected shape: ${JSON.stringify(json)}`);
  }

  return { runId, datasetId };
}

/** Poll actor run status */
export async function getRunStatus(runId: string): Promise<string> {
  const res = await fetch(`${BASE}/actor-runs/${runId}`, {
    headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Apify poll failed: ${res.status}`);
  const json = (await res.json()) as any;
  return json?.data?.status ?? 'UNKNOWN';
}

/** Fetch all items from an Apify dataset */
export async function fetchDataset(datasetId: string): Promise<any[]> {
  const res = await fetch(
    `${BASE}/datasets/${datasetId}/items?clean=true`,
    { headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` } }
  );
  if (!res.ok) throw new Error(`Apify dataset fetch failed: ${res.status}`);
  return (await res.json()) as any[];
}

/** Parse a raw Apify item into a normalized ParsedAd */
export function parseApifyItem(item: any): ParsedAd {
  const snapshot = item.snapshot ?? item.ad_snapshot ?? item.adSnapshot ?? {};
  const images: any[] = snapshot.images ?? snapshot.media ?? [];

  // Try every known image URL path
  const imageUrl: string | null =
    images[0]?.original_image_url ??
    images[0]?.resized_image_url ??
    images[0]?.url ??
    snapshot.image_url ??
    snapshot.thumbnail_url ??
    item.imageUrl ??
    item.image_url ??
    item.thumbnail ??
    item.picture ??
    null;

  const adId = String(item.adArchiveId ?? item.id ?? item.ad_id ?? item.archive_id ?? '');
  const pageId = String(item.pageId ?? item.page_id ?? item.advertiser_id ?? item.fanPageId ?? '');
  const pageName = String(
    item.pageName ?? item.page_name ?? item.advertiser_name ??
    item.fanPageName ?? item.page?.name ?? 'Unknown'
  );
  const startDate =
    item.startDate ?? item.start_date ?? item.startedRunningAt ??
    item.started_running_at ?? item.ad_delivery_start_time ?? null;
  const endDate =
    item.endDate ?? item.end_date ?? item.endedRunningAt ??
    item.ended_running_at ?? item.ad_delivery_stop_time ?? null;
  const isActive: boolean =
    (item.isActive ?? item.is_active ?? item.active ?? item.status === 'ACTIVE') === true;

  // Determine creative type
  const hasVideo =
    (snapshot.videos && snapshot.videos.length > 0) ||
    (snapshot.video && snapshot.video.length > 0) ||
    item.hasVideo || item.is_video || item.mediaType === 'video';

  const hasImage = imageUrl != null;

  const rawType = item.creativeType ?? item.creative_type ?? item.mediaType ?? item.media_type;
  const creativeType = rawType
    ? String(rawType).toLowerCase()
    : hasVideo ? 'video' : hasImage ? 'image' : 'text';

  const adCopy =
    snapshot.body?.markup ??
    snapshot.body?.text ??
    snapshot.body_text ??
    snapshot.text ??
    item.adCopy ?? item.ad_copy ?? item.description ??
    null;

  const headline =
    snapshot.title ??
    snapshot.link_title ??
    snapshot.linkTitle ??
    item.headline ?? item.title ??
    null;

  const cta =
    snapshot.cta_type ??
    snapshot.call_to_action_type ??
    snapshot.ctaType ??
    item.cta ?? item.call_to_action ??
    null;

  return {
    adId,
    pageId,
    pageName,
    imageUrl,
    isActive,
    startDate,
    endDate,
    adCopy,
    headline,
    cta,
    creativeType: String(creativeType).toLowerCase(),
  };
}
