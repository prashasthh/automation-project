import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { runPrompter, type AdInput, type BrandCtx, type StyleVariant } from '../services/kie-prompter.js';
import { createImageTask, pollTaskResult } from '../services/kie-image.js';
import { uploadFromUrl } from '../services/localstore.js';
import { tasks } from '../services/tasks.js';

// Style variants in the order they are assigned to variations
const VARIANT_ORDER: StyleVariant[] = ['premium', 'minimal', 'modern', 'bold'];

const generateRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/generate — start generation (supports 1, 2, or 4 variations)
  fastify.post('/generate', async (request, reply) => {
    const { ad, brand, variations = 1 } = request.body as {
      ad: AdInput;
      brand: BrandCtx;
      variations?: number;
    };

    // Validate brand has at least name or USP
    if (!brand?.brandName && !brand?.usp) {
      return reply.code(400).send({
        error: 'Brand context requires at least brandName or usp. Please fill in Brand Settings.',
      });
    }

    if (!ad?.imageUrl) {
      return reply.code(400).send({ error: 'ad.imageUrl is required' });
    }

    // Clamp variations to 1, 2, or 4
    const count = ([1, 2, 4] as number[]).includes(variations) ? variations : 1;

    // Create a generation task for each variation
    const generationIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const generationId = uuidv4();
      const styleVariant = count > 1 ? VARIANT_ORDER[i % VARIANT_ORDER.length] : undefined;

      generationIds.push(generationId);

      tasks.set(generationId, {
        id: generationId,
        status: 'pending',
        createdAt: Date.now(),
        styleVariant,
      });

      // Run each generation pipeline independently in background
      (async (gid: string, variant: StyleVariant | undefined) => {
        const task = tasks.get(gid);
        if (!task) return;

        try {
          task.status = 'running';

          // Step 1: Run prompter with style variant
          const brief = await runPrompter(ad, brand, variant);
          task.promptUsed = brief.image_prompt;

          // Step 2: Create image generation task
          const publicBaseUrl = process.env.PUBLIC_BASE_URL;
          const kieTaskId = await createImageTask(brief, ad, brand, publicBaseUrl);
          task.kieTaskId = kieTaskId;

          // Step 3: Poll KIE until done
          let attempts = 0;
          const maxAttempts = 120; // ~10 min at 5s

          while (attempts < maxAttempts) {
            await sleep(5000);
            attempts++;

            const result = await pollTaskResult(kieTaskId);

            if (result.state === 'success' && result.resultUrl) {
              const localUrl = await uploadFromUrl(result.resultUrl);
              const t = tasks.get(gid);
              if (t) {
                t.status = 'done';
                t.imageUrl = localUrl;
              }
              return;
            }

            if (result.state === 'failed') {
              const t = tasks.get(gid);
              if (t) {
                t.status = 'failed';
                t.error = 'KIE image generation failed';
              }
              return;
            }
          }

          // Timeout
          const t = tasks.get(gid);
          if (t && t.status === 'running') {
            t.status = 'failed';
            t.error = 'Generation timed out';
          }
        } catch (err: any) {
          const t = tasks.get(gid);
          if (t) {
            t.status = 'failed';
            t.error = err.message ?? 'Unknown error';
          }
        }
      })(generationId, styleVariant);
    }

    return reply.code(202).send({ generationId: generationIds[0], generationIds });
  });

  // GET /api/generate/:id — poll generation status
  fastify.get('/generate/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = tasks.get(id);

    if (!task) {
      return reply.code(404).send({ error: 'Generation not found' });
    }

    return {
      status: task.status,
      imageUrl: task.imageUrl,
      promptUsed: task.promptUsed,
      error: task.error,
      styleVariant: task.styleVariant,
    };
  });
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default generateRoutes;
