import type { FastifyPluginAsync } from 'fastify';
import { runInsights } from '../services/kie-insights';

interface AdInput {
  imageUrl: string;
  adCopy?: string | null;
  headline?: string | null;
  cta?: string | null;
  daysActive: number;
}

const insightsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/insights — analyze a winning ad
  fastify.post('/insights', async (request, reply) => {
    const { ad, adId } = request.body as { ad: AdInput; adId: string };

    if (!ad?.imageUrl) {
      return reply.code(400).send({ error: 'ad.imageUrl is required' });
    }
    if (!adId) {
      return reply.code(400).send({ error: 'adId is required' });
    }

    try {
      const insights = await runInsights(ad, adId);
      return reply.send(insights);
    } catch (err: any) {
      fastify.log.error(err, 'Insights generation failed');
      return reply.code(500).send({ error: err.message ?? 'Insights generation failed' });
    }
  });
};

export default insightsRoutes;
