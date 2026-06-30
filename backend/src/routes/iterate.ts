import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { createImageTask, pollTaskResult } from '../services/kie-image';
import { uploadFromUrl } from '../services/localstore';
import { tasks } from '../services/tasks';
import type { BrandCtx } from '../services/kie-prompter';

interface IterateBody {
  instruction: string;
  parentId: string;
  brand: BrandCtx;
}

const iterateRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/iterate', async (request, reply) => {
    const { instruction, parentId, brand } = request.body as IterateBody;

    if (!instruction?.trim()) {
      return reply.code(400).send({ error: 'instruction is required' });
    }

    const parentTask = tasks.get(parentId);
    if (!parentTask || !parentTask.imageUrl) {
      return reply.code(400).send({ error: 'Parent generation not found or not complete' });
    }

    const generationId = uuidv4();

    tasks.set(generationId, {
      id: generationId,
      status: 'pending',
      createdAt: Date.now(),
    });

    // Build an ad input from the instruction + parent image
    // In local dev: parent image is localhost, KIE can't reach it
    // → use text-to-image with the instruction as the full prompt
    const publicBaseUrl = process.env.PUBLIC_BASE_URL;
    const isPublicUrl =
      publicBaseUrl &&
      parentTask.imageUrl.startsWith(publicBaseUrl);

    (async () => {
      const task = tasks.get(generationId);
      if (!task) return;

      try {
        task.status = 'running';

        const adForIterate = {
          imageUrl: parentTask.imageUrl!,
          daysActive: 0,
        };

        const brief = {
          image_prompt: instruction,
          aspect_ratio: '1:1' as const,
          style_notes: `Iteration of generation ${parentId}`,
        };

        const imageInputs = isPublicUrl ? [parentTask.imageUrl!] : [];

        const kieTaskId = await createImageTask(
          brief,
          { ...adForIterate, imageUrl: isPublicUrl ? parentTask.imageUrl! : '' },
          brand ?? {},
          publicBaseUrl
        );

        task.kieTaskId = kieTaskId;
        task.promptUsed = instruction;

        let attempts = 0;
        while (attempts < 120) {
          await sleep(5000);
          attempts++;

          const result = await pollTaskResult(kieTaskId);

          if (result.state === 'success' && result.resultUrl) {
            const localUrl = await uploadFromUrl(result.resultUrl);
            const t = tasks.get(generationId);
            if (t) {
              t.status = 'done';
              t.imageUrl = localUrl;
            }
            return;
          }

          if (result.state === 'failed') {
            const t = tasks.get(generationId);
            if (t) {
              t.status = 'failed';
              t.error = 'KIE iteration failed';
            }
            return;
          }
        }

        const t = tasks.get(generationId);
        if (t && t.status === 'running') {
          t.status = 'failed';
          t.error = 'Iteration timed out';
        }
      } catch (err: any) {
        const t = tasks.get(generationId);
        if (t) {
          t.status = 'failed';
          t.error = err.message ?? 'Unknown error';
        }
      }
    })();

    return reply.code(202).send({ generationId });
  });
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default iterateRoutes;
