
const KIE_API_KEY = process.env.KIE_API_KEY ?? '';
const KIE_BASE = 'https://api.kie.ai';

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

interface AdInput {
  imageUrl: string;
  adCopy?: string | null;
  headline?: string | null;
  cta?: string | null;
  daysActive: number;
}

function buildInsightsPrompt(ad: AdInput): string {
  const lines: string[] = [];

  lines.push(`You are an elite performance marketing analyst specializing in Facebook ad creative strategy.`);
  lines.push(`Your job is to deeply analyze a static image ad and extract structured insights that agencies can use to understand WHY it works.`);
  lines.push(``);
  lines.push(`AD CONTEXT:`);
  lines.push(`- This ad has been running for ${ad.daysActive} days (strong performance signal)`);
  if (ad.headline) lines.push(`- Headline: "${ad.headline}"`);
  if (ad.adCopy) lines.push(`- Ad copy: "${ad.adCopy}"`);
  if (ad.cta) lines.push(`- CTA: "${ad.cta}"`);
  lines.push(``);
  lines.push(`ANALYZE the attached image and return ONLY a valid JSON object with this exact structure:`);
  lines.push(`{`);
  lines.push(`  "headline": "The main headline or primary text visible in the ad",`);
  lines.push(`  "mainOffer": "The core offer or value proposition in 1 sentence",`);
  lines.push(`  "cta": "The call to action text or type",`);
  lines.push(`  "brandName": "The brand or company name visible in the ad",`);
  lines.push(`  "visualStyle": "One of: Minimal, Luxury, Bold, UGC, Educational, Testimonial, Product Showcase, Before/After, Lifestyle, Infographic",`);
  lines.push(`  "colorPalette": ["#hexcode1", "#hexcode2", "#hexcode3"],`);
  lines.push(`  "productLayout": "One of: Centered Product, Lifestyle Shot, Text-Heavy, Grid Layout, Split Screen, Full Bleed, Floating Product",`);
  lines.push(`  "whyWorking": "2-3 sentence explanation of the key psychological and strategic reasons this ad is performing well after ${ad.daysActive} days",`);
  lines.push(`  "creativeBreakdown": {`);
  lines.push(`    "whyHeadlineWorks": "Specific reason why the headline is effective",`);
  lines.push(`    "whyLayoutWorks": "Why the visual layout drives attention and action",`);
  lines.push(`    "emotionTargeted": "The specific emotion or psychological trigger being activated",`);
  lines.push(`    "marketingAngle": "The core marketing angle (e.g. Fear of missing out, Social proof, Authority, Transformation, etc.)",`);
  lines.push(`    "attentionHook": "The specific element that stops the scroll",`);
  lines.push(`    "targetAudience": "The precise audience this ad is targeting based on visual and copy cues"`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`Return ONLY the raw JSON. No markdown, no explanation, no text before or after.`);

  return lines.join('\n');
}

/** In-memory cache: adId → insights. Cleared on process restart. */
const insightsCache = new Map<string, AdInsights>();

export async function runInsights(ad: AdInput, adId: string): Promise<AdInsights> {
  // Return cached result if available
  const cached = insightsCache.get(adId);
  if (cached) return cached;

  const prompt = buildInsightsPrompt(ad);

  const userContent: any[] = [
    { type: 'input_text', text: prompt },
    { type: 'input_image', image_url: ad.imageUrl },
  ];

  const body = {
    model: 'gpt-5-5',
    stream: false,
    input: [{ role: 'user', content: userContent }],
    reasoning: { effort: 'medium' },
  };

  const res = await fetch(`${KIE_BASE}/codex/v1/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE insights failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;

  const msg = data.output?.find((o: any) => o.type === 'message');
  const rawText: string = msg
    ? (msg.content?.[0]?.text ?? msg.content?.[0]?.output_text ?? '')
    : (data.choices?.[0]?.message?.content ?? '');

  if (!rawText) {
    throw new Error(`KIE insights returned empty response`);
  }

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let insights: AdInsights;
  try {
    insights = JSON.parse(cleaned);
  } catch {
    throw new Error(`KIE insights returned non-JSON: ${cleaned.slice(0, 300)}`);
  }

  // Ensure colorPalette is always an array of 3
  if (!Array.isArray(insights.colorPalette) || insights.colorPalette.length === 0) {
    insights.colorPalette = ['#1a1a2e', '#16213e', '#0f3460'];
  }
  while (insights.colorPalette.length < 3) {
    insights.colorPalette.push('#e5e7eb');
  }

  // Cache and return
  insightsCache.set(adId, insights);
  return insights;
}
