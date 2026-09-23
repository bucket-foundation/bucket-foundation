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
    const bitIndex = 7 - (i & 7);
    return ((buf[byteIndex] >> bitIndex) & 1) === 1;
  };

  const latLngToXY = (lat: number, lng: number) => {
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

  const sample = (lat: number, lng: number) => {
    const land = isLand(lat, lng);
    const v = land ? 255 : 0;
    return { r: v, g: v, b: v, y: v };
  };

  void threshold;

  return { width, height, isLand, sample };
}
