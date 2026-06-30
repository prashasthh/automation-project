import sharp from 'sharp';

/**
 * Compute a dHash (difference hash) for an image URL.
 * Returns a 64-bit BigInt representing the hash.
 */
export async function dHash(imageUrl: string): Promise<bigint> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    // Resize to 9x8 grayscale — 9 wide so we can compute 8 column differences
    const { data } = await sharp(buffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let hash = 0n;
    let bit = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = data[row * 9 + col];
        const right = data[row * 9 + col + 1];
        if (left > right) {
          hash |= 1n << BigInt(bit);
        }
        bit++;
      }
    }

    return hash;
  } catch {
    // Return 0 on error — won't dedupe but won't crash
    return 0n;
  }
}

/**
 * Hamming distance between two dHash values.
 * Values < 10 are considered the same creative.
 */
export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let distance = 0;
  while (x !== 0n) {
    distance += Number(x & 1n);
    x >>= 1n;
  }
  return distance;
}
