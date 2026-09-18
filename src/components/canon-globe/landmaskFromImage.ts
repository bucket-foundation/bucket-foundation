// Landmask loader. Fetches a precomputed 1-bit land/ocean grid built offline
// by `npm run globe:landmask` (scripts/globe/build-landmask.mjs) and exposes
// `isLand(lat, lng)` the same way the old canvas-based sampler did.
//
// The globe used to draw the daymap JPEG into a 2D canvas and call
// getImageData to read pixel colors at runtime. Some browsers (Brave with
// fingerprint protection, some hardened Chromium builds) refuse the 2D
// context or the readback, which threw and left the globe with no dots.
// This loader has no canvas anywhere: the land/ocean decision is baked into
// a static asset at build time, and the client only fetches and unpacks
// bytes. The old function body is preserved verbatim in
// _intake/research-os-k12/DELETIONS.md for reference.

export type Landmask = {
  width: number;
  height: number;
  isLand: (lat: number, lng: number) => boolean;
  sample: (lat: number, lng: number) => { r: number; g: number; b: number; y: number };
};

type LandmaskHeader = {
  width: number;
  height: number;
  threshold: number;
  format: string;
  bitOrder: string;
  rowMajor: boolean;
};

function headerUrlFor(binUrl: string): string {
  return binUrl.replace(/\.bin$/, ".json");
}

/**
 * Loads a precomputed landmask asset. `url` is the `.bin` path (e.g.
 * `/textures/earth/landmask-2k.bin`); the JSON header sits next to it with
 * the same basename. `threshold` is accepted for signature compatibility
 * with the old loader but is informational only here, the threshold was
 * already applied when the asset was built.
 */
export async function loadLandmask(
  url: string,
  threshold = 90
): Promise<Landmask> {
  const [headerRes, binRes] = await Promise.all([
    fetch(headerUrlFor(url)),
    fetch(url),
  ]);
  if (!headerRes.ok) {
    throw new Error(`landmask: header fetch failed (${headerRes.status})`);
  }
  if (!binRes.ok) {
    throw new Error(`landmask: bin fetch failed (${binRes.status})`);
  }

  const header = (await headerRes.json()) as LandmaskHeader;
  const buf = new Uint8Array(await binRes.arrayBuffer());

  const { width, height } = header;
  const expectedBytes = Math.ceil((width * height) / 8);
  if (buf.length !== expectedBytes) {
    throw new Error(
      `landmask: expected ${expectedBytes} packed bytes for ${width}x${height}, got ${buf.length}`
    );
  }

  const pixelIsLand = (x: number, y: number): boolean => {
    const i = y * width + x;
    const byteIndex = i >> 3;
    const bitIndex = 7 - (i & 7); // MSB first, matches the build script
    return ((buf[byteIndex] >> bitIndex) & 1) === 1;
  };

  const latLngToXY = (lat: number, lng: number) => {
    // equirectangular: lng in [-180,180] → x in [0,w); lat in [90,-90] → y in [0,h)
    const u = ((lng + 180) % 360) / 360;
    const v = (90 - lat) / 180;
    const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
    return { x, y };
  };

  const isLand = (lat: number, lng: number) => {
    const { x, y } = latLngToXY(lat, lng);
    return pixelIsLand(x, y);
  };

  // Kept for type compatibility with the old canvas-based loader. No
  // consumer reads per-channel color today (only `isLand` and the grid
  // dimensions are used); the packed asset holds a single land/ocean bit
  // per pixel, so this reports the land call as a flat black-or-white
  // value rather than the original RGB.
  const sample = (lat: number, lng: number) => {
    const land = isLand(lat, lng);
    const v = land ? 255 : 0;
    return { r: v, g: v, b: v, y: v };
  };

  void threshold; // informational only, see doc comment above

  return { width, height, isLand, sample };
}
