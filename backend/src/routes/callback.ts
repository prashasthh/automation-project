import type { FastifyPluginAsync } from 'fastify';
import { uploadFromUrl } from '../services/localstore.js';
import { tasks } from '../services/tasks.js';

const callbackRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/kie-callback — optional KIE webhook
  fastify.post('/kie-callback', async (request, reply) => {
    const body = request.body as any;

    const taskId = body?.taskId ?? body?.data?.taskId;
    const state = String(body?.state ?? body?.status ?? '').toLowerCase();

    if (!taskId) {
      return reply.code(400).send({ error: 'Missing taskId in callback' });
    }

    // Find the GenTask by kieTaskId
    let genId: string | null = null;
    for (const [id, task] of tasks.entries()) {
      if (task.kieTaskId === taskId) {
        genId = id;
        break;
      }
    }

    if (!genId) {
      // Unknown task — ignore
      return { ok: true };
    }

    const task = tasks.get(genId);
    if (!task) return { ok: true };

    const FAILED_STATES = new Set(['failure', 'failed', 'error', 'cancelled', 'timeout', 'aborted']);

    if (FAILED_STATES.has(state)) {
      task.status = 'failed';
      task.error = `KIE reported ${state}`;
    } else if (state === 'success' || state === 'completed') {
      try {
        const resultJson = body?.resultJson ?? body?.data?.resultJson;
        const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
        const resultUrl = parsed?.resultUrls?.[0] ?? body?.resultUrl;

        if (resultUrl) {
          const localUrl = await uploadFromUrl(resultUrl);
          task.status = 'done';
          task.imageUrl = localUrl;
        }
      } catch (err: any) {
        task.status = 'failed';
        task.error = `Callback processing error: ${err.message}`;
      }
    }

    return { ok: true };
  });
};

export default callbackRoutes;
