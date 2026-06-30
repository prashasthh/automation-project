import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { startApifyRun, getRunStatus, fetchDataset } from '../services/apify';
import { filterAndDedupe } from '../services/filter';
import { searches } from '../services/tasks';

const searchesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/searches — kick off a scrape
  fastify.post('/searches', async (request, reply) => {
    const { searchUrl, maxAds = 100, minDays = 20 } = request.body as any;

    if (!searchUrl || typeof searchUrl !== 'string') {
      return reply.code(400).send({ error: 'searchUrl is required' });
    }

    // Ensure the URL has active_status=active and media_type=image
    let url: URL;
    try {
      url = new URL(searchUrl);
    } catch {
      return reply.code(400).send({ error: 'Invalid searchUrl' });
    }

    // Inject required filters if missing
    if (!url.searchParams.has('active_status')) {
      url.searchParams.set('active_status', 'active');
    }
    if (!url.searchParams.has('media_type')) {
      url.searchParams.set('media_type', 'image');
    }

    const finalUrl = url.toString();
    const searchId = uuidv4();

    searches.set(searchId, {
      id: searchId,
      status: 'running',
      createdAt: Date.now(),
    });

    // Start Apify run in background
    (async () => {
      try {
        const { runId, datasetId } = await startApifyRun(finalUrl, Math.min(Math.max(maxAds, 10), 500));

        const state = searches.get(searchId);
        if (!state) return;
        state.apifyRunId = runId;
        state.datasetId = datasetId;

        // Poll Apify until done
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes at 5s intervals

        while (attempts < maxAttempts) {
          await sleep(5000);
          attempts++;

          const status = await getRunStatus(runId);

          if (status === 'SUCCEEDED') {
            const rawItems = await fetchDataset(datasetId);
            const ads = await filterAndDedupe(rawItems, minDays);

            const s = searches.get(searchId);
            if (s) {
              s.status = 'done';
              s.ads = ads;
            }
            return;
          }

          if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
            const s = searches.get(searchId);
            if (s) {
              s.status = 'failed';
              s.error = `Apify run ${status.toLowerCase()}`;
            }
            return;
          }
        }

        // Timeout
        const s = searches.get(searchId);
        if (s && s.status === 'running') {
          s.status = 'failed';
          s.error = 'Scrape timed out after 10 minutes';
        }
      } catch (err: any) {
        const s = searches.get(searchId);
        if (s) {
          s.status = 'failed';
          s.error = err.message ?? 'Unknown error';
        }
      }
    })();

    return reply.code(202).send({ searchId });
  });

  // GET /api/searches/:id — poll search status
  fastify.get('/searches/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const state = searches.get(id);

    if (!state) {
      return reply.code(404).send({ error: 'Search not found' });
    }

    return {
      status: state.status,
      ads: state.ads,
      error: state.error,
    };
  });
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default searchesRoutes;
