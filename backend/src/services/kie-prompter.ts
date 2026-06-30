
const KIE_API_KEY = process.env.KIE_API_KEY ?? '';

const KIE_BASE = 'https://api.kie.ai';

export interface AdInput {
  imageUrl: string;
  adCopy?: string | null;
  headline?: string | null;
  cta?: string | null;
  daysActive: number;
}

export interface BrandCtx {
  brandName?: string;
  usp?: string;
  tone?: string;
  audience?: string;
  visualGuidelines?: string;
  referenceAssetUrls?: string[];
}

export interface ImageBrief {
  image_prompt: string;
  aspect_ratio: '1:1' | '4:5' | '9:16';
  style_notes: string;
}

export type StyleVariant = 'premium' | 'minimal' | 'modern' | 'bold';

const STYLE_SUFFIXES: Record<StyleVariant, string> = {
  premium: `STYLE DIRECTION — PREMIUM: Render with a luxury, high-end aesthetic. Use rich dark backgrounds or soft cream tones, refined typography with generous spacing, subtle gold or metallic accents, and polished product photography lighting. The overall feel should be aspirational and exclusive.`,
  minimal: `STYLE DIRECTION — MINIMAL: Render with a clean, Scandinavian-inspired minimalist aesthetic. Maximum whitespace, one or two neutral colors, a single hero element, ultra-light typography. No clutter. Every element must earn its place.`,
  modern: `STYLE DIRECTION — MODERN: Render with a contemporary, tech-forward aesthetic. Bold geometric shapes, a vibrant accent color on a dark or light neutral base, sans-serif typography with strong hierarchy. Feels fresh, confident, and direct.`,
  bold: `STYLE DIRECTION — BOLD: Render with a high-energy, attention-grabbing aesthetic. Strong contrasting colors, oversized typography, dynamic angles or textures, a powerful statement headline that fills the frame. Stops the scroll instantly.`,
};

function buildSystemPrompt(ad: AdInput, brand: BrandCtx, styleVariant?: StyleVariant): string {
  const brandName = brand.brandName ?? 'Our Brand';
  const lines: string[] = [];

  lines.push(`You are an elite static ad creative specialist. Your entire expertise is studying high-performing`);
  lines.push(`static image ads, reverse-engineering the exact structural formula that makes them work, and`);
  lines.push(`rebuilding that formula for a new brand — preserving every effective element while swapping in the`);
  lines.push(`new product and identity.`);
  lines.push(``);
  lines.push(`WINNING AD CONTEXT:`);
  lines.push(`- This ad has been running for ${ad.daysActive} days — a strong performance indicator.`);
  if (ad.headline) lines.push(`- Headline: "${ad.headline}"`);
  if (ad.adCopy) lines.push(`- Copy: "${ad.adCopy}"`);
  if (ad.cta) lines.push(`- CTA: "${ad.cta}"`);
  lines.push(``);
  lines.push(`TARGET BRAND — ${brandName}:`);
  if (brand.usp) lines.push(`- USP: ${brand.usp}`);
  if (brand.tone) lines.push(`- Tone: ${brand.tone}`);
  if (brand.audience) lines.push(`- Target audience: ${brand.audience}`);
  if (brand.visualGuidelines) lines.push(`- Visual guidelines: ${brand.visualGuidelines}`);
  if (brand.referenceAssetUrls && brand.referenceAssetUrls.length > 0) {
    lines.push(`- Product/logo reference images are attached — your image_prompt MUST describe how to incorporate this exact product.`);
  }
  lines.push(``);
  lines.push(`YOUR PROCESS:`);
  lines.push(`1. DISSECT the winning ad: layout type (product showcase / lifestyle / before-after / benefit grid /`);
  lines.push(`   social proof / bold claim), visual hook, emotional trigger, text hierarchy, and how image and`);
  lines.push(`   copy work together. What is the ONE thing that makes this ad stop the scroll?`);
  lines.push(``);
  lines.push(`2. REPLICATE for ${brandName}: Keep the IDENTICAL structural pattern, layout, and emotional hook.`);
  lines.push(`   Do NOT change the formula. Only swap: the product (using reference images if provided), brand`);
  lines.push(`   name, and copy (rewritten for our USP with the same punch and structure as the original).`);
  lines.push(``);
  lines.push(`3. Write the image_prompt as if briefing a professional graphic designer who has never seen the`);
  lines.push(`   original. Be explicit about:`);
  lines.push(`   - Exact layout and composition`);
  lines.push(`   - Exact text that should appear on the image verbatim (rewritten for our brand)`);
  lines.push(`   - How the product is positioned and lit`);
  lines.push(`   - Color palette, background, lighting mood`);
  lines.push(`   - Typography weight and style`);
  lines.push(`   - Any graphic elements (badges, callouts, icons, overlays)`);

  // Append style variant direction if provided
  if (styleVariant && STYLE_SUFFIXES[styleVariant]) {
    lines.push(``);
    lines.push(STYLE_SUFFIXES[styleVariant]);
  }

  lines.push(``);
  lines.push(`OUTPUT: A single raw JSON object. No markdown, no explanation, nothing before or after.`);
  lines.push(`{"image_prompt":"...","aspect_ratio":"1:1|4:5|9:16","style_notes":"..."}`);

  return lines.join('\n');
}

/** Run the KIE GPT-5.5 vision prompter to get an ImageBrief */
export async function runPrompter(ad: AdInput, brand: BrandCtx, styleVariant?: StyleVariant): Promise<ImageBrief> {
  const systemPrompt = buildSystemPrompt(ad, brand, styleVariant);

  const userContent: any[] = [
    { type: 'input_text', text: systemPrompt },
    { type: 'input_image', image_url: ad.imageUrl },
  ];

  // Attach up to 3 brand reference images
  const refs = (brand.referenceAssetUrls ?? []).slice(0, 3);
  if (refs.length > 0) {
    userContent.push({ type: 'input_text', text: 'Brand product/logo reference images:' });
    for (const url of refs) {
      userContent.push({ type: 'input_image', image_url: url });
    }
  }

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
    throw new Error(`KIE prompter failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;

  // Support both OpenAI Responses API format and Chat Completions fallback
  const msg = data.output?.find((o: any) => o.type === 'message');
  const rawText: string = msg
    ? (msg.content?.[0]?.text ?? msg.content?.[0]?.output_text ?? '')
    : (data.choices?.[0]?.message?.content ?? '');

  if (!rawText) {
    throw new Error(`KIE prompter returned empty response: ${JSON.stringify(data)}`);
  }

  // Strip markdown code fences if the model wrapped the JSON
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let brief: ImageBrief;
  try {
    brief = JSON.parse(cleaned);
  } catch {
    throw new Error(`KIE prompter returned non-JSON: ${cleaned.slice(0, 200)}`);
  }

  if (!brief.image_prompt) {
    throw new Error(`KIE prompter brief missing image_prompt: ${JSON.stringify(brief)}`);
  }

  // Default aspect ratio
  if (!['1:1', '4:5', '9:16'].includes(brief.aspect_ratio)) {
    brief.aspect_ratio = '1:1';
  }

  return brief;
}
