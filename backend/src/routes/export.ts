import type { FastifyPluginAsync } from 'fastify';
import path from 'path';
import fs from 'fs';
const archiver = require('archiver');
import { tasks } from '../services/tasks';

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

const exportRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/export/:generationId — download a ZIP package
  fastify.get('/export/:generationId', async (request, reply) => {
    const { generationId } = request.params as { generationId: string };

    const task = tasks.get(generationId);
    if (!task) {
      return reply.code(404).send({ error: 'Generation not found' });
    }
    if (task.status !== 'done' || !task.imageUrl) {
      return reply.code(400).send({ error: 'Generation not complete yet' });
    }

    // Extract local filename from the URL (e.g. http://localhost:3001/uploads/abc.png → abc.png)
    const urlPath = new URL(task.imageUrl).pathname; // /uploads/filename.ext
    const filename = path.basename(urlPath);
    const imagePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(imagePath)) {
      return reply.code(404).send({ error: 'Image file not found on disk' });
    }

    const metadata = {
      generationId,
      styleVariant: task.styleVariant ?? 'default',
      generatedAt: new Date(task.createdAt).toISOString(),
      exportedAt: new Date().toISOString(),
    };

    // Set response headers for ZIP download
    const safeName = `adforge-${generationId.slice(0, 8)}`;
    reply.raw.setHeader('Content-Type', 'application/zip');
    reply.raw.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}.zip"`
    );

    // Stream ZIP directly to response
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(reply.raw);

    // 1. Generated image
    archive.file(imagePath, { name: `ad${path.extname(filename)}` });

    // 2. AI Prompt
    if (task.promptUsed) {
      archive.append(task.promptUsed, { name: 'prompt.txt' });
    }

    // 3. Metadata JSON
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

    // 4. README
    const readme = [
      `AdForge Export Package`,
      `======================`,
      `Generation ID : ${generationId}`,
      `Style Variant : ${task.styleVariant ?? 'default'}`,
      `Generated At  : ${metadata.generatedAt}`,
      `Exported At   : ${metadata.exportedAt}`,
      ``,
      `Files in this package:`,
      `  ad.*          — Generated ad image`,
      `  prompt.txt    — AI prompt used to generate this image`,
      `  metadata.json — Full generation metadata`,
      ``,
      `Generated with AdForge — https://github.com/adforge`,
    ].join('\n');

    archive.append(readme, { name: 'README.txt' });

    await archive.finalize();

    // Signal to Fastify that we handled the reply ourselves
    return reply;
  });
};

export default exportRoutes;
