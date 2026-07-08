import fs from 'fs';

import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const uploadsDir = path.join(import.meta.dirname, '..', '..', 'uploads');

/** Download a KIE result URL to local disk and return the permanent local URL */
export async function uploadFromUrl(remoteUrl: string): Promise<string> {
  const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Failed to download result image: ${res.status}`);

  // Determine extension from Content-Type or URL
  const contentType = res.headers.get('content-type') ?? '';
  let ext = 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
  else if (contentType.includes('webp')) ext = 'webp';
  else {
    const urlExt = remoteUrl.split('?')[0].split('.').pop()?.toLowerCase();
    if (urlExt && ['png', 'jpg', 'jpeg', 'webp'].includes(urlExt)) {
      ext = urlExt === 'jpeg' ? 'jpg' : urlExt;
    }
  }

  const filename = `${uuidv4()}.${ext}`;
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  // In production the browser can't reach the server's localhost, so build the
  // URL from PUBLIC_BASE_URL (the deployed backend origin) when it is set.
  const base =
    process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '') ||
    `http://localhost:${process.env.PORT ?? '3001'}`;
  return `${base}/uploads/${filename}`;
}
