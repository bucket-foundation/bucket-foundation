import type { Fetch } from "./types";

export const LOCAL_PORTS = [11434, 8080, 8000] as const;
export const PROBE_MS = 1500;

export interface LocalServer {
  baseUrl: string;
  port: number;
  models: string[];
  preset: "ollama" | "llamacpp" | "vllm" | "openai";
}

const PRESET_BY_PORT: Record<number, LocalServer["preset"]> = { 11434: "ollama", 8080: "llamacpp", 8000: "vllm" };

export async function probeLocal(fetch: Fetch = globalThis.fetch, host = "127.0.0.1", ports: readonly number[] = LOCAL_PORTS, ms = PROBE_MS): Promise<LocalServer[]> {
  const found = await Promise.all(
    ports.map(async (port): Promise<LocalServer | null> => {
      const baseUrl = `http://${host}:${port}/v1`;
      try {
        const res = await fetch(`${baseUrl}/models`, { signal: AbortSignal.timeout(ms) });
        if (!res.ok) return null;
        const body = (await res.json()) as { data?: { id?: unknown }[] };
        if (!Array.isArray(body.data)) return null;
        const models = body.data.map((m) => m.id).filter((id): id is string => typeof id === "string");
        return { baseUrl, port, models, preset: PRESET_BY_PORT[port] ?? "openai" };
      } catch {
        return null;
      }
    }),
  );
  return found.filter((s): s is LocalServer => s !== null);
}

export function pickChatModel(models: string[]): string | undefined {
  return models.find((m) => !/embed/i.test(m));
}
