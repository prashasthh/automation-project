import type { ImageBrief, AdInput, BrandCtx } from './kie-prompter.js';


const KIE_API_KEY = process.env.KIE_API_KEY ?? '';
const KIE_BASE = 'https://api.kie.ai';

const FAILED_STATES = new Set([
  'failure', 'failed', 'error', 'cancelled', 'timeout', 'aborted',
]);

export interface TaskResult {
  state: 'pending' | 'running' | 'success' | 'failed';
  resultUrl?: string;
}

/** Create a nano-banana-pro image generation task */
export async function createImageTask(
  brief: ImageBrief,
  ad: AdInput,
  brand: BrandCtx,
  publicBaseUrl?: string
): Promise<string> {
  // Pass competitor ad URL + brand reference images as image_input
  const imageInputs: string[] = [];
  if (ad.imageUrl) imageInputs.push(ad.imageUrl);
  for (const url of (brand.referenceAssetUrls ?? []).slice(0, 3)) {
    if (url) imageInputs.push(url);
  }

  const body: any = {
    model: 'nano-banana-pro',
    input: {
      prompt: brief.image_prompt,
      aspect_ratio: brief.aspect_ratio,
      resolution: '2K',
      output_format: 'png',
    },
  };

  if (imageInputs.length > 0) {
    body.input.image_input = imageInputs;
  }

  // Optional webhook callback
  if (publicBaseUrl) {
    body.callBackUrl = `${publicBaseUrl}/api/kie-callback`;
  }

  const res = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE createTask failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;

  if (data.code !== 200 && data.code !== 0) {
    throw new Error(`KIE createTask error: ${JSON.stringify(data)}`);
  }

  const taskId = data?.data?.taskId ?? data?.taskId;
  if (!taskId) {
    throw new Error(`KIE createTask returned no taskId: ${JSON.stringify(data)}`);
  }

  return String(taskId);
}

/** Poll a KIE image task for its result */
export async function pollTaskResult(taskId: string): Promise<TaskResult> {
  const res = await fetch(
    `${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: { Authorization: `Bearer ${KIE_API_KEY}` },
    }
  );

  if (!res.ok) {
    throw new Error(`KIE pollTask failed: ${res.status}`);
  }

  const data = (await res.json()) as any;
  const record = data?.data ?? data;
  const rawState = String(record?.state ?? record?.status ?? 'pending').toLowerCase();

  // Normalize failed states
  if (FAILED_STATES.has(rawState)) {
    return { state: 'failed' };
  }

  if (rawState === 'success' || rawState === 'completed' || rawState === 'done') {
    let resultUrl: string | undefined;
    try {
      const parsed = typeof record.resultJson === 'string'
        ? JSON.parse(record.resultJson)
        : record.resultJson;
      resultUrl = parsed?.resultUrls?.[0] ?? parsed?.url ?? record.resultUrl ?? record.result_url;
    } catch {
      resultUrl = record.resultUrl ?? record.result_url;
    }
    return { state: 'success', resultUrl };
  }

  if (rawState === 'running' || rawState === 'processing') {
    return { state: 'running' };
  }

  return { state: 'pending' };
}
