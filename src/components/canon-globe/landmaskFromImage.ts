// Landmask sampler. Loads a daymap image into an offscreen canvas and exposes
// `isLand(lat, lng)` based on a luminance threshold. Ocean pixels on the NASA
// blue-marble daymap read dark blue (low R, modest G, high B); land reads as
// warm browns + greens with much higher luminance. A simple Y > threshold cut
// is enough to separate them at 2k resolution.

export type Landmask = {
  width: number;
  height: number;
  isLand: (lat: number, lng: number) => boolean;
  sample: (lat: number, lng: number) => { r: number; g: number; b: number; y: number };
};

export async function loadLandmask(
  url: string,
  threshold = 90
): Promise<Landmask> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("landmask: 2d context unavailable");
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const sample = (lat: number, lng: number) => {
    // equirectangular: lng in [-180,180] → x in [0,w); lat in [90,-90] → y in [0,h)
    const u = ((lng + 180) % 360) / 360;
    const v = (90 - lat) / 180;
    const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Rec. 601 luma
    const yLum = 0.299 * r + 0.587 * g + 0.114 * b;
    return { r, g, b, y: yLum };
  };

  const isLand = (lat: number, lng: number) => {
    const { r, g, b, y } = sample(lat, lng);
    // Ocean is dominated by blue channel; land tends to have R or G >= B.
    if (b > r + 25 && b > g + 10) return false;
    return y > threshold;
  };

  return { width, height, isLand, sample };
}
