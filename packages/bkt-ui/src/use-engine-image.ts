import { useEffect, useState } from "react";
import { IMAGE_MAX_BYTES, type Api } from "./api";

export const IMAGE_CACHE_BYTES = 48 * 1024 * 1024;

export class ImageCache {
  private urls = new Map<string, string>();
  private held = 0;

  constructor(readonly cap: number = IMAGE_CACHE_BYTES) {}

  get bytes(): number {
    return this.held;
  }

  get size(): number {
    return this.urls.size;
  }

  has(key: string): boolean {
    return this.urls.has(key);
  }

  get(key: string): string | undefined {
    const url = this.urls.get(key);
    if (url === undefined) return undefined;
    this.urls.delete(key);
    this.urls.set(key, url);
    return url;
  }

  set(key: string, url: string): void {
    const old = this.urls.get(key);
    if (old !== undefined) {
      this.held -= old.length;
      this.urls.delete(key);
    }
    if (url.length > this.cap) return;
    this.urls.set(key, url);
    this.held += url.length;
    for (const [oldest, value] of this.urls) {
      if (this.held <= this.cap) break;
      this.urls.delete(oldest);
      this.held -= value.length;
    }
  }
}

export const imageCache = new ImageCache();

export interface ImageRef {
  path: string;
  sha256: string;
  size: number;
}

export type EngineImage = { status: "idle" | "loading" } | { status: "ready"; src: string } | { status: "too-large" } | { status: "error"; error: string };

export function useEngineImage(api: Pick<Api, "image">, slug: string, file: ImageRef | null, show = true, cache: ImageCache = imageCache): EngineImage {
  const [state, setState] = useState<EngineImage>({ status: "idle" });
  const path = file?.path;
  const sha = file?.sha256;
  const size = file?.size ?? 0;
  useEffect(() => {
    if (!show || path === undefined || sha === undefined) return setState({ status: "idle" });
    if (size > IMAGE_MAX_BYTES) return setState({ status: "too-large" });
    const held = cache.get(sha);
    if (held !== undefined) return setState({ status: "ready", src: held });
    let alive = true;
    setState({ status: "loading" });
    api.image(slug, path).then(
      (src) => {
        if (!src.startsWith("data:image/")) throw new Error("The image did not arrive as image data.");
        cache.set(sha, src);
        if (alive) setState({ status: "ready", src });
      },
    ).catch((e: Error) => alive && setState({ status: "error", error: e.message }));
    return () => {
      alive = false;
    };
  }, [api, slug, path, sha, size, show, cache]);
  return state;
}

export function usePageImage(api: Pick<Api, "researchPage">, slug: string, pdf: string, n: number, show = true, cache: ImageCache = imageCache): EngineImage {
  const [state, setState] = useState<EngineImage>({ status: "idle" });
  useEffect(() => {
    if (!show) return setState({ status: "idle" });
    const key = `${pdf}:${n}`;
    const held = cache.get(key);
    if (held !== undefined) return setState({ status: "ready", src: held });
    let alive = true;
    setState({ status: "loading" });
    api.researchPage(slug, n).then(
      (page) => {
        if (page.state !== "ready" || !page.src.startsWith("data:image/png")) throw new Error("The page did not arrive as an image.");
        cache.set(key, page.src);
        if (alive) setState({ status: "ready", src: page.src });
      },
    ).catch((e: Error) => alive && setState({ status: "error", error: e.message }));
    return () => {
      alive = false;
    };
  }, [api, slug, pdf, n, show, cache]);
  return state;
}
